-- AlterTable: add Asaas conciliation fields to invoices
ALTER TABLE "invoices" ADD COLUMN "asaasExternalRef" TEXT;
ALTER TABLE "invoices" ADD COLUMN "asaasOriginalValue" DECIMAL(12,2);
ALTER TABLE "invoices" ADD COLUMN "asaasNetValue" DECIMAL(12,2);
ALTER TABLE "invoices" ADD COLUMN "asaasConfirmedDate" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN "asaasCreditDate" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN "asaasDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoices" ADD COLUMN "asaasRawPayload" JSONB;
