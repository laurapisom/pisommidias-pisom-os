import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AsaasService } from './asaas/asaas.service';
import { AsaasSyncService } from './asaas/asaas-sync.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private asaasService: AsaasService,
    private asaasSyncService: AsaasSyncService,
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
}
