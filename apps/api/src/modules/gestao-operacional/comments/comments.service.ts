import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async findByCard(organizationId: string, cardId: string) {
    return this.prisma.boardCardComment.findMany({
      where: { cardId, organizationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(organizationId: string, cardId: string, userId: string, data: {
    content: string; mentions?: string[];
  }) {
    return this.prisma.boardCardComment.create({
      data: {
        organizationId, cardId, userId,
        content: data.content,
        mentions: data.mentions ?? [],
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async update(organizationId: string, commentId: string, userId: string, content: string) {
    const comment = await this.prisma.boardCardComment.findFirst({ where: { id: commentId, organizationId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.userId !== userId) throw new ForbiddenException('Só o autor pode editar este comentário');
    return this.prisma.boardCardComment.update({
      where: { id: commentId },
      data: { content, isEdited: true },
    });
  }

  async delete(organizationId: string, commentId: string, userId: string) {
    const comment = await this.prisma.boardCardComment.findFirst({ where: { id: commentId, organizationId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.userId !== userId) throw new ForbiddenException('Sem permissão para excluir este comentário');
    return this.prisma.boardCardComment.delete({ where: { id: commentId } });
  }
}
