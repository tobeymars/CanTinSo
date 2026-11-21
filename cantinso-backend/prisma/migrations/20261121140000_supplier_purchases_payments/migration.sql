-- Purchases are valued only when a confirmed receipt exists. Legacy unpriced lots are not converted into fictional accounting transactions.
CREATE TABLE "purchase_receipts" (
 "id" UUID NOT NULL, "kitchen_id" UUID NOT NULL, "supplier_id" UUID NOT NULL,
 "number" TEXT NOT NULL, "invoice_number" TEXT, "reference" TEXT, "description" TEXT,
 "total" DECIMAL(18,0) NOT NULL, "created_by_id" UUID NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_receipts_kitchen_id_number_key" ON "purchase_receipts"("kitchen_id","number");
CREATE INDEX "purchase_receipts_supplier_id_created_at_idx" ON "purchase_receipts"("supplier_id","created_at");
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "purchase_receipt_lines" (
 "id" UUID NOT NULL, "receipt_id" UUID NOT NULL, "lot_id" UUID NOT NULL,
 "quantity" DECIMAL(12,3) NOT NULL, "unit_price" DECIMAL(18,0) NOT NULL,
 "amount" DECIMAL(18,0) NOT NULL,
 CONSTRAINT "purchase_receipt_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_receipt_lines_lot_id_key" ON "purchase_receipt_lines"("lot_id");
CREATE INDEX "purchase_receipt_lines_receipt_id_idx" ON "purchase_receipt_lines"("receipt_id");
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "purchase_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "purchase_receipt_lines_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "supplier_payments" (
 "id" UUID NOT NULL, "kitchen_id" UUID NOT NULL, "supplier_id" UUID NOT NULL,
 "receipt_id" UUID NOT NULL, "reference" TEXT NOT NULL, "amount" DECIMAL(18,0) NOT NULL,
 "method" TEXT NOT NULL, "note" TEXT, "reversed_at" TIMESTAMP(3), "reversed_by_id" UUID, "reversal_reason" TEXT, "paid_at" TIMESTAMP(3) NOT NULL,
 "created_by_id" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "supplier_payments_kitchen_id_reference_key" ON "supplier_payments"("kitchen_id","reference");
CREATE INDEX "supplier_payments_supplier_id_paid_at_idx" ON "supplier_payments"("supplier_id","paid_at");
CREATE INDEX "supplier_payments_receipt_id_paid_at_idx" ON "supplier_payments"("receipt_id","paid_at");
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
