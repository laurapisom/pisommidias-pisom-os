import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateDealDto, UpdateDealDto, MoveDealDto } from './deals.dto';

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateDealDto) {
    const deal = await this.prisma.deal.create({
      data: {
        organizationId,
        pipelineId: dto.pipelineId,
        stageId: dto.stageId,
        ownerId: dto.ownerId || userId,
        createdById: userId,
        title: dto.title,
        value: dto.value,
        leadId: dto.leadId,
        companyId: dto.companyId,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
        customFields: dto.customFields,
      },
      include: {
        stage: true,
        owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        company: { select: { id: true, name: true } },
        lead: { select: { id: true, contact: { select: { firstName: true, lastName: true } } } },
      },
    });

    await this.prisma.activity.create({
      data: {
        organizationId,
        userId,
        type: 'SYSTEM',
        title: `Negócio "${deal.title}" criado`,
        dealId: deal.id,
      },
    });

    return deal;
  }

  async findAll(organizationId: string, filters?: {
    pipelineId?: string;
    stageId?: string;
    status?: string;
    ownerId?: string;
    search?: string;
  }) {
    const where: any = { organizationId };

    if (filters?.pipelineId) where.pipelineId = filters.pipelineId;
    if (filters?.stageId) where.stageId = filters.stageId;
    if (filters?.status) where.status = filters.status;
    if (filters?.ownerId) where.ownerId = filters.ownerId;
    if (filters?.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    return this.prisma.deal.findMany({
      where,
      include: {
        stage: true,
        owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        company: { select: { id: true, name: true } },
        contacts: {
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        _count: { select: { tasks: true, activities: true } },
      },
      orderBy: [{ stage: { position: 'asc' } }, { position: 'asc' }],
    });
  }

  async findById(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: {
        stage: true,
        pipeline: { include: { stages: { orderBy: { position: 'asc' } } } },
        owner: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        company: true,
        lead: { include: { contact: true } },
        contacts: { include: { contact: true } },
        tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { firstName: true, lastName: true, avatar: true } } } },
        tags: { include: { tag: true } },
        comments: { orderBy: { createdAt: 'desc' }, include: { user: { select: { firstName: true, lastName: true, avatar: true } } } },
      },
    });
    if (!deal) throw new NotFoundException('Negócio não encontrado');
    return deal;
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateDealDto) {
    await this.ensureExists(organizationId, id);

    return this.prisma.deal.update({
      where: { id },
      data: {
        title: dto.title,
        value: dto.value,
        ownerId: dto.ownerId,
        companyId: dto.companyId,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
        customFields: dto.customFields,
      },
      include: { stage: true, owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async moveStage(organizationId: string, id: string, userId: string, dto: MoveDealDto) {
    const deal = await this.ensureExists(organizationId, id);

    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        stageId: dto.stageId,
        position: dto.position ?? 0,
      },
      include: { stage: true },
    });

    await this.prisma.activity.create({
      data: {
        organizationId,
        userId,
        type: 'STAGE_CHANGE',
        title: `Movido para "${updated.stage.name}"`,
        dealId: id,
        metadata: { fromStageId: deal.stageId, toStageId: dto.stageId },
      },
    });

    return updated;
  }

  async markWon(organizationId: string, id: string, userId: string, reason?: string) {
    await this.ensureExists(organizationId, id);

    const deal = await this.prisma.deal.update({
      where: { id },
      data: { status: 'WON', closedAt: new Date(), wonReason: reason },
    });

    await this.prisma.activity.create({
      data: {
        organizationId,
        userId,
        type: 'STATUS_CHANGE',
        title: 'Negócio ganho!',
        dealId: id,
      },
    });

    return deal;
  }

  async markLost(organizationId: string, id: string, userId: string, reason?: string) {
    await this.ensureExists(organizationId, id);

    const deal = await this.prisma.deal.update({
      where: { id },
      data: { status: 'LOST', closedAt: new Date(), lostReason: reason },
    });

    await this.prisma.activity.create({
      data: {
        organizationId,
        userId,
        type: 'STATUS_CHANGE',
        title: 'Negócio perdido',
        dealId: id,
        metadata: { reason },
      },
    });

    return deal;
  }

  async getKanbanView(organizationId: string, pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            deals: {
              where: { status: 'OPEN' },
              orderBy: { position: 'asc' },
              include: {
                owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                company: { select: { id: true, name: true } },
                _count: { select: { tasks: true } },
              },
            },
          },
        },
      },
    });

    if (!pipeline) throw new NotFoundException('Pipeline não encontrado');
    return pipeline;
  }

  async getSummary(organizationId: string, pipelineId?: string) {
    const where: any = { organizationId };
    if (pipelineId) where.pipelineId = pipelineId;

    const [open, won, lost, totalValue] = await Promise.all([
      this.prisma.deal.count({ where: { ...where, status: 'OPEN' } }),
      this.prisma.deal.count({ where: { ...where, status: 'WON' } }),
      this.prisma.deal.count({ where: { ...where, status: 'LOST' } }),
      this.prisma.deal.aggregate({
        where: { ...where, status: 'OPEN' },
        _sum: { value: true },
      }),
    ]);

    return { open, won, lost, totalOpenValue: totalValue._sum.value || 0 };
  }

  private async ensureExists(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) throw new NotFoundException('Negócio não encontrado');
    return deal;
  }
}
