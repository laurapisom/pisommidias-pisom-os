import * as tls from 'tls';
import * as forge from 'node-forge';

export interface CertificateValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: 'WRONG_PASSWORD' | 'CORRUPTED' | 'EXPIRED' | 'OPENSSL_LEGACY' | 'INVALID_FORMAT' | 'UNKNOWN';
}

/**
 * TLS options extracted from a PFX certificate.
 * Either pfx+passphrase (modern format) or cert+key (converted from legacy).
 */
export interface PfxTlsOptions {
  pfx?: Buffer;
  passphrase?: string;
  cert?: string;
  key?: string;
}

/**
 * Validates and loads a PFX certificate buffer.
 * If the PFX uses legacy OpenSSL algorithms (common with Brazilian ICP-Brasil certs),
 * automatically converts it using node-forge (pure JavaScript PKCS12 parser).
 *
 * Returns TLS options ready to use with https.Agent or tls.createSecureContext.
 */
export function loadPfxCertificate(
  pfxBuffer: Buffer,
  passphrase?: string,
): { valid: true; tlsOptions: PfxTlsOptions } | { valid: false; error: string; errorCode: string } {
  const pass = passphrase || '';

  // 1. Try loading the PFX directly with Node.js TLS (works with modern format)
  try {
    tls.createSecureContext({ pfx: pfxBuffer, passphrase: pass });
    return { valid: true, tlsOptions: { pfx: pfxBuffer, passphrase: pass } };
  } catch (directErr: any) {
    const msg = (directErr.message || '').toLowerCase();

    // Only attempt node-forge conversion for mac verify failure / unsupported algorithm
    const isLegacyIssue = msg.includes('mac verify failure') ||
      msg.includes('mac_verify_failure') ||
      msg.includes('unsupported') ||
      msg.includes('rc2') ||
      msg.includes('algorithm');

    if (!isLegacyIssue) {
      const classified = classifyCertificateError(directErr);
      return { valid: false, error: classified.error!, errorCode: classified.errorCode || 'UNKNOWN' };
    }
  }

  // 2. Convert legacy PFX using node-forge (pure JavaScript, no openssl CLI dependency)
  try {
    const derBuffer = forge.util.createBuffer(pfxBuffer.toString('binary'));
    const asn1 = forge.asn1.fromDer(derBuffer);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, pass);

    // Extract certificate chain
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBagList = certBags[forge.pki.oids.certBag] || [];

    // Extract private key
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    let keyBagList = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];

    if (keyBagList.length === 0) {
      const keyBags2 = p12.getBags({ bagType: forge.pki.oids.keyBag });
      keyBagList = keyBags2[forge.pki.oids.keyBag] || [];
    }

    if (certBagList.length === 0 || keyBagList.length === 0) {
      return {
        valid: false,
        error: 'Não foi possível extrair certificado e chave privada do PFX. O arquivo pode estar corrompido.',
        errorCode: 'CORRUPTED',
      };
    }

    // Convert to PEM format
    const certPems = certBagList
      .filter((bag: any) => bag.cert)
      .map((bag: any) => forge.pki.certificateToPem(bag.cert));

    const privateKey = keyBagList[0]?.key;
    if (!privateKey) {
      return {
        valid: false,
        error: 'Não foi possível extrair a chave privada do certificado PFX.',
        errorCode: 'CORRUPTED',
      };
    }

    const keyPem = forge.pki.privateKeyToPem(privateKey);
    const certChain = certPems.join('\n');

    // Validate the extracted PEM works with Node.js TLS
    try {
      tls.createSecureContext({ cert: certChain, key: keyPem });
    } catch (pemErr: any) {
      return {
        valid: false,
        error: `Certificado convertido mas inválido para TLS: ${pemErr.message}`,
        errorCode: 'CORRUPTED',
      };
    }

    return { valid: true, tlsOptions: { cert: certChain, key: keyPem } };
  } catch (forgeErr: any) {
    const errMsg = (forgeErr.message || '').toLowerCase();

    // node-forge reports bad password as "Invalid password" or PKCS#12 MAC error
    if (
      errMsg.includes('invalid password') ||
      errMsg.includes('pkcs#12 mac') ||
      errMsg.includes('bad decrypt') ||
      errMsg.includes('mac could not be verified')
    ) {
      return {
        valid: false,
        error: 'Senha do certificado incorreta. Verifique se a senha está correta (sem espaços extras).',
        errorCode: 'WRONG_PASSWORD',
      };
    }

    // ASN.1 parsing errors = corrupted file
    if (errMsg.includes('asn1') || errMsg.includes('too few bytes') || errMsg.includes('invalid')) {
      return {
        valid: false,
        error: 'O arquivo do certificado está corrompido ou não é um PFX válido. Faça download novamente.',
        errorCode: 'CORRUPTED',
      };
    }

    return {
      valid: false,
      error: `Erro ao processar o certificado: ${forgeErr.message}`,
      errorCode: 'UNKNOWN',
    };
  }
}

