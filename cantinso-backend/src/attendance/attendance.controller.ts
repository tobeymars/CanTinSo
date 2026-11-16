import { ConflictException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AttendanceService } from "./attendance.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SCHOOL_ADMIN", "SCHOOL_STAFF", "SCHOOL_KITCHEN", "SUPER_ADMIN")
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  getEvents(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    if (!user.schoolId) {
      throw new ConflictException("Tài khoản chưa được gán trường.");
    }
    return this.attendance.getEvents(user.schoolId, Number(limit) || 100);
  }
}
