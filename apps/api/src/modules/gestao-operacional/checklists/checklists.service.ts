import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  async createChecklist(cardId: string, title: string) {
    const last = await this.prisma.boardChecklist.findFirst({
      where: { cardId }, orderBy: { position: 'desc' }, select: { position: true },
    });
    return this.prisma.boardChecklist.create({
      data: { cardId, title, position: (last?.position ?? -1) + 1 },
      include: { items: true },
    });
  }

  async updateChecklist(checklistId: string, title: string) {
    return this.prisma.boardChecklist.update({ where: { id: checklistId }, data: { title } });
  }

  async deleteChecklist(checklistId: string) {
    return this.prisma.boardChecklist.delete({ where: { id: checklistId } });
  }

  async createItem(checklistId: string, data: {
    title: string; responsavelId?: string; dueDate?: string; position?: number;
  }) {
    const last = await this.prisma.boardChecklistItem.findFirst({
      where: { checklistId }, orderBy: { position: 'desc' }, select: { position: true },
    });
    return this.prisma.boardChecklistItem.create({
      data: {
        checklistId, title: data.title,
        responsavelId: data.responsavelId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        position: data.position ?? (last?.position ?? -1) + 1,
      },
      include: { responsavel: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  async updateItem(itemId: string, data: {
    title?: string; responsavelId?: string | null; dueDate?: string | null; position?: number;
  }) {
    return this.prisma.boardChecklistItem.update({
      where: { id: itemId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      },
      include: { responsavel: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  async deleteItem(itemId: string) {
    return this.prisma.boardChecklistItem.delete({ where: { id: itemId } });
  }

  async toggleItem(itemId: string) {
    const item = await this.prisma.boardChecklistItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item não encontrado');
    return this.prisma.boardChecklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: !item.isCompleted,
        completedAt: !item.isCompleted ? new Date() : null,
      },
    });
  }
}
