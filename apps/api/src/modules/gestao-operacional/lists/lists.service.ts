import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ListsService {
  constructor(private prisma: PrismaService) {}

  async findAll(boardId: string) {
    return this.prisma.boardList.findMany({
      where: { boardId, isArchived: false },
      include: {
        _count: { select: { cards: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async create(boardId: string, data: { name: string; color?: string }) {
    const last = await this.prisma.boardList.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return this.prisma.boardList.create({
      data: { boardId, name: data.name, color: data.color, position: (last?.position ?? -1) + 1 },
    });
  }

  async update(listId: string, data: { name?: string; color?: string }) {
    return this.prisma.boardList.update({ where: { id: listId }, data });
  }

  async archive(listId: string) {
    return this.prisma.boardList.update({ where: { id: listId }, data: { isArchived: true } });
  }

  async reorder(boardId: string, lists: { id: string; position: number }[]) {
    await Promise.all(lists.map(l =>
      this.prisma.boardList.update({ where: { id: l.id }, data: { position: l.position } })
    ));
    return { success: true };
  }
}
