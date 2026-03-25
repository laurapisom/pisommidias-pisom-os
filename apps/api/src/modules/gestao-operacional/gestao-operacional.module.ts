import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { BoardsService } from './boards/boards.service';
import { BoardsController } from './boards/boards.controller';
import { ListsService } from './lists/lists.service';
import { ListsController } from './lists/lists.controller';
import { CardsService } from './cards/cards.service';
import { CardsController } from './cards/cards.controller';
import { ChecklistsService } from './checklists/checklists.service';
import { ChecklistsController } from './checklists/checklists.controller';
import { CommentsService } from './comments/comments.service';
import { CommentsController } from './comments/comments.controller';
import { AttachmentsService } from './attachments/attachments.service';
import { AttachmentsController } from './attachments/attachments.controller';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsController } from './notifications/notifications.controller';
import { SuggestionsService } from './suggestions/suggestions.service';
import { SuggestionsController } from './suggestions/suggestions.controller';
import { ProductivityService } from './productivity/productivity.service';
import { ProductivityController } from './productivity/productivity.controller';
import { BoardsGateway } from './websocket/boards.gateway';
import { BoardsGatewayService } from './websocket/boards.gateway.service';
import { GestaoPermissionGuard } from './guards/gestao-permission.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'pisom-dev-secret-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    BoardsController,
    ListsController,
    CardsController,
    ChecklistsController,
    CommentsController,
    AttachmentsController,
    NotificationsController,
    SuggestionsController,
    ProductivityController,
  ],
  providers: [
    BoardsService,
    ListsService,
    CardsService,
    ChecklistsService,
    CommentsService,
    AttachmentsService,
    NotificationsService,
    SuggestionsService,
    ProductivityService,
    BoardsGateway,
    BoardsGatewayService,
    GestaoPermissionGuard,
  ],
  exports: [
    BoardsService,
    NotificationsService,
    BoardsGatewayService,
  ],
})
export class GestaoOperacionalModule {}
