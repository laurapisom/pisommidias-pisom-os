import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  private cardInclude = {
    company: { select: { id: true, name: true, color: true } },
    assignees: {
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    },
    createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    _count: { select: { comments: true, attachments: true, checklists: true } },
  };

  async findByBoard(organizationId: string, boardId: string, filters?: {
    listId?: string; assigneeId?: string; priority?: string; companyId?: string; isCompleted?: boolean;
  }) {
    const where: any = { organizationId, boardId, isArchived: false };
    if (filters?.listId) where.listId = filters.listId;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.isCompleted !== undefined) where.isCompleted = filters.isCompleted;
    if (filters?.assigneeId) where.assignees = { some: { userId: filters.assigneeId } };

    return this.prisma.boardCard.findMany({
      where,
      include: this.cardInclude,
      orderBy: [{ listId: 'asc' }, { position: 'asc' }],
    });
  }

  async findById(organizationId: string, cardId: string) {
    const card = await this.prisma.boardCard.findFirst({
      where: { id: cardId, organizationId },
      include: {
        company: { select: { id: true, name: true, color: true } },
        assignees: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        },
        checklists: {
          include: {
            items: {
              include: { responsavel: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        attachments: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        completedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { comments: true, history: true } },
      },
    });
    if (!card) throw new NotFoundException('Cartão não encontrado');
    return card;
  }

  async create(organizationId: string, boardId: string, userId: string, data: {
    title: string; listId: string; description?: string; priority?: string;
    dueDate?: string; companyId?: string; assigneeIds?: string[];
  }) {
    const last = await this.prisma.boardCard.findFirst({
      where: { listId: data.listId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const card = await this.prisma.boardCard.create({
      data: {
        organizationId, boardId,
        listId: data.listId,
        createdById: userId,
        title: data.title,
        description: data.description,
        priority: (data.priority as any) || 'NORMAL',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        companyId: data.companyId,
        position: (last?.position ?? -1) + 1,
      },
    });

    if (data.assigneeIds?.length) {
      await this.prisma.boardCardAssignee.createMany({
        data: data.assigneeIds.map(uid => ({ cardId: card.id, userId: uid })),
        skipDuplicates: true,
      });
    }

    await this.logHistory(card.id, organizationId, userId, 'created');
    return this.findById(organizationId, card.id);
  }

  async update(organizationId: string, cardId: string, userId: string, data: {
    title?: string; description?: string; priority?: string;
    dueDate?: string | null; companyId?: string | null;
    coverColor?: string | null;
  }) {
    const card = await this.prisma.boardCard.update({
      where: { id: cardId },
      data: {
        ...data,
        priority: data.priority as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      },
    });
    await this.logHistory(cardId, organizationId, userId, 'updated');
    return card;
  }

  async move(organizationId: string, cardId: string, userId: string, listId: string, position: number) {
    const card = await this.prisma.boardCard.findFirst({ where: { id: cardId, organizationId } });
    if (!card) throw new NotFoundException('Cartão não encontrado');
    const updated = await this.prisma.boardCard.update({
      where: { id: cardId },
      data: { listId, position },
    });
    await this.logHistory(cardId, organizationId, userId, 'moved', undefined, { fromList: card.listId }, { toList: listId });
    return updated;
  }

  async toggleComplete(organizationId: string, cardId: string, userId: string) {
    const card = await this.prisma.boardCard.findFirst({ where: { id: cardId, organizationId } });
    if (!card) throw new NotFoundException('Cartão não encontrado');
    const updated = await this.prisma.boardCard.update({
      where: { id: cardId },
      data: {
        isCompleted: !card.isCompleted,
        completedAt: !card.isCompleted ? new Date() : null,
        completedById: !card.isCompleted ? userId : null,
      },
    });
    await this.logHistory(cardId, organizationId, userId, updated.isCompleted ? 'completed' : 'reopened');
    return updated;
  }

  async setAssignees(organizationId: string, cardId: string, userId: string, assigneeIds: string[]) {
    await this.prisma.boardCardAssignee.deleteMany({ where: { cardId } });
    if (assigneeIds.length) {
      await this.prisma.boardCardAssignee.createMany({
        data: assigneeIds.map(uid => ({ cardId, userId: uid })),
        skipDuplicates: true,
      });
    }
    await this.logHistory(cardId, organizationId, userId, 'assigned', undefined, undefined, { assigneeIds });
    return this.findById(organizationId, cardId);
  }

  async archive(organizationId: string, cardId: string, userId: string) {
    await this.logHistory(cardId, organizationId, userId, 'archived');
    return this.prisma.boardCard.update({ where: { id: cardId }, data: { isArchived: true } });
  }

  async getHistory(organizationId: string, cardId: string) {
    return this.prisma.boardCardHistory.findMany({
      where: { cardId, organizationId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(cardId: string, userId: string) {
    await this.prisma.boardCardReadReceipt.upsert({
      where: { cardId_userId: { cardId, userId } },
      update: { readAt: new Date() },
      create: { cardId, userId },
    });
  }

  private async logHistory(
    cardId: string, organizationId: string, userId: string,
    action: string, field?: string, oldValue?: any, newValue?: any, metadata?: any,
  ) {
    await this.prisma.boardCardHistory.create({
      data: { cardId, organizationId, userId, action, field, oldValue, newValue, metadata },
    });
  }
}
