CREATE TABLE "kitchen_stock_minimums" (
 "id" UUID NOT NULL,
 "kitchen_id" UUID NOT NULL,
 "ingredient_id" UUID NOT NULL,
 "minimum_qty" DECIMAL(12,3) NOT NULL,
 "updated_by_id" UUID NOT NULL,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "kitchen_stock_minimums_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kitchen_stock_minimums_kitchen_id_ingredient_id_key" ON "kitchen_stock_minimums"("kitchen_id","ingredient_id");
ALTER TABLE "kitchen_stock_minimums" ADD CONSTRAINT "kitchen_stock_minimums_kitchen_id_fkey"
 FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kitchen_stock_minimums" ADD CONSTRAINT "kitchen_stock_minimums_ingredient_id_fkey"
 FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
