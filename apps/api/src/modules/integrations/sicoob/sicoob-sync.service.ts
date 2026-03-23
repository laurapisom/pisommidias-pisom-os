import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SicoobService, SicoobConfig } from './sicoob.service';
import { SicoobReconciliationService } from './sicoob-reconciliation.service';

@Injectable()
export class SicoobSyncService {
  private readonly logger = new Logger(SicoobSyncService.name);
  private syncStartedAt = 0;

  constructor(
    private prisma: PrismaService,
    private sicoobService: SicoobService,
    private reconciliationService: SicoobReconciliationService,
  ) {}

  async syncAll(organizationId: string): Promise<{
    statements: number;
    ddaBills: number;
    scheduledPayments: number;
    reconciled: number;
  }> {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'sicoob' } },
    });

    if (!integration || !integration.isActive) {
      throw new Error('Integração Sicoob não encontrada ou inativa');
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        syncStatus: 'syncing',
        syncError: null,
        syncCancelled: false,
        syncProgress: 0,
        syncPhase: null,
        syncDetail: 'Iniciando sincronização Sicoob...',
      },
    });

    try {
      this.syncStartedAt = Date.now();
      const config = this.buildConfig(integration);
      const sandbox = integration.sandbox;

      // Determine date range
      const endDate = new Date();
      const startDate = integration.lastSyncAt
        ? new Date(integration.lastSyncAt)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days back

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Find Sicoob bank account
      const bankAccount = await this.findSicoobBankAccount(organizationId);
      if (!bankAccount) {
        throw new Error('Conta bancária Sicoob não encontrada. Crie uma conta do tipo "Conta Corrente" com o nome "Sicoob" antes de sincronizar.');
      }

      // ── PHASE 1: Balance (5%) ──────────────────────────
      await this.checkCancelled(integration.id);
      await this.updateProgress(integration.id, 2, 'balance', 'Consultando saldo...');

      try {
        const balance = await this.sicoobService.getBalance(config, sandbox);
        this.logger.log(`Sicoob balance: available=${balance.available}, total=${balance.total}`);
      } catch (err) {
        this.logger.warn(`Balance fetch failed (non-critical): ${err.message}`);
      }

      // ── PHASE 2: Bank Statement (5-60%) ────────────────
      await this.checkCancelled(integration.id);
      await this.updateProgress(integration.id, 5, 'statements', 'Buscando extrato bancário...');

      const transactions = await this.sicoobService.getStatement(config, startStr, endStr, sandbox);
      const statementCount = await this.syncStatements(
        organizationId, bankAccount.id, transactions, integration.id,
      );

      // ── PHASE 3: DDA Bills (60-80%) ────────────────────
      await this.checkCancelled(integration.id);
      await this.updateProgress(integration.id, 60, 'dda', 'Buscando boletos DDA...');

      // DDA: look 60 days ahead for future bills
      const ddaEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const ddaEndStr = ddaEndDate.toISOString().split('T')[0];

      let ddaCount = 0;
      try {
        const ddaBills = await this.sicoobService.getDdaBills(config, startStr, ddaEndStr, sandbox);
        ddaCount = await this.syncDdaBills(organizationId, ddaBills, integration.id);
      } catch (err) {
        this.logger.warn(`DDA sync failed (non-critical): ${err.message}`);
      }

      // ── PHASE 4: Scheduled Payments (80-90%) ───────────
      await this.checkCancelled(integration.id);
      await this.updateProgress(integration.id, 80, 'scheduled', 'Buscando pagamentos agendados...');

      let scheduledCount = 0;
      try {
        const scheduled = await this.sicoobService.getScheduledPayments(
          config, startStr, ddaEndStr, sandbox,
        );
        scheduledCount = await this.syncScheduledPayments(
          organizationId, bankAccount.id, scheduled, integration.id,
        );
      } catch (err) {
        this.logger.warn(`Scheduled payments sync failed (non-critical): ${err.message}`);
      }

      // ── PHASE 5: Reconciliation (90-100%) ──────────────
      await this.checkCancelled(integration.id);
      await this.updateProgress(integration.id, 90, 'reconciliation', 'Executando conciliação automática...');

      const reconciledCount = await this.reconciliationService.reconcile(organizationId, bankAccount.id);

      // ── Done ───────────────────────────────────────────
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'success',
          lastSyncAt: new Date(),
          syncError: null,
          syncProgress: 100,
          syncPhase: 'done',
          syncDetail: `Sincronização concluída: ${statementCount} transações, ${ddaCount} boletos DDA, ${scheduledCount} agendamentos, ${reconciledCount} conciliados`,
        },
      });

      return {
        statements: statementCount,
        ddaBills: ddaCount,
        scheduledPayments: scheduledCount,
        reconciled: reconciledCount,
      };
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
      return { statements: 0, ddaBills: 0, scheduledPayments: 0, reconciled: 0 };
    }
  }

  // ── Helpers ─────────────────────────────────────────────

  private buildConfig(integration: any): SicoobConfig {
    const config: SicoobConfig = {
      clientId: integration.clientId,
      accountNumber: integration.accountNumber || '',
    };
    if (integration.certificateData) {
      config.certificatePfx = Buffer.from(integration.certificateData, 'base64');
      config.certificatePass = integration.certificatePass || undefined;
    } else if (integration.certificatePath) {
      config.certificatePfx = SicoobService.loadCertificate(integration.certificatePath);
      config.certificatePass = integration.certificatePass || undefined;
    }
    return config;
  }

  private async findSicoobBankAccount(organizationId: string) {
    return this.prisma.bankAccount.findFirst({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { type: 'CHECKING', name: { contains: 'sicoob', mode: 'insensitive' } },
          { bank: { contains: 'sicoob', mode: 'insensitive' } },
          { bank: '756' }, // Sicoob bank code
        ],
      },
      select: { id: true },
    });
  }

  private async checkCancelled(integrationId: string): Promise<void> {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });
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

  // ── Statement Sync ──────────────────────────────────────

  private async syncStatements(
    organizationId: string,
    bankAccountId: string,
    transactions: any[],
    integrationId: string,
  ): Promise<number> {
    let count = 0;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (i % 50 === 0) {
        await this.checkCancelled(integrationId);
        const progress = 5 + Math.round((i / transactions.length) * 55);
        await this.updateProgress(
          integrationId, progress, 'statements',
          `Importando extrato (${i}/${transactions.length})...`,
        );
      }

      const externalId = tx.id || `${tx.date}-${tx.amount}-${i}`;

      await this.prisma.bankStatement.upsert({
        where: {
          organizationId_bankAccountId_externalId: {
            organizationId,
            bankAccountId,
            externalId,
          },
        },
        create: {
          organizationId,
          bankAccountId,
          externalId,
          date: new Date(tx.date),
          description: tx.description,
          amount: tx.amount,
          balance: tx.balance || undefined,
          type: tx.type,
          category: tx.category || undefined,
          counterpart: tx.counterpart || undefined,
          documentNumber: tx.documentNumber || undefined,
        },
        update: {
          description: tx.description,
          amount: tx.amount,
          balance: tx.balance || undefined,
          type: tx.type,
          category: tx.category || undefined,
          counterpart: tx.counterpart || undefined,
        },
      });
      count++;
    }

    this.logger.log(`Statements: ${count} synced for org ${organizationId}`);
    return count;
  }

  // ── DDA Sync ────────────────────────────────────────────

  private async syncDdaBills(
    organizationId: string,
    bills: any[],
    integrationId: string,
  ): Promise<number> {
    let count = 0;

    for (const bill of bills) {
      await this.prisma.ddaBill.upsert({
        where: {
          organizationId_externalId: {
            organizationId,
            externalId: bill.id,
          },
        },
        create: {
          organizationId,
          externalId: bill.id,
          barcode: bill.barcode || undefined,
          issuerName: bill.issuerName,
          issuerDocument: bill.issuerDocument || undefined,
          amount: bill.amount,
          dueDate: new Date(bill.dueDate),
          status: bill.status === 'PENDING' ? 'PENDING' : bill.status,
        },
        update: {
          amount: bill.amount,
          dueDate: new Date(bill.dueDate),
          issuerName: bill.issuerName,
          status: bill.status === 'PENDING' ? 'PENDING' : bill.status,
        },
      });
      count++;
    }

    this.logger.log(`DDA bills: ${count} synced for org ${organizationId}`);
    return count;
  }

  // ── Scheduled Payments Sync ─────────────────────────────

  private async syncScheduledPayments(
    organizationId: string,
    bankAccountId: string,
    payments: any[],
    integrationId: string,
  ): Promise<number> {
    let count = 0;

    for (const p of payments) {
      if (!p.id) continue;

      await this.prisma.scheduledPayment.upsert({
        where: {
          organizationId_externalId: {
            organizationId,
            externalId: p.id,
          },
        },
        create: {
          organizationId,
          bankAccountId,
          externalId: p.id,
          type: p.type,
          recipient: p.recipient,
          recipientDoc: p.recipientDoc || undefined,
          amount: p.amount,
          scheduledDate: new Date(p.scheduledDate),
          status: p.status,
        },
        update: {
          amount: p.amount,
          scheduledDate: new Date(p.scheduledDate),
          status: p.status,
          recipient: p.recipient,
        },
      });
      count++;
    }

    this.logger.log(`Scheduled payments: ${count} synced for org ${organizationId}`);
    return count;
  }
}
