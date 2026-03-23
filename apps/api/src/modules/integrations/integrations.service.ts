import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AsaasService } from './asaas/asaas.service';
import { AsaasSyncService } from './asaas/asaas-sync.service';
import { SicoobService } from './sicoob/sicoob.service';
import { SicoobSyncService } from './sicoob/sicoob-sync.service';
import { SicoobReconciliationService } from './sicoob/sicoob-reconciliation.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private asaasService: AsaasService,
    private asaasSyncService: AsaasSyncService,
    private sicoobService: SicoobService,
    private sicoobSyncService: SicoobSyncService,
    private sicoobReconciliationService: SicoobReconciliationService,
  ) {}

  async getAsaasIntegration(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
    });

    if (!integration) return null;

    return integration;
  }

  async saveAsaasIntegration(
    organizationId: string,
    data: { apiKey: string; sandbox: boolean },
  ) {
    return this.prisma.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
      create: {
        organizationId,
        provider: 'asaas',
        apiKey: data.apiKey,
        sandbox: data.sandbox,
        isActive: true,
        syncStatus: 'idle',
      },
      update: {
        apiKey: data.apiKey,
        sandbox: data.sandbox,
      },
    });
  }

  async testAsaasConnection(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
    });

    if (!integration) {
      throw new NotFoundException('Integração Asaas não configurada');
    }

    const success = await this.asaasService.testConnection(
      integration.apiKey,
      integration.sandbox,
    );

    return {
      success,
      message: success ? 'Conexão estabelecida com sucesso' : 'Falha ao conectar com a API do Asaas. Verifique sua API Key.',
    };
  }

  async triggerSync(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
    });

    if (!integration) {
      throw new NotFoundException('Integração Asaas não configurada');
    }

    if (integration.syncStatus === 'syncing') {
      throw new BadRequestException('Sincronização já em andamento');
    }

    // Fire and forget - sync runs in background
    this.asaasSyncService.syncAll(organizationId).catch((err) => {
      // Error is already persisted to DB by syncAll
    });

    return { message: 'Sincronização iniciada' };
  }

  async cancelSync(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
    });

    if (!integration) {
      throw new NotFoundException('Integração Asaas não configurada');
    }

    if (integration.syncStatus !== 'syncing') {
      throw new BadRequestException('Nenhuma sincronização em andamento');
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { syncCancelled: true },
    });

    return { message: 'Cancelamento solicitado' };
  }

  async getSyncStatus(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'asaas' } },
    });

    if (!integration) {
      return { syncStatus: null, lastSyncAt: null, syncError: null };
    }

    return {
      syncStatus: integration.syncStatus,
      lastSyncAt: integration.lastSyncAt,
      syncError: integration.syncError,
      syncProgress: integration.syncProgress,
      syncPhase: integration.syncPhase,
      syncDetail: integration.syncDetail,
    };
  }

  async deleteAsaasIntegration(organizationId: string) {
    await this.prisma.integration.deleteMany({
      where: { organizationId, provider: 'asaas' },
    });
    return { message: 'Integração removida' };
  }

  // ═══════════════════════════════════════════════════════════
  // SICOOB INTEGRATION
  // ═══════════════════════════════════════════════════════════

  async getSicoobIntegration(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'sicoob' } },
    });
    if (!integration) return null;
    return {
      ...integration,
      certificatePass: integration.certificatePass ? '••••••••' : null,
    };
  }

  async saveSicoobIntegration(
    organizationId: string,
    data: {
      clientId: string;
      accountNumber: string;
      certificatePath?: string;
      certificatePass?: string;
      sandbox?: boolean;
    },
  ) {
    const updateData: any = {
      clientId: data.clientId,
      accountNumber: data.accountNumber,
      sandbox: data.sandbox ?? false,
    };
    if (data.certificatePath !== undefined) updateData.certificatePath = data.certificatePath;
    if (data.certificatePass !== undefined) updateData.certificatePass = data.certificatePass;

    return this.prisma.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: 'sicoob' } },
      create: {
        organizationId,
        provider: 'sicoob',
        apiKey: '',
        clientId: data.clientId,
        accountNumber: data.accountNumber,
        certificatePath: data.certificatePath,
        certificatePass: data.certificatePass,
        sandbox: data.sandbox ?? false,
        isActive: true,
        syncStatus: 'idle',
      },
      update: updateData,
    });
  }

  async updateSicoobCertificateData(organizationId: string, certificateData: string, filename: string) {
    return this.prisma.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: 'sicoob' } },
      create: {
        organizationId,
        provider: 'sicoob',
        apiKey: '',
        certificateData,
        certificatePath: filename,
        isActive: true,
        syncStatus: 'idle',
      },
      update: { certificateData, certificatePath: filename },
    });
  }

  async testSicoobConnection(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'sicoob' } },
    });

    if (!integration) {
      throw new NotFoundException('Integração Sicoob não configurada');
    }

    const config: any = {
      clientId: integration.clientId!,
      accountNumber: integration.accountNumber || '',
    };
    if (integration.certificateData) {
      config.certificatePfx = Buffer.from(integration.certificateData, 'base64');
      config.certificatePass = integration.certificatePass || undefined;
    } else if (integration.certificatePath) {
      config.certificatePfx = SicoobService.loadCertificate(integration.certificatePath);
      config.certificatePass = integration.certificatePass || undefined;
    }

    const success = await this.sicoobService.testConnection(config, integration.sandbox);

    return {
      success,
      message: success
        ? 'Conexão estabelecida com sucesso'
        : 'Falha ao conectar com a API do Sicoob. Verifique o Client ID, certificado e conta corrente.',
    };
  }

  async triggerSicoobSync(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'sicoob' } },
    });

    if (!integration) {
      throw new NotFoundException('Integração Sicoob não configurada');
    }

    if (integration.syncStatus === 'syncing') {
      throw new BadRequestException('Sincronização já em andamento');
    }

    // Fire and forget
    this.sicoobSyncService.syncAll(organizationId).catch(() => {});

    return { message: 'Sincronização Sicoob iniciada' };
  }

  async cancelSicoobSync(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'sicoob' } },
    });

    if (!integration) {
      throw new NotFoundException('Integração Sicoob não configurada');
    }

    if (integration.syncStatus !== 'syncing') {
      throw new BadRequestException('Nenhuma sincronização em andamento');
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { syncCancelled: true },
    });

    return { message: 'Cancelamento solicitado' };
  }

  async getSicoobSyncStatus(organizationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'sicoob' } },
    });

    if (!integration) {
      return { syncStatus: null, lastSyncAt: null, syncError: null };
    }

    return {
      syncStatus: integration.syncStatus,
      lastSyncAt: integration.lastSyncAt,
      syncError: integration.syncError,
      syncProgress: integration.syncProgress,
      syncPhase: integration.syncPhase,
      syncDetail: integration.syncDetail,
    };
  }

  async deleteSicoobIntegration(organizationId: string) {
    await this.prisma.integration.deleteMany({
      where: { organizationId, provider: 'sicoob' },
    });
    return { message: 'Integração Sicoob removida' };
  }

  // ── Sicoob: Bank Statements ─────────────────────────────

  async getSicoobStatements(organizationId: string, filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    reconciled?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: any = { organizationId };

    if (filters?.type) where.type = filters.type;
    if (filters?.reconciled === 'true') where.reconciled = true;
    if (filters?.reconciled === 'false') where.reconciled = false;
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters?.startDate) where.date.gte = new Date(filters.startDate);
      if (filters?.endDate) where.date.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.bankStatement.findMany({
        where,
        include: {
          bankAccount: { select: { id: true, name: true, color: true } },
          expense: { select: { id: true, title: true, value: true } },
          invoice: { select: { id: true, number: true, totalValue: true } },
          transfer: { select: { id: true, amount: true, description: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bankStatement.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Sicoob: DDA Bills ───────────────────────────────────

  async getDdaBills(organizationId: string, filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.ddaBill.findMany({
        where,
        include: {
          expense: { select: { id: true, title: true, value: true, status: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ddaBill.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Sicoob: Reconciliation ──────────────────────────────

  async triggerReconciliation(organizationId: string) {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { type: 'CHECKING', name: { contains: 'sicoob', mode: 'insensitive' } },
          { bank: { contains: 'sicoob', mode: 'insensitive' } },
          { bank: '756' },
        ],
      },
    });

    if (!bankAccount) {
      throw new NotFoundException('Conta Sicoob não encontrada');
    }

    const count = await this.sicoobReconciliationService.reconcile(organizationId, bankAccount.id);
    return { reconciled: count, message: `${count} transações conciliadas` };
  }

  async matchStatement(statementId: string, body: { expenseId?: string; invoiceId?: string }) {
    if (body.expenseId) {
      await this.sicoobReconciliationService.matchStatementToExpense(statementId, body.expenseId);
    } else if (body.invoiceId) {
      await this.sicoobReconciliationService.matchStatementToInvoice(statementId, body.invoiceId);
    }
    return { message: 'Vinculação realizada' };
  }

  async unmatchStatement(statementId: string) {
    await this.sicoobReconciliationService.unmatchStatement(statementId);
    return { message: 'Vinculação desfeita' };
  }

  // ── Internal Transfers ──────────────────────────────────

  async getInternalTransfers(organizationId: string, filters?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: any = { organizationId };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters?.startDate) where.date.gte = new Date(filters.startDate);
      if (filters?.endDate) where.date.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.internalTransfer.findMany({
        where,
        include: {
          fromAccount: { select: { id: true, name: true, color: true } },
          toAccount: { select: { id: true, name: true, color: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.internalTransfer.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
