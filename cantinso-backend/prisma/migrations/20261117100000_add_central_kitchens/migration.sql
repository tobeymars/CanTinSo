-- Add central kitchen profiles, school assignments, and kitchen-scoped users.
CREATE TYPE "KitchenType" AS ENUM ('SCHOOL', 'CENTRAL');

CREATE TABLE "kitchens" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "KitchenType" NOT NULL DEFAULT 'CENTRAL',
  "school_id" UUID,
  "address" TEXT,
  "contact_name" TEXT,
  "phone" TEXT,
  "capacity" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kitchens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kitchens_code_key" ON "kitchens"("code");
CREATE UNIQUE INDEX "kitchens_school_id_key" ON "kitchens"("school_id");
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_type_school_id_check" CHECK (("type" = 'SCHOOL' AND "school_id" IS NOT NULL) OR ("type" = 'CENTRAL' AND "school_id" IS NULL));

ALTER TABLE "users" ADD COLUMN "kitchen_id" UUID;
CREATE INDEX "users_kitchen_id_role_idx" ON "users"("kitchen_id", "role");
ALTER TABLE "users" ADD CONSTRAINT "users_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "kitchen_school_assignments" (
  "id" UUID NOT NULL,
  "kitchen_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kitchen_school_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kitchen_school_assignments_kitchen_id_school_id_starts_at_key" ON "kitchen_school_assignments"("kitchen_id", "school_id", "starts_at");
CREATE INDEX "kitchen_school_assignments_school_id_is_active_idx" ON "kitchen_school_assignments"("school_id", "is_active");
CREATE INDEX "kitchen_school_assignments_kitchen_id_is_active_idx" ON "kitchen_school_assignments"("kitchen_id", "is_active");
CREATE UNIQUE INDEX "one_active_kitchen_per_school" ON "kitchen_school_assignments"("school_id") WHERE "is_active" = true AND "ends_at" IS NULL;
ALTER TABLE "kitchen_school_assignments" ADD CONSTRAINT "kitchen_school_assignments_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_school_assignments" ADD CONSTRAINT "kitchen_school_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
