import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, data: {
    title: string;
    value: number;
    dueDate: string;
    categoryId?: string;
    costCenterId?: string;
    type?: string;
    recurrence?: string;
    supplier?: string;
    invoiceNumber?: string;
    description?: string;
    notes?: string;
  }) {
    return this.prisma.expense.create({
      data: {
        organizationId,
        createdById: userId,
        title: data.title,
        value: data.value,
        dueDate: new Date(data.dueDate),
        categoryId: data.categoryId,
        costCenterId: data.costCenterId,
        type: (data.type as any) || 'FIXED',
        recurrence: data.recurrence as any,
        supplier: data.supplier,
        invoiceNumber: data.invoiceNumber,
        description: data.description,
        notes: data.notes,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        costCenter: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async findAll(organizationId: string, filters?: {
    status?: string;
    categoryId?: string;
    costCenterId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.costCenterId) where.costCenterId = filters.costCenterId;
    if (filters?.type) where.type = filters.type;
    if (filters?.startDate || filters?.endDate) {
      where.dueDate = {};
      if (filters?.startDate) where.dueDate.gte = new Date(filters.startDate);
      if (filters?.endDate) where.dueDate.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
          costCenter: { select: { id: true, name: true, type: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(organizationId: string, id: string, data: Record<string, any>) {
    await this.ensureExists(organizationId, id);
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.supplier !== undefined) updateData.supplier = data.supplier;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null;
    if (data.costCenterId !== undefined) updateData.costCenterId = data.costCenterId || null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    return this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, color: true } },
        costCenter: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async approve(organizationId: string, id: string, userId: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.expense.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId },
    });
  }

  async markPaid(organizationId: string, id: string, paidAt?: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.expense.update({
      where: { id },
      data: { status: 'PAID', paidAt: paidAt ? new Date(paidAt) : new Date() },
    });
  }

  async reject(organizationId: string, id: string, userId: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.expense.update({
      where: { id },
      data: { status: 'REJECTED', approvedById: userId },
    });
  }

  async getSummary(organizationId: string, month?: string) {
    const now = new Date();
    const start = month
      ? new Date(`${month}-01`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

    const where = { organizationId, dueDate: { gte: start, lte: end } };

    const [totalExpenses, paidExpenses, pendingExpenses, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { value: true }, _count: true }),
      this.prisma.expense.aggregate({ where: { ...where, status: 'PAID' }, _sum: { value: true } }),
      this.prisma.expense.aggregate({
        where: { ...where, status: { in: ['PENDING', 'APPROVED'] } },
        _sum: { value: true },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _sum: { value: true },
        _count: true,
        orderBy: { _sum: { value: 'desc' } },
      }),
    ]);

    const categories = await Promise.all(
      byCategory.map(async (item) => {
        const cat = item.categoryId
          ? await this.prisma.expenseCategory.findUnique({
              where: { id: item.categoryId },
              select: { name: true, color: true },
            })
          : null;
        return {
          categoryId: item.categoryId,
          categoryName: cat?.name || 'Sem categoria',
          color: cat?.color,
          total: Number(item._sum.value || 0),
          count: item._count,
        };
      }),
    );

    return {
      month: start.toISOString().slice(0, 7),
      total: Number(totalExpenses._sum.value || 0),
      count: totalExpenses._count,
      paid: Number(paidExpenses._sum.value || 0),
      pending: Number(pendingExpenses._sum.value || 0),
      byCategory: categories,
    };
  }

  // Category CRUD
  async createCategory(organizationId: string, data: { name: string; color?: string; parentId?: string }) {
    return this.prisma.expenseCategory.create({
      data: { organizationId, ...data },
    });
  }

  async getCategories(organizationId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { organizationId, isActive: true },
      include: { _count: { select: { expenses: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // Cost Center CRUD
  async createCostCenter(organizationId: string, data: { name: string; type?: string; referenceId?: string }) {
    return this.prisma.costCenter.create({
      data: { organizationId, name: data.name, type: (data.type as any) || 'GENERAL', referenceId: data.referenceId },
    });
  }

  async getCostCenters(organizationId: string) {
    return this.prisma.costCenter.findMany({
      where: { organizationId, isActive: true },
      include: { _count: { select: { expenses: true } } },
      orderBy: { name: 'asc' },
    });
  }

  private async ensureExists(organizationId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, organizationId } });
    if (!expense) throw new NotFoundException('Despesa não encontrada');
    return expense;
  }
}
