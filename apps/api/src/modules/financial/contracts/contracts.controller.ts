import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial/contracts')
export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar contrato recorrente' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.contractsService.create(user.organizationId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contratos' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
  ) {
    return this.contractsService.findAll(user.organizationId, { status, companyId, search });
  }

  @Get('mrr')
  @ApiOperation({ summary: 'MRR e ARR' })
  getMRR(@CurrentUser() user: any) {
    return this.contractsService.getMRR(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do contrato + faturas' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contractsService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar contrato' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.contractsService.update(user.organizationId, id, body);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar contrato' })
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.contractsService.cancel(user.organizationId, id, body.reason);
  }
}
