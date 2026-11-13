import { Controller, Get, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { StudentBulkImportService } from "./student-bulk-import.service";

@UseGuards(JwtAuthGuard)
@Controller("students")
export class StudentBulkImportController {
  constructor(private readonly importer: StudentBulkImportService) {}

  @Get("import-template")
  async template(@Res() response: Response) {
    const buffer = await this.importer.getTemplate();
    response.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="CanTinSo_students_template.xlsx"',
      "Content-Length": buffer.length,
    });
    response.end(buffer);
  }

  @Post("bulk-import")
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  }))
  importZip(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    return this.importer.importZip(user, file);
  }
}
