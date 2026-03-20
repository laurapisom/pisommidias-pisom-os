import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial/invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar fatura avulsa' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.invoicesService.create(user.organizationId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar faturas' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('contractId') contractId?: string,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoicesService.findAll(user.organizationId, {
      status, contractId, companyId, search, startDate, endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro do mês (faturado, recebido, pendente, inadimplente)' })
  getSummary(@CurrentUser() user: any, @Query('month') month?: string) {
    return this.invoicesService.getSummary(user.organizationId, month);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Gerar faturas dos contratos ativos (billing engine)' })
  generate(@CurrentUser() user: any) {
    return this.invoicesService.generateFromContracts(user.organizationId);
  }

  @Post('mark-overdue')
  @ApiOperation({ summary: 'Marcar faturas vencidas como inadimplentes' })
  markOverdue(@CurrentUser() user: any) {
    return this.invoicesService.markOverdue(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes da fatura' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar fatura' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.invoicesService.update(user.organizationId, id, body);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Registrar pagamento' })
  markPaid(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.invoicesService.markPaid(user.organizationId, id, body);
  }

  @Patch(':id/send')
  @ApiOperation({ summary: 'Marcar fatura como enviada' })
  markSent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.markSent(user.organizationId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar fatura' })
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.cancel(user.organizationId, id);
  }
}
