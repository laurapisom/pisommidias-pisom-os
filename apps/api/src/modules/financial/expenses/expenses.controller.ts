import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial/expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar despesa' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.expensesService.create(user.organizationId, user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar despesas' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('costCenterId') costCenterId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.expensesService.findAll(user.organizationId, {
      status, categoryId, costCenterId, type, search, startDate, endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo de despesas do mês' })
  getSummary(@CurrentUser() user: any, @Query('month') month?: string) {
    return this.expensesService.getSummary(user.organizationId, month);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias de despesa' })
  getCategories(@CurrentUser() user: any) {
    return this.expensesService.getCategories(user.organizationId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Criar categoria de despesa' })
  createCategory(@CurrentUser() user: any, @Body() body: any) {
    return this.expensesService.createCategory(user.organizationId, body);
  }

  @Get('cost-centers')
  @ApiOperation({ summary: 'Listar centros de custo' })
  getCostCenters(@CurrentUser() user: any) {
    return this.expensesService.getCostCenters(user.organizationId);
  }

  @Post('cost-centers')
  @ApiOperation({ summary: 'Criar centro de custo' })
  createCostCenter(@CurrentUser() user: any, @Body() body: any) {
    return this.expensesService.createCostCenter(user.organizationId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar despesa' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.expensesService.update(user.organizationId, id, body);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Aprovar despesa' })
  approve(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.approve(user.organizationId, id, user.id);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Registrar pagamento da despesa' })
  markPaid(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { paidAt?: string }) {
    return this.expensesService.markPaid(user.organizationId, id, body.paidAt);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rejeitar despesa' })
  reject(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.reject(user.organizationId, id, user.id);
  }
}
