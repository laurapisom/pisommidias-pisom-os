import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CardsService } from './cards.service';
import { GestaoPermissionGuard } from '../guards/gestao-permission.guard';
import { RequireGestaoPermission } from '../guards/gestao-permission.decorator';

@ApiTags('Gestão Operacional - Cartões')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestao-operacional')
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Get('boards/:boardId/cards')
  @ApiOperation({ summary: 'Listar cartões do quadro' })
  findByBoard(
    @CurrentUser() user: any,
    @Param('boardId') boardId: string,
    @Query('listId') listId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: string,
    @Query('companyId') companyId?: string,
    @Query('isCompleted') isCompleted?: string,
  ) {
    return this.cardsService.findByBoard(user.organizationId, boardId, {
      listId, assigneeId, priority, companyId,
      isCompleted: isCompleted !== undefined ? isCompleted === 'true' : undefined,
    });
  }

  @Post('boards/:boardId/cards')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('criar_cartoes')
  @ApiOperation({ summary: 'Criar cartão' })
  create(@CurrentUser() user: any, @Param('boardId') boardId: string, @Body() body: any) {
    return this.cardsService.create(user.organizationId, boardId, user.id, body);
  }

  @Get('cards/:cardId')
  @ApiOperation({ summary: 'Detalhes do cartão' })
  async findById(@CurrentUser() user: any, @Param('cardId') cardId: string) {
    const card = await this.cardsService.findById(user.organizationId, cardId);
    await this.cardsService.markRead(cardId, user.id);
    return card;
  }

  @Patch('cards/:cardId')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('editar_cartoes')
  @ApiOperation({ summary: 'Editar cartão' })
  update(@CurrentUser() user: any, @Param('cardId') cardId: string, @Body() body: any) {
    return this.cardsService.update(user.organizationId, cardId, user.id, body);
  }

  @Delete('cards/:cardId')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('excluir_cartoes')
  @ApiOperation({ summary: 'Arquivar cartão' })
  archive(@CurrentUser() user: any, @Param('cardId') cardId: string) {
    return this.cardsService.archive(user.organizationId, cardId, user.id);
  }

  @Patch('cards/:cardId/move')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('mover_cartoes')
  @ApiOperation({ summary: 'Mover cartão' })
  move(@CurrentUser() user: any, @Param('cardId') cardId: string, @Body() body: { listId: string; position: number }) {
    return this.cardsService.move(user.organizationId, cardId, user.id, body.listId, body.position);
  }

  @Patch('cards/:cardId/complete')
  @ApiOperation({ summary: 'Marcar/desmarcar cartão como completo' })
  toggleComplete(@CurrentUser() user: any, @Param('cardId') cardId: string) {
    return this.cardsService.toggleComplete(user.organizationId, cardId, user.id);
  }

  @Patch('cards/:cardId/assignees')
  @ApiOperation({ summary: 'Definir responsáveis do cartão' })
  setAssignees(@CurrentUser() user: any, @Param('cardId') cardId: string, @Body() body: { assigneeIds: string[] }) {
    return this.cardsService.setAssignees(user.organizationId, cardId, user.id, body.assigneeIds);
  }

  @Get('cards/:cardId/history')
  @ApiOperation({ summary: 'Histórico do cartão' })
  getHistory(@CurrentUser() user: any, @Param('cardId') cardId: string) {
    return this.cardsService.getHistory(user.organizationId, cardId);
  }
}
