-- Preserve original invoiced quantity and unit without changing existing stock quantities.
ALTER TABLE "purchase_receipt_lines" ADD COLUMN "entered_quantity" DECIMAL(12,3);
ALTER TABLE "purchase_receipt_lines" ADD COLUMN "entered_unit" TEXT;
-- Legacy rows remain NULL and represent the canonical lot unit.
