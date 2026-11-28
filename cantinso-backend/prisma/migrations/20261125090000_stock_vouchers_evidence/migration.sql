-- Additive, no change to legacy warehouse history.
CREATE TABLE "stock_vouchers" (
 "id" UUID NOT NULL,
 "kitchen_id" UUID NOT NULL,
 "number" TEXT NOT NULL,
 "kind" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'POSTED',
 "receipt_id" UUID,
 "lot_id" UUID,
 "school_id" UUID,
 "service_date" DATE,
 "meal_type" TEXT,
 "quantity" DECIMAL(12,3),
 "unit" TEXT,
 "inspection" JSONB NOT NULL,
 "posted_by_id" UUID NOT NULL,
 "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "stock_vouchers_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "stock_vouchers_kind_check" CHECK ("kind" IN ('RECEIPT','ISSUE')),
 CONSTRAINT "stock_vouchers_status_check" CHECK ("status" = 'POSTED')
);
CREATE UNIQUE INDEX "stock_vouchers_kitchen_id_number_key" ON "stock_vouchers"("kitchen_id","number");
CREATE INDEX "stock_vouchers_kitchen_id_posted_at_idx" ON "stock_vouchers"("kitchen_id","posted_at");
CREATE INDEX "stock_vouchers_receipt_id_idx" ON "stock_vouchers"("receipt_id");
CREATE INDEX "stock_vouchers_lot_id_idx" ON "stock_vouchers"("lot_id");
ALTER TABLE "stock_vouchers" ADD CONSTRAINT "stock_vouchers_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_vouchers" ADD CONSTRAINT "stock_vouchers_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "stock_voucher_evidences" (
 "id" UUID NOT NULL,
 "voucher_id" UUID NOT NULL,
 "category" TEXT NOT NULL,
 "filename" TEXT NOT NULL,
 "mime_type" TEXT NOT NULL,
 "size" INTEGER NOT NULL,
 "sha256" TEXT NOT NULL,
 "data" BYTEA NOT NULL,
 "uploaded_by_id" UUID NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "stock_voucher_evidences_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stock_voucher_evidences_voucher_id_category_idx" ON "stock_voucher_evidences"("voucher_id","category");
ALTER TABLE "stock_voucher_evidences" ADD CONSTRAINT "stock_voucher_evidences_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "stock_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
