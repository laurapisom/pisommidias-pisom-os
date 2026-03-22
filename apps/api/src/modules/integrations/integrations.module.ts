import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { AsaasService } from './asaas/asaas.service';
import { AsaasSyncService } from './asaas/asaas-sync.service';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, AsaasService, AsaasSyncService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
