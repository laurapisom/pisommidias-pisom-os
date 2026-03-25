import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { AsaasWebhookController } from './asaas/asaas-webhook.controller';
import { IntegrationsService } from './integrations.service';
import { AsaasService } from './asaas/asaas.service';
import { AsaasSyncService } from './asaas/asaas-sync.service';
import { SicoobService } from './sicoob/sicoob.service';
import { SicoobSyncService } from './sicoob/sicoob-sync.service';
import { SicoobReconciliationService } from './sicoob/sicoob-reconciliation.service';
import { GoogleDriveService } from './google-drive/google-drive.service';
import { N8nService } from './n8n/n8n.service';

@Module({
  controllers: [IntegrationsController, AsaasWebhookController],
  providers: [
    IntegrationsService,
    AsaasService,
    AsaasSyncService,
    SicoobService,
    SicoobSyncService,
    SicoobReconciliationService,
    GoogleDriveService,
    N8nService,
  ],
  exports: [IntegrationsService, GoogleDriveService, N8nService],
})
export class IntegrationsModule {}
