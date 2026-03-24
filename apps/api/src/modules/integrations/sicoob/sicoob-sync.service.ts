import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SicoobService, SicoobConfig } from './sicoob.service';
import { SicoobReconciliationService } from './sicoob-reconciliation.service';
import { loadPfxCertificate, translateConnectionError } from './certificate-validator';

@Injectable()
export class SicoobSyncService {
  private readonly logger = new Logger(SicoobSyncService.name);

  constructor(
    private prisma: PrismaService,
    private sicoobService: SicoobService,
    private reconciliationService: SicoobReconciliationService,
  ) {}

  async syncAll(organizationId: string): Promise<{
    statements: number;
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
      const config = this.buildConfig(integration);
      const sandbox = integration.sandbox;

      // Date range: last sync or 90 days back
      const endDate = new Date();
      const startDate = integration.lastSyncAt
        ? new Date(integration.lastSyncAt)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Find or auto-create Sicoob bank account
      const bankAccount = await this.findOrCreateSicoobBankAccount(organizationId);

      // ── PHASE 1: Bank Statement (0-80%) ────────────────
      await this.checkCancelled(integration.id);
      await this.updateProgress(integration.id, 5, 'statements', 'Buscando extrato bancário...');

      const transactions = await this.sicoobService.getStatement(config, startStr, endStr, sandbox);
      const statementCount = await this.syncStatements(
        organizationId, bankAccount.id, transactions, integration.id,
      );

      // ── PHASE 2: Reconciliation (80-100%) ──────────────
      await this.checkCancelled(integration.id);
      await this.updateProgress(integration.id, 80, 'reconciliation', 'Executando conciliação automática...');

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
          syncDetail: `Sincronização concluída: ${statementCount} transações, ${reconciledCount} conciliados`,
        },
      });

      return { statements: statementCount, reconciled: reconciledCount };
    } catch (error) {
      const isCancelled = error.message === 'Sincronização cancelada pelo usuário';
      const translatedError = isCancelled ? null : translateConnectionError(error.message);
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: isCancelled ? 'cancelled' : 'error',
          syncError: translatedError,
          syncProgress: null,
          syncPhase: null,
          syncDetail: null,
          syncCancelled: false,
        },
      });
      if (!isCancelled) throw new Error(translatedError || error.message);
      return { statements: 0, reconciled: 0 };
    }
  }

  // ── Helpers ─────────────────────────────────────────────

  private buildConfig(integration: any): SicoobConfig {
    const config: SicoobConfig = {
      clientId: integration.clientId?.trim(),
      accountNumber: (integration.accountNumber || '').trim(),
    };
    if (integration.certificateData) {
      config.certificatePfx = Buffer.from(integration.certificateData, 'base64');
      config.certificatePass = integration.certificatePass?.trim() || undefined;
    } else if (integration.certificatePath) {
      config.certificatePfx = SicoobService.loadCertificate(integration.certificatePath);
      config.certificatePass = integration.certificatePass?.trim() || undefined;
    }

    // Load and validate certificate (auto-converts legacy format)
    if (config.certificatePfx) {
      const loaded = loadPfxCertificate(config.certificatePfx, config.certificatePass);
      if (!loaded.valid) {
        throw new Error(loaded.error);
      }
      config.tlsOptions = loaded.tlsOptions;
    } else {
      throw new Error('Nenhum certificado digital configurado. Faça upload do certificado PFX antes de sincronizar.');
    }

    return config;
  }

  private async findOrCreateSicoobBankAccount(organizationId: string) {
    let account = await this.prisma.bankAccount.findFirst({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { type: 'CHECKING', name: { contains: 'sicoob', mode: 'insensitive' } },
          { bank: { contains: 'sicoob', mode: 'insensitive' } },
          { bank: '756' },
        ],
      },
      select: { id: true },
    });
    if (!account) {
      this.logger.log(`Auto-creating Sicoob bank account for org ${organizationId}`);
      account = await this.prisma.bankAccount.create({
        data: {
          organizationId,
          name: 'Sicoob',
          type: 'CHECKING',
          bank: '756',
          initialBalance: 0,
          color: '#003641',
        },
        select: { id: true },
      });
    }
    return account;
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
        const progress = 5 + Math.round((i / transactions.length) * 75);
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
}
