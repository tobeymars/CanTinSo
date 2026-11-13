-- CreateTable
CREATE TABLE "attendance_events" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID,
    "device_id" TEXT NOT NULL DEFAULT 'hik-main',
    "device_serial_no" BIGINT NOT NULL,
    "employee_no_string" TEXT NOT NULL,
    "major" INTEGER NOT NULL,
    "minor" INTEGER NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "attendance_status" TEXT,
    "current_verify_mode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_events_school_id_occurred_at_idx" ON "attendance_events"("school_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attendance_events_school_id_employee_no_string_idx" ON "attendance_events"("school_id", "employee_no_string");

-- CreateIndex
CREATE INDEX "attendance_events_student_id_occurred_at_idx" ON "attendance_events"("student_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_device_id_device_serial_no_key" ON "attendance_events"("device_id", "device_serial_no");

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
