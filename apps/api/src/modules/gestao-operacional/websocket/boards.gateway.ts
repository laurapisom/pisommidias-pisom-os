import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { BoardsGatewayService } from './boards.gateway.service';

@WebSocketGateway({
  namespace: '/boards',
  cors: { origin: '*', credentials: true },
})
export class BoardsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private gatewayService: BoardsGatewayService,
  ) {}

  afterInit(server: Server) {
    this.gatewayService.setServer(server);
  }

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { socket.disconnect(true); return; }
      const payload = this.jwtService.verify(token);
      (socket as any).user = payload;
      // Join personal room for user-targeted notifications
      socket.join(`user:${payload.sub}`);
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const user = (socket as any).user;
    if (user) {
      // Notify boards of leave (rooms automatically cleaned by socket.io)
    }
  }

  @SubscribeMessage('board:join')
  handleJoinBoard(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string }) {
    socket.join(`board:${data.boardId}`);
    const user = (socket as any).user;
    this.server.to(`board:${data.boardId}`).emit('presence:join', {
      boardId: data.boardId,
      userId: user?.sub,
    });
  }

  @SubscribeMessage('board:leave')
  handleLeaveBoard(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string }) {
    socket.leave(`board:${data.boardId}`);
    const user = (socket as any).user;
    this.server.to(`board:${data.boardId}`).emit('presence:leave', {
      boardId: data.boardId,
      userId: user?.sub,
    });
  }

  @SubscribeMessage('card:typing')
  handleTyping(@ConnectedSocket() socket: Socket, @MessageBody() data: { boardId: string; cardId: string }) {
    const user = (socket as any).user;
    socket.to(`board:${data.boardId}`).emit('presence:typing', {
      boardId: data.boardId,
      cardId: data.cardId,
      userId: user?.sub,
    });
  }
}
