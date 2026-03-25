import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';
import { GestaoPermissionGuard } from '../guards/gestao-permission.guard';
import { RequireGestaoPermission } from '../guards/gestao-permission.decorator';

@ApiTags('Gestão Operacional - Anexos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestao-operacional')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('cards/:cardId/attachments')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('gerenciar_anexos')
  @ApiOperation({ summary: 'Registrar anexo (referência Drive)' })
  create(@CurrentUser() user: any, @Param('cardId') cardId: string, @Body() body: any) {
    return this.attachmentsService.create(cardId, user.id, body);
  }

  @Delete('attachments/:attachmentId')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('gerenciar_anexos')
  @ApiOperation({ summary: 'Remover referência de anexo' })
  delete(@CurrentUser() user: any, @Param('attachmentId') attachmentId: string) {
    return this.attachmentsService.delete(attachmentId, user.id);
  }
}
