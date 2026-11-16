import { Module } from "@nestjs/common";
import { RolesGuard } from "../common/roles.guard";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";
import { StudentBulkImportController } from "./student-bulk-import.controller";
import { StudentBulkImportService } from "./student-bulk-import.service";
import { HikvisionEnrollmentService } from "./hikvision-enrollment.service";

@Module({
  controllers: [StudentsController, StudentBulkImportController],
  providers: [StudentsService, StudentBulkImportService, HikvisionEnrollmentService, RolesGuard],
})
export class StudentsModule {}
