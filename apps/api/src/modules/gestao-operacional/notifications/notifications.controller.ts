import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Gestão Operacional - Notificações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestao-operacional/notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações' })
  findAll(@CurrentUser() user: any) {
    return this.notificationsService.findAll(user.organizationId, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user.organizationId, user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.markRead(user.organizationId, id, user.id);
  }
}
