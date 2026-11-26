CREATE TABLE "inventory_disposals" (
  "id" UUID NOT NULL,
  "kitchen_id" UUID NOT NULL,
  "lot_id" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "evidence_reference" TEXT NOT NULL,
  "handler_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_by_id" UUID NOT NULL,
  "completed_by_id" UUID,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_disposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_disposals_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_disposals_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_disposals_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_disposals_status_check" CHECK ("status" IN ('DRAFT','COMPLETED'))
);
CREATE UNIQUE INDEX "inventory_disposals_kitchen_id_number_key" ON "inventory_disposals"("kitchen_id","number");
CREATE INDEX "inventory_disposals_lot_id_status_idx" ON "inventory_disposals"("lot_id","status");
