-- Expand-only migration: existing school-scoped records remain untouched.
-- New kitchen-scoped suppliers and lots have kitchen_id, leaving school_id NULL.
ALTER TABLE "suppliers" ADD COLUMN "kitchen_id" UUID;
ALTER TABLE "inventory_lots" ADD COLUMN "kitchen_id" UUID;
ALTER TABLE "suppliers" ALTER COLUMN "school_id" DROP NOT NULL;
ALTER TABLE "inventory_lots" ALTER COLUMN "school_id" DROP NOT NULL;

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_kitchen_id_fkey"
  FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_kitchen_id_fkey"
  FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "suppliers_kitchen_id_code_key" ON "suppliers"("kitchen_id","code");
CREATE INDEX "suppliers_kitchen_id_name_idx" ON "suppliers"("kitchen_id","name");
CREATE UNIQUE INDEX "inventory_lots_kitchen_id_lot_code_key" ON "inventory_lots"("kitchen_id","lot_code");
CREATE INDEX "inventory_lots_kitchen_id_status_expiry_date_idx" ON "inventory_lots"("kitchen_id","status","expiry_date");

-- Do not infer ownership of old school lots. Manual, verified migration will be needed.
