import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CashflowService {
  constructor(private prisma: PrismaService) {}

  async getCashflow(organizationId: string, months: number = 6) {
    const now = new Date();
    const results: any[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      const monthKey = start.toISOString().slice(0, 7);

      const [revenue, expenses] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            organizationId,
            status: 'PAID',
            paidAt: { gte: start, lte: end },
          },
          _sum: { paidValue: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            organizationId,
            status: 'PAID',
            paidAt: { gte: start, lte: end },
          },
          _sum: { value: true },
        }),
      ]);

      const revenueTotal = Number(revenue._sum.paidValue || 0);
      const expenseTotal = Number(expenses._sum.value || 0);

      results.push({
        month: monthKey,
        revenue: revenueTotal,
        expenses: expenseTotal,
        balance: revenueTotal - expenseTotal,
      });
    }

    return results;
  }

  async getProjectedCashflow(organizationId: string, months: number = 3) {
    const now = new Date();
    const results: any[] = [];

    for (let i = 0; i < months; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      const monthKey = start.toISOString().slice(0, 7);

      const [expectedRevenue, expectedExpenses, ddaExpenses, scheduledExpenses] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            organizationId,
            status: { in: ['PENDING', 'SENT'] },
            dueDate: { gte: start, lte: end },
          },
          _sum: { totalValue: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            organizationId,
            status: { in: ['PENDING', 'APPROVED'] },
            dueDate: { gte: start, lte: end },
          },
          _sum: { value: true },
        }),
        // DDA bills pending (certain future expenses)
        this.prisma.ddaBill.aggregate({
          where: {
            organizationId,
            status: { in: ['PENDING', 'SCHEDULED'] },
            dueDate: { gte: start, lte: end },
            expenseId: null, // Not already linked to an expense
          },
          _sum: { amount: true },
          _count: true,
        }),
        // Scheduled payments (confirmed future outflows)
        this.prisma.scheduledPayment.aggregate({
          where: {
            organizationId,
            status: { in: ['SCHEDULED', 'PROCESSING'] },
            scheduledDate: { gte: start, lte: end },
            expenseId: null,
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      const revenue = Number(expectedRevenue._sum.totalValue || 0);
      const manualExpenses = Number(expectedExpenses._sum.value || 0);
      const ddaAmount = Number(ddaExpenses._sum.amount || 0);
      const scheduledAmount = Number(scheduledExpenses._sum.amount || 0);
      const totalExpenses = manualExpenses + ddaAmount + scheduledAmount;

      results.push({
        month: monthKey,
        projected: true,
        revenue,
        expenses: totalExpenses,
        expenseBreakdown: {
          manual: manualExpenses,
          dda: ddaAmount,
          ddaCount: ddaExpenses._count,
          scheduled: scheduledAmount,
          scheduledCount: scheduledExpenses._count,
        },
        balance: revenue - totalExpenses,
      });
    }

    return results;
  }

  async getDRE(organizationId: string, month?: string) {
    const now = new Date();
    const start = month
      ? new Date(`${month}-01`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    const monthKey = start.toISOString().slice(0, 7);

    const [grossRevenue, expenses, expensesByCategory] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          status: 'PAID',
          paidAt: { gte: start, lte: end },
        },
        _sum: { paidValue: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: {
          organizationId,
          status: 'PAID',
          paidAt: { gte: start, lte: end },
        },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          organizationId,
          status: 'PAID',
          paidAt: { gte: start, lte: end },
        },
        _sum: { value: true },
      }),
    ]);

    const revenue = Number(grossRevenue._sum.paidValue || 0);
    const totalExpenses = Number(expenses._sum.value || 0);
    const netProfit = revenue - totalExpenses;
    const margin = revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0;

    const categoryBreakdown = await Promise.all(
      expensesByCategory.map(async (item) => {
        const cat = item.categoryId
          ? await this.prisma.expenseCategory.findUnique({
              where: { id: item.categoryId },
              select: { name: true, color: true },
            })
          : null;
        return {
          category: cat?.name || 'Sem categoria',
          color: cat?.color,
          value: Number(item._sum.value || 0),
        };
      }),
    );

    return {
      month: monthKey,
      grossRevenue: revenue,
      revenueCount: grossRevenue._count,
      totalExpenses,
      expenseCount: expenses._count,
      netProfit,
      margin,
      expenseBreakdown: categoryBreakdown.sort((a, b) => b.value - a.value),
    };
  }

  async getClientProfitability(organizationId: string, month?: string) {
    const now = new Date();
    const start = month
      ? new Date(`${month}-01`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

    // Revenue per contract (client)
    const contracts = await this.prisma.contract.findMany({
      where: { organizationId, status: 'ACTIVE' },
    });

    const profitability = await Promise.all(
      contracts.map(async (contract) => {
        const revenue = await this.prisma.invoice.aggregate({
          where: {
            contractId: contract.id,
            status: 'PAID',
            paidAt: { gte: start, lte: end },
          },
          _sum: { paidValue: true },
        });

        // Expenses from cost center linked to this client
        const costCenter = await this.prisma.costCenter.findFirst({
          where: { organizationId, type: 'CLIENT', referenceId: contract.companyId || undefined },
        });

        let expenseTotal = 0;
        if (costCenter) {
          const exp = await this.prisma.expense.aggregate({
            where: {
              costCenterId: costCenter.id,
              status: 'PAID',
              paidAt: { gte: start, lte: end },
            },
            _sum: { value: true },
          });
          expenseTotal = Number(exp._sum.value || 0);
        }

        const rev = Number(revenue._sum.paidValue || 0);
        const profit = rev - expenseTotal;

        return {
          contractId: contract.id,
          contractTitle: contract.title,
          companyId: contract.companyId,
          revenue: rev,
          expenses: expenseTotal,
          profit,
          margin: rev > 0 ? Math.round((profit / rev) * 10000) / 100 : 0,
        };
      }),
    );

    return profitability.sort((a, b) => b.revenue - a.revenue);
  }
}
