import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AsaasService, AsaasCustomer, AsaasSubscription, AsaasPayment, AsaasFinancialTransaction } from './asaas.service';
import { BillingCycle, ContractStatus, InvoiceStatus } from '@prisma/client';

function mapCycle(cycle: string): BillingCycle {
  switch (cycle) {
    case 'WEEKLY':
    case 'BIWEEKLY':
    case 'MONTHLY':
      return 'MONTHLY';
    case 'QUARTERLY':
      return 'QUARTERLY';
    case 'SEMIANNUALLY':
      return 'SEMIANNUAL';
    case 'YEARLY':
      return 'ANNUAL';
    default:
      return 'CUSTOM';
  }
}

function mapSubscriptionStatus(status: string): ContractStatus {
  switch (status) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'INACTIVE':
      return 'PAUSED';
    case 'EXPIRED':
      return 'EXPIRED';
    default:
      return 'CANCELLED';
  }
}

function mapPaymentStatus(status: string): InvoiceStatus {
  switch (status) {
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'PENDING';
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return 'PAID';
    case 'OVERDUE':
      return 'OVERDUE';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return 'REFUNDED';
    case 'DELETED':
    case 'RESTORED':
    case 'ARCHIVED':
    case 'DUNNING_REQUESTED':
    case 'DUNNING_RECEIVED':
      return 'CANCELLED';
    default:
      // Unknown status - default to PENDING so it can be reviewed, not silently cancelled
      return 'PENDING';
  }
}

@Injectable()
export class AsaasSyncService {
  private readonly logger = new Logger(AsaasSyncService.name);

  constructor(
    private prisma: PrismaService,
    private asaasService: AsaasService,
  ) {}

  private static readonly SYNC_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes max

