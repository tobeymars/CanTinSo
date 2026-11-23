import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthUser } from "../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSchoolDto } from "./dto/create-school.dto";

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMySchool(user: AuthUser) {
    if (![UserRole.SCHOOL_ADMIN, UserRole.SCHOOL_KITCHEN].includes(user.role as UserRole) || !user.schoolId) {
      throw new ForbiddenException("Tài khoản chưa được gán trường.");
    }
    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        ward: { select: { id: true, name: true, code: true } },
      },
    });
    if (!school) throw new ForbiddenException("Không tìm thấy trường được gán.");
    return school;
  }

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

  async create(user: AuthUser, dto: CreateSchoolDto) {
    if (user.role !== UserRole.UBND_ADMIN || !user.wardId) {
      throw new ForbiddenException("Chỉ tài khoản UBND đã được gán phường mới được tạo trường.");
    }

    const name = dto.name.trim();
    const code = dto.code?.trim() || null;
    if (code && await this.prisma.school.findUnique({ where: { code }, select: { id: true } })) {
      throw new ConflictException("Mã trường đã tồn tại trong hệ thống.");
    }

    return this.prisma.school.create({
      data: {
        name,
        code,
        address: dto.address?.trim() || null,
        contactName: dto.contactName?.trim() || null,
        phone: dto.phone?.trim() || null,
        // Luôn lấy địa bàn từ JWT; không nhận wardId từ dữ liệu client.
        wardId: user.wardId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        contactName: true,
        phone: true,
        wardId: true,
        ward: { select: { id: true, name: true, code: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async list(user: AuthUser) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.prisma.school.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          contactName: true,
          phone: true,
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
          address: true,
          contactName: true,
          phone: true,
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
