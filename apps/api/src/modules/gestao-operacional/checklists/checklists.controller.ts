import { Controller, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ChecklistsService } from './checklists.service';
import { GestaoPermissionGuard } from '../guards/gestao-permission.guard';
import { RequireGestaoPermission } from '../guards/gestao-permission.decorator';

@ApiTags('Gestão Operacional - Checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GestaoPermissionGuard)
@RequireGestaoPermission('gerenciar_checklists')
@Controller('gestao-operacional')
export class ChecklistsController {
  constructor(private checklistsService: ChecklistsService) {}

  @Post('cards/:cardId/checklists')
  @ApiOperation({ summary: 'Criar checklist' })
  createChecklist(@Param('cardId') cardId: string, @Body() body: { title: string }) {
    return this.checklistsService.createChecklist(cardId, body.title);
  }

  @Patch('checklists/:checklistId')
  @ApiOperation({ summary: 'Renomear checklist' })
  updateChecklist(@Param('checklistId') checklistId: string, @Body() body: { title: string }) {
    return this.checklistsService.updateChecklist(checklistId, body.title);
  }

  @Delete('checklists/:checklistId')
  @ApiOperation({ summary: 'Excluir checklist' })
  deleteChecklist(@Param('checklistId') checklistId: string) {
    return this.checklistsService.deleteChecklist(checklistId);
  }

  @Post('checklists/:checklistId/items')
  @ApiOperation({ summary: 'Adicionar item ao checklist' })
  createItem(@Param('checklistId') checklistId: string, @Body() body: any) {
    return this.checklistsService.createItem(checklistId, body);
  }

  @Patch('checklist-items/:itemId')
  @ApiOperation({ summary: 'Editar item do checklist' })
  updateItem(@Param('itemId') itemId: string, @Body() body: any) {
    return this.checklistsService.updateItem(itemId, body);
  }

  @Delete('checklist-items/:itemId')
  @ApiOperation({ summary: 'Excluir item do checklist' })
  deleteItem(@Param('itemId') itemId: string) {
    return this.checklistsService.deleteItem(itemId);
  }

  @Patch('checklist-items/:itemId/complete')
  @ApiOperation({ summary: 'Marcar/desmarcar item como completo' })
  toggleItem(@Param('itemId') itemId: string) {
    return this.checklistsService.toggleItem(itemId);
  }
}
