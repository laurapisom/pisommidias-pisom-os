import { Module } from '@nestjs/common';
import { ContractsService } from './contracts/contracts.service';
import { ContractsController } from './contracts/contracts.controller';
import { InvoicesService } from './invoices/invoices.service';
import { InvoicesController } from './invoices/invoices.controller';
import { ExpensesService } from './expenses/expenses.service';
import { ExpensesController } from './expenses/expenses.controller';
import { CashflowService } from './cashflow/cashflow.service';
import { CashflowController } from './cashflow/cashflow.controller';

@Module({
  controllers: [
    ContractsController,
    InvoicesController,
    ExpensesController,
    CashflowController,
  ],
  providers: [
    ContractsService,
    InvoicesService,
    ExpensesService,
    CashflowService,
  ],
  exports: [ContractsService, InvoicesService, ExpensesService, CashflowService],
})
export class FinancialModule {}
