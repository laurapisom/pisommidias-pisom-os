import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePostDto,
  UpdatePostDto,
  UpdatePostStatusDto,
  CreateIdeaDto,
  CreateProfileDto,
  CreateVersionDto,
} from './content.dto';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // ─── Posts ──────────────────────────────────────────────────────────

  async getPosts(organizationId: string, params: Record<string, string>) {
    const where: any = { organizationId };
    if (params.status) where.status = params.status;
    if (params.channel) where.channel = params.channel;
    if (params.profileId) where.profileId = params.profileId;
    if (params.assignedToId) where.assignedToId = params.assignedToId;

    const posts = await this.prisma.contentPost.findMany({
      where,
      include: {
        profile: { select: { id: true, clientName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { versions: true } },
      },
      orderBy: params.sort === 'scheduled'
        ? { scheduledAt: 'asc' }
        : { createdAt: 'desc' },
    });

    return { data: posts, total: posts.length };
  }

  async getCalendar(organizationId: string, month: string) {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);

    const posts = await this.prisma.contentPost.findMany({
      where: {
        organizationId,
        scheduledAt: { gte: start, lte: end },
      },
      include: {
        profile: { select: { id: true, clientName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return posts;
  }

  async getPost(organizationId: string, id: string) {
    const post = await this.prisma.contentPost.findFirst({
      where: { id, organizationId },
      include: {
        profile: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        versions: {
          include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { version: 'desc' },
        },
      },
    });
    if (!post) throw new NotFoundException('Post não encontrado');
    return post;
  }

  async createPost(organizationId: string, userId: string, dto: CreatePostDto) {
    return this.prisma.contentPost.create({
      data: {
        organizationId,
        createdById: userId,
        title: dto.title,
        content: dto.content,
        caption: dto.caption,
        channel: dto.channel as any,
        profileId: dto.profileId,
        assignedToId: dto.assignedToId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        tags: dto.tags || [],
        mediaUrls: dto.mediaUrls || [],
      },
      include: {
        profile: { select: { id: true, clientName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updatePost(organizationId: string, id: string, dto: UpdatePostDto) {
    const post = await this.prisma.contentPost.findFirst({ where: { id, organizationId } });
    if (!post) throw new NotFoundException('Post não encontrado');

    return this.prisma.contentPost.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        channel: dto.channel as any,
      },
    });
  }

  async updatePostStatus(organizationId: string, id: string, userId: string, dto: UpdatePostStatusDto) {
    const post = await this.prisma.contentPost.findFirst({ where: { id, organizationId } });
    if (!post) throw new NotFoundException('Post não encontrado');

    const data: any = { status: dto.status };
    if (dto.status === 'REJECTED') data.rejectionReason = dto.rejectionReason;
    if (dto.status === 'PUBLISHED') data.publishedAt = new Date();

    // Save version snapshot on status transitions
    if (['IN_REVIEW', 'APPROVED'].includes(dto.status)) {
      const lastVersion = await this.prisma.contentVersion.findFirst({
        where: { postId: id },
        orderBy: { version: 'desc' },
      });
      await this.prisma.contentVersion.create({
        data: {
          postId: id,
          version: (lastVersion?.version || 0) + 1,
          content: post.content,
          caption: post.caption,
          note: `Status → ${dto.status}`,
          createdById: userId,
        },
      });
    }

    return this.prisma.contentPost.update({ where: { id }, data });
  }

  async deletePost(organizationId: string, id: string) {
    const post = await this.prisma.contentPost.findFirst({ where: { id, organizationId } });
    if (!post) throw new NotFoundException('Post não encontrado');
    await this.prisma.contentPost.delete({ where: { id } });
  }

  async getPostSummary(organizationId: string) {
    const [total, byStatus, byChannel] = await Promise.all([
      this.prisma.contentPost.count({ where: { organizationId } }),
      this.prisma.contentPost.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.contentPost.groupBy({
        by: ['channel'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byChannel: byChannel.map((c) => ({ channel: c.channel, count: c._count })),
    };
  }

  // ─── Versions ───────────────────────────────────────────────────────

  async createVersion(organizationId: string, postId: string, userId: string, dto: CreateVersionDto) {
    const post = await this.prisma.contentPost.findFirst({ where: { id: postId, organizationId } });
    if (!post) throw new NotFoundException('Post não encontrado');

    const lastVersion = await this.prisma.contentVersion.findFirst({
      where: { postId },
      orderBy: { version: 'desc' },
    });

    return this.prisma.contentVersion.create({
      data: {
        postId,
        version: (lastVersion?.version || 0) + 1,
        content: dto.content,
        caption: dto.caption,
        note: dto.note,
        createdById: userId,
      },
    });
  }

  // ─── Ideas ──────────────────────────────────────────────────────────

  async getIdeas(organizationId: string, params: Record<string, string>) {
    const where: any = { organizationId };
    if (params.status) where.status = params.status;
    if (params.profileId) where.profileId = params.profileId;

    const ideas = await this.prisma.contentIdea.findMany({
      where,
      include: {
        profile: { select: { id: true, clientName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: ideas, total: ideas.length };
  }

  async createIdea(organizationId: string, userId: string, dto: CreateIdeaDto) {
    return this.prisma.contentIdea.create({
      data: {
        organizationId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        channel: dto.channel as any,
        reference: dto.reference,
        profileId: dto.profileId,
      },
    });
  }

  async updateIdeaStatus(organizationId: string, id: string, status: string) {
    const idea = await this.prisma.contentIdea.findFirst({ where: { id, organizationId } });
    if (!idea) throw new NotFoundException('Ideia não encontrada');
    return this.prisma.contentIdea.update({ where: { id }, data: { status: status as any } });
  }

  async deleteIdea(organizationId: string, id: string) {
    const idea = await this.prisma.contentIdea.findFirst({ where: { id, organizationId } });
    if (!idea) throw new NotFoundException('Ideia não encontrada');
    await this.prisma.contentIdea.delete({ where: { id } });
  }

  // ─── Profiles ───────────────────────────────────────────────────────

  async getProfiles(organizationId: string) {
    return this.prisma.clientContentProfile.findMany({
      where: { organizationId },
      include: {
        _count: { select: { posts: true, ideas: true } },
      },
      orderBy: { clientName: 'asc' },
    });
  }

  async getProfile(organizationId: string, id: string) {
    const profile = await this.prisma.clientContentProfile.findFirst({
      where: { id, organizationId },
      include: {
        posts: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
          include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
        },
        _count: { select: { posts: true, ideas: true } },
      },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    return profile;
  }

  async createProfile(organizationId: string, dto: CreateProfileDto) {
    return this.prisma.clientContentProfile.create({
      data: {
        organizationId,
        clientName: dto.clientName,
        brandVoice: dto.brandVoice,
        visualGuide: dto.visualGuide,
        targetAudience: dto.targetAudience,
        competitors: dto.competitors,
        hashtags: dto.hashtags,
        notes: dto.notes,
        channels: (dto.channels || []) as any,
      },
    });
  }

  async updateProfile(organizationId: string, id: string, dto: Partial<CreateProfileDto>) {
    const profile = await this.prisma.clientContentProfile.findFirst({ where: { id, organizationId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    return this.prisma.clientContentProfile.update({
      where: { id },
      data: {
        ...dto,
        channels: dto.channels as any,
      },
    });
  }

  async deleteProfile(organizationId: string, id: string) {
    const profile = await this.prisma.clientContentProfile.findFirst({ where: { id, organizationId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    await this.prisma.clientContentProfile.delete({ where: { id } });
  }
}
