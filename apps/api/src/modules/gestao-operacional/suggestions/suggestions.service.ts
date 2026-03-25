import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class SuggestionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.improvementSuggestion.findMany({
      where: { organizationId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, data: { title: string; description: string }) {
    return this.prisma.improvementSuggestion.create({
      data: { organizationId, createdById: userId, title: data.title, description: data.description },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async changeStatus(organizationId: string, id: string, userId: string, data: {
    status: string; statusNote?: string;
  }) {
    const suggestion = await this.prisma.improvementSuggestion.findFirst({ where: { id, organizationId } });
    if (!suggestion) throw new NotFoundException('Sugestão não encontrada');
    return this.prisma.improvementSuggestion.update({
      where: { id },
      data: {
        status: data.status as any,
        statusNote: data.statusNote,
        statusChangedById: userId,
        statusChangedAt: new Date(),
      },
    });
  }

  async toggleUpvote(organizationId: string, id: string, userId: string) {
    const suggestion = await this.prisma.improvementSuggestion.findFirst({ where: { id, organizationId } });
    if (!suggestion) throw new NotFoundException('Sugestão não encontrada');
    const hasVoted = suggestion.upvotes.includes(userId);
    const upvotes = hasVoted
      ? suggestion.upvotes.filter((uid: string) => uid !== userId)
      : [...suggestion.upvotes, userId];
    return this.prisma.improvementSuggestion.update({ where: { id }, data: { upvotes } });
  }
}
