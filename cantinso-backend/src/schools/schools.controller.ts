import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { SchoolsService } from "./schools.service";
import { CreateSchoolDto } from "./dto/create-school.dto";

@Controller("schools")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Get("me/overview")
  @Roles("SCHOOL_ADMIN")
  getMyOverview(@CurrentUser() user: AuthUser, @Query("date") date: string) {
    return this.schools.getMyOverview(user, date);
  }

  @Post()
  @Roles("UBND_ADMIN")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSchoolDto) {
    return this.schools.create(user, dto);
  }

  @Get()
  @Roles("SUPER_ADMIN", "UBND_ADMIN")
  list(@CurrentUser() user: AuthUser) {
    return this.schools.list(user);
  }
}
