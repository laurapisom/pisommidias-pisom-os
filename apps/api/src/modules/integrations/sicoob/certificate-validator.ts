import * as tls from 'tls';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
 * automatically converts it using the system openssl CLI with -legacy flag.
 *
 * Returns TLS options ready to use with https.Agent or tls.createSecureContext.
 */
export function loadPfxCertificate(
  pfxBuffer: Buffer,
  passphrase?: string,
): { valid: true; tlsOptions: PfxTlsOptions } | { valid: false; error: string; errorCode: string } {
  const pass = passphrase || '';

  // 1. Try loading the PFX directly (works with modern format)
  try {
    tls.createSecureContext({ pfx: pfxBuffer, passphrase: pass });
    return { valid: true, tlsOptions: { pfx: pfxBuffer, passphrase: pass } };
  } catch (directErr: any) {
    const msg = (directErr.message || '').toLowerCase();

    // Only attempt legacy conversion for mac verify failure / unsupported algorithm
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

  // 2. Try converting legacy PFX to PEM using openssl CLI
  const tmpDir = os.tmpdir();
  const tmpPfx = path.join(tmpDir, `sicoob-cert-${Date.now()}.pfx`);
  const tmpPem = path.join(tmpDir, `sicoob-cert-${Date.now()}.pem`);

  try {
    fs.writeFileSync(tmpPfx, pfxBuffer, { mode: 0o600 });

    // Convert PFX → PEM with -legacy flag (supports old encryption algorithms)
    execFileSync('openssl', [
      'pkcs12', '-in', tmpPfx, '-out', tmpPem, '-nodes', '-legacy',
      '-passin', `pass:${pass}`,
    ], { timeout: 10000, stdio: 'pipe' });

    const pemContent = fs.readFileSync(tmpPem, 'utf-8');

    // Extract cert chain and private key from PEM
    const certs = pemContent.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    const keyMatch = pemContent.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/);

    if (!certs || !keyMatch) {
      return {
        valid: false,
        error: 'Não foi possível extrair certificado e chave privada do PFX. O arquivo pode estar corrompido.',
        errorCode: 'CORRUPTED',
      };
    }

    const certChain = certs.join('\n');
    const privateKey = keyMatch[0];

    // Validate the extracted PEM works
    try {
      tls.createSecureContext({ cert: certChain, key: privateKey });
    } catch (pemErr: any) {
      return {
        valid: false,
        error: `Certificado convertido mas inválido: ${pemErr.message}`,
        errorCode: 'CORRUPTED',
      };
    }

    return { valid: true, tlsOptions: { cert: certChain, key: privateKey } };
  } catch (opensslErr: any) {
    const errMsg = (opensslErr.stderr?.toString() || opensslErr.message || '').toLowerCase();

    // openssl also reports mac verify failure when password is truly wrong
    if (errMsg.includes('mac verify failure') || errMsg.includes('mac_verify_failure') || errMsg.includes('bad decrypt')) {
      return {
        valid: false,
        error: 'Senha do certificado incorreta. Verifique se a senha está correta (sem espaços extras).',
        errorCode: 'WRONG_PASSWORD',
      };
    }

    // openssl not found
    if (opensslErr.code === 'ENOENT') {
      return {
        valid: false,
        error: 'O certificado usa formato legado e o sistema não possui openssl instalado para convertê-lo. '
          + 'Converta manualmente: openssl pkcs12 -in cert.pfx -out temp.pem -nodes -legacy && '
          + 'openssl pkcs12 -export -in temp.pem -out cert_novo.pfx',
        errorCode: 'OPENSSL_LEGACY',
      };
    }

    return {
      valid: false,
      error: `Erro ao processar o certificado: ${opensslErr.message}`,
      errorCode: 'UNKNOWN',
    };
  } finally {
    try { fs.unlinkSync(tmpPfx); } catch {}
    try { fs.unlinkSync(tmpPem); } catch {}
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
