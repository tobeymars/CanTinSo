import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/current-user.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const SCHOOL_ADMIN_CREATABLE_ROLES: UserRole[] = [
  UserRole.SCHOOL_KITCHEN,
  UserRole.SCHOOL_STAFF,
];
const SCHOOL_SCOPED_ROLES: UserRole[] = [
  UserRole.SCHOOL_ADMIN,
  UserRole.SCHOOL_STAFF,
  UserRole.SCHOOL_KITCHEN,
  UserRole.KITCHEN_MANAGER,
  UserRole.NUTRITIONIST,
  UserRole.WAREHOUSE_STAFF,
  UserRole.PARENT,
];
const UNASSIGNED_ORG_ROLES: UserRole[] = [UserRole.CENTRAL_KITCHEN];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(user: AuthUser) {
    if (user.role === UserRole.SUPER_ADMIN) return {};
    if (!user.schoolId) {
      throw new ForbiddenException("Tài khoản chưa được gán trường.");
    }
    return { schoolId: user.schoolId };
  }

  async list(user: AuthUser) {
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.SCHOOL_ADMIN
    ) {
      throw new ForbiddenException("Bạn không có quyền quản lý tài khoản.");
    }

    return this.prisma.user.findMany({
      where: this.scope(user),
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        schoolId: true,
        wardId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.SCHOOL_ADMIN
    ) {
      throw new ForbiddenException("Bạn không có quyền tạo tài khoản.");
    }

    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!SCHOOL_ADMIN_CREATABLE_ROLES.includes(dto.role)) {
        throw new ForbiddenException(
          "Ban Giám Hiệu chỉ được tạo tài khoản Bếp tại trường hoặc Nhân viên trường.",
        );
      }
      if (!actor.schoolId) {
        throw new ForbiddenException(
          "Tài khoản Ban Giám Hiệu chưa được gán trường.",
        );
      }
      if (dto.wardId) {
        throw new ForbiddenException(
          "Ban Giám Hiệu không được gán tài khoản vào phường.",
        );
      }
      dto.schoolId = actor.schoolId;
    } else {
      if (SCHOOL_SCOPED_ROLES.includes(dto.role) && !dto.schoolId) {
        throw new ConflictException("Vai trò này cần được gán schoolId.");
      }

      if (dto.role === UserRole.UBND_ADMIN) {
        if (!dto.wardId) {
          throw new ConflictException(
            "Tài khoản UBND_ADMIN cần được gán wardId.",
          );
        }
        if (dto.schoolId) {
          throw new ConflictException(
            "Tài khoản UBND_ADMIN không được gán trực tiếp vào trường.",
          );
        }

        const ward = await this.prisma.ward.findUnique({
          where: { id: dto.wardId },
          select: { id: true },
        });
        if (!ward) {
          throw new NotFoundException("Không tìm thấy phường được gán.");
        }
      } else {
        if (dto.wardId) {
          throw new ConflictException(
            "Chỉ tài khoản UBND_ADMIN mới được gán wardId.",
          );
        }
        if (UNASSIGNED_ORG_ROLES.includes(dto.role)) {
          throw new ForbiddenException(
            "Chưa hỗ trợ tạo tài khoản Bếp trung tâm khi chưa có mô hình gán đơn vị quản lý.",
          );
        }
      }
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Email đã được sử dụng.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName.trim(),
        role: dto.role,
        schoolId:
          dto.role === UserRole.UBND_ADMIN ? null : dto.schoolId ?? null,
        wardId: dto.role === UserRole.UBND_ADMIN ? dto.wardId! : null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        schoolId: true,
        wardId: true,
        createdAt: true,
      },
    });
  }

  private async findManagedUser(actor: AuthUser, id: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException("Không tìm thấy tài khoản.");
    }

    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      (actor.role !== UserRole.SCHOOL_ADMIN ||
        !actor.schoolId ||
        target.schoolId !== actor.schoolId)
    ) {
      throw new ForbiddenException("Bạn không có quyền quản lý tài khoản này.");
    }

    if (
      actor.role === UserRole.SCHOOL_ADMIN &&
      !SCHOOL_ADMIN_CREATABLE_ROLES.includes(target.role)
    ) {
      throw new ForbiddenException(
        "Ban Giám Hiệu không được thay đổi tài khoản có vai trò này.",
      );
    }

    return target;
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const target = await this.findManagedUser(actor, id);

    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (dto.role && !SCHOOL_ADMIN_CREATABLE_ROLES.includes(dto.role)) {
        throw new ForbiddenException(
          "Ban Giám Hiệu không được gán vai trò này.",
        );
      }
      if (dto.schoolId !== undefined && dto.schoolId !== actor.schoolId) {
        throw new ForbiddenException(
          "Không được chuyển tài khoản sang trường khác.",
        );
      }
    }

    const nextRole = dto.role ?? target.role;
    const nextSchoolId =
      dto.schoolId !== undefined ? dto.schoolId : target.schoolId;

    if (SCHOOL_SCOPED_ROLES.includes(nextRole) && !nextSchoolId) {
      throw new ConflictException("Vai trò này cần được gán schoolId.");
    }
    if (nextRole === UserRole.UBND_ADMIN) {
      if (!target.wardId || nextSchoolId) {
        throw new ConflictException(
          "Tài khoản UBND_ADMIN phải được tạo và gán phường hợp lệ.",
        );
      }
    }

    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      const duplicate = await this.prisma.user.findUnique({ where: { email } });
      if (duplicate && duplicate.id !== target.id) {
        throw new ConflictException("Email đã được sử dụng.");
      }
      dto.email = email;
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        fullName: dto.fullName?.trim(),
        wardId: nextRole === UserRole.UBND_ADMIN ? target.wardId : null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        schoolId: true,
        wardId: true,
        updatedAt: true,
      },
    });
  }

  async resetPassword(actor: AuthUser, id: string, password: string) {
    await this.findManagedUser(actor, id);
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { success: true, message: "Đã đặt lại mật khẩu." };
  }
}
