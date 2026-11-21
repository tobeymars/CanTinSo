-- Persistent QR tokens for approved school meal plan revisions.
CREATE TABLE "dish_qrs" (
 "id" UUID NOT NULL,
 "public_token" TEXT NOT NULL,
 "school_id" UUID NOT NULL,
 "kitchen_id" UUID NOT NULL,
 "meal_plan_id" UUID NOT NULL,
 "revision_id" UUID NOT NULL,
 "revision_item_id" UUID NOT NULL,
 "age_group_id" UUID NOT NULL,
 "issued_by_id" UUID NOT NULL,
 "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "revoked_at" TIMESTAMP(3),
 "revoked_by_id" UUID,
 "revoke_reason" TEXT,
 CONSTRAINT "dish_qrs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dish_qrs_public_token_key" ON "dish_qrs"("public_token");
CREATE UNIQUE INDEX "dish_qrs_revision_id_revision_item_id_age_group_id_key" ON "dish_qrs"("revision_id", "revision_item_id", "age_group_id");
CREATE INDEX "dish_qrs_school_id_issued_at_idx" ON "dish_qrs"("school_id", "issued_at");
CREATE INDEX "dish_qrs_kitchen_id_issued_at_idx" ON "dish_qrs"("kitchen_id", "issued_at");
ALTER TABLE "dish_qrs" ADD CONSTRAINT "dish_qrs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_qrs" ADD CONSTRAINT "dish_qrs_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_qrs" ADD CONSTRAINT "dish_qrs_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_qrs" ADD CONSTRAINT "dish_qrs_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "meal_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_qrs" ADD CONSTRAINT "dish_qrs_revision_item_id_fkey" FOREIGN KEY ("revision_item_id") REFERENCES "meal_plan_revision_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_qrs" ADD CONSTRAINT "dish_qrs_age_group_id_fkey" FOREIGN KEY ("age_group_id") REFERENCES "meal_plan_age_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_qrs" ADD CONSTRAINT "dish_qrs_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_qrs" ADD CONSTRAINT "dish_qrs_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
