import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BankAccountsService } from './bank-accounts.service';

@ApiTags('Bank Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial/bank-accounts')
export class BankAccountsController {
  constructor(private bankAccountsService: BankAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar conta bancaria' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.bankAccountsService.create(user.organizationId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contas bancarias' })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'type', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
  ) {
    return this.bankAccountsService.findAll(user.organizationId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar conta bancaria por ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bankAccountsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar conta bancaria' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.bankAccountsService.update(user.organizationId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir conta bancaria' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bankAccountsService.remove(user.organizationId, id);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Recalcular saldo da conta' })
  recalculate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bankAccountsService.recalculateBalance(user.organizationId, id);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transferencia entre contas' })
  transfer(@CurrentUser() user: any, @Body() body: any) {
    return this.bankAccountsService.transfer(user.organizationId, body);
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Extrato da conta bancaria' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getStatement(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bankAccountsService.getStatement(user.organizationId, id, {
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post(':id/close-period')
  @ApiOperation({ summary: 'Fechar periodo contabil da conta' })
  closePeriod(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.bankAccountsService.closePeriod(user.organizationId, id, body);
  }
}
