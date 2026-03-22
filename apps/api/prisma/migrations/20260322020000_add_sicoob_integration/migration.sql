-- AlterTable: Add Sicoob fields to integrations
ALTER TABLE "integrations" ADD COLUMN "clientId" TEXT;
ALTER TABLE "integrations" ADD COLUMN "clientSecret" TEXT;
ALTER TABLE "integrations" ADD COLUMN "certificatePath" TEXT;
ALTER TABLE "integrations" ADD COLUMN "certificatePass" TEXT;
ALTER TABLE "integrations" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "integrations" ADD COLUMN "agency" TEXT;
ALTER TABLE "integrations" ALTER COLUMN "apiKey" SET DEFAULT '';

-- AlterTable: Add sicoobStatementId to expenses
ALTER TABLE "expenses" ADD COLUMN "sicoobStatementId" TEXT;
CREATE UNIQUE INDEX "expenses_sicoobStatementId_key" ON "expenses"("sicoobStatementId");

-- CreateTable: bank_statements
CREATE TABLE "bank_statements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "externalId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2),
    "type" TEXT NOT NULL,
    "category" TEXT,
    "counterpart" TEXT,
    "documentNumber" TEXT,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "reconciledExpenseId" TEXT,
    "reconciledInvoiceId" TEXT,
    "reconciledTransferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bank_statements_organizationId_bankAccountId_externalId_key" ON "bank_statements"("organizationId", "bankAccountId", "externalId");
CREATE INDEX "bank_statements_organizationId_date_idx" ON "bank_statements"("organizationId", "date");
CREATE INDEX "bank_statements_organizationId_reconciled_idx" ON "bank_statements"("organizationId", "reconciled");

ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_reconciledExpenseId_fkey" FOREIGN KEY ("reconciledExpenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_reconciledInvoiceId_fkey" FOREIGN KEY ("reconciledInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_reconciledTransferId_fkey" FOREIGN KEY ("reconciledTransferId") REFERENCES "internal_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: internal_transfers
CREATE TABLE "internal_transfers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "asaasTransactionId" TEXT,
    "sicoobTransactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "internal_transfers_organizationId_date_idx" ON "internal_transfers"("organizationId", "date");

ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: dda_bills
CREATE TABLE "dda_bills" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "barcode" TEXT,
    "issuerName" TEXT NOT NULL,
    "issuerDocument" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dda_bills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dda_bills_organizationId_externalId_key" ON "dda_bills"("organizationId", "externalId");
CREATE INDEX "dda_bills_organizationId_dueDate_idx" ON "dda_bills"("organizationId", "dueDate");
CREATE INDEX "dda_bills_organizationId_status_idx" ON "dda_bills"("organizationId", "status");

ALTER TABLE "dda_bills" ADD CONSTRAINT "dda_bills_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dda_bills" ADD CONSTRAINT "dda_bills_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: scheduled_payments
CREATE TABLE "scheduled_payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "externalId" TEXT,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientDoc" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "paidAt" TIMESTAMP(3),
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scheduled_payments_organizationId_externalId_key" ON "scheduled_payments"("organizationId", "externalId");
CREATE INDEX "scheduled_payments_organizationId_scheduledDate_idx" ON "scheduled_payments"("organizationId", "scheduledDate");

ALTER TABLE "scheduled_payments" ADD CONSTRAINT "scheduled_payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_payments" ADD CONSTRAINT "scheduled_payments_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_payments" ADD CONSTRAINT "scheduled_payments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
