import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }) {
    const board = await this.prisma.operationalBoard.create({
      data: {
        organizationId,
        createdById: userId,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
      },
    });
    // Auto-add creator as admin member
    await this.prisma.boardMember.create({
      data: { organizationId, boardId: board.id, userId, role: 'admin' },
    });
    return board;
  }

  async findAll(organizationId: string, userId: string) {
    // Show boards where user is a member OR is org owner/admin
    const memberBoards = await this.prisma.boardMember.findMany({
      where: { organizationId, userId },
      select: { boardId: true },
    });
    const boardIds = memberBoards.map((m: any) => m.boardId);
    return this.prisma.operationalBoard.findMany({
      where: { organizationId, isArchived: false, id: { in: boardIds } },
      include: {
        _count: { select: { cards: true, members: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(organizationId: string, boardId: string, userId: string) {
    await this.assertMember(boardId, userId);
    const board = await this.prisma.operationalBoard.findFirst({
      where: { id: boardId, organizationId },
      include: {
        lists: {
          where: { isArchived: false },
          orderBy: { position: 'asc' },
          include: {
            _count: { select: { cards: true } },
          },
        },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
          },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    if (!board) throw new NotFoundException('Quadro não encontrado');
    return board;
  }

  async update(organizationId: string, boardId: string, userId: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    position?: number;
  }) {
    await this.assertMember(boardId, userId);
    return this.prisma.operationalBoard.update({
      where: { id: boardId },
      data,
    });
  }

  async archive(organizationId: string, boardId: string, userId: string) {
    await this.assertMember(boardId, userId);
    return this.prisma.operationalBoard.update({
      where: { id: boardId },
      data: { isArchived: true },
    });
  }

  async getMembers(organizationId: string, boardId: string, userId: string) {
    await this.assertMember(boardId, userId);
    return this.prisma.boardMember.findMany({
      where: { boardId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
      },
    });
  }

  async addMember(organizationId: string, boardId: string, userId: string, targetUserId: string, role = 'member') {
    await this.assertMember(boardId, userId);
    return this.prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      update: { role },
      create: { organizationId, boardId, userId: targetUserId, role, addedById: userId },
    });
  }

  async removeMember(organizationId: string, boardId: string, userId: string, targetUserId: string) {
    await this.assertMember(boardId, userId);
    return this.prisma.boardMember.deleteMany({
      where: { boardId, userId: targetUserId },
    });
  }

  async reorder(organizationId: string, boards: { id: string; position: number }[]) {
    await Promise.all(boards.map(b =>
      this.prisma.operationalBoard.update({ where: { id: b.id }, data: { position: b.position } })
    ));
    return { success: true };
  }

  async assertMember(boardId: string, userId: string) {
    const member = await this.prisma.boardMember.findFirst({ where: { boardId, userId } });
    if (!member) throw new ForbiddenException('Acesso ao quadro negado');
    return member;
  }
}
