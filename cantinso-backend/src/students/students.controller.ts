import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, AuthUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateStudentDto } from "./student.dto";
import { StudentsService } from "./students.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("students")
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Get()
  @Roles("SCHOOL_ADMIN", "SCHOOL_STAFF", "SUPER_ADMIN")
  list(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.students.list(user, query);
  }

  @Post()
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStudentDto) {
    return this.students.create(user, dto);
  }

  @Put(":id")
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CreateStudentDto) {
    return this.students.update(user, id, dto);
  }

  @Delete(":id")
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.students.remove(user, id);
  }
}
