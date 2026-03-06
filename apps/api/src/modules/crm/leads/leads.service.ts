import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, data: {
    contactId?: string;
    companyId?: string;
    source?: string;
    customFields?: Record<string, any>;
  }) {
    return this.prisma.lead.create({
      data: { organizationId, ...data },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(organizationId: string, filters?: {
    status?: string;
    source?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.search) {
      where.OR = [
        { contact: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { contact: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { contact: { email: { contains: filters.search, mode: 'insensitive' } } },
        { company: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          company: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
          _count: { select: { deals: true, activities: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        company: true,
        deals: { include: { stage: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
        },
        tags: { include: { tag: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  async updateStatus(organizationId: string, id: string, status: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        status: status as any,
        convertedAt: status === 'CONVERTED' ? new Date() : undefined,
      },
    });
  }

  private async ensureExists(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }
}
