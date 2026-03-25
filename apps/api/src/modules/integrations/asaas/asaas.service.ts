import { Injectable, Logger } from '@nestjs/common';

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  city?: number;
  cityName?: string;
  state?: string;
  personType?: string;
  company?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  description?: string;
  status: string;
  dateCreated: string;
  endDate?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  billingType: string;
  value: number;
  netValue?: number;
  dueDate: string;
  paymentDate?: string;
  status: string;
  description?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixTransaction?: { qrCode?: string };
}

export interface AsaasFinancialTransaction {
  id: string;
  value: number;
  type: string;
  date: string;
  description?: string;
  paymentId?: string;
  balance: number;
}

interface AsaasListResponse<T> {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  private getBaseUrl(sandbox: boolean): string {
    return sandbox
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';
  }

  private async httpGet<T>(
    path: string,
    apiKey: string,
    sandbox: boolean,
    retries = 3,
  ): Promise<T> {
    const url = `${this.getBaseUrl(sandbox)}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        this.logger.warn(`Asaas API retry ${attempt}/${retries} after ${delay}ms for ${path}`);
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(url, {
          headers: { access_token: apiKey },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.text();
          const statusCode = res.status;
          // Retry on 5xx or 429 (rate limit)
          if ((statusCode >= 500 || statusCode === 429) && attempt < retries) {
            lastError = new Error(`Asaas API error ${statusCode}: ${body}`);
            continue;
          }
          throw new Error(`Asaas API error ${statusCode}: ${body.substring(0, 200)}`);
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          lastError = new Error(`Asaas API timeout after 30s for ${path}`);
          if (attempt < retries) continue;
          throw lastError;
        }
        // Retry on network errors
        if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          lastError = error;
          if (attempt < retries) continue;
        }
        throw error;
      }
    }

    throw lastError || new Error(`Asaas API failed after ${retries} retries`);
  }

  private buildDateFilter(dateCreatedAfter?: string): string {
    if (!dateCreatedAfter) return '';
    return `&dateCreated[ge]=${dateCreatedAfter}`;
  }

  async testConnection(apiKey: string, sandbox: boolean): Promise<boolean> {
    try {
      const res = await this.httpGet<AsaasListResponse<AsaasCustomer>>(
        '/customers?limit=1',
        apiKey,
        sandbox,
      );
      // Validate response has expected structure (real Asaas response)
      if (typeof res?.totalCount !== 'number') return false;
      return true;
    } catch (error) {
      this.logger.warn(`Asaas connection test failed: ${error.message}`);
      return false;
    }
  }

  async getCount(
    endpoint: 'customers' | 'subscriptions' | 'payments' | 'financialTransactions',
    apiKey: string,
    sandbox: boolean,
    dateCreatedAfter?: string,
  ): Promise<number> {
    const dateFilter = this.buildDateFilter(dateCreatedAfter);
    const res = await this.httpGet<AsaasListResponse<unknown>>(
      `/${endpoint}?limit=1${dateFilter}`,
      apiKey,
      sandbox,
    );
    return res.totalCount;
  }

  async *fetchAllCustomers(
    apiKey: string,
    sandbox: boolean,
    dateCreatedAfter?: string,
  ): AsyncGenerator<AsaasCustomer[]> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const dateFilter = this.buildDateFilter(dateCreatedAfter);
    while (hasMore) {
      const res = await this.httpGet<AsaasListResponse<AsaasCustomer>>(
        `/customers?offset=${offset}&limit=${limit}${dateFilter}`,
        apiKey,
        sandbox,
      );
      if (res.data.length > 0) yield res.data;
      hasMore = res.hasMore;
      offset += limit;
    }
  }

  async *fetchAllSubscriptions(
    apiKey: string,
    sandbox: boolean,
    dateCreatedAfter?: string,
  ): AsyncGenerator<AsaasSubscription[]> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const dateFilter = this.buildDateFilter(dateCreatedAfter);
    while (hasMore) {
      const res = await this.httpGet<AsaasListResponse<AsaasSubscription>>(
        `/subscriptions?offset=${offset}&limit=${limit}${dateFilter}`,
        apiKey,
        sandbox,
      );
      if (res.data.length > 0) yield res.data;
      hasMore = res.hasMore;
      offset += limit;
    }
  }

  async *fetchAllPayments(
    apiKey: string,
    sandbox: boolean,
    dateCreatedAfter?: string,
  ): AsyncGenerator<AsaasPayment[]> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const dateFilter = this.buildDateFilter(dateCreatedAfter);
    while (hasMore) {
      const res = await this.httpGet<AsaasListResponse<AsaasPayment>>(
        `/payments?offset=${offset}&limit=${limit}${dateFilter}`,
        apiKey,
        sandbox,
      );
      if (res.data.length > 0) yield res.data;
      hasMore = res.hasMore;
      offset += limit;
    }
  }

  async *fetchPaymentsBySubscription(
    subscriptionId: string,
    apiKey: string,
    sandbox: boolean,
  ): AsyncGenerator<AsaasPayment[]> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    while (hasMore) {
      const res = await this.httpGet<AsaasListResponse<AsaasPayment>>(
        `/payments?subscription=${subscriptionId}&offset=${offset}&limit=${limit}`,
        apiKey,
        sandbox,
      );
      if (res.data.length > 0) yield res.data;
      hasMore = res.hasMore;
      offset += limit;
    }
  }

  async *fetchPaymentsByCustomer(
    customerId: string,
    apiKey: string,
    sandbox: boolean,
  ): AsyncGenerator<AsaasPayment[]> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    while (hasMore) {
      const res = await this.httpGet<AsaasListResponse<AsaasPayment>>(
        `/payments?customer=${customerId}&offset=${offset}&limit=${limit}`,
        apiKey,
        sandbox,
      );
      if (res.data.length > 0) yield res.data;
      hasMore = res.hasMore;
      offset += limit;
    }
  }

  async *fetchAllFinancialTransactions(
    apiKey: string,
    sandbox: boolean,
    dateCreatedAfter?: string,
  ): AsyncGenerator<AsaasFinancialTransaction[]> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const dateFilter = this.buildDateFilter(dateCreatedAfter);
    while (hasMore) {
      const res = await this.httpGet<AsaasListResponse<AsaasFinancialTransaction>>(
        `/financialTransactions?offset=${offset}&limit=${limit}${dateFilter}`,
        apiKey,
        sandbox,
      );
      if (res.data.length > 0) yield res.data;
      hasMore = res.hasMore;
      offset += limit;
    }
  }
}
