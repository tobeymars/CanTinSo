import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { SchoolsService } from "./schools.service";

@Controller("schools")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "UBND_ADMIN")
  list(@CurrentUser() user: AuthUser) {
    return this.schools.list(user);
  }
}
