CREATE TABLE "supervision_meals" (
 "id" UUID NOT NULL,
 "school_id" UUID NOT NULL,
 "kitchen_id" UUID NOT NULL,
 "service_date" DATE NOT NULL,
 "meal_type" TEXT NOT NULL,
 "checks" JSONB NOT NULL DEFAULT '{}',
 "stages" JSONB NOT NULL DEFAULT '{}',
 "approvals" JSONB NOT NULL DEFAULT '[]',
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "supervision_meals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "supervision_meals_school_id_service_date_meal_type_key" ON "supervision_meals"("school_id","service_date","meal_type");
CREATE INDEX "supervision_meals_kitchen_id_service_date_idx" ON "supervision_meals"("kitchen_id","service_date");
CREATE TABLE "supervision_events" (
 "id" UUID NOT NULL,
 "meal_id" UUID NOT NULL,
 "actor_id" UUID NOT NULL,
 "actor_role" TEXT NOT NULL,
 "action" TEXT NOT NULL,
 "item_id" TEXT NOT NULL,
 "payload" JSONB NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supervision_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "supervision_events_meal_id_created_at_idx" ON "supervision_events"("meal_id","created_at");
ALTER TABLE "supervision_events" ADD CONSTRAINT "supervision_events_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "supervision_meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supervision_meals" ADD CONSTRAINT "supervision_meals_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supervision_meals" ADD CONSTRAINT "supervision_meals_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
