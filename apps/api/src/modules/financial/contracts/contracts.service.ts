import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, data: {
    title: string;
    companyId?: string;
    dealId?: string;
    value: number;
    billingCycle?: string;
    startDate: string;
    endDate?: string;
    dayOfMonth?: number;
    services?: string[];
    notes?: string;
  }) {
    const startDate = new Date(data.startDate);
    const nextBilling = new Date(startDate);
    nextBilling.setDate(data.dayOfMonth || 10);
    if (nextBilling <= startDate) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }

    return this.prisma.contract.create({
      data: {
        organizationId,
        companyId: data.companyId,
        dealId: data.dealId,
        title: data.title,
        value: data.value,
        billingCycle: (data.billingCycle as any) || 'MONTHLY',
        startDate,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        dayOfMonth: data.dayOfMonth || 10,
        nextBillingDate: nextBilling,
        services: data.services || [],
        notes: data.notes,
      },
    });
  }

  async findAll(organizationId: string, filters?: {
    status?: string;
    companyId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters?.startDate || filters?.endDate) {
      where.startDate = {};
      if (filters?.startDate) where.startDate.gte = new Date(filters.startDate);
      if (filters?.endDate) where.startDate.lte = new Date(filters.endDate);
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(organizationId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
      include: {
        company: { select: { id: true, name: true } },
        invoices: {
          orderBy: { dueDate: 'desc' },
          take: 24,
        },
      },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }

  async update(organizationId: string, id: string, data: Record<string, any>) {
    await this.ensureExists(organizationId, id);
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    return this.prisma.contract.update({ where: { id }, data: updateData });
  }

  async cancel(organizationId: string, id: string, reason?: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.contract.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
  }

  async getMRR(organizationId: string) {
    const activeContracts = await this.prisma.contract.findMany({
      where: { organizationId, status: 'ACTIVE' },
    });

    let mrr = 0;
    for (const c of activeContracts) {
      const monthly = Number(c.value);
      switch (c.billingCycle) {
        case 'MONTHLY': mrr += monthly; break;
        case 'QUARTERLY': mrr += monthly / 3; break;
        case 'SEMIANNUAL': mrr += monthly / 6; break;
        case 'ANNUAL': mrr += monthly / 12; break;
        default: mrr += monthly; break;
      }
    }

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      activeContracts: activeContracts.length,
    };
  }

  private async ensureExists(organizationId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({ where: { id, organizationId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }
}
