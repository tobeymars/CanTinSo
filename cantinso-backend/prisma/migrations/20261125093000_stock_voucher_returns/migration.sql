ALTER TYPE "TraceEventType" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TABLE "stock_vouchers" ADD COLUMN "source_voucher_id" UUID;
CREATE INDEX "stock_vouchers_source_voucher_id_idx" ON "stock_vouchers"("source_voucher_id");
ALTER TABLE "stock_vouchers" ADD CONSTRAINT "stock_vouchers_source_voucher_id_fkey" FOREIGN KEY ("source_voucher_id") REFERENCES "stock_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_vouchers" DROP CONSTRAINT "stock_vouchers_kind_check";
ALTER TABLE "stock_vouchers" ADD CONSTRAINT "stock_vouchers_kind_check" CHECK ("kind" IN ('RECEIPT','ISSUE','RETURN'));
