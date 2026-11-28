CREATE TABLE "kitchen_shift_tasks" (
    "id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "role" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kitchen_shift_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "kitchen_shift_tasks_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "kitchen_shift_tasks_kitchen_id_service_date_role_task_id_key" ON "kitchen_shift_tasks"("kitchen_id","service_date","role","task_id");
CREATE INDEX "kitchen_shift_tasks_kitchen_id_service_date_idx" ON "kitchen_shift_tasks"("kitchen_id","service_date");
