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
    default:
      return 'CANCELLED';
  }
}

@Injectable()
export class AsaasSyncService {
  private readonly logger = new Logger(AsaasSyncService.name);

  constructor(
    private prisma: PrismaService,
    private asaasService: AsaasService,
  ) {}

  async syncAll(organizationId: string): Promise<{ customers: number; subscriptions: number; payments: number; expenses: number }> {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
    });

    if (!integration || !integration.isActive) {
      throw new Error('Integração Asaas não encontrada ou inativa');
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'syncing', syncError: null, syncCancelled: false, syncProgress: 0, syncPhase: null, syncDetail: 'Iniciando sincronização...' },
    });

    try {
      // Sync incremental: usa lastSyncAt para filtrar apenas dados novos/atualizados
      const dateFilter = integration.lastSyncAt
        ? integration.lastSyncAt.toISOString().split('T')[0]
        : undefined;

      // Obter contagens totais para calcular progresso
      await this.updateProgress(integration.id, 0, 'counting', 'Calculando total de registros...');

      const customerTotal = await this.asaasService.getCount('customers', integration.apiKey, integration.sandbox, dateFilter);
      const subscriptionTotal = await this.asaasService.getCount('subscriptions', integration.apiKey, integration.sandbox, dateFilter);
      const paymentTotal = await this.asaasService.getCount('payments', integration.apiKey, integration.sandbox, dateFilter);
      let expenseTotal = 0;
      try {
        expenseTotal = await this.asaasService.getCount('financialTransactions', integration.apiKey, integration.sandbox, dateFilter);
      } catch {
        this.logger.warn('Could not fetch financialTransactions count, skipping expense sync');
      }
      const grandTotal = customerTotal + subscriptionTotal + paymentTotal + expenseTotal;

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
      const paymentCount = await this.syncPayments(
        organizationId, integration.apiKey, integration.sandbox, dateFilter,
        grandTotal, processed, integration.id, paymentTotal,
      );
      processed += paymentCount;

      // Sync Expenses (financial transactions from Asaas)
      let expenseCount = 0;
      if (expenseTotal > 0) {
        expenseCount = await this.syncExpenses(
          organizationId, integration.apiKey, integration.sandbox, dateFilter,
          grandTotal, processed, integration.id, expenseTotal,
        );
      }

      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'success',
          lastSyncAt: new Date(),
          syncError: null,
          syncProgress: 100,
          syncPhase: 'done',
          syncDetail: `Sincronização concluída: ${customerCount} clientes, ${subscriptionCount} assinaturas, ${paymentCount} cobranças, ${expenseCount} despesas`,
        },
      });

      return { customers: customerCount, subscriptions: subscriptionCount, payments: paymentCount, expenses: expenseCount };
    } catch (error) {
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

  private async checkCancelled(integrationId: string): Promise<void> {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (integration?.syncCancelled) {
      throw new Error('Sincronização cancelada pelo usuário');
    }
  }

  private async updateProgress(integrationId: string, progress: number, phase: string, detail: string) {
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { syncProgress: progress, syncPhase: phase, syncDetail: detail },
    });
  }

  private calcProgress(processed: number, grandTotal: number): number {
    if (grandTotal === 0) return 100;
    return Math.min(Math.round((processed / grandTotal) * 100), 99);
  }

  private async syncCustomers(
    organizationId: string, apiKey: string, sandbox: boolean, dateFilter: string | undefined,
    grandTotal: number, processedBefore: number, integrationId: string, phaseTotal: number,
  ): Promise<number> {
    let count = 0;
    await this.updateProgress(integrationId, this.calcProgress(processedBefore, grandTotal), 'customers', `Sincronizando clientes (0/${phaseTotal})...`);

    for await (const batch of this.asaasService.fetchAllCustomers(apiKey, sandbox, dateFilter)) {
      await this.checkCancelled(integrationId);
      for (const customer of batch) {
        await this.upsertCompany(organizationId, customer);
        count++;
      }
      await this.updateProgress(
        integrationId,
        this.calcProgress(processedBefore + count, grandTotal),
        'customers',
        `Sincronizando clientes (${count}/${phaseTotal})...`,
      );
    }
    this.logger.log(`Synced ${count} customers for org ${organizationId}`);
    return count;
  }

  private async upsertCompany(organizationId: string, customer: AsaasCustomer) {
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
      // Try to match by CNPJ before creating
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
  }

  private async syncSubscriptions(
    organizationId: string, apiKey: string, sandbox: boolean, dateFilter: string | undefined,
    grandTotal: number, processedBefore: number, integrationId: string, phaseTotal: number,
  ): Promise<number> {
    let count = 0;
    await this.updateProgress(integrationId, this.calcProgress(processedBefore, grandTotal), 'subscriptions', `Sincronizando assinaturas (0/${phaseTotal})...`);

    for await (const batch of this.asaasService.fetchAllSubscriptions(apiKey, sandbox, dateFilter)) {
      await this.checkCancelled(integrationId);
      for (const sub of batch) {
        await this.upsertContract(organizationId, sub);
        count++;
      }
      await this.updateProgress(
        integrationId,
        this.calcProgress(processedBefore + count, grandTotal),
        'subscriptions',
        `Sincronizando assinaturas (${count}/${phaseTotal})...`,
      );
    }
    this.logger.log(`Synced ${count} subscriptions for org ${organizationId}`);
    return count;
  }

  private async upsertContract(organizationId: string, sub: AsaasSubscription) {
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
  }

  private async syncPayments(
    organizationId: string, apiKey: string, sandbox: boolean, dateFilter: string | undefined,
    grandTotal: number, processedBefore: number, integrationId: string, phaseTotal: number,
  ): Promise<number> {
    let count = 0;
    await this.updateProgress(integrationId, this.calcProgress(processedBefore, grandTotal), 'payments', `Sincronizando cobranças (0/${phaseTotal})...`);

    for await (const batch of this.asaasService.fetchAllPayments(apiKey, sandbox, dateFilter)) {
      await this.checkCancelled(integrationId);
      for (const payment of batch) {
        await this.upsertInvoice(organizationId, payment);
        count++;
      }
      await this.updateProgress(
        integrationId,
        this.calcProgress(processedBefore + count, grandTotal),
        'payments',
        `Sincronizando cobranças (${count}/${phaseTotal})...`,
      );
    }
    this.logger.log(`Synced ${count} payments for org ${organizationId}`);
    return count;
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
    let count = 0;
    const createdById = await this.getSystemUserId(organizationId);
    await this.updateProgress(integrationId, this.calcProgress(processedBefore, grandTotal), 'expenses', `Sincronizando despesas (0/${phaseTotal})...`);

    for await (const batch of this.asaasService.fetchAllFinancialTransactions(apiKey, sandbox, dateFilter)) {
      await this.checkCancelled(integrationId);
      for (const transaction of batch) {
        if (!this.isOutgoingTransaction(transaction)) continue;
        await this.upsertExpense(organizationId, transaction, createdById);
        count++;
      }
      await this.updateProgress(
        integrationId,
        this.calcProgress(processedBefore + count, grandTotal),
        'expenses',
        `Sincronizando despesas (${count}/${phaseTotal})...`,
      );
    }
    this.categoryCache.clear();
    this.logger.log(`Synced ${count} expenses for org ${organizationId}`);
    return count;
  }

  private async upsertExpense(organizationId: string, transaction: AsaasFinancialTransaction, createdById: string) {
    const existing = await this.prisma.expense.findUnique({
      where: { asaasTransactionId: transaction.id },
    });

    const categoryName = this.mapTransactionCategory(transaction.type, transaction.description);
    const categoryId = await this.getOrCreateExpenseCategory(organizationId, categoryName);
    const absValue = Math.abs(transaction.value);
    const transactionDate = new Date(transaction.date);

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
  }

  // ─── Invoice Sync ───────────────────────────────────────────────────

  private async upsertInvoice(organizationId: string, payment: AsaasPayment) {
    const company = await this.prisma.company.findFirst({
      where: { organizationId, asaasCustomerId: payment.customer },
    });

    const contract = payment.subscription
      ? await this.prisma.contract.findFirst({
          where: { organizationId, asaasSubscriptionId: payment.subscription },
        })
      : null;

    const existing = await this.prisma.invoice.findFirst({
      where: { organizationId, asaasPaymentId: payment.id },
    });

    const status = mapPaymentStatus(payment.status);
    const isPaid = status === 'PAID';

    const data = {
      status,
      type: contract ? ('RECURRING' as const) : ('ONE_TIME' as const),
      value: payment.value,
      totalValue: payment.value,
      dueDate: new Date(payment.dueDate),
      description: payment.description || undefined,
      paidAt: isPaid && payment.paymentDate ? new Date(payment.paymentDate) : undefined,
      paidValue: isPaid && payment.netValue != null ? payment.netValue : undefined,
      paymentMethod: payment.billingType || undefined,
      asaasPaymentId: payment.id,
      asaasBillingType: payment.billingType || undefined,
      asaasInvoiceUrl: payment.invoiceUrl || undefined,
      asaasBankSlipUrl: payment.bankSlipUrl || undefined,
      asaasPixCode: payment.pixTransaction?.qrCode || undefined,
      companyId: company?.id || undefined,
      contractId: contract?.id || undefined,
    };

    if (existing) {
      await this.prisma.invoice.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.invoice.create({
        data: { ...data, organizationId },
      });
    }
  }
}
