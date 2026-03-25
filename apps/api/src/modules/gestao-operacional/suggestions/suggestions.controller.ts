import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SuggestionsService } from './suggestions.service';
import { GestaoPermissionGuard } from '../guards/gestao-permission.guard';
import { RequireGestaoPermission } from '../guards/gestao-permission.decorator';

@ApiTags('Gestão Operacional - Sugestões')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestao-operacional/suggestions')
export class SuggestionsController {
  constructor(private suggestionsService: SuggestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sugestões' })
  findAll(@CurrentUser() user: any) {
    return this.suggestionsService.findAll(user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar sugestão' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.suggestionsService.create(user.organizationId, user.id, body);
  }

  @Patch(':id/status')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('gerenciar_sugestoes')
  @ApiOperation({ summary: 'Alterar status da sugestão' })
  changeStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.suggestionsService.changeStatus(user.organizationId, id, user.id, body);
  }

  @Patch(':id/upvote')
  @ApiOperation({ summary: 'Votar / desvotar sugestão' })
  toggleUpvote(@CurrentUser() user: any, @Param('id') id: string) {
    return this.suggestionsService.toggleUpvote(user.organizationId, id, user.id);
  }
}
