import { Injectable, Logger } from '@nestjs/common';

// ── Interfaces ──────────────────────────────────────────────

export interface SicoobConfig {
  clientId: string;
  accountNumber: string;
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

export interface SicoobDdaBill {
  id: string;
  barcode?: string;
  issuerName: string;
  issuerDocument?: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface SicoobScheduledPayment {
  id: string;
  type: string;
  recipient: string;
  recipientDoc?: string;
  amount: number;
  scheduledDate: string;
  status: string;
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
      scope: 'cco_consulta',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Sicoob auth failed (${res.status}): ${text.substring(0, 200)}`);
      }

      const data = await res.json() as { access_token: string; expires_in: number };
      const token = data.access_token;
      // Cache with 20s margin before expiry
      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + (data.expires_in - 20) * 1000,
      });

      return token;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async httpGet<T>(path: string, config: SicoobConfig, sandbox = false): Promise<T> {
    const token = await this.getAccessToken(config, sandbox);
    const baseUrl = sandbox ? this.SANDBOX_URL : this.BASE_URL;
    const url = `${baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      client_id: config.clientId,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Sicoob API error ${res.status}: ${body.substring(0, 200)}`);
      }

      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Public Methods ──────────────────────────────────────

  async testConnection(config: SicoobConfig, sandbox = false): Promise<boolean> {
    try {
      await this.getAccessToken(config, sandbox);
      // Try fetching balance to validate full connectivity
      await this.getBalance(config, sandbox);
      return true;
    } catch (error) {
      this.logger.warn(`Sicoob connection test failed: ${error.message}`);
      return false;
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
    const params = new URLSearchParams({
      numeroContaCorrente: config.accountNumber,
      dataInicio: startDate, // YYYY-MM-DD
      dataFim: endDate,      // YYYY-MM-DD
    });

    const data = await this.httpGet<any>(
      `/conta-corrente/v4/extrato?${params.toString()}`,
      config,
      sandbox,
    );

    const transactions = data.transacoes || data.resultado || data || [];
    if (!Array.isArray(transactions)) {
      this.logger.warn('Unexpected statement response format');
      return [];
    }

    return transactions.map((tx: any) => this.mapTransaction(tx));
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

  // ── DDA (Boletos Eletrônicos) ───────────────────────────

  async getDdaBills(
    config: SicoobConfig,
    startDate: string,
    endDate: string,
    sandbox = false,
  ): Promise<SicoobDdaBill[]> {
    try {
      const params = new URLSearchParams({
        dataInicio: startDate,
        dataFim: endDate,
      });

      const data = await this.httpGet<any>(
        `/dda/v1/boletos?${params.toString()}`,
        config,
        sandbox,
      );

      const bills = data.boletos || data.resultado || data || [];
      if (!Array.isArray(bills)) return [];

      return bills.map((bill: any) => ({
        id: String(bill.id || bill.identificador || bill.codigoBarras),
        barcode: bill.codigoBarras || bill.linhaDigitavel || undefined,
        issuerName: bill.nomeCedente || bill.cedente || bill.beneficiario || 'Desconhecido',
        issuerDocument: bill.documentoCedente || bill.cnpjCedente || undefined,
        amount: Number(bill.valor || bill.valorDocumento || 0),
        dueDate: bill.dataVencimento || bill.vencimento,
        status: bill.situacao || 'PENDING',
      }));
    } catch (error) {
      this.logger.warn(`DDA fetch failed: ${error.message}`);
      return [];
    }
  }

  // ── Scheduled Payments ──────────────────────────────────

  async getScheduledPayments(
    config: SicoobConfig,
    startDate: string,
    endDate: string,
    sandbox = false,
  ): Promise<SicoobScheduledPayment[]> {
    try {
      const params = new URLSearchParams({
        numeroContaCorrente: config.accountNumber,
        dataInicio: startDate,
        dataFim: endDate,
      });

      const data = await this.httpGet<any>(
        `/pagamentos/v4/agendamentos?${params.toString()}`,
        config,
        sandbox,
      );

      const payments = data.agendamentos || data.resultado || data || [];
      if (!Array.isArray(payments)) return [];

      return payments.map((p: any) => ({
        id: String(p.id || p.identificador || p.codigoBarras),
        type: this.classifyPaymentType(p),
        recipient: p.nomeFavorecido || p.beneficiario || 'Desconhecido',
        recipientDoc: p.documentoFavorecido || p.cnpjFavorecido || undefined,
        amount: Number(p.valor || 0),
        scheduledDate: p.dataAgendamento || p.dataVencimento || p.dataPagamento,
        status: this.mapPaymentStatus(p.situacao || p.status),
      }));
    } catch (error) {
      this.logger.warn(`Scheduled payments fetch failed: ${error.message}`);
      return [];
    }
  }

  private classifyPaymentType(payment: any): string {
    if (payment.codigoBarras || payment.linhaDigitavel) return 'BOLETO';
    if (payment.chavePix) return 'PIX';
    return 'TED';
  }

  private mapPaymentStatus(status: string): string {
    if (!status) return 'SCHEDULED';
    const s = status.toUpperCase();
    if (s.includes('AGENDAD') || s.includes('PENDENT')) return 'SCHEDULED';
    if (s.includes('PROCESSAND') || s.includes('EM PROCESS')) return 'PROCESSING';
    if (s.includes('EFETUAD') || s.includes('PAGO') || s.includes('LIQUIDADO')) return 'PAID';
    if (s.includes('CANCEL')) return 'CANCELLED';
    if (s.includes('REJEITAD') || s.includes('FALHA')) return 'FAILED';
    return 'SCHEDULED';
  }
}
