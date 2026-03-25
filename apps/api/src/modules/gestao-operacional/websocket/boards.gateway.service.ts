import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class BoardsGatewayService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emit(boardId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`board:${boardId}`).emit(event, payload);
    }
  }

  emitCardCreated(boardId: string, card: any) {
    this.emit(boardId, 'card:created', card);
  }

  emitCardUpdated(boardId: string, card: any) {
    this.emit(boardId, 'card:updated', card);
  }

  emitCardMoved(boardId: string, payload: { cardId: string; listId: string; position: number }) {
    this.emit(boardId, 'card:moved', payload);
  }

  emitCardDeleted(boardId: string, cardId: string) {
    this.emit(boardId, 'card:deleted', { cardId });
  }

  emitCardCompleted(boardId: string, card: any) {
    this.emit(boardId, 'card:completed', card);
  }

  emitCommentAdded(boardId: string, comment: any) {
    this.emit(boardId, 'comment:added', comment);
  }

  emitCommentUpdated(boardId: string, comment: any) {
    this.emit(boardId, 'comment:updated', comment);
  }

  emitCommentDeleted(boardId: string, payload: { commentId: string; cardId: string }) {
    this.emit(boardId, 'comment:deleted', payload);
  }

  emitListCreated(boardId: string, list: any) {
    this.emit(boardId, 'list:created', list);
  }

  emitListUpdated(boardId: string, list: any) {
    this.emit(boardId, 'list:updated', list);
  }

  emitListReordered(boardId: string, lists: any[]) {
    this.emit(boardId, 'list:reordered', lists);
  }

  emitToUser(userId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit(event, payload);
    }
  }
}
