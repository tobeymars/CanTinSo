-- CreateEnum
CREATE TYPE "DishStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DishVersionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DishApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DishApprovalEventType" AS ENUM ('SUBMITTED', 'APPROVED', 'RETURNED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MealPlanRevisionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "MealPlanApprovalEventType" AS ENUM ('SUBMITTED', 'APPROVED', 'RETURNED', 'REJECTED', 'SUPERSEDED');

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_school_id_fkey";

-- AlterTable
ALTER TABLE "dishes" ADD COLUMN     "kitchen_id" UUID,
ADD COLUMN     "status" "DishStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "meal_plans" ADD COLUMN     "kitchen_id" UUID;

-- CreateTable
CREATE TABLE "dish_versions" (
    "id" UUID NOT NULL,
    "dish_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "status" "DishVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "recipe_snapshot" JSONB NOT NULL,
    "nutrition_snapshot" JSONB,
    "allergen_snapshot" JSONB,
    "created_by_id" UUID NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dish_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_ingredients" (
    "id" UUID NOT NULL,
    "dish_version_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_code" TEXT NOT NULL,
    "preparation_note" TEXT,

    CONSTRAINT "dish_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_approvals" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "dish_version_id" UUID NOT NULL,
    "status" "DishApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by_id" UUID,
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_approval_events" (
    "id" UUID NOT NULL,
    "dish_approval_id" UUID NOT NULL,
    "event_type" "DishApprovalEventType" NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" "UserRole" NOT NULL,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dish_approval_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_revisions" (
    "id" UUID NOT NULL,
    "meal_plan_id" UUID NOT NULL,
    "revision_no" INTEGER NOT NULL,
    "status" "MealPlanRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "proposed_by_id" UUID NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "decided_by_id" UUID,
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_age_groups" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_age_months" INTEGER,
    "max_age_months" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "meal_plan_age_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_revision_age_groups" (
    "id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "age_group_id" UUID NOT NULL,
    "planned_servings" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "meal_plan_revision_age_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_revision_items" (
    "id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "dish_version_id" UUID NOT NULL,
    "meal_slot" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "meal_plan_revision_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_item_age_group_portions" (
    "id" UUID NOT NULL,
    "revision_item_id" UUID NOT NULL,
    "age_group_id" UUID NOT NULL,
    "portion_factor" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "unit_code" TEXT NOT NULL,
    "override_reason" TEXT,

    CONSTRAINT "meal_plan_item_age_group_portions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_approval_events" (
    "id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "event_type" "MealPlanApprovalEventType" NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" "UserRole" NOT NULL,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plan_approval_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dish_versions_dish_id_status_idx" ON "dish_versions"("dish_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dish_versions_dish_id_version_no_key" ON "dish_versions"("dish_id", "version_no");

-- CreateIndex
CREATE INDEX "dish_ingredients_ingredient_id_idx" ON "dish_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "dish_ingredients_dish_version_id_ingredient_id_key" ON "dish_ingredients"("dish_version_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "dish_approvals_school_id_status_updated_at_idx" ON "dish_approvals"("school_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "dish_approvals_school_id_dish_version_id_key" ON "dish_approvals"("school_id", "dish_version_id");

-- CreateIndex
CREATE INDEX "dish_approval_events_dish_approval_id_occurred_at_idx" ON "dish_approval_events"("dish_approval_id", "occurred_at");

-- CreateIndex
CREATE INDEX "dish_approval_events_actor_id_occurred_at_idx" ON "dish_approval_events"("actor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "meal_plan_revisions_meal_plan_id_status_idx" ON "meal_plan_revisions"("meal_plan_id", "status");

-- CreateIndex
CREATE INDEX "meal_plan_revisions_proposed_by_id_created_at_idx" ON "meal_plan_revisions"("proposed_by_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_revisions_meal_plan_id_revision_no_key" ON "meal_plan_revisions"("meal_plan_id", "revision_no");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_age_groups_code_key" ON "meal_plan_age_groups"("code");

-- CreateIndex
CREATE INDEX "meal_plan_revision_age_groups_age_group_id_idx" ON "meal_plan_revision_age_groups"("age_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_revision_age_groups_revision_id_age_group_id_key" ON "meal_plan_revision_age_groups"("revision_id", "age_group_id");

-- CreateIndex
CREATE INDEX "meal_plan_revision_items_dish_version_id_idx" ON "meal_plan_revision_items"("dish_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_revision_items_revision_id_meal_slot_dish_version_key" ON "meal_plan_revision_items"("revision_id", "meal_slot", "dish_version_id");

-- CreateIndex
CREATE INDEX "meal_plan_item_age_group_portions_age_group_id_idx" ON "meal_plan_item_age_group_portions"("age_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_item_age_group_portions_revision_item_id_age_grou_key" ON "meal_plan_item_age_group_portions"("revision_item_id", "age_group_id");

-- CreateIndex
CREATE INDEX "meal_plan_approval_events_revision_id_occurred_at_idx" ON "meal_plan_approval_events"("revision_id", "occurred_at");

-- CreateIndex
CREATE INDEX "meal_plan_approval_events_actor_id_occurred_at_idx" ON "meal_plan_approval_events"("actor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "dishes_kitchen_id_status_name_idx" ON "dishes"("kitchen_id", "status", "name");

-- CreateIndex
CREATE INDEX "meal_plans_kitchen_id_service_date_idx" ON "meal_plans"("kitchen_id", "service_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_versions" ADD CONSTRAINT "dish_versions_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_versions" ADD CONSTRAINT "dish_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_ingredients" ADD CONSTRAINT "dish_ingredients_dish_version_id_fkey" FOREIGN KEY ("dish_version_id") REFERENCES "dish_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_ingredients" ADD CONSTRAINT "dish_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_approvals" ADD CONSTRAINT "dish_approvals_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_approvals" ADD CONSTRAINT "dish_approvals_dish_version_id_fkey" FOREIGN KEY ("dish_version_id") REFERENCES "dish_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_approvals" ADD CONSTRAINT "dish_approvals_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_approval_events" ADD CONSTRAINT "dish_approval_events_dish_approval_id_fkey" FOREIGN KEY ("dish_approval_id") REFERENCES "dish_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_approval_events" ADD CONSTRAINT "dish_approval_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_revisions" ADD CONSTRAINT "meal_plan_revisions_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_revisions" ADD CONSTRAINT "meal_plan_revisions_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_revisions" ADD CONSTRAINT "meal_plan_revisions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_revision_age_groups" ADD CONSTRAINT "meal_plan_revision_age_groups_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "meal_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_revision_age_groups" ADD CONSTRAINT "meal_plan_revision_age_groups_age_group_id_fkey" FOREIGN KEY ("age_group_id") REFERENCES "meal_plan_age_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_revision_items" ADD CONSTRAINT "meal_plan_revision_items_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "meal_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_revision_items" ADD CONSTRAINT "meal_plan_revision_items_dish_version_id_fkey" FOREIGN KEY ("dish_version_id") REFERENCES "dish_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_item_age_group_portions" ADD CONSTRAINT "meal_plan_item_age_group_portions_revision_item_id_fkey" FOREIGN KEY ("revision_item_id") REFERENCES "meal_plan_revision_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_item_age_group_portions" ADD CONSTRAINT "meal_plan_item_age_group_portions_age_group_id_fkey" FOREIGN KEY ("age_group_id") REFERENCES "meal_plan_age_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_approval_events" ADD CONSTRAINT "meal_plan_approval_events_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "meal_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_approval_events" ADD CONSTRAINT "meal_plan_approval_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business rule: only one editable DRAFT revision per meal plan.
CREATE UNIQUE INDEX "meal_plan_revisions_one_draft_per_plan_key"
ON "meal_plan_revisions" ("meal_plan_id")
WHERE "status" = 'DRAFT';

-- Recipe ingredient quantity must be positive.
ALTER TABLE "dish_ingredients"
ADD CONSTRAINT "dish_ingredients_quantity_positive_check"
CHECK ("quantity" > 0);

-- Planned servings must be positive.
ALTER TABLE "meal_plan_revision_age_groups"
ADD CONSTRAINT "meal_plan_revision_age_groups_planned_servings_positive_check"
CHECK ("planned_servings" > 0);

-- Portion factor must be positive.
ALTER TABLE "meal_plan_item_age_group_portions"
ADD CONSTRAINT "meal_plan_item_age_group_portions_portion_factor_positive_check"
CHECK ("portion_factor" > 0);

-- Minimum age cannot exceed maximum age.
ALTER TABLE "meal_plan_age_groups"
ADD CONSTRAINT "meal_plan_age_groups_age_bounds_check"
CHECK (
    "min_age_months" IS NULL
    OR "max_age_months" IS NULL
    OR "min_age_months" <= "max_age_months"
);
