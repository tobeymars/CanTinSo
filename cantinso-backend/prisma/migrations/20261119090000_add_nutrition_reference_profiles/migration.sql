-- Nutrition reference data from Ministry of Health Decision 3958/QD-BYT, Appendix 7.
-- Values are per 100g edible food. Missing source cells remain NULL; zero remains zero.
CREATE TABLE "nutrition_references" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "issuing_body" TEXT NOT NULL,
  "document_no" TEXT NOT NULL,
  "issued_at" DATE NOT NULL,
  "effective_at" DATE NOT NULL,
  "appendix" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nutrition_references_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ingredient_nutrition_profiles" (
  "id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "nutrition_reference_id" UUID NOT NULL,
  "source_row_no" INTEGER,
  "source_category" TEXT NOT NULL,
  "edible_rate_percent" DECIMAL(6,2) NOT NULL,
  "energy_kcal" DECIMAL(12,4),
  "protein_g" DECIMAL(12,4),
  "fat_g" DECIMAL(12,4),
  "carbohydrate_g" DECIMAL(12,4),
  "fiber_g" DECIMAL(12,4),
  "calcium_mg" DECIMAL(12,4),
  "iron_mg" DECIMAL(12,4),
  "zinc_mg" DECIMAL(12,4),
  "vitamin_a_rae_mcg" DECIMAL(12,4),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ingredient_nutrition_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "nutrition_references_code_key" ON "nutrition_references"("code");
CREATE UNIQUE INDEX "nutrition_references_document_no_appendix_version_key" ON "nutrition_references"("document_no","appendix","version");
CREATE UNIQUE INDEX "ingredient_nutrition_profiles_ingredient_id_nutrition_reference_id_key" ON "ingredient_nutrition_profiles"("ingredient_id","nutrition_reference_id");
CREATE INDEX "ingredient_nutrition_profiles_nutrition_reference_id_source_category_idx" ON "ingredient_nutrition_profiles"("nutrition_reference_id","source_category");
CREATE INDEX "ingredient_nutrition_profiles_ingredient_id_idx" ON "ingredient_nutrition_profiles"("ingredient_id");
ALTER TABLE "ingredient_nutrition_profiles" ADD CONSTRAINT "ingredient_nutrition_profiles_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingredient_nutrition_profiles" ADD CONSTRAINT "ingredient_nutrition_profiles_nutrition_reference_id_fkey" FOREIGN KEY ("nutrition_reference_id") REFERENCES "nutrition_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