/**
 * Validates a PFX certificate (simpler check, returns boolean-style result).
 */
export function validatePfxCertificate(
  pfxBuffer: Buffer,
  passphrase?: string,
): CertificateValidationResult {
  const result = loadPfxCertificate(pfxBuffer, passphrase);
  if (result.valid) return { valid: true };
  return { valid: false, error: result.error, errorCode: result.errorCode as any };
}

/**
 * Classifies a certificate loading error into a user-friendly diagnostic.
 */
export function classifyCertificateError(err: any): CertificateValidationResult {
  const message = (err.message || '').toLowerCase();

  if (message.includes('mac verify failure') || message.includes('mac_verify_failure')) {
    return {
      valid: false,
      error: 'Senha do certificado incorreta ou certificado com formato incompatível.',
      errorCode: 'WRONG_PASSWORD',
    };
  }

  if (message.includes('unsupported') || message.includes('legacy') || message.includes('rc2-40-cbc') || message.includes('algorithm')) {
    return {
      valid: false,
      error: 'O certificado usa um algoritmo de criptografia incompatível.',
      errorCode: 'OPENSSL_LEGACY',
    };
  }

  if (message.includes('not enough data') || message.includes('bad pkcs12') || message.includes('asn1') || message.includes('header too long') || message.includes('wrong tag')) {
    return {
      valid: false,
      error: 'O arquivo do certificado está corrompido ou não é um PFX válido. Faça download novamente.',
      errorCode: 'CORRUPTED',
    };
  }

  if (message.includes('bad decrypt') || message.includes('bad_decrypt')) {
    return {
      valid: false,
      error: 'Senha do certificado incorreta. Verifique se digitou corretamente.',
      errorCode: 'WRONG_PASSWORD',
    };
  }

  return {
    valid: false,
    error: `Erro ao carregar o certificado: ${err.message}`,
    errorCode: 'UNKNOWN',
  };
}

/**
 * Translates a raw mTLS/certificate error from httpsRequest into a
 * user-friendly message in Portuguese.
 */
export function translateConnectionError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();

  if (msg.includes('mac verify failure') || msg.includes('mac_verify_failure')) {
    return 'Falha na autenticação do certificado. Verifique a senha e tente fazer upload novamente.';
  }

  if (msg.includes('bad decrypt') || msg.includes('bad_decrypt')) {
    return 'Senha do certificado incorreta.';
  }

  if (msg.includes('certificate has expired') || msg.includes('cert_has_expired')) {
    return 'O certificado digital expirou. Emita um novo certificado A1 e faça upload novamente.';
  }

  if (msg.includes('self signed certificate') || msg.includes('self_signed_cert_in_chain')) {
    return 'Certificado não reconhecido pela cadeia de confiança ICP-Brasil.';
  }

  if (msg.includes('unable to verify the first certificate')) {
    return 'Não foi possível verificar a cadeia de certificados. Use um certificado A1 ICP-Brasil.';
  }

  if (msg.includes('econnrefused') || msg.includes('enotfound')) {
    return 'Não foi possível conectar ao servidor do Sicoob. Verifique sua conexão com a internet.';
  }

  if (msg.includes('timeout')) {
    return 'Tempo limite excedido ao conectar com o Sicoob. Tente novamente.';
  }

  if (msg.includes('401') || msg.includes('unauthorized')) {
    return 'Client ID não autorizado. Verifique se o Client ID está correto e a aplicação foi aprovada no portal Sicoob Developers.';
  }

  if (msg.includes('403') || msg.includes('forbidden')) {
    return 'Acesso negado. Verifique os escopos (openid, cco_saldo, cco_extrato) no portal Sicoob Developers.';
  }

  return errorMessage;
}
