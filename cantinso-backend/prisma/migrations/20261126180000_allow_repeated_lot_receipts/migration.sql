-- Một lô có thể được nhập bổ sung qua nhiều phiếu nhập độc lập.
DROP INDEX IF EXISTS "purchase_receipt_lines_lot_id_key";
CREATE INDEX IF NOT EXISTS "purchase_receipt_lines_lot_id_idx" ON "purchase_receipt_lines"("lot_id");
