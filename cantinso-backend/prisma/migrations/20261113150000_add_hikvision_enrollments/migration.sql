CREATE TABLE "hikvision_student_enrollments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "employee_no" TEXT NOT NULL,
    "user_created_at" TIMESTAMP(3),
    "face_uploaded_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hikvision_student_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hikvision_student_enrollments_device_id_employee_no_key"
ON "hikvision_student_enrollments"("device_id", "employee_no");
CREATE UNIQUE INDEX "hikvision_student_enrollments_device_id_student_id_key"
ON "hikvision_student_enrollments"("device_id", "student_id");
CREATE INDEX "hikvision_student_enrollments_school_id_last_error_idx"
ON "hikvision_student_enrollments"("school_id", "last_error");
ALTER TABLE "hikvision_student_enrollments"
ADD CONSTRAINT "hikvision_student_enrollments_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
