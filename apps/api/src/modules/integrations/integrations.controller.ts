import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get('asaas')
  @ApiOperation({ summary: 'Get Asaas integration settings' })
  getAsaas(@CurrentUser() user: any) {
    return this.integrationsService.getAsaasIntegration(user.organizationId);
  }

  @Post('asaas')
  @ApiOperation({ summary: 'Save Asaas integration settings' })
  saveAsaas(
    @CurrentUser() user: any,
    @Body() body: { apiKey: string; sandbox: boolean },
  ) {
    return this.integrationsService.saveAsaasIntegration(user.organizationId, body);
  }

  @Post('asaas/test')
  @ApiOperation({ summary: 'Test Asaas connection' })
  testConnection(@CurrentUser() user: any) {
    return this.integrationsService.testAsaasConnection(user.organizationId);
  }

  @Post('asaas/sync')
  @ApiOperation({ summary: 'Trigger Asaas sync' })
  triggerSync(@CurrentUser() user: any) {
    return this.integrationsService.triggerSync(user.organizationId);
  }

  @Get('asaas/status')
  @ApiOperation({ summary: 'Get Asaas sync status' })
  getSyncStatus(@CurrentUser() user: any) {
    return this.integrationsService.getSyncStatus(user.organizationId);
  }

  @Delete('asaas')
  @ApiOperation({ summary: 'Delete Asaas integration' })
  deleteAsaas(@CurrentUser() user: any) {
    return this.integrationsService.deleteAsaasIntegration(user.organizationId);
  }
}
