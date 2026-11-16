-- Create organizational tables and preserve every existing school_id.
CREATE TABLE "wards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "ward_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- Backfill placeholder School records for all IDs already referenced by the app.
-- Real school names and ward assignments can be filled in later without changing IDs.
INSERT INTO "schools" ("id", "name", "created_at", "updated_at")
SELECT DISTINCT existing_school_ids."school_id",
       'Chưa cập nhật tên trường',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM (
    SELECT "school_id" FROM "users" WHERE "school_id" IS NOT NULL
    UNION
    SELECT "school_id" FROM "classrooms"
    UNION
    SELECT "school_id" FROM "students"
    UNION
    SELECT "school_id" FROM "attendance_events"
    UNION
    SELECT "school_id" FROM "suppliers"
    UNION
    SELECT "school_id" FROM "inventory_lots"
    UNION
    SELECT "school_id" FROM "meal_plans"
    UNION
    SELECT "school_id" FROM "food_safety_checks"
    UNION
    SELECT "school_id" FROM "hikvision_student_enrollments"
) AS existing_school_ids
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "users" ADD COLUMN "ward_id" UUID;

CREATE UNIQUE INDEX "wards_code_key" ON "wards"("code");
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");
CREATE INDEX "schools_ward_id_idx" ON "schools"("ward_id");

ALTER TABLE "schools"
ADD CONSTRAINT "schools_ward_id_fkey"
FOREIGN KEY ("ward_id") REFERENCES "wards"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
ADD CONSTRAINT "users_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users"
ADD CONSTRAINT "users_ward_id_fkey"
FOREIGN KEY ("ward_id") REFERENCES "wards"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "classrooms"
ADD CONSTRAINT "classrooms_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "students"
ADD CONSTRAINT "students_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_events"
ADD CONSTRAINT "attendance_events_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "suppliers"
ADD CONSTRAINT "suppliers_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_lots"
ADD CONSTRAINT "inventory_lots_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "meal_plans"
ADD CONSTRAINT "meal_plans_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "food_safety_checks"
ADD CONSTRAINT "food_safety_checks_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "hikvision_student_enrollments"
ADD CONSTRAINT "hikvision_student_enrollments_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
