import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';

// ── Interfaces ──────────────────────────────────────────────

export interface SicoobConfig {
  clientId: string;
  accountNumber: string;
  certificatePfx?: Buffer;
  certificatePass?: string;
}

export interface SicoobTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  type: 'CREDIT' | 'DEBIT';
  category: string;
  counterpart?: string;
  documentNumber?: string;
}

export interface SicoobBalance {
  available: number;
  blocked: number;
  total: number;
}

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class SicoobService {
  private readonly logger = new Logger(SicoobService.name);
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  private readonly BASE_URL = 'https://api.sicoob.com.br';
  private readonly SANDBOX_URL = 'https://sandbox.sicoob.com.br/sicoob/sandbox';
  private readonly TOKEN_URL = 'https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token';
  private readonly SANDBOX_TOKEN_URL = 'https://sandbox.sicoob.com.br/sicoob/sandbox/auth/token';

  // ── mTLS HTTPS Request ────────────────────────────────────

  private httpsRequest(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      pfx?: Buffer;
      passphrase?: string;
      timeout?: number;
    },
  ): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const reqOptions: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: options.method,
        headers: options.headers,
        timeout: options.timeout || 30000,
      };

      if (options.pfx) {
        reqOptions.pfx = options.pfx;
        reqOptions.passphrase = options.passphrase;
      }

      const req = https.request(reqOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve({ status: res.statusCode || 0, body });
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Sicoob request timeout after ${options.timeout || 30000}ms`));
      });

      if (options.body) req.write(options.body);
      req.end();
    });
  }

  // ── Token Management ────────────────────────────────────

  private async getAccessToken(config: SicoobConfig, sandbox = false): Promise<string> {
    const cacheKey = config.clientId;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const tokenUrl = sandbox ? this.SANDBOX_TOKEN_URL : this.TOKEN_URL;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      scope: 'cco_consulta cco_saldo cco_extrato',
    });

    this.logger.log(`Requesting token from ${tokenUrl}`);

    const res = await this.httpsRequest(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      pfx: config.certificatePfx,
      passphrase: config.certificatePass,
    });

    if (res.status >= 400) {
      this.logger.error(`Token request failed (${res.status}): ${res.body.substring(0, 300)}`);
      throw new Error(`Sicoob auth failed (${res.status}): ${res.body.substring(0, 200)}`);
    }

    const data = JSON.parse(res.body) as { access_token: string; expires_in: number };
    const token = data.access_token;
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + (data.expires_in - 20) * 1000,
    });

    this.logger.log('Token obtained successfully');
    return token;
  }

  private async httpGet<T>(path: string, config: SicoobConfig, sandbox = false): Promise<T> {
    const token = await this.getAccessToken(config, sandbox);
    const baseUrl = sandbox ? this.SANDBOX_URL : this.BASE_URL;
    const url = `${baseUrl}${path}`;

    this.logger.log(`GET ${url}`);

    const res = await this.httpsRequest(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-sicoob-clientid': config.clientId,
        client_id: config.clientId,
      },
      pfx: config.certificatePfx,
      passphrase: config.certificatePass,
    });

    this.logger.log(`Response ${res.status}: ${res.body.substring(0, 200)}`);

    if (res.status >= 400) {
      throw new Error(`Sicoob API error ${res.status}: ${res.body.substring(0, 300)}`);
    }

    return JSON.parse(res.body);
  }

  // ── Certificate Loading ───────────────────────────────────

  static loadCertificate(certificatePath: string): Buffer | undefined {
    try {
      if (!certificatePath || !fs.existsSync(certificatePath)) {
        return undefined;
      }
      return fs.readFileSync(certificatePath);
    } catch {
      return undefined;
    }
  }

  // ── Public Methods ──────────────────────────────────────

  async testConnection(config: SicoobConfig, sandbox = false): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Test token generation
      await this.getAccessToken(config, sandbox);
      this.logger.log('Test: token OK');

      // Step 2: Test balance endpoint
      try {
        await this.getBalance(config, sandbox);
        this.logger.log('Test: balance OK');
      } catch (balanceErr) {
        this.logger.warn(`Test: balance failed (${balanceErr.message}), trying extrato...`);
        // Balance might fail but extrato might work - try current month
        const now = new Date();
        const mes = now.getMonth() + 1;
        const ano = now.getFullYear();
        await this.httpGet(
          `/conta-corrente/v4/extrato/${mes}/${ano}?numeroContaCorrente=${config.accountNumber}`,
          config,
          sandbox,
        );
        this.logger.log('Test: extrato OK');
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Sicoob connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ── Balance ─────────────────────────────────────────────

  async getBalance(config: SicoobConfig, sandbox = false): Promise<SicoobBalance> {
    const params = `?numeroContaCorrente=${config.accountNumber}`;
    const data = await this.httpGet<any>(
      `/conta-corrente/v4/saldo${params}`,
      config,
      sandbox,
    );

    return {
      available: Number(data.saldoDisponivel || data.disponivel || 0),
      blocked: Number(data.saldoBloqueado || data.bloqueado || 0),
      total: Number(data.saldoTotal || data.total || data.saldoDisponivel || 0),
    };
  }

  // ── Bank Statement (Extrato) ────────────────────────────

  async getStatement(
    config: SicoobConfig,
    startDate: string,
    endDate: string,
    sandbox = false,
  ): Promise<SicoobTransaction[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allTransactions: SicoobTransaction[] = [];
    const errors: string[] = [];

    // Iterate through each month in the range
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endMonth) {
      const mes = current.getMonth() + 1;
      const ano = current.getFullYear();

      try {
        const data = await this.httpGet<any>(
          `/conta-corrente/v4/extrato/${mes}/${ano}?numeroContaCorrente=${config.accountNumber}`,
          config,
          sandbox,
        );

        const transactions = data.transacoes || data.resultado || data || [];
        if (Array.isArray(transactions)) {
          allTransactions.push(...transactions.map((tx: any) => this.mapTransaction(tx)));
        }
      } catch (error) {
        errors.push(`${mes}/${ano}: ${error.message}`);
        this.logger.warn(`Failed to fetch statement for ${mes}/${ano}: ${error.message}`);
      }

      current.setMonth(current.getMonth() + 1);
    }

    // If ALL months failed and we got no data, throw an error
    if (allTransactions.length === 0 && errors.length > 0) {
      throw new Error(`Falha ao buscar extrato: ${errors[0]}`);
    }

    return allTransactions;
  }

  private mapTransaction(tx: any): SicoobTransaction {
    const amount = Number(tx.valor || 0);
    return {
      id: String(tx.identificador || tx.id || tx.numeroDocumento || `${tx.dataMovimento}-${amount}`),
      date: tx.dataMovimento || tx.data || tx.dateCreated,
      description: tx.descricao || tx.historico || '',
      amount,
      balance: Number(tx.saldo || 0),
      type: amount >= 0 ? 'CREDIT' : 'DEBIT',
      category: this.classifyTransactionCategory(tx.descricao || tx.historico || ''),
      counterpart: tx.nomeFavorecido || tx.nomeContrapartida || tx.contrapartida || undefined,
      documentNumber: tx.numeroDocumento || tx.documento || undefined,
    };
  }

  private classifyTransactionCategory(description: string): string {
    const desc = description.toUpperCase();
    if (desc.includes('PIX')) return 'PIX';
    if (desc.includes('TED') || desc.includes('TRANSF')) return 'TED';
    if (desc.includes('BOLETO') || desc.includes('COMPENSACAO')) return 'BOLETO';
    if (desc.includes('TARIFA') || desc.includes('TAR ')) return 'TARIFA';
    if (desc.includes('IOF')) return 'IOF';
    if (desc.includes('SAQUE')) return 'SAQUE';
    if (desc.includes('DEPOSITO') || desc.includes('DEP ')) return 'DEPOSITO';
    if (desc.includes('CHEQUE')) return 'CHEQUE';
    if (desc.includes('DEB AUTO') || desc.includes('DEBITO AUTO')) return 'DEBITO_AUTOMATICO';
    return 'OUTROS';
  }
}
