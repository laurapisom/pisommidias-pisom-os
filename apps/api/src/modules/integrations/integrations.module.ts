import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { AsaasWebhookController } from './asaas/asaas-webhook.controller';
import { IntegrationsService } from './integrations.service';
import { AsaasService } from './asaas/asaas.service';
import { AsaasSyncService } from './asaas/asaas-sync.service';
import { SicoobService } from './sicoob/sicoob.service';
import { SicoobSyncService } from './sicoob/sicoob-sync.service';
import { SicoobReconciliationService } from './sicoob/sicoob-reconciliation.service';

@Module({
  controllers: [IntegrationsController, AsaasWebhookController],
  providers: [
    IntegrationsService,
    AsaasService,
    AsaasSyncService,
    SicoobService,
    SicoobSyncService,
    SicoobReconciliationService,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
