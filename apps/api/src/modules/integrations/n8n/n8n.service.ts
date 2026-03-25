import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);

  constructor(private prisma: PrismaService) {}

  async getIntegration(organizationId: string) {
    return this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'n8n' } },
      select: { id: true, isActive: true, settings: true },
    });
  }

  async save(organizationId: string, data: { webhookUrl: string; apiKey?: string }) {
    const settings = { webhookUrl: data.webhookUrl, apiKey: data.apiKey };
    return this.prisma.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: 'n8n' } },
      create: { organizationId, provider: 'n8n', apiKey: data.apiKey || '', isActive: true, settings },
      update: { settings, isActive: true },
    });
  }

  async disconnect(organizationId: string) {
    return this.prisma.integration.updateMany({
      where: { organizationId, provider: 'n8n' },
      data: { isActive: false, settings: {} },
    });
  }

  async test(organizationId: string): Promise<{ ok: boolean; message: string }> {
    const integration = await this.getIntegration(organizationId);
    if (!integration?.isActive) {
      return { ok: false, message: 'n8n não está configurado' };
    }
    const settings = integration.settings as Record<string, any>;
    if (!settings?.webhookUrl) {
      return { ok: false, message: 'URL do webhook não configurada' };
    }
    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', source: 'pisom-os' }),
      });
      return { ok: response.ok, message: response.ok ? 'Webhook respondeu com sucesso' : `Erro HTTP ${response.status}` };
    } catch (err) {
      return { ok: false, message: `Falha ao conectar: ${err.message}` };
    }
  }

  async triggerIfConfigured(organizationId: string, event: string, payload: any) {
    try {
      const integration = await this.getIntegration(organizationId);
      if (!integration?.isActive) return;
      const settings = integration.settings as Record<string, any>;
      if (!settings?.webhookUrl) return;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (settings.apiKey) headers['X-N8N-API-KEY'] = settings.apiKey;

      await fetch(settings.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      });
    } catch (err) {
      this.logger.warn(`n8n trigger failed for org ${organizationId}: ${err.message}`);
    }
  }
}
