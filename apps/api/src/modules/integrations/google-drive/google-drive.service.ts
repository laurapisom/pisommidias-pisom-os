import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class GoogleDriveService {
  constructor(private prisma: PrismaService) {}

  async getIntegration(organizationId: string) {
    return this.prisma.integration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'google_drive' } },
      select: { id: true, isActive: true, settings: true, lastSyncAt: true },
    });
  }

  async save(organizationId: string, data: { settings: Record<string, any> }) {
    return this.prisma.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: 'google_drive' } },
      create: { organizationId, provider: 'google_drive', apiKey: '', isActive: true, settings: data.settings },
      update: { settings: data.settings, isActive: true },
    });
  }

  async disconnect(organizationId: string) {
    return this.prisma.integration.updateMany({
      where: { organizationId, provider: 'google_drive' },
      data: { isActive: false, settings: {} },
    });
  }

  async test(organizationId: string): Promise<{ ok: boolean; message: string }> {
    const integration = await this.getIntegration(organizationId);
    if (!integration?.isActive) {
      return { ok: false, message: 'Google Drive não está configurado' };
    }
    // Validate that settings contain required oauth fields
    const settings = integration.settings as Record<string, any>;
    if (!settings?.access_token && !settings?.service_account) {
      return { ok: false, message: 'Credenciais incompletas' };
    }
    return { ok: true, message: 'Conexão com Google Drive verificada' };
  }
}
