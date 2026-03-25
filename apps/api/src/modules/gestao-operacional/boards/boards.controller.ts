import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BoardsService } from './boards.service';
import { GestaoPermissionGuard } from '../guards/gestao-permission.guard';
import { RequireGestaoPermission } from '../guards/gestao-permission.decorator';

@ApiTags('Gestão Operacional - Quadros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestao-operacional/boards')
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar quadros do usuário' })
  findAll(@CurrentUser() user: any) {
    return this.boardsService.findAll(user.organizationId, user.id);
  }

  @Post()
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('criar_quadros')
  @ApiOperation({ summary: 'Criar quadro' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.boardsService.create(user.organizationId, user.id, body);
  }

  @Get(':boardId')
  @ApiOperation({ summary: 'Detalhes do quadro' })
  findById(@CurrentUser() user: any, @Param('boardId') boardId: string) {
    return this.boardsService.findById(user.organizationId, boardId, user.id);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reordenar quadros' })
  reorder(@CurrentUser() user: any, @Body() body: { boards: { id: string; position: number }[] }) {
    return this.boardsService.reorder(user.organizationId, body.boards);
  }

  @Patch(':boardId')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('editar_quadros')
  @ApiOperation({ summary: 'Editar quadro' })
  update(@CurrentUser() user: any, @Param('boardId') boardId: string, @Body() body: any) {
    return this.boardsService.update(user.organizationId, boardId, user.id, body);
  }

  @Delete(':boardId')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('excluir_quadros')
  @ApiOperation({ summary: 'Arquivar quadro' })
  archive(@CurrentUser() user: any, @Param('boardId') boardId: string) {
    return this.boardsService.archive(user.organizationId, boardId, user.id);
  }

  @Get(':boardId/members')
  @ApiOperation({ summary: 'Listar membros do quadro' })
  getMembers(@CurrentUser() user: any, @Param('boardId') boardId: string) {
    return this.boardsService.getMembers(user.organizationId, boardId, user.id);
  }

  @Post(':boardId/members')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('gerenciar_membros_quadro')
  @ApiOperation({ summary: 'Adicionar membro ao quadro' })
  addMember(@CurrentUser() user: any, @Param('boardId') boardId: string, @Body() body: { userId: string; role?: string }) {
    return this.boardsService.addMember(user.organizationId, boardId, user.id, body.userId, body.role);
  }

  @Delete(':boardId/members/:userId')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('gerenciar_membros_quadro')
  @ApiOperation({ summary: 'Remover membro do quadro' })
  removeMember(@CurrentUser() user: any, @Param('boardId') boardId: string, @Param('userId') targetUserId: string) {
    return this.boardsService.removeMember(user.organizationId, boardId, user.id, targetUserId);
  }
}
