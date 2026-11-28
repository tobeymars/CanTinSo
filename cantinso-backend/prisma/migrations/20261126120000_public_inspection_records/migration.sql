CREATE TABLE "public_inspection_records" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "meal_type" TEXT NOT NULL,
    "record_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "inspected_at" DATE NOT NULL,
    "scope" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "finding_count" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "evidence_reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "published_by_id" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "public_inspection_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "public_inspection_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "public_inspection_records_status_check" CHECK ("status" IN ('DRAFT','PUBLISHED')),
    CONSTRAINT "public_inspection_records_outcome_check" CHECK ("outcome" IN ('follow_up_required','no_follow_up')),
    CONSTRAINT "public_inspection_records_finding_count_check" CHECK ("finding_count" >= 0)
);
CREATE UNIQUE INDEX "public_inspection_records_record_number_key" ON "public_inspection_records"("record_number");
CREATE INDEX "public_inspection_records_school_id_service_date_meal_type_status_idx" ON "public_inspection_records"("school_id", "service_date", "meal_type", "status");
