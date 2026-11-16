import { ForbiddenException, Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthUser } from "../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

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
