import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { AttendanceService } from "./attendance.service";

@UseGuards(JwtAuthGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  getEvents(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    if (!user.schoolId) {
      throw new Error("Tài khoản chưa được gán trường");
    }

    return this.attendance.getEvents(user.schoolId, Number(limit) || 100);
  }
}
