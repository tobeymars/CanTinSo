import { Module } from "@nestjs/common";
import { StudentBulkImportController } from "./student-bulk-import.controller";
import { StudentBulkImportService } from "./student-bulk-import.service";
import { HikvisionEnrollmentService } from "./hikvision-enrollment.service";

@Module({
  controllers: [StudentBulkImportController],
  providers: [StudentBulkImportService, HikvisionEnrollmentService],
})
export class StudentBulkImportModule {}
