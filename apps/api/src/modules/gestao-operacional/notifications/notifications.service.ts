import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findUnread(organizationId: string, userId: string) {
    return this.prisma.boardNotification.findMany({
      where: { organizationId, userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findAll(organizationId: string, userId: string) {
    return this.prisma.boardNotification.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(organizationId: string, notificationId: string, userId: string) {
    return this.prisma.boardNotification.updateMany({
      where: { id: notificationId, userId, organizationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    return this.prisma.boardNotification.updateMany({
      where: { organizationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async create(data: {
    organizationId: string; userId: string; actorId?: string;
    type: string; boardId?: string; cardId?: string; message: string;
  }) {
    return this.prisma.boardNotification.create({ data });
  }
}
