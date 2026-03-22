import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial/accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar conta bancária' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.accountsService.create(user.organizationId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contas com saldos' })
  findAll(@CurrentUser() user: any) {
    return this.accountsService.findAll(user.organizationId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro geral' })
  getSummary(@CurrentUser() user: any) {
    return this.accountsService.getSummary(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes da conta' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accountsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar conta' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.accountsService.update(user.organizationId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar conta' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accountsService.remove(user.organizationId, id);
  }
}
