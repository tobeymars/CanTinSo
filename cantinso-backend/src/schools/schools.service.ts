import { ForbiddenException, Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthUser } from "../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyOverview(user: AuthUser, date: string) {
    if (user.role !== UserRole.SCHOOL_ADMIN || !user.schoolId) {
      throw new ForbiddenException("Tài khoản chưa được gán trường để xem tổng quan.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new ForbiddenException("Ngày xem tổng quan không hợp lệ.");
    }

    const serviceDate = new Date(`${date}T00:00:00.000Z`);
    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        ward: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            students: true,
            suppliers: true,
            foodSafetyChecks: true,
          },
        },
        mealPlans: {
          where: { serviceDate },
          select: { id: true, mealType: true, servings: true, status: true },
          orderBy: { mealType: "asc" },
        },
      },
    });

    if (!school) {
      throw new ForbiddenException("Không tìm thấy trường được gán cho tài khoản.");
    }

    return {
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        ward: school.ward,
      },
      counts: {
        students: school._count.students,
        suppliers: school._count.suppliers,
        foodSafetyChecks: school._count.foodSafetyChecks,
        mealPlans: school.mealPlans.length,
        plannedServings: school.mealPlans.reduce((total, plan) => total + plan.servings, 0),
        mealsInProgress: school.mealPlans.filter(plan => !["COMPLETED", "CANCELLED", "SERVED"].includes(plan.status.toUpperCase())).length,
      },
      mealPlans: school.mealPlans,
      date,
    };
  }

  async list(user: AuthUser) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.prisma.school.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          wardId: true,
          ward: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
      });
    }

    if (user.role === UserRole.UBND_ADMIN) {
      if (!user.wardId) {
        throw new ForbiddenException(
          "Tài khoản UBND chưa được gán phường quản lý.",
        );
      }

      return this.prisma.school.findMany({
        where: { wardId: user.wardId },
        select: {
          id: true,
          name: true,
          code: true,
          wardId: true,
          ward: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
      });
    }

    throw new ForbiddenException("Bạn không có quyền xem danh sách trường.");
  }
}
