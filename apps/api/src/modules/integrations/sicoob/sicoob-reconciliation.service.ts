import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

const TOLERANCE_DAYS = 3; // ±3 days for date matching
const TOLERANCE_AMOUNT = 0.01; // R$ 0.01 tolerance for value matching

@Injectable()
export class SicoobReconciliationService {
  private readonly logger = new Logger(SicoobReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main reconciliation entry point.
   * Matches unreconciled bank statements with expenses, invoices, and transfers.
   */
  async reconcile(organizationId: string, bankAccountId: string): Promise<number> {
    let reconciled = 0;

    const statements = await this.prisma.bankStatement.findMany({
      where: { organizationId, bankAccountId, reconciled: false },
      orderBy: { date: 'asc' },
    });

    if (statements.length === 0) return 0;

    const createdById = await this.getSystemUserId(organizationId);

    for (const stmt of statements) {
      // 1. Try to detect inter-account transfer (Asaas ↔ Sicoob)
      if (await this.tryMatchTransfer(organizationId, bankAccountId, stmt)) {
        reconciled++;
        continue;
      }

      const absAmount = Math.abs(Number(stmt.amount));

      if (stmt.type === 'DEBIT') {
        // 2. Try to match with existing FIXED expense
        if (await this.tryMatchExpense(organizationId, bankAccountId, stmt, absAmount)) {
          reconciled++;
          continue;
        }

        // 3. Create new expense for unmatched debits
        await this.createExpenseFromStatement(organizationId, bankAccountId, stmt, absAmount, createdById);
        reconciled++;
      } else {
        // 4. Try to match credits with pending invoices
        if (await this.tryMatchInvoice(organizationId, bankAccountId, stmt, absAmount)) {
          reconciled++;
        }
        // Credits that don't match anything stay unreconciled for manual review
      }
    }

    this.logger.log(`Reconciliation: ${reconciled} of ${statements.length} statements reconciled for org ${organizationId}`);
    return reconciled;
  }

  /**
   * Manual match: link a specific statement to an expense
   */
  async matchStatementToExpense(statementId: string, expenseId: string): Promise<void> {
    const stmt = await this.prisma.bankStatement.findUniqueOrThrow({ where: { id: statementId } });

    await this.prisma.$transaction([
      this.prisma.bankStatement.update({
        where: { id: statementId },
        data: {
          reconciled: true,
          reconciledAt: new Date(),
          reconciledExpenseId: expenseId,
        },
      }),
      this.prisma.expense.update({
        where: { id: expenseId },
        data: {
          status: 'PAID',
          paidAt: stmt.date,
          bankAccountId: stmt.bankAccountId,
          sicoobStatementId: stmt.externalId,
        },
      }),
    ]);
  }

  /**
   * Manual match: link a specific statement to an invoice
   */
  async matchStatementToInvoice(statementId: string, invoiceId: string): Promise<void> {
    const stmt = await this.prisma.bankStatement.findUniqueOrThrow({ where: { id: statementId } });

    await this.prisma.$transaction([
      this.prisma.bankStatement.update({
        where: { id: statementId },
        data: {
          reconciled: true,
          reconciledAt: new Date(),
          reconciledInvoiceId: invoiceId,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: stmt.date,
          paidValue: Math.abs(Number(stmt.amount)),
          bankAccountId: stmt.bankAccountId,
        },
      }),
    ]);
  }

  /**
   * Undo a reconciliation match
   */
  async unmatchStatement(statementId: string): Promise<void> {
    await this.prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        reconciled: false,
        reconciledAt: null,
        reconciledExpenseId: null,
        reconciledInvoiceId: null,
        reconciledTransferId: null,
      },
    });
  }

  // ── Private Methods ──────────────────────────────────────

  /**
   * Detect inter-account transfers (Asaas → Sicoob or vice versa).
   * Looks for matching Asaas TRANSFER transactions within ±1 day.
   */
  private async tryMatchTransfer(
    organizationId: string,
    sicoobAccountId: string,
    stmt: any,
  ): Promise<boolean> {
    const amount = Number(stmt.amount);
    // Only credits might be transfers from Asaas
    if (amount <= 0) return false;

    const desc = (stmt.description || '').toUpperCase();
    const isLikelyTransfer = desc.includes('ASAAS') || desc.includes('TED') ||
      desc.includes('TRANSF') || (stmt.category === 'TED');

    if (!isLikelyTransfer) return false;

    // Look for matching Asaas expense (type=TRANSFER) with same amount ±1 day
    const dateMin = new Date(stmt.date);
    dateMin.setDate(dateMin.getDate() - 1);
    const dateMax = new Date(stmt.date);
    dateMax.setDate(dateMax.getDate() + 1);

    const asaasExpense = await this.prisma.expense.findFirst({
      where: {
        organizationId,
        asaasTransactionId: { not: null },
        paidAt: { gte: dateMin, lte: dateMax },
        value: { gte: amount - TOLERANCE_AMOUNT, lte: amount + TOLERANCE_AMOUNT },
        // Check if category is transfer
        category: { name: { contains: 'Transferência', mode: 'insensitive' } },
      },
      include: { bankAccount: true },
    });

    if (!asaasExpense || !asaasExpense.bankAccountId) return false;

    // Create internal transfer record
    const transfer = await this.prisma.internalTransfer.create({
      data: {
        organizationId,
        fromAccountId: asaasExpense.bankAccountId,
        toAccountId: sicoobAccountId,
        amount,
        date: stmt.date,
        description: `Transferência Asaas → Sicoob`,
        asaasTransactionId: asaasExpense.asaasTransactionId,
        sicoobTransactionId: stmt.externalId,
        status: 'DETECTED',
      },
    });

    // Mark statement as reconciled
    await this.prisma.bankStatement.update({
      where: { id: stmt.id },
      data: {
        reconciled: true,
        reconciledAt: new Date(),
        reconciledTransferId: transfer.id,
      },
    });

    return true;
  }

  /**
   * Match debit statement with existing expense by value + date (±3 days).
   */
  private async tryMatchExpense(
    organizationId: string,
    bankAccountId: string,
    stmt: any,
    absAmount: number,
  ): Promise<boolean> {
    const dateMin = new Date(stmt.date);
    dateMin.setDate(dateMin.getDate() - TOLERANCE_DAYS);
    const dateMax = new Date(stmt.date);
    dateMax.setDate(dateMax.getDate() + TOLERANCE_DAYS);

    // Find pending/approved expenses matching value and approximate date
    const matchingExpense = await this.prisma.expense.findFirst({
      where: {
        organizationId,
        status: { in: ['PENDING', 'APPROVED'] },
        value: { gte: absAmount - TOLERANCE_AMOUNT, lte: absAmount + TOLERANCE_AMOUNT },
        dueDate: { gte: dateMin, lte: dateMax },
        // Don't match expenses already linked to Asaas
        asaasTransactionId: null,
        sicoobStatementId: null,
      },
      orderBy: [
        // Prefer FIXED expenses (more predictable)
        { type: 'asc' },
        // Then closest date
        { dueDate: 'asc' },
      ],
    });

    if (!matchingExpense) return false;

    await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id: matchingExpense.id },
        data: {
          status: 'PAID',
          paidAt: stmt.date,
          bankAccountId,
          sicoobStatementId: stmt.externalId,
        },
      }),
      this.prisma.bankStatement.update({
        where: { id: stmt.id },
        data: {
          reconciled: true,
          reconciledAt: new Date(),
          reconciledExpenseId: matchingExpense.id,
        },
      }),
    ]);

    return true;
  }

  /**
   * Match credit statement with pending invoice by value + date.
   */
  private async tryMatchInvoice(
    organizationId: string,
    bankAccountId: string,
    stmt: any,
    absAmount: number,
  ): Promise<boolean> {
    const dateMin = new Date(stmt.date);
    dateMin.setDate(dateMin.getDate() - TOLERANCE_DAYS);
    const dateMax = new Date(stmt.date);
    dateMax.setDate(dateMax.getDate() + TOLERANCE_DAYS);

    const matchingInvoice = await this.prisma.invoice.findFirst({
      where: {
        organizationId,
        status: { in: ['PENDING', 'SENT', 'OVERDUE'] },
        totalValue: { gte: absAmount - TOLERANCE_AMOUNT, lte: absAmount + TOLERANCE_AMOUNT },
        dueDate: { gte: dateMin, lte: dateMax },
        asaasPaymentId: null, // Don't match Asaas invoices
      },
    });

    if (!matchingInvoice) return false;

    await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id: matchingInvoice.id },
        data: {
          status: 'PAID',
          paidAt: stmt.date,
          paidValue: absAmount,
          bankAccountId,
        },
      }),
      this.prisma.bankStatement.update({
        where: { id: stmt.id },
        data: {
          reconciled: true,
          reconciledAt: new Date(),
          reconciledInvoiceId: matchingInvoice.id,
        },
      }),
    ]);

    return true;
  }

  /**
   * Create a new expense from an unmatched debit statement.
   */
  private async createExpenseFromStatement(
    organizationId: string,
    bankAccountId: string,
    stmt: any,
    absAmount: number,
    createdById: string,
  ): Promise<void> {
    const categoryName = this.categorizeByDescription(stmt.description || '');
    const categoryId = await this.getOrCreateCategory(organizationId, categoryName);

    const expense = await this.prisma.expense.create({
      data: {
        organizationId,
        createdById,
        title: stmt.description || 'Débito Sicoob',
        value: absAmount,
        status: 'PAID',
        type: this.inferExpenseType(stmt.description || ''),
        dueDate: stmt.date,
        paidAt: stmt.date,
        supplier: stmt.counterpart || undefined,
        categoryId,
        bankAccountId,
        sicoobStatementId: stmt.externalId,
      },
    });

    await this.prisma.bankStatement.update({
      where: { id: stmt.id },
      data: {
        reconciled: true,
        reconciledAt: new Date(),
        reconciledExpenseId: expense.id,
      },
    });
  }

  /**
   * Auto-categorize expense based on bank statement description.
   */
  private categorizeByDescription(description: string): string {
    const desc = description.toUpperCase();

    if (desc.includes('ALUGUEL') || desc.includes('LOCACAO')) return 'Aluguel';
    if (desc.includes('ENERGIA') || desc.includes('CEMIG') || desc.includes('COPEL') || desc.includes('CPFL') || desc.includes('ENEL') || desc.includes('LIGHT')) return 'Energia Elétrica';
    if (desc.includes('AGUA') || desc.includes('SANEAMENTO') || desc.includes('SABESP') || desc.includes('COPASA')) return 'Água e Saneamento';
    if (desc.includes('INTERNET') || desc.includes('VIVO') || desc.includes('CLARO') || desc.includes('TIM') || desc.includes('OI ') || desc.includes('TELECOM')) return 'Telecom/Internet';
    if (desc.includes('SEGURO')) return 'Seguros';
    if (desc.includes('CONDOMIN')) return 'Condomínio';
    if (desc.includes('IMPOSTO') || desc.includes('DARF') || desc.includes('GPS') || desc.includes('DAS ') || desc.includes('TRIBUT')) return 'Impostos e Tributos';
    if (desc.includes('TARIFA') || desc.includes('TAR ') || desc.includes('MANUT CONTA')) return 'Tarifas Bancárias (Sicoob)';
    if (desc.includes('IOF')) return 'IOF (Sicoob)';
    if (desc.includes('FOLHA') || desc.includes('SALARIO') || desc.includes('PAGTO FUNC')) return 'Folha de Pagamento';
    if (desc.includes('CONTADOR') || desc.includes('CONTABIL')) return 'Contabilidade';
    if (desc.includes('SOFTWARE') || desc.includes('LICENCA') || desc.includes('ASSINATURA')) return 'Software/Assinaturas';
    if (desc.includes('COMBUSTIVEL') || desc.includes('POSTO') || desc.includes('GASOLINA')) return 'Combustível';
    if (desc.includes('TED') || desc.includes('TRANSF')) return 'Transferências (Sicoob)';
    if (desc.includes('PIX')) return 'PIX (Sicoob)';

    return 'Outras Despesas (Sicoob)';
  }

  /**
   * Infer expense type based on description patterns.
   */
  private inferExpenseType(description: string): 'FIXED' | 'VARIABLE' | 'ONE_TIME' {
    const desc = description.toUpperCase();
    // These are typically fixed monthly expenses
    if (
      desc.includes('ALUGUEL') || desc.includes('CONDOMIN') ||
      desc.includes('ENERGIA') || desc.includes('AGUA') ||
      desc.includes('INTERNET') || desc.includes('SEGURO') ||
      desc.includes('TARIFA') || desc.includes('FOLHA')
    ) {
      return 'FIXED';
    }
    return 'VARIABLE';
  }

  private categoryCache = new Map<string, string>();

  private async getOrCreateCategory(organizationId: string, name: string): Promise<string> {
    const key = `${organizationId}:${name}`;
    if (this.categoryCache.has(key)) return this.categoryCache.get(key)!;

    let category = await this.prisma.expenseCategory.findFirst({
      where: { organizationId, name },
    });
    if (!category) {
      category = await this.prisma.expenseCategory.create({
        data: { organizationId, name },
      });
    }
    this.categoryCache.set(key, category.id);
    return category.id;
  }

  private async getSystemUserId(organizationId: string): Promise<string> {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'OWNER' },
      select: { userId: true },
    });
    if (member) return member.userId;

    const anyMember = await this.prisma.organizationMember.findFirst({
      where: { organizationId },
      select: { userId: true },
    });
    if (!anyMember) throw new Error('Nenhum membro encontrado na organização');
    return anyMember.userId;
  }
}
