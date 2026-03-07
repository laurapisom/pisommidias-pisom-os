import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BankAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, data: {
    name: string;
    type?: string;
    bankName?: string;
    bankCode?: string;
    agency?: string;
    accountNumber?: string;
    pixKey?: string;
    pixKeyType?: string;
    initialBalance?: number;
    isPrimary?: boolean;
    color?: string;
    notes?: string;
  }) {
    const initialBalance = data.initialBalance || 0;

    if (data.isPrimary) {
      await this.prisma.bankAccount.updateMany({
        where: { organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.bankAccount.create({
      data: {
        organizationId,
        name: data.name,
        type: (data.type as any) || 'CHECKING',
        bankName: data.bankName,
        bankCode: data.bankCode,
        agency: data.agency,
        accountNumber: data.accountNumber,
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType,
        initialBalance,
        currentBalance: initialBalance,
        reconciledBalance: initialBalance,
        projectedBalance: initialBalance,
        isPrimary: data.isPrimary || false,
        color: data.color,
        notes: data.notes,
      },
    });
  }

  async findAll(organizationId: string, filters?: {
    isActive?: boolean;
    type?: string;
  }) {
    const where: Prisma.BankAccountWhereInput = { organizationId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.type) {
      where.type = filters.type as any;
    }

    const accounts = await this.prisma.bankAccount.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });

    const totals = await this.prisma.bankAccount.aggregate({
      where: { organizationId, isActive: true },
      _sum: {
        currentBalance: true,
        projectedBalance: true,
      },
    });

    return {
      accounts,
      totals: {
        currentBalance: Number(totals._sum.currentBalance || 0),
        projectedBalance: Number(totals._sum.projectedBalance || 0),
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Conta bancaria nao encontrada');
    }

    return account;
  }

  async update(organizationId: string, id: string, data: {
    name?: string;
    type?: string;
    bankName?: string;
    bankCode?: string;
    agency?: string;
    accountNumber?: string;
    pixKey?: string;
    pixKeyType?: string;
    isPrimary?: boolean;
    isActive?: boolean;
    color?: string;
    notes?: string;
  }) {
    await this.findOne(organizationId, id);

    if (data.isPrimary) {
      await this.prisma.bankAccount.updateMany({
        where: { organizationId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updateData: any = { ...data };
    if (data.type) updateData.type = data.type as any;

    return this.prisma.bankAccount.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(organizationId: string, id: string) {
    const account = await this.findOne(organizationId, id);

    const entriesCount = await this.prisma.financialEntry.count({
      where: { bankAccountId: id, deletedAt: null },
    });

    if (entriesCount > 0) {
      throw new ConflictException(
        `Conta bancaria possui ${entriesCount} lancamentos vinculados. Desative-a em vez de excluir.`,
      );
    }

    return this.prisma.bankAccount.delete({ where: { id } });
  }

  async recalculateBalance(organizationId: string, accountId: string) {
    const account = await this.findOne(organizationId, accountId);

    const [received, paid] = await Promise.all([
      this.prisma.financialEntry.aggregate({
        where: {
          bankAccountId: accountId,
          type: 'RECEIVABLE',
          status: { in: ['RECEIVED', 'PAID'] },
          deletedAt: null,
        },
        _sum: { paidValue: true },
      }),
      this.prisma.financialEntry.aggregate({
        where: {
          bankAccountId: accountId,
          type: 'PAYABLE',
          status: { in: ['RECEIVED', 'PAID'] },
          deletedAt: null,
        },
        _sum: { paidValue: true },
      }),
    ]);

    const [transfersIn, transfersOut] = await Promise.all([
      this.prisma.bankTransfer.aggregate({
        where: { toAccountId: accountId },
        _sum: { amount: true },
      }),
      this.prisma.bankTransfer.aggregate({
        where: { fromAccountId: accountId },
        _sum: { amount: true },
      }),
    ]);

    const initial = Number(account.initialBalance);
    const inflows = Number(received._sum.paidValue || 0) + Number(transfersIn._sum.amount || 0);
    const outflows = Number(paid._sum.paidValue || 0) + Number(transfersOut._sum.amount || 0);
    const currentBalance = initial + inflows - outflows;

    // Projected: current + future pending
    const [futureReceivable, futurePayable] = await Promise.all([
      this.prisma.financialEntry.aggregate({
        where: {
          bankAccountId: accountId,
          type: 'RECEIVABLE',
          status: { in: ['PENDING', 'CONFIRMED'] },
          deletedAt: null,
        },
        _sum: { value: true },
      }),
      this.prisma.financialEntry.aggregate({
        where: {
          bankAccountId: accountId,
          type: 'PAYABLE',
          status: { in: ['PENDING', 'CONFIRMED'] },
          deletedAt: null,
        },
        _sum: { value: true },
      }),
    ]);

    const projectedBalance =
      currentBalance +
      Number(futureReceivable._sum.value || 0) -
      Number(futurePayable._sum.value || 0);

    return this.prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        currentBalance,
        projectedBalance,
      },
    });
  }

  async transfer(organizationId: string, data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
    transferDate?: string;
  }) {
    if (data.fromAccountId === data.toAccountId) {
      throw new BadRequestException('Conta de origem e destino devem ser diferentes');
    }

    if (data.amount <= 0) {
      throw new BadRequestException('Valor da transferencia deve ser positivo');
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.findOne(organizationId, data.fromAccountId),
      this.findOne(organizationId, data.toAccountId),
    ]);

    if (!fromAccount.isActive || !toAccount.isActive) {
      throw new BadRequestException('Ambas as contas devem estar ativas');
    }

    const transferDate = data.transferDate ? new Date(data.transferDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.bankTransfer.create({
        data: {
          organizationId,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          amount: data.amount,
          description: data.description,
          transferDate,
        },
      });

      await tx.bankAccount.update({
        where: { id: data.fromAccountId },
        data: {
          currentBalance: { decrement: data.amount },
          projectedBalance: { decrement: data.amount },
        },
      });

      await tx.bankAccount.update({
        where: { id: data.toAccountId },
        data: {
          currentBalance: { increment: data.amount },
          projectedBalance: { increment: data.amount },
        },
      });

      return transfer;
    });
  }

  async getStatement(organizationId: string, accountId: string, filters: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    await this.findOne(organizationId, accountId);

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const dateFilter: any = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);

    const where: Prisma.FinancialEntryWhereInput = {
      bankAccountId: accountId,
      deletedAt: null,
      status: { in: ['RECEIVED', 'PAID'] },
    };

    if (Object.keys(dateFilter).length > 0) {
      where.paymentDate = dateFilter;
    }

    const [entries, total] = await Promise.all([
      this.prisma.financialEntry.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, color: true } },
        },
      }),
      this.prisma.financialEntry.count({ where }),
    ]);

    const transfers = await this.prisma.bankTransfer.findMany({
      where: {
        organizationId,
        OR: [
          { fromAccountId: accountId },
          { toAccountId: accountId },
        ],
        ...(Object.keys(dateFilter).length > 0
          ? { transferDate: dateFilter }
          : {}),
      },
      orderBy: { transferDate: 'desc' },
      include: {
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    });

    const movements = [
      ...entries.map((e) => ({
        id: e.id,
        type: 'ENTRY' as const,
        date: e.paymentDate,
        description: e.description,
        amount: e.type === 'RECEIVABLE'
          ? Number(e.paidValue || e.value)
          : -Number(e.paidValue || e.value),
        category: (e as any).category,
        entryType: e.type,
        status: e.status,
      })),
      ...transfers.map((t) => ({
        id: t.id,
        type: 'TRANSFER' as const,
        date: t.transferDate,
        description: t.description || `Transferencia ${t.fromAccount.name} -> ${t.toAccount.name}`,
        amount: t.toAccountId === accountId
          ? Number(t.amount)
          : -Number(t.amount),
        category: null,
        entryType: null,
        status: null,
      })),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return {
      movements,
      total: total + transfers.length,
      page,
      limit,
    };
  }

  async closePeriod(organizationId: string, accountId: string, data: {
    year: number;
    month: number;
    closingBalance: number;
  }) {
    const account = await this.findOne(organizationId, accountId);

    const closedPeriods = (account.closedPeriods as any[]) || [];
    const periodKey = `${data.year}-${String(data.month).padStart(2, '0')}`;

    if (closedPeriods.some((p: any) => p.period === periodKey)) {
      throw new ConflictException(`Periodo ${periodKey} ja esta fechado`);
    }

    closedPeriods.push({
      period: periodKey,
      closingBalance: data.closingBalance,
      closedAt: new Date().toISOString(),
    });

    return this.prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        closedPeriods: closedPeriods as any,
        reconciledBalance: data.closingBalance,
      },
    });
  }

  async isPeriodClosed(organizationId: string, accountId: string, date: Date): Promise<boolean> {
    const account = await this.findOne(organizationId, accountId);
    const closedPeriods = (account.closedPeriods as any[]) || [];
    const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return closedPeriods.some((p: any) => p.period === periodKey);
  }
}
