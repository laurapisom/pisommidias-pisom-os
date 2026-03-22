import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, data: {
    name: string;
    type?: string;
    bank?: string;
    agency?: string;
    accountNumber?: string;
    initialBalance?: number;
    color?: string;
    isDefault?: boolean;
  }) {
    // Se for default, tirar o default das outras
    if (data.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.bankAccount.create({
      data: {
        organizationId,
        name: data.name,
        type: (data.type as any) || 'CHECKING',
        bank: data.bank,
        agency: data.agency,
        accountNumber: data.accountNumber,
        initialBalance: data.initialBalance ?? 0,
        color: data.color || '#6366f1',
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async findAll(organizationId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Calcular saldo de cada conta
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.calculateBalance(organizationId, account.id, Number(account.initialBalance));
        return { ...account, currentBalance: balance };
      }),
    );

    const totalBalance = accountsWithBalance.reduce((sum, a) => sum + a.currentBalance, 0);

    return { accounts: accountsWithBalance, totalBalance };
  }

  async findOne(organizationId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');

    const currentBalance = await this.calculateBalance(organizationId, id, Number(account.initialBalance));
    return { ...account, currentBalance };
  }

  async update(organizationId: string, id: string, data: {
    name?: string;
    type?: string;
    bank?: string;
    agency?: string;
    accountNumber?: string;
    initialBalance?: number;
    color?: string;
    isDefault?: boolean;
  }) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');

    if (data.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type as any,
        bank: data.bank,
        agency: data.agency,
        accountNumber: data.accountNumber,
        initialBalance: data.initialBalance,
        color: data.color,
        isDefault: data.isDefault,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');

    // Soft delete — desativa em vez de excluir
    return this.prisma.bankAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async calculateBalance(organizationId: string, accountId: string, initialBalance: number): Promise<number> {
    // Entradas: faturas pagas vinculadas a esta conta
    const paidInvoices = await this.prisma.invoice.aggregate({
      where: { organizationId, bankAccountId: accountId, status: 'PAID' },
      _sum: { paidValue: true },
    });

    // Saídas: despesas pagas vinculadas a esta conta
    const paidExpenses = await this.prisma.expense.aggregate({
      where: { organizationId, bankAccountId: accountId, status: 'PAID' },
      _sum: { value: true },
    });

    const income = Number(paidInvoices._sum.paidValue || 0);
    const expenses = Number(paidExpenses._sum.value || 0);

    return initialBalance + income - expenses;
  }

  async getSummary(organizationId: string) {
    const { accounts, totalBalance } = await this.findAll(organizationId);

    // Totais gerais (todas as contas, incluindo sem conta vinculada)
    const totalPaidInvoices = await this.prisma.invoice.aggregate({
      where: { organizationId, status: 'PAID' },
      _sum: { paidValue: true },
    });
    const totalPaidExpenses = await this.prisma.expense.aggregate({
      where: { organizationId, status: 'PAID' },
      _sum: { value: true },
    });
    const totalPendingInvoices = await this.prisma.invoice.aggregate({
      where: { organizationId, status: { in: ['PENDING', 'SENT', 'OVERDUE'] } },
      _sum: { totalValue: true },
    });
    const totalPendingExpenses = await this.prisma.expense.aggregate({
      where: { organizationId, status: { in: ['PENDING', 'APPROVED'] } },
      _sum: { value: true },
    });

    return {
      accounts,
      totalBalance,
      totalReceived: Number(totalPaidInvoices._sum.paidValue || 0),
      totalSpent: Number(totalPaidExpenses._sum.value || 0),
      totalPendingReceivable: Number(totalPendingInvoices._sum.totalValue || 0),
      totalPendingPayable: Number(totalPendingExpenses._sum.value || 0),
    };
  }
}
