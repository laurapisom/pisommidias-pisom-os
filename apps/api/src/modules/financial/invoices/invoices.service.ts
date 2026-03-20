import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, data: {
    contractId?: string;
    companyId?: string;
    type?: string;
    value: number;
    discount?: number;
    tax?: number;
    description?: string;
    dueDate: string;
    referenceMonth?: string;
  }) {
    const discount = data.discount || 0;
    const tax = data.tax || 0;
    const totalValue = data.value - discount + tax;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    });

    const nextNumber = lastInvoice?.number
      ? String(parseInt(lastInvoice.number) + 1).padStart(6, '0')
      : '000001';

    return this.prisma.invoice.create({
      data: {
        organizationId,
        contractId: data.contractId,
        companyId: data.companyId,
        number: nextNumber,
        type: (data.type as any) || 'RECURRING',
        value: data.value,
        discount,
        tax,
        totalValue,
        description: data.description,
        dueDate: new Date(data.dueDate),
        referenceMonth: data.referenceMonth,
      },
    });
  }

  async findAll(organizationId: string, filters?: {
    status?: string;
    contractId?: string;
    companyId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.contractId) where.contractId = filters.contractId;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { number: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.startDate || filters?.endDate) {
      where.dueDate = {};
      if (filters?.startDate) where.dueDate.gte = new Date(filters.startDate);
      if (filters?.endDate) where.dueDate.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          contract: { select: { id: true, title: true, companyId: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        contract: { select: { id: true, title: true, value: true, billingCycle: true } },
        company: { select: { id: true, name: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    return invoice;
  }

  async update(organizationId: string, id: string, data: Record<string, any>) {
    await this.ensureExists(organizationId, id);
    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.value !== undefined) {
      updateData.value = data.value;
      const discount = data.discount ?? 0;
      const tax = data.tax ?? 0;
      updateData.discount = discount;
      updateData.tax = tax;
      updateData.totalValue = data.value - discount + tax;
    }
    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        contract: { select: { id: true, title: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async markSent(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  async markPaid(organizationId: string, id: string, data: {
    paidValue?: number;
    paymentMethod?: string;
    paidAt?: string;
  }) {
    const invoice = await this.ensureExists(organizationId, id);
    const paidValue = data.paidValue || Number(invoice.totalValue);
    const isPartial = paidValue < Number(invoice.totalValue);

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: isPartial ? 'PARTIALLY_PAID' : 'PAID',
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        paidValue,
        paymentMethod: data.paymentMethod,
      },
    });
  }

  async markOverdue(organizationId: string) {
    const now = new Date();
    const result = await this.prisma.invoice.updateMany({
      where: {
        organizationId,
        status: { in: ['PENDING', 'SENT'] },
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });
    return { updated: result.count };
  }

  async cancel(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async getSummary(organizationId: string, month?: string) {
    const now = new Date();
    const startOfMonth = month
      ? new Date(`${month}-01`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59);

    const where = { organizationId, dueDate: { gte: startOfMonth, lte: endOfMonth } };

    const [totalBilled, totalPaid, totalPending, totalOverdue, overdueCount] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { ...where },
        _sum: { totalValue: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { paidValue: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { organizationId, status: { in: ['PENDING', 'SENT'] } },
        _sum: { totalValue: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { organizationId, status: 'OVERDUE' },
        _sum: { totalValue: true },
      }),
      this.prisma.invoice.count({
        where: { organizationId, status: 'OVERDUE' },
      }),
    ]);

    return {
      month: startOfMonth.toISOString().slice(0, 7),
      billed: { total: Number(totalBilled._sum.totalValue || 0), count: totalBilled._count },
      received: { total: Number(totalPaid._sum.paidValue || 0), count: totalPaid._count },
      pending: { total: Number(totalPending._sum.totalValue || 0), count: totalPending._count },
      overdue: { total: Number(totalOverdue._sum.totalValue || 0), count: overdueCount },
      conversionRate: totalBilled._count > 0
        ? Math.round((totalPaid._count / totalBilled._count) * 100)
        : 0,
    };
  }

  async generateFromContracts(organizationId: string) {
    const today = new Date();
    const contracts = await this.prisma.contract.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        nextBillingDate: { lte: today },
      },
    });

    const created: any[] = [];
    for (const contract of contracts) {
      const refMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      const existing = await this.prisma.invoice.findFirst({
        where: { contractId: contract.id, referenceMonth: refMonth },
      });
      if (existing) continue;

      const invoice = await this.create(organizationId, {
        contractId: contract.id,
        companyId: contract.companyId || undefined,
        value: Number(contract.value),
        dueDate: contract.nextBillingDate!.toISOString(),
        referenceMonth: refMonth,
        description: `${contract.title} - ${refMonth}`,
      });

      // Advance next billing date
      const next = new Date(contract.nextBillingDate!);
      switch (contract.billingCycle) {
        case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
        case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break;
        case 'SEMIANNUAL': next.setMonth(next.getMonth() + 6); break;
        case 'ANNUAL': next.setFullYear(next.getFullYear() + 1); break;
      }

      await this.prisma.contract.update({
        where: { id: contract.id },
        data: { nextBillingDate: next },
      });

      created.push(invoice);
    }

    return { generated: created.length, invoices: created };
  }

  private async ensureExists(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, organizationId } });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    return invoice;
  }
}
