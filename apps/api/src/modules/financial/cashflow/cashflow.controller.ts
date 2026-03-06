import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CashflowService } from './cashflow.service';

@ApiTags('Cashflow & DRE')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial/cashflow')
export class CashflowController {
  constructor(private cashflowService: CashflowService) {}

  @Get('realized')
  @ApiOperation({ summary: 'Fluxo de caixa realizado (últimos N meses)' })
  getRealizedCashflow(
    @CurrentUser() user: any,
    @Query('months') months?: string,
  ) {
    return this.cashflowService.getCashflow(user.organizationId, months ? parseInt(months) : 6);
  }

  @Get('projected')
  @ApiOperation({ summary: 'Fluxo de caixa projetado (próximos N meses)' })
  getProjectedCashflow(
    @CurrentUser() user: any,
    @Query('months') months?: string,
  ) {
    return this.cashflowService.getProjectedCashflow(user.organizationId, months ? parseInt(months) : 3);
  }

  @Get('dre')
  @ApiOperation({ summary: 'DRE gerencial (receita - despesas = lucro)' })
  getDRE(@CurrentUser() user: any, @Query('month') month?: string) {
    return this.cashflowService.getDRE(user.organizationId, month);
  }

  @Get('client-profitability')
  @ApiOperation({ summary: 'Rentabilidade por cliente (receita vs custo)' })
  getClientProfitability(@CurrentUser() user: any, @Query('month') month?: string) {
    return this.cashflowService.getClientProfitability(user.organizationId, month);
  }
}
