import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';
import { loadPfxCertificate } from './sicoob/certificate-validator';
import * as path from 'path';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  // ═══════════════════════════════════════════════════════════
  // ASAAS
  // ═══════════════════════════════════════════════════════════

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
  testAsaasConnection(@CurrentUser() user: any) {
    return this.integrationsService.testAsaasConnection(user.organizationId);
  }

  @Post('asaas/sync')
  @ApiOperation({ summary: 'Trigger Asaas sync' })
  triggerAsaasSync(@CurrentUser() user: any) {
    return this.integrationsService.triggerSync(user.organizationId);
  }

  @Post('asaas/sync/cancel')
  @ApiOperation({ summary: 'Cancel Asaas sync' })
  cancelAsaasSync(@CurrentUser() user: any) {
    return this.integrationsService.cancelSync(user.organizationId);
  }

  @Get('asaas/status')
  @ApiOperation({ summary: 'Get Asaas sync status' })
  getAsaasSyncStatus(@CurrentUser() user: any) {
    return this.integrationsService.getSyncStatus(user.organizationId);
  }

  @Delete('asaas')
  @ApiOperation({ summary: 'Delete Asaas integration' })
  deleteAsaas(@CurrentUser() user: any) {
    return this.integrationsService.deleteAsaasIntegration(user.organizationId);
  }

  // ═══════════════════════════════════════════════════════════
  // SICOOB
  // ═══════════════════════════════════════════════════════════

  @Get('sicoob')
  @ApiOperation({ summary: 'Get Sicoob integration settings' })
  getSicoob(@CurrentUser() user: any) {
    return this.integrationsService.getSicoobIntegration(user.organizationId);
  }

  @Post('sicoob')
  @ApiOperation({ summary: 'Save Sicoob integration settings' })
  saveSicoob(
    @CurrentUser() user: any,
    @Body() body: {
      clientId: string;
      accountNumber: string;
      certificatePath?: string;
      certificatePass?: string;
      sandbox?: boolean;
    },
  ) {
    return this.integrationsService.saveSicoobIntegration(user.organizationId, body);
  }

  @Post('sicoob/certificate')
  @ApiOperation({ summary: 'Upload Sicoob PFX certificate' })
  @UseInterceptors(
    FileInterceptor('certificate', {
      storage: require('multer').memoryStorage(),
      fileFilter: (_req: any, file: any, cb: any) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.pfx', '.p12'].includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Apenas arquivos .pfx ou .p12 são aceitos'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadCertificate(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
    @Body() body: { passphrase?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    // Validate the PFX certificate if a passphrase is provided
    if (body?.passphrase) {
      const loaded = loadPfxCertificate(file.buffer, body.passphrase.trim());
      if (!loaded.valid) {
        throw new BadRequestException(loaded.error);
      }
    }

    const base64Data = file.buffer.toString('base64');
    await this.integrationsService.updateSicoobCertificateData(
      user.organizationId,
      base64Data,
      file.originalname,
    );
    return {
      filename: file.originalname,
      message: 'Certificado enviado com sucesso',
    };
  }

  @Post('sicoob/test')
  @ApiOperation({ summary: 'Test Sicoob connection' })
  testSicoobConnection(@CurrentUser() user: any) {
    return this.integrationsService.testSicoobConnection(user.organizationId);
  }

  @Post('sicoob/sync')
  @ApiOperation({ summary: 'Trigger Sicoob sync' })
  triggerSicoobSync(@CurrentUser() user: any) {
    return this.integrationsService.triggerSicoobSync(user.organizationId);
  }

  @Post('sicoob/sync/cancel')
  @ApiOperation({ summary: 'Cancel Sicoob sync' })
  cancelSicoobSync(@CurrentUser() user: any) {
    return this.integrationsService.cancelSicoobSync(user.organizationId);
  }

  @Get('sicoob/status')
  @ApiOperation({ summary: 'Get Sicoob sync status' })
  getSicoobSyncStatus(@CurrentUser() user: any) {
    return this.integrationsService.getSicoobSyncStatus(user.organizationId);
  }

  @Delete('sicoob')
  @ApiOperation({ summary: 'Delete Sicoob integration' })
  deleteSicoob(@CurrentUser() user: any) {
    return this.integrationsService.deleteSicoobIntegration(user.organizationId);
  }

  // ── Sicoob: Bank Statements ─────────────────────────────

  @Get('sicoob/statements')
  @ApiOperation({ summary: 'List bank statements' })
  getSicoobStatements(
    @CurrentUser() user: any,
    @Query() query: { startDate?: string; endDate?: string; type?: string; reconciled?: string; page?: string; limit?: string },
  ) {
    return this.integrationsService.getSicoobStatements(user.organizationId, {
      ...query,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  // ── Sicoob: DDA ─────────────────────────────────────────

  // ── Reconciliation ──────────────────────────────────────

  @Post('sicoob/reconcile')
  @ApiOperation({ summary: 'Run automatic reconciliation' })
  reconcile(@CurrentUser() user: any) {
    return this.integrationsService.triggerReconciliation(user.organizationId);
  }

  @Post('sicoob/statements/:id/match')
  @ApiOperation({ summary: 'Manually match statement to expense/invoice' })
  matchStatement(
    @Param('id') id: string,
    @Body() body: { expenseId?: string; invoiceId?: string },
  ) {
    return this.integrationsService.matchStatement(id, body);
  }

  @Post('sicoob/statements/:id/unmatch')
  @ApiOperation({ summary: 'Undo statement match' })
  unmatchStatement(@Param('id') id: string) {
    return this.integrationsService.unmatchStatement(id);
  }

  // ── Internal Transfers ──────────────────────────────────

  @Get('transfers')
  @ApiOperation({ summary: 'List internal transfers between accounts' })
  getTransfers(
    @CurrentUser() user: any,
    @Query() query: { startDate?: string; endDate?: string; page?: string; limit?: string },
  ) {
    return this.integrationsService.getInternalTransfers(user.organizationId, {
      ...query,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}
