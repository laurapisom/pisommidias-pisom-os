import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AsaasService, AsaasCustomer, AsaasSubscription, AsaasPayment } from './asaas.service';
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

  async syncAll(organizationId: string): Promise<{ customers: number; subscriptions: number; payments: number }> {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
    });

    if (!integration || !integration.isActive) {
      throw new Error('Integração Asaas não encontrada ou inativa');
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'syncing', syncError: null },
    });

    try {
      const customerCount = await this.syncCustomers(organizationId, integration.apiKey, integration.sandbox);
      const subscriptionCount = await this.syncSubscriptions(organizationId, integration.apiKey, integration.sandbox);
      const paymentCount = await this.syncPayments(organizationId, integration.apiKey, integration.sandbox);

      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { syncStatus: 'success', lastSyncAt: new Date(), syncError: null },
      });

      return { customers: customerCount, subscriptions: subscriptionCount, payments: paymentCount };
    } catch (error) {
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { syncStatus: 'error', syncError: error.message },
      });
      throw error;
    }
  }

  private async syncCustomers(organizationId: string, apiKey: string, sandbox: boolean): Promise<number> {
    let count = 0;
    for await (const batch of this.asaasService.fetchAllCustomers(apiKey, sandbox)) {
      for (const customer of batch) {
        await this.upsertCompany(organizationId, customer);
        count++;
      }
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

  private async syncSubscriptions(organizationId: string, apiKey: string, sandbox: boolean): Promise<number> {
    let count = 0;
    for await (const batch of this.asaasService.fetchAllSubscriptions(apiKey, sandbox)) {
      for (const sub of batch) {
        await this.upsertContract(organizationId, sub);
        count++;
      }
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

  private async syncPayments(organizationId: string, apiKey: string, sandbox: boolean): Promise<number> {
    let count = 0;
    for await (const batch of this.asaasService.fetchAllPayments(apiKey, sandbox)) {
      for (const payment of batch) {
        await this.upsertInvoice(organizationId, payment);
        count++;
      }
    }
    this.logger.log(`Synced ${count} payments for org ${organizationId}`);
    return count;
  }

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
