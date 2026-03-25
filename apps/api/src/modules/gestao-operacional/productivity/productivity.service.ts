import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ProductivityService {
  constructor(private prisma: PrismaService) {}

  private getDateFilter(period: string) {
    const days = parseInt(period?.replace('d', '') || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    return since;
  }

  async getOrgStats(organizationId: string, period = '30d', boardId?: string) {
    const since = this.getDateFilter(period);
    const where: any = { organizationId, createdAt: { gte: since } };
    if (boardId) where.boardId = boardId;

    const [total, completed, overdue] = await Promise.all([
      this.prisma.boardCard.count({ where: { ...where, isArchived: false } }),
      this.prisma.boardCard.count({ where: { ...where, isCompleted: true, completedAt: { gte: since } } }),
      this.prisma.boardCard.count({
        where: { ...where, isCompleted: false, dueDate: { lt: new Date() }, isArchived: false },
      }),
    ]);

    return { total, completed, overdue, period };
  }

  async getUserRanking(organizationId: string, period = '30d') {
    const since = this.getDateFilter(period);
    const cards = await this.prisma.boardCard.findMany({
      where: { organizationId, isArchived: false, dueDate: { not: null } },
      select: {
        isCompleted: true, completedAt: true, dueDate: true,
        assignees: { select: { userId: true } },
      },
    });

    const userStats: Record<string, { total: number; onTime: number }> = {};
    for (const card of cards) {
      for (const assignee of card.assignees) {
        if (!userStats[assignee.userId]) userStats[assignee.userId] = { total: 0, onTime: 0 };
        const isOverdue = !card.isCompleted && card.dueDate && card.dueDate < new Date();
        if (card.isCompleted || isOverdue) {
          userStats[assignee.userId].total++;
          if (card.isCompleted && card.completedAt && card.dueDate && card.completedAt <= card.dueDate) {
            userStats[assignee.userId].onTime++;
          }
        }
      }
    }

    const userIds = Object.keys(userStats);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatar: true },
    });

    return users.map((u: any) => ({
      user: u,
      total: userStats[u.id]?.total ?? 0,
      onTime: userStats[u.id]?.onTime ?? 0,
      score: userStats[u.id]?.total
        ? Math.round((userStats[u.id].onTime / userStats[u.id].total) * 100)
        : 0,
    })).sort((a: any, b: any) => b.score - a.score);
  }

  async getMyStats(organizationId: string, userId: string, period = '30d') {
    const since = this.getDateFilter(period);
    const cards = await this.prisma.boardCard.findMany({
      where: {
        organizationId, isArchived: false,
        assignees: { some: { userId } },
      },
      select: { isCompleted: true, completedAt: true, dueDate: true, createdAt: true },
    });

    const total = cards.length;
    const completed = cards.filter((c: any) => c.isCompleted).length;
    const onTime = cards.filter((c: any) =>
      c.isCompleted && c.completedAt && c.dueDate && c.completedAt <= c.dueDate
    ).length;
    const overdue = cards.filter((c: any) => !c.isCompleted && c.dueDate && c.dueDate < new Date()).length;
    const score = total > 0 ? Math.round((onTime / total) * 100) : 0;

    return { total, completed, onTime, overdue, score, period };
  }
}
