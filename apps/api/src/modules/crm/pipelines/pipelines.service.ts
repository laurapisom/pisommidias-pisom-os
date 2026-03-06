import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.pipeline.findMany({
      where: { organizationId },
      include: {
        stages: { orderBy: { position: 'asc' } },
        _count: { select: { deals: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async create(organizationId: string, data: {
    name: string;
    description?: string;
    stages?: Array<{ name: string; color?: string; probability?: number }>;
  }) {
    return this.prisma.pipeline.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        stages: data.stages
          ? {
              create: data.stages.map((s, i) => ({
                name: s.name,
                color: s.color,
                probability: s.probability || 0,
                position: i,
              })),
            }
          : undefined,
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
  }

  async addStage(pipelineId: string, data: {
    name: string;
    color?: string;
    probability?: number;
    position?: number;
  }) {
    const maxPos = await this.prisma.pipelineStage.aggregate({
      where: { pipelineId },
      _max: { position: true },
    });

    return this.prisma.pipelineStage.create({
      data: {
        pipelineId,
        name: data.name,
        color: data.color,
        probability: data.probability || 0,
        position: data.position ?? (maxPos._max.position ?? 0) + 1,
      },
    });
  }

  async getDefault(organizationId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { organizationId, isDefault: true },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (!pipeline) throw new NotFoundException('Pipeline padrão não encontrado');
    return pipeline;
  }
}
