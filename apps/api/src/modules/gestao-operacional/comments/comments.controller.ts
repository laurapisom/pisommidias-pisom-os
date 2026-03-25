import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { GestaoPermissionGuard } from '../guards/gestao-permission.guard';
import { RequireGestaoPermission } from '../guards/gestao-permission.decorator';

@ApiTags('Gestão Operacional - Comentários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestao-operacional')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get('cards/:cardId/comments')
  @ApiOperation({ summary: 'Listar comentários do cartão' })
  findByCard(@CurrentUser() user: any, @Param('cardId') cardId: string) {
    return this.commentsService.findByCard(user.organizationId, cardId);
  }

  @Post('cards/:cardId/comments')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('adicionar_comentarios')
  @ApiOperation({ summary: 'Adicionar comentário' })
  create(@CurrentUser() user: any, @Param('cardId') cardId: string, @Body() body: any) {
    return this.commentsService.create(user.organizationId, cardId, user.id, body);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Editar comentário' })
  update(@CurrentUser() user: any, @Param('commentId') commentId: string, @Body() body: { content: string }) {
    return this.commentsService.update(user.organizationId, commentId, user.id, body.content);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Excluir comentário' })
  delete(@CurrentUser() user: any, @Param('commentId') commentId: string) {
    return this.commentsService.delete(user.organizationId, commentId, user.id);
  }
}
