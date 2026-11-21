-- Preserve original invoiced quantity and unit without changing existing stock quantities.
ALTER TABLE "purchase_receipt_lines" ADD COLUMN "entered_quantity" DECIMAL(15,6);
ALTER TABLE "purchase_receipt_lines" ADD COLUMN "entered_unit" TEXT;
-- Legacy rows remain NULL and represent the canonical lot unit.
-- Price per gram may legitimately be a fractional VND; totals still round to whole VND.
ALTER TABLE "purchase_receipt_lines" ALTER COLUMN "unit_price" TYPE DECIMAL(24,6);
