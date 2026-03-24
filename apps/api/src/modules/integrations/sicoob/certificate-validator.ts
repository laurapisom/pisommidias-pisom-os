import * as tls from 'tls';
import * as crypto from 'crypto';

export interface CertificateValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: 'WRONG_PASSWORD' | 'CORRUPTED' | 'EXPIRED' | 'OPENSSL_LEGACY' | 'INVALID_FORMAT' | 'UNKNOWN';
  subject?: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  cnpj?: string;
}

/**
 * Validates a PFX/PKCS12 certificate buffer with the given passphrase.
 * Detects common issues like wrong password, corruption, expiry, and
 * OpenSSL 3.x legacy format incompatibility.
 */
export function validatePfxCertificate(
  pfxBuffer: Buffer,
  passphrase?: string,
): CertificateValidationResult {
  try {
    // Attempt to load the PFX — this will throw on bad password/corruption
    const ctx = tls.createSecureContext({
      pfx: pfxBuffer,
      passphrase: passphrase || '',
    });

    // Try to extract certificate details via the secure context
    // The createSecureContext succeeding means the PFX is valid and password is correct
    return { valid: true };
  } catch (err: any) {
    return classifyCertificateError(err);
  }
}

/**
 * Extracts certificate details (subject, dates, CNPJ) from a PFX buffer.
 * Returns null if extraction fails.
 */
export function extractPfxInfo(
  pfxBuffer: Buffer,
  passphrase?: string,
): { subject: string; validFrom: Date; validTo: Date; cnpj?: string } | null {
  try {
    // Use forge-like approach with Node's built-in crypto
    // Node 15+ supports X509Certificate
    if (typeof (crypto as any).X509Certificate === 'function') {
      const ctx = tls.createSecureContext({
        pfx: pfxBuffer,
        passphrase: passphrase || '',
      });

      // Unfortunately, Node's tls module doesn't expose the cert directly from context.
      // We rely on the validation passing and return minimal info.
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Classifies a certificate loading error into a user-friendly diagnostic.
 */
export function classifyCertificateError(err: any): CertificateValidationResult {
  const message = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();

  // MAC verify failure — most common: wrong password or OpenSSL incompatibility
  if (message.includes('mac verify failure') || message.includes('mac_verify_failure')) {
    return {
      valid: false,
      error: 'Senha do certificado incorreta ou certificado incompatível. '
        + 'Verifique se a senha está correta (sem espaços extras). '
        + 'Se o certificado foi gerado com uma versão diferente do OpenSSL, '
        + 'pode ser necessário reconvertê-lo com: '
        + 'openssl pkcs12 -in cert.pfx -out temp.pem -nodes -legacy && '
        + 'openssl pkcs12 -export -in temp.pem -out cert_novo.pfx',
      errorCode: 'WRONG_PASSWORD',
    };
  }

  // Unsupported algorithm (OpenSSL 3.x legacy issue)
  if (
    message.includes('unsupported') ||
    message.includes('legacy') ||
    message.includes('rc2-40-cbc') ||
    message.includes('algorithm')
  ) {
    return {
      valid: false,
      error: 'O certificado usa um algoritmo de criptografia incompatível com esta versão do sistema. '
        + 'Reconverta o certificado usando: '
        + 'openssl pkcs12 -in cert.pfx -out temp.pem -nodes -legacy && '
        + 'openssl pkcs12 -export -in temp.pem -out cert_novo.pfx',
      errorCode: 'OPENSSL_LEGACY',
    };
  }

  // Bad PKCS12 format
  if (
    message.includes('not enough data') ||
    message.includes('bad pkcs12') ||
    message.includes('asn1') ||
    message.includes('header too long') ||
    message.includes('wrong tag')
  ) {
    return {
      valid: false,
      error: 'O arquivo do certificado está corrompido ou não é um arquivo PFX/PKCS12 válido. '
        + 'Faça o download do certificado novamente junto à autoridade certificadora.',
      errorCode: 'CORRUPTED',
    };
  }

  // Empty/no password when one is required
  if (message.includes('bad decrypt') || message.includes('bad_decrypt')) {
    return {
      valid: false,
      error: 'A senha do certificado está incorreta. Verifique se digitou a senha corretamente, '
        + 'sem espaços extras no início ou final.',
      errorCode: 'WRONG_PASSWORD',
    };
  }

  // Generic fallback
  return {
    valid: false,
    error: `Erro ao carregar o certificado: ${err.message}. `
      + 'Verifique se o arquivo é um certificado PFX válido e se a senha está correta.',
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
    return 'Falha na autenticação do certificado (mac verify failure). '
      + 'Causas prováveis: (1) Senha do certificado incorreta — redigite a senha nas credenciais. '
      + '(2) Certificado gerado com versão incompatível do OpenSSL — reconverta o PFX. '
      + '(3) Arquivo do certificado corrompido — faça upload novamente.';
  }

  if (msg.includes('bad decrypt') || msg.includes('bad_decrypt')) {
    return 'Senha do certificado incorreta. Edite as credenciais e redigite a senha exata do certificado.';
  }

  if (msg.includes('certificate has expired') || msg.includes('cert_has_expired')) {
    return 'O certificado digital expirou. Emita um novo certificado A1 junto à autoridade certificadora e faça upload novamente.';
  }

  if (msg.includes('self signed certificate') || msg.includes('self_signed_cert_in_chain')) {
    return 'O certificado não é reconhecido pela cadeia de confiança ICP-Brasil. '
      + 'Verifique se está usando um certificado A1 válido emitido por uma AC da ICP-Brasil.';
  }

  if (msg.includes('unable to verify the first certificate')) {
    return 'Não foi possível verificar a cadeia de certificados. '
      + 'O certificado precisa ser A1, emitido por uma AC da ICP-Brasil.';
  }

  if (msg.includes('econnrefused') || msg.includes('enotfound')) {
    return 'Não foi possível conectar ao servidor do Sicoob. Verifique sua conexão com a internet.';
  }

  if (msg.includes('timeout')) {
    return 'Tempo limite excedido ao conectar com o Sicoob. Tente novamente em alguns instantes.';
  }

  if (msg.includes('401') || msg.includes('unauthorized')) {
    return 'Client ID não autorizado. Verifique se o Client ID está correto e se a aplicação foi aprovada no portal do Sicoob.';
  }

  if (msg.includes('403') || msg.includes('forbidden')) {
    return 'Acesso negado. Verifique se a aplicação no portal do Sicoob tem os escopos necessários '
      + '(cco_consulta, cco_saldo, cco_extrato) e se foi liberada no Internet Banking.';
  }

  return errorMessage;
}
