-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_STAFF', 'KITCHEN_MANAGER', 'NUTRITIONIST', 'WAREHOUSE_STAFF', 'PARENT');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('AVAILABLE', 'QUARANTINED', 'EXPIRED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "FoodCheckStatus" AS ENUM ('PASS', 'FAIL', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "TraceEventType" AS ENUM ('RECEIVED', 'INSPECTED', 'STORED', 'PREPARED', 'COOKED', 'SERVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SCHOOL_STAFF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "school_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER,
    "school_id" UUID NOT NULL,
    "school_year" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classroom_id" UUID,
    "gender" "Gender",
    "birth_date" DATE,
    "guardian" TEXT,
    "phone" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "school_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_code" TEXT,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "school_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lots" (
    "id" UUID NOT NULL,
    "lot_code" TEXT NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "remaining_qty" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATE,
    "storage_location" TEXT,
    "status" "LotStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dishes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "recipe" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "servings" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_items" (
    "id" UUID NOT NULL,
    "meal_plan_id" UUID NOT NULL,
    "dish_id" UUID NOT NULL,
    "servings" INTEGER NOT NULL,

    CONSTRAINT "meal_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_safety_checks" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "FoodCheckStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_by_id" UUID,
    "notes" TEXT,
    "evidence" JSONB,

    CONSTRAINT "food_safety_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_events" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "event_type" "TraceEventType" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" UUID,
    "location" TEXT,
    "description" TEXT,
    "metadata" JSONB,

    CONSTRAINT "trace_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_school_id_role_idx" ON "users"("school_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_school_id_name_school_year_key" ON "classrooms"("school_id", "name", "school_year");

-- CreateIndex
CREATE INDEX "students_school_id_name_idx" ON "students"("school_id", "name");

-- CreateIndex
CREATE INDEX "students_classroom_id_status_idx" ON "students"("classroom_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "students_school_id_code_key" ON "students"("school_id", "code");

-- CreateIndex
CREATE INDEX "suppliers_school_id_name_idx" ON "suppliers"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_school_id_code_key" ON "suppliers"("school_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_code_key" ON "ingredients"("code");

-- CreateIndex
CREATE INDEX "inventory_lots_school_id_status_expiry_date_idx" ON "inventory_lots"("school_id", "status", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_lots_school_id_lot_code_key" ON "inventory_lots"("school_id", "lot_code");

-- CreateIndex
CREATE UNIQUE INDEX "dishes_code_key" ON "dishes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_school_id_service_date_meal_type_key" ON "meal_plans"("school_id", "service_date", "meal_type");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_items_meal_plan_id_dish_id_key" ON "meal_plan_items"("meal_plan_id", "dish_id");

-- CreateIndex
CREATE INDEX "food_safety_checks_school_id_checked_at_idx" ON "food_safety_checks"("school_id", "checked_at");

-- CreateIndex
CREATE INDEX "trace_events_lot_id_occurred_at_idx" ON "trace_events"("lot_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_events" ADD CONSTRAINT "trace_events_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
