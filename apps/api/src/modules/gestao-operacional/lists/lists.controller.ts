import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ListsService } from './lists.service';
import { GestaoPermissionGuard } from '../guards/gestao-permission.guard';
import { RequireGestaoPermission } from '../guards/gestao-permission.decorator';

@ApiTags('Gestão Operacional - Listas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestao-operacional/boards/:boardId/lists')
export class ListsController {
  constructor(private listsService: ListsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar listas do quadro' })
  findAll(@Param('boardId') boardId: string) {
    return this.listsService.findAll(boardId);
  }

  @Post()
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('criar_listas')
  @ApiOperation({ summary: 'Criar lista' })
  create(@Param('boardId') boardId: string, @Body() body: any) {
    return this.listsService.create(boardId, body);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reordenar listas' })
  reorder(@Param('boardId') boardId: string, @Body() body: { lists: { id: string; position: number }[] }) {
    return this.listsService.reorder(boardId, body.lists);
  }

  @Patch(':listId')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('editar_listas')
  @ApiOperation({ summary: 'Editar lista' })
  update(@Param('listId') listId: string, @Body() body: any) {
    return this.listsService.update(listId, body);
  }

  @Delete(':listId')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('excluir_listas')
  @ApiOperation({ summary: 'Arquivar lista' })
  archive(@Param('listId') listId: string) {
    return this.listsService.archive(listId);
  }
}