  async syncAll(organizationId: string): Promise<{ customers: number; subscriptions: number; payments: number; expenses: number }> {
    // Pre-flight: verify DB is reachable before starting long sync
    try {
      await this.prisma.executeWithRetry(() => this.prisma.$queryRaw`SELECT 1`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Banco de dados inacessível. Verifique a conexão (DATABASE_URL). Detalhe: ${msg}`);
    }

    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
    });

    if (!integration || !integration.isActive) {
      throw new Error('Integração Asaas não encontrada ou inativa');
    }

    // Clear caches at the start to prevent stale data from previous runs
    this.companyCache.clear();
    this.contractCache.clear();
    this.categoryCache.clear();
    this.asaasBankAccountId = undefined;
    this.cashBankAccountId = undefined;

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'syncing', syncError: null, syncCancelled: false, syncProgress: 0, syncPhase: null, syncDetail: 'Iniciando sincronização...' },
    });

    // Set up a global timeout to prevent infinite syncs
    const syncTimeout = setTimeout(async () => {
      this.logger.error(`Sync timeout after ${AsaasSyncService.SYNC_TIMEOUT_MS / 1000}s for org ${organizationId}`);
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { syncCancelled: true },
      });
    }, AsaasSyncService.SYNC_TIMEOUT_MS);

    try {
      // Sync incremental: usa lastSyncAt para filtrar apenas dados novos/atualizados
      const dateFilter = integration.lastSyncAt
        ? integration.lastSyncAt.toISOString().split('T')[0]
        : undefined;

      // Obter contagens totais para calcular progresso
      this.syncStartedAt = Date.now();
      this.lastCancelCheck = 0;
      await this.updateProgress(integration.id, 0, 'counting', 'Calculando total de registros...');

      const customerTotal = await this.asaasService.getCount('customers', integration.apiKey, integration.sandbox, dateFilter);
      const subscriptionTotal = await this.asaasService.getCount('subscriptions', integration.apiKey, integration.sandbox, dateFilter);
      const paymentTotal = await this.asaasService.getCount('payments', integration.apiKey, integration.sandbox, dateFilter);
      let expenseTotal = 0;
      let expenseSkipped = false;
      try {
        expenseTotal = await this.asaasService.getCount('financialTransactions', integration.apiKey, integration.sandbox, dateFilter);
      } catch {
        expenseSkipped = true;
        this.logger.warn('Could not fetch financialTransactions count, skipping expense sync');
      }
      const grandTotal = customerTotal + subscriptionTotal + paymentTotal + expenseTotal;

      this.logger.log(`Sync counts for org ${organizationId}: ${customerTotal}C ${subscriptionTotal}S ${paymentTotal}P ${expenseTotal}E (total: ${grandTotal})${dateFilter ? ` [since ${dateFilter}]` : ' [full]'}`);
      await this.updateProgress(
        integration.id, 1, 'counting',
        `Encontrados: ${customerTotal} clientes, ${subscriptionTotal} assinaturas, ${paymentTotal} cobranças${expenseSkipped ? '' : `, ${expenseTotal} transações`}${dateFilter ? ` (desde ${dateFilter})` : ''}`,
      );

      let processed = 0;

      // Sync Customers
      const customerCount = await this.syncCustomers(
        organizationId, integration.apiKey, integration.sandbox, dateFilter,
        grandTotal, processed, integration.id, customerTotal,
      );
      processed += customerCount;

      // Sync Subscriptions
      const subscriptionCount = await this.syncSubscriptions(
        organizationId, integration.apiKey, integration.sandbox, dateFilter,
        grandTotal, processed, integration.id, subscriptionTotal,
      );
      processed += subscriptionCount;

      // Sync Payments
      let paymentCount = await this.syncPayments(
        organizationId, integration.apiKey, integration.sandbox, dateFilter,
        grandTotal, processed, integration.id, paymentTotal,
      );

      // Fallback: if global /payments returned 0, try fetching per subscription/customer
      if (paymentCount === 0) {
        this.logger.warn(`Global /payments returned 0 for org ${organizationId}. Trying fallback via subscriptions & customers...`);
        paymentCount = await this.syncPaymentsFallback(
          organizationId, integration.apiKey, integration.sandbox, integration.id,
        );
      }
      processed += paymentCount;

      // Sync Expenses (financial transactions from Asaas)
      let expenseCount = 0;
      if (expenseTotal > 0) {
        expenseCount = await this.syncExpenses(
          organizationId, integration.apiKey, integration.sandbox, dateFilter,
          grandTotal, processed, integration.id, expenseTotal,
        );
      }

      this.companyCache.clear();
      this.contractCache.clear();
      this.categoryCache.clear();
      this.asaasBankAccountId = undefined;
      this.cashBankAccountId = undefined;
      this.invoiceNumberCounter = 0;
      clearTimeout(syncTimeout);

      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'success',
          lastSyncAt: new Date(),
          syncError: null,
          syncProgress: 100,
          syncPhase: 'done',
          syncDetail: grandTotal === 0
            ? `Nenhum registro encontrado no Asaas${dateFilter ? ` desde ${dateFilter}. Use "Sync Completa" para reimportar tudo.` : '. Verifique se a API Key e o modo (sandbox/produção) estão corretos.'}`
            : `Sincronização concluída: ${customerCount} clientes, ${subscriptionCount} assinaturas, ${paymentCount} cobranças, ${expenseCount} despesas${expenseSkipped ? ' (despesas ignoradas - sem permissão)' : ''}`,
        },
      });

      this.logger.log(`Sync completed for org ${organizationId}: ${customerCount}C ${subscriptionCount}S ${paymentCount}P ${expenseCount}E`);
      return { customers: customerCount, subscriptions: subscriptionCount, payments: paymentCount, expenses: expenseCount };
    } catch (error) {
      clearTimeout(syncTimeout);
      this.companyCache.clear();
      this.contractCache.clear();
      this.categoryCache.clear();
      this.asaasBankAccountId = undefined;
      this.cashBankAccountId = undefined;
      this.invoiceNumberCounter = 0;
      const isCancelled = error.message === 'Sincronização cancelada pelo usuário';
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: isCancelled ? 'cancelled' : 'error',
          syncError: isCancelled ? null : error.message,
          syncProgress: null,
          syncPhase: null,
          syncDetail: null,
          syncCancelled: false,
        },
      });
      if (!isCancelled) throw error;
      return { customers: 0, subscriptions: 0, payments: 0, expenses: 0 };
    }
  }

  private syncStartedAt: number = 0;

  private lastCancelCheck = 0;
  private static readonly CANCEL_CHECK_INTERVAL_MS = 5000; // Check DB at most every 5 seconds

  private async checkCancelled(integrationId: string): Promise<void> {
    const now = Date.now();
    if (now - this.lastCancelCheck < AsaasSyncService.CANCEL_CHECK_INTERVAL_MS) return;
    this.lastCancelCheck = now;

    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (integration?.syncCancelled) {
      throw new Error('Sincronização cancelada pelo usuário');
    }
  }

  private async updateProgress(integrationId: string, progress: number, phase: string, detail: string, eta?: string) {
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { syncProgress: progress, syncPhase: phase, syncDetail: eta ? `${detail} | ${eta}` : detail },
    });
  }

  private calcProgress(processed: number, grandTotal: number): number {
    if (grandTotal === 0) return 100;
    return Math.min(Math.round((processed / grandTotal) * 100), 99);
  }

  private calcEta(processed: number, grandTotal: number): string {
    if (processed <= 0 || grandTotal <= 0) return '';
    const elapsed = (Date.now() - this.syncStartedAt) / 1000;
    if (elapsed < 2) return ''; // Not enough data to estimate
    const rate = processed / elapsed;
    if (rate <= 0) return '';
    const remaining = grandTotal - processed;
    if (remaining <= 0) return '';
    const etaSeconds = Math.ceil(remaining / rate);
    if (etaSeconds < 60) return `~${etaSeconds}s restantes`;
    if (etaSeconds < 3600) return `~${Math.ceil(etaSeconds / 60)}min restantes`;
    return `~${Math.floor(etaSeconds / 3600)}h${Math.ceil((etaSeconds % 3600) / 60)}min restantes`;
  }

  private async syncCustomers(
    organizationId: string, apiKey: string, sandbox: boolean, dateFilter: string | undefined,
    grandTotal: number, processedBefore: number, integrationId: string, phaseTotal: number,
  ): Promise<number> {
    // Pré-carregar IDs já sincronizados para pular duplicados
    const existingIds = new Set(
      (await this.prisma.company.findMany({
        where: { organizationId, asaasCustomerId: { not: null } },
        select: { asaasCustomerId: true },
      })).map(c => c.asaasCustomerId),
    );

    let count = 0;
    let skipped = 0;
    let checked = 0;
    await this.updateProgress(integrationId, this.calcProgress(processedBefore, grandTotal), 'customers', `Verificando clientes (${existingIds.size} já sincronizados)...`);

    for await (const batch of this.asaasService.fetchAllCustomers(apiKey, sandbox, dateFilter)) {
      await this.checkCancelled(integrationId);
      for (const customer of batch) {
        checked++;
        if (existingIds.has(customer.id)) {
          skipped++;
        } else {
          await this.upsertCompany(organizationId, customer);
          count++;
        }
        if (checked % 50 === 0) {
          await this.checkCancelled(integrationId);
          const total = processedBefore + checked;
          await this.updateProgress(
            integrationId,
            this.calcProgress(total, grandTotal),
            'customers',
            count > 0
              ? `Sincronizando clientes (${count} novos, ${skipped} já existentes)...`
              : `Verificando clientes (${checked}/${phaseTotal}, ${skipped} já existentes)...`,
            this.calcEta(total, grandTotal),
          );
        }
      }
    }
    this.logger.log(`Customers: ${count} new, ${skipped} skipped for org ${organizationId}`);
    return checked; // retorna total verificado para progresso correto
  }

  private async upsertCompany(organizationId: string, customer: AsaasCustomer) {
    await this.prisma.executeWithRetry(async () => {
      const existing = await this.prisma.company.findFirst({
        where: { organizationId, asaasCustomerId: customer.id },
      });

      const data = {
        name: customer.personType === 'JURIDICA' && customer.company
          ? customer.company
          : customer.name,
        cnpj: customer.cpfCnpj || undefined,
        phone: customer.mobilePhone || customer.phone || undefined,
        address: [customer.address, customer.addressNumber].filter(Boolean).join(', ') || undefined,
        city: customer.cityName || undefined,
        state: customer.state || undefined,
        asaasCustomerId: customer.id,
        isCustomer: true,
      };

      if (existing) {
        await this.prisma.company.update({
          where: { id: existing.id },
          data,
        });
      } else {
        const byDoc = customer.cpfCnpj
          ? await this.prisma.company.findFirst({
              where: { organizationId, cnpj: customer.cpfCnpj },
            })
          : null;

        if (byDoc) {
          await this.prisma.company.update({
            where: { id: byDoc.id },
            data,
          });
        } else {
          await this.prisma.company.create({
            data: { ...data, organizationId },
          });
        }
      }
    });
  }

  private async syncSubscriptions(
    organizationId: string, apiKey: string, sandbox: boolean, dateFilter: string | undefined,
    grandTotal: number, processedBefore: number, integrationId: string, phaseTotal: number,
  ): Promise<number> {
    // Pré-carregar IDs já sincronizados
    const existingIds = new Set(
      (await this.prisma.contract.findMany({
        where: { organizationId, asaasSubscriptionId: { not: null } },
        select: { asaasSubscriptionId: true },
      })).map(c => c.asaasSubscriptionId),
    );

    let count = 0;
    let skipped = 0;
    let checked = 0;
    await this.updateProgress(integrationId, this.calcProgress(processedBefore, grandTotal), 'subscriptions', `Verificando assinaturas (${existingIds.size} já sincronizadas)...`);

    for await (const batch of this.asaasService.fetchAllSubscriptions(apiKey, sandbox, dateFilter)) {
      await this.checkCancelled(integrationId);
      for (const sub of batch) {
        checked++;
        if (existingIds.has(sub.id)) {
          skipped++;
        } else {
          await this.upsertContract(organizationId, sub);
          count++;
        }
        if (checked % 50 === 0) {
          await this.checkCancelled(integrationId);
          const total = processedBefore + checked;
          await this.updateProgress(
            integrationId,
            this.calcProgress(total, grandTotal),
            'subscriptions',
            count > 0
              ? `Sincronizando assinaturas (${count} novas, ${skipped} já existentes)...`
              : `Verificando assinaturas (${checked}/${phaseTotal}, ${skipped} já existentes)...`,
            this.calcEta(total, grandTotal),
          );
        }
      }
    }
    this.logger.log(`Subscriptions: ${count} new, ${skipped} skipped for org ${organizationId}`);
    return checked;
  }

  private async upsertContract(organizationId: string, sub: AsaasSubscription) {
    await this.prisma.executeWithRetry(async () => {
      const company = await this.prisma.company.findFirst({
        where: { organizationId, asaasCustomerId: sub.customer },
      });

      const existing = await this.prisma.contract.findFirst({
        where: { organizationId, asaasSubscriptionId: sub.id },
      });

      const data = {
        title: sub.description || `Assinatura Asaas #${sub.id}`,
        value: sub.value,
        status: mapSubscriptionStatus(sub.status),
        billingCycle: mapCycle(sub.cycle),
        nextBillingDate: sub.nextDueDate ? new Date(sub.nextDueDate) : undefined,
        startDate: new Date(sub.dateCreated),
        endDate: sub.endDate ? new Date(sub.endDate) : undefined,
        asaasCustomerId: sub.customer,
        asaasSubscriptionId: sub.id,
        companyId: company?.id || undefined,
      };

      if (existing) {
        await this.prisma.contract.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prisma.contract.create({
          data: { ...data, organizationId, startDate: data.startDate },
        });
      }
    });
  }

  private async syncPayments(
    organizationId: string, apiKey: string, sandbox: boolean, dateFilter: string | undefined,
    grandTotal: number, processedBefore: number, integrationId: string, phaseTotal: number,
  ): Promise<number> {
    // Auto-numbering: get the highest existing invoice number
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { organizationId, number: { not: null } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    this.invoiceNumberCounter = lastInvoice?.number ? parseInt(lastInvoice.number) || 0 : 0;

    // Pré-carregar IDs e status já sincronizados
    const existingPayments = new Map(
      (await this.prisma.invoice.findMany({
        where: { organizationId, asaasPaymentId: { not: null } },
        select: { asaasPaymentId: true, status: true },
      })).map(p => [p.asaasPaymentId, p.status] as const),
    );
    // Status finais que não precisam de atualização
    const finalStatuses = new Set(['PAID', 'CANCELLED', 'REFUNDED']);

    let newCount = 0;
    let updatedCount = 0;
    let skipped = 0;
    let checked = 0;
    await this.updateProgress(integrationId, this.calcProgress(processedBefore, grandTotal), 'payments', `Verificando cobranças (${existingPayments.size} já sincronizadas)...`);

    for await (const batch of this.asaasService.fetchAllPayments(apiKey, sandbox, dateFilter)) {
      await this.checkCancelled(integrationId);
      for (const payment of batch) {
        checked++;
        const existingStatus = existingPayments.get(payment.id);
        if (existingStatus) {
          if (finalStatuses.has(existingStatus)) {
            skipped++;
          } else {
            // Atualizar cobranças pendentes/vencidas (status pode ter mudado)
            await this.upsertInvoice(organizationId, payment);
            updatedCount++;
          }
        } else {
          await this.upsertInvoice(organizationId, payment);
          newCount++;
        }
        if (checked % 50 === 0) {
          await this.checkCancelled(integrationId);
          const total = processedBefore + checked;
          const parts = [];
          if (newCount > 0) parts.push(`${newCount} novas`);
          if (updatedCount > 0) parts.push(`${updatedCount} atualizadas`);
          if (skipped > 0) parts.push(`${skipped} já finalizadas`);
          await this.updateProgress(
            integrationId,
            this.calcProgress(total, grandTotal),
            'payments',
            `Cobranças (${checked}/${phaseTotal}): ${parts.join(', ') || 'verificando...'}`,
            this.calcEta(total, grandTotal),
          );
        }
      }
    }
    this.logger.log(`Payments: ${newCount} new, ${updatedCount} updated, ${skipped} skipped for org ${organizationId}`);
    return checked;
  }

  // ─── Fallback: Sync Payments via Subscriptions & Customers ────────────

  private async syncPaymentsFallback(
    organizationId: string, apiKey: string, sandbox: boolean, integrationId: string,
  ): Promise<number> {
    // Pre-load existing invoices to avoid duplicates
    const existingPaymentIds = new Set(
      (await this.prisma.invoice.findMany({
        where: { organizationId, asaasPaymentId: { not: null } },
        select: { asaasPaymentId: true },
      })).map(p => p.asaasPaymentId),
    );

    let totalFound = 0;
    let totalCreated = 0;
    const seenPaymentIds = new Set<string>();

    // Strategy 1: Fetch payments per subscription
    const contracts = await this.prisma.contract.findMany({
      where: { organizationId, asaasSubscriptionId: { not: null } },
      select: { asaasSubscriptionId: true },
    });

    if (contracts.length > 0) {
      await this.updateProgress(integrationId, 50, 'payments', `Buscando cobranças via ${contracts.length} assinaturas...`);
      this.logger.log(`Fallback: fetching payments for ${contracts.length} subscriptions`);

      for (const contract of contracts) {
        await this.checkCancelled(integrationId);
        try {
          for await (const batch of this.asaasService.fetchPaymentsBySubscription(
            contract.asaasSubscriptionId!, apiKey, sandbox,
          )) {
            for (const payment of batch) {
              if (seenPaymentIds.has(payment.id)) continue;
              seenPaymentIds.add(payment.id);
              totalFound++;
              if (!existingPaymentIds.has(payment.id)) {
                await this.upsertInvoice(organizationId, payment);
                totalCreated++;
              }
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch payments for subscription ${contract.asaasSubscriptionId}: ${err.message}`);
        }

        if (totalFound > 0 && totalFound % 20 === 0) {
          await this.updateProgress(integrationId, 60, 'payments', `Cobranças via assinaturas: ${totalCreated} novas, ${totalFound} verificadas`);
        }
      }
    }

    // Strategy 2: Fetch payments per customer (catches standalone charges not linked to subscriptions)
    const companies = await this.prisma.company.findMany({
      where: { organizationId, asaasCustomerId: { not: null } },
      select: { asaasCustomerId: true },
    });

    if (companies.length > 0) {
      await this.updateProgress(integrationId, 70, 'payments', `Buscando cobranças avulsas via ${companies.length} clientes...`);
      this.logger.log(`Fallback: fetching payments for ${companies.length} customers`);

      for (const company of companies) {
        await this.checkCancelled(integrationId);
        try {
          for await (const batch of this.asaasService.fetchPaymentsByCustomer(
            company.asaasCustomerId!, apiKey, sandbox,
          )) {
            for (const payment of batch) {
              if (seenPaymentIds.has(payment.id)) continue;
              seenPaymentIds.add(payment.id);
              totalFound++;
              if (!existingPaymentIds.has(payment.id)) {
                await this.upsertInvoice(organizationId, payment);
                totalCreated++;
              }
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch payments for customer ${company.asaasCustomerId}: ${err.message}`);
        }

        if (totalFound > 0 && totalFound % 20 === 0) {
          await this.updateProgress(integrationId, 80, 'payments', `Cobranças: ${totalCreated} novas, ${totalFound} verificadas`);
        }
      }
    }

    this.logger.log(`Fallback payments: ${totalCreated} new, ${totalFound} total found for org ${organizationId}`);
    return totalFound;
  }

  // ─── Expense Sync (Asaas Financial Transactions) ─────────────────────

  private readonly EXPENSE_CATEGORY_MAP: Record<string, string> = {
    PAYMENT_FEE: 'Taxa Boleto (Asaas)',
    PAYMENT_FEE_PIX: 'Taxa PIX (Asaas)',
    PAYMENT_FEE_CREDIT_CARD: 'Taxa Cartão (Asaas)',
    TRANSFER: 'Transferência Bancária (Asaas)',
    INTERNAL_TRANSFER_DEBIT: 'Transferência Bancária (Asaas)',
    REFUND: 'Estorno (Asaas)',
    PARTIAL_REFUND: 'Estorno (Asaas)',
    CHARGEBACK: 'Chargeback (Asaas)',
    CHARGEBACK_REVERSAL: 'Chargeback (Asaas)',
    OTHER: 'Outras Taxas (Asaas)',
  };

  private mapTransactionCategory(type: string, description?: string): string {
    if (type === 'PAYMENT_FEE' && description) {
      const lower = description.toLowerCase();
      if (lower.includes('pix')) return this.EXPENSE_CATEGORY_MAP.PAYMENT_FEE_PIX;
      if (lower.includes('cartão') || lower.includes('credit') || lower.includes('crédito'))
        return this.EXPENSE_CATEGORY_MAP.PAYMENT_FEE_CREDIT_CARD;
      return this.EXPENSE_CATEGORY_MAP.PAYMENT_FEE;
    }
    return this.EXPENSE_CATEGORY_MAP[type] || this.EXPENSE_CATEGORY_MAP.OTHER;
  }

  private categoryCache = new Map<string, string>();

  private async getOrCreateExpenseCategory(organizationId: string, name: string): Promise<string> {
    const cacheKey = `${organizationId}:${name}`;
    if (this.categoryCache.has(cacheKey)) return this.categoryCache.get(cacheKey)!;

    let category = await this.prisma.expenseCategory.findFirst({
      where: { organizationId, name },
    });
    if (!category) {
      category = await this.prisma.expenseCategory.create({
        data: { organizationId, name },
      });
    }
    this.categoryCache.set(cacheKey, category.id);
    return category.id;
  }

  private async getSystemUserId(organizationId: string): Promise<string> {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'OWNER' },
      select: { userId: true },
    });
    if (member) return member.userId;

    const anyMember = await this.prisma.organizationMember.findFirst({
      where: { organizationId },
      select: { userId: true },
    });
    if (!anyMember) throw new Error('Nenhum membro encontrado na organização para criar despesas');
    return anyMember.userId;
  }

  private isOutgoingTransaction(transaction: AsaasFinancialTransaction): boolean {
    return transaction.value < 0;
  }

  private async syncExpenses(
    organizationId: string, apiKey: string, sandbox: boolean, dateFilter: string | undefined,
    grandTotal: number, processedBefore: number, integrationId: string, phaseTotal: number,
  ): Promise<number> {
    // Pré-carregar IDs já sincronizados
    const existingIds = new Set(
      (await this.prisma.expense.findMany({
        where: { organizationId, asaasTransactionId: { not: null } },
        select: { asaasTransactionId: true },
      })).map(e => e.asaasTransactionId),
    );

    let count = 0;
    let skipped = 0;
    let checked = 0;
    const createdById = await this.getSystemUserId(organizationId);
    await this.updateProgress(integrationId, this.calcProgress(processedBefore, grandTotal), 'expenses', `Verificando despesas (${existingIds.size} já sincronizadas)...`);

    for await (const batch of this.asaasService.fetchAllFinancialTransactions(apiKey, sandbox, dateFilter)) {
      await this.checkCancelled(integrationId);
      for (const transaction of batch) {
        if (!this.isOutgoingTransaction(transaction)) continue;
        checked++;
        if (existingIds.has(transaction.id)) {
          skipped++;
        } else {
          await this.upsertExpense(organizationId, transaction, createdById);
          count++;
        }
        if (checked % 50 === 0) {
          await this.checkCancelled(integrationId);
          const total = processedBefore + checked;
          await this.updateProgress(
            integrationId,
            this.calcProgress(total, grandTotal),
            'expenses',
            count > 0
              ? `Sincronizando despesas (${count} novas, ${skipped} já existentes)...`
              : `Verificando despesas (${checked}/${phaseTotal}, ${skipped} já existentes)...`,
            this.calcEta(total, grandTotal),
          );
        }
      }
    }
    this.categoryCache.clear();
    this.logger.log(`Expenses: ${count} new, ${skipped} skipped for org ${organizationId}`);
    return checked;
  }

  private async upsertExpense(organizationId: string, transaction: AsaasFinancialTransaction, createdById: string) {
    await this.prisma.executeWithRetry(async () => {
      const existing = await this.prisma.expense.findUnique({
        where: { asaasTransactionId: transaction.id },
      });

      const categoryName = this.mapTransactionCategory(transaction.type, transaction.description);
      const categoryId = await this.getOrCreateExpenseCategory(organizationId, categoryName);
      const absValue = Math.abs(transaction.value);
      const transactionDate = new Date(transaction.date);
      const bankAccountId = await this.findOrCreateAsaasBankAccount(organizationId);

      const data = {
        title: transaction.description || `${categoryName} - ${transaction.id}`,
        value: absValue,
        status: 'PAID' as const,
        type: 'VARIABLE' as const,
        dueDate: transactionDate,
        paidAt: transactionDate,
        supplier: 'Asaas',
        categoryId,
        asaasTransactionId: transaction.id,
        bankAccountId,
        notes: transaction.paymentId ? `Ref. cobrança: ${transaction.paymentId}` : undefined,
      };

      if (existing) {
        await this.prisma.expense.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prisma.expense.create({
          data: { ...data, organizationId, createdById },
        });
      }
    });
  }

  // ─── Invoice Sync ───────────────────────────────────────────────────

  // Cache for company/contract/bankAccount lookups to avoid repeated DB queries
  private companyCache = new Map<string, string | null>();
  private contractCache = new Map<string, string | null>();
  private asaasBankAccountId: string | null | undefined = undefined;
  private cashBankAccountId: string | null | undefined = undefined;
  private invoiceNumberCounter = 0;

  private async findOrCreateAsaasBankAccount(organizationId: string): Promise<string> {
    if (this.asaasBankAccountId !== undefined && this.asaasBankAccountId) return this.asaasBankAccountId;
    let account = await this.prisma.bankAccount.findFirst({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { type: 'PAYMENT_GATEWAY' },
          { name: { contains: 'asaas', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (!account) {
      this.logger.log(`Auto-creating Asaas bank account for org ${organizationId}`);
      account = await this.prisma.bankAccount.create({
        data: {
          organizationId,
          name: 'Asaas',
          type: 'PAYMENT_GATEWAY',
          initialBalance: 0,
          color: '#6366f1',
        },
        select: { id: true },
      });
    }
    this.asaasBankAccountId = account.id;
    return account.id;
  }

  private async findOrCreateCashBankAccount(organizationId: string): Promise<string> {
    if (this.cashBankAccountId !== undefined && this.cashBankAccountId) return this.cashBankAccountId;
    let account = await this.prisma.bankAccount.findFirst({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { type: 'CASH' },
          { name: { contains: 'caixa', mode: 'insensitive' } },
          { name: { contains: 'dinheiro', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (!account) {
      this.logger.log(`Auto-creating Cash bank account for org ${organizationId}`);
      account = await this.prisma.bankAccount.create({
        data: {
          organizationId,
          name: 'Caixa Físico',
          type: 'CASH',
          initialBalance: 0,
          color: '#10b981',
        },
        select: { id: true },
      });
    }
    this.cashBankAccountId = account.id;
    return account.id;
  }

  private async findCompanyId(organizationId: string, asaasCustomerId: string): Promise<string | undefined> {
    const cacheKey = `${organizationId}:${asaasCustomerId}`;
    if (this.companyCache.has(cacheKey)) return this.companyCache.get(cacheKey) || undefined;
    const company = await this.prisma.company.findFirst({
      where: { organizationId, asaasCustomerId },
      select: { id: true },
    });
    this.companyCache.set(cacheKey, company?.id || null);
    return company?.id || undefined;
  }

  private async findContractId(organizationId: string, asaasSubscriptionId: string): Promise<string | undefined> {
    const cacheKey = `${organizationId}:${asaasSubscriptionId}`;
    if (this.contractCache.has(cacheKey)) return this.contractCache.get(cacheKey) || undefined;
    const contract = await this.prisma.contract.findFirst({
      where: { organizationId, asaasSubscriptionId },
      select: { id: true },
    });
    this.contractCache.set(cacheKey, contract?.id || null);
    return contract?.id || undefined;
  }

  private async upsertInvoice(organizationId: string, payment: AsaasPayment) {
    await this.prisma.executeWithRetry(async () => {
      const companyId = await this.findCompanyId(organizationId, payment.customer);
      const contractId = payment.subscription
        ? await this.findContractId(organizationId, payment.subscription)
        : undefined;

      const isCashPayment = payment.billingType === 'UNDEFINED' || payment.status === 'RECEIVED_IN_CASH';
      const bankAccountId = isCashPayment
        ? await this.findOrCreateCashBankAccount(organizationId)
        : await this.findOrCreateAsaasBankAccount(organizationId);

      const existing = await this.prisma.invoice.findFirst({
        where: { organizationId, asaasPaymentId: payment.id },
      });

      const status = mapPaymentStatus(payment.status);
      const isPaid = status === 'PAID';

      const paidValue = isPaid
        ? (payment.netValue != null ? payment.netValue : payment.value)
        : undefined;

      const data = {
        status,
        type: contractId ? ('RECURRING' as const) : ('ONE_TIME' as const),
        value: payment.value,
        totalValue: payment.value,
        dueDate: new Date(payment.dueDate),
        description: payment.description || undefined,
        paidAt: isPaid && payment.paymentDate ? new Date(payment.paymentDate) : (isPaid ? new Date(payment.dueDate) : undefined),
        paidValue,
        paymentMethod: payment.billingType || undefined,
        asaasPaymentId: payment.id,
        asaasBillingType: payment.billingType || undefined,
        asaasInvoiceUrl: payment.invoiceUrl || undefined,
        asaasBankSlipUrl: payment.bankSlipUrl || undefined,
        asaasPixCode: payment.pixTransaction?.qrCode || undefined,
        companyId,
        contractId,
        bankAccountId,
      };

      if (existing) {
        await this.prisma.invoice.update({
          where: { id: existing.id },
          data,
        });
      } else {
        this.invoiceNumberCounter++;
        const number = String(this.invoiceNumberCounter).padStart(6, '0');
        await this.prisma.invoice.create({
          data: { ...data, organizationId, number },
        });
      }
    });
  }
}
