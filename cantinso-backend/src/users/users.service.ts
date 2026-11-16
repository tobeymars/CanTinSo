import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SCHOOL_ADMIN_CREATABLE_ROLES: UserRole[] = [UserRole.SCHOOL_KITCHEN, UserRole.SCHOOL_STAFF];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(user: AuthUser) {
    return user.role === UserRole.SUPER_ADMIN ? {} : { schoolId: user.schoolId ?? '__NO_SCHOOL__' };
  }

  private assertSchoolAdminScope(user: AuthUser, schoolId?: string | null) {
    if (user.role === UserRole.SCHOOL_ADMIN && (!user.schoolId || schoolId !== user.schoolId)) {
      throw new ForbiddenException('Ban Giám Hiệu chỉ được quản lý tài khoản thuộc trường mình.');
    }
  }

  async list(user: AuthUser) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền quản lý tài khoản.');
    }
    const users = await this.prisma.user.findMany({
      where: this.scope(user),
      select: { id: true, email: true, fullName: true, role: true, isActive: true, schoolId: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền tạo tài khoản.');
    }
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (!SCHOOL_ADMIN_CREATABLE_ROLES.includes(dto.role)) {
        throw new ForbiddenException('Ban Giám Hiệu chỉ được tạo tài khoản Bếp tại trường hoặc Nhân viên trường.');
      }
      if (!actor.schoolId) throw new ForbiddenException('Tài khoản Ban Giám Hiệu chưa được gán trường.');
      dto.schoolId = actor.schoolId;
    } else {
      if ([UserRole.SCHOOL_ADMIN, UserRole.SCHOOL_STAFF, UserRole.SCHOOL_KITCHEN, UserRole.KITCHEN_MANAGER, UserRole.NUTRITIONIST, UserRole.WAREHOUSE_STAFF, UserRole.PARENT].includes(dto.role) && !dto.schoolId) {
        throw new ConflictException('Vai trò này cần được gán schoolId.');
      }
      if ([UserRole.CENTRAL_KITCHEN, UserRole.UBND_ADMIN].includes(dto.role)) {
        throw new ForbiddenException('Chưa thể tạo tài khoản Bếp trung tâm hoặc UBND khi hệ thống chưa có mô hình gán đơn vị quản lý.');
      }
    }
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email đã được sử dụng.');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, fullName: dto.fullName.trim(), role: dto.role, schoolId: dto.schoolId ?? null },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, schoolId: true, createdAt: true },
    });
    return user;
  }

  private async findManagedUser(actor: AuthUser, id: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (actor.role !== UserRole.SUPER_ADMIN && (actor.role !== UserRole.SCHOOL_ADMIN || !actor.schoolId || target.schoolId !== actor.schoolId)) {
      throw new ForbiddenException('Bạn không có quyền quản lý tài khoản này.');
    }
    if (actor.role === UserRole.SCHOOL_ADMIN && !SCHOOL_ADMIN_CREATABLE_ROLES.includes(target.role)) {
      throw new ForbiddenException('Ban Giám Hiệu không được thay đổi tài khoản có vai trò này.');
    }
    return target;
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const target = await this.findManagedUser(actor, id);
    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (dto.role && !SCHOOL_ADMIN_CREATABLE_ROLES.includes(dto.role)) {
        throw new ForbiddenException('Ban Giám Hiệu không được gán vai trò này.');
      }
      if (dto.schoolId && dto.schoolId !== actor.schoolId) {
        throw new ForbiddenException('Không được chuyển tài khoản sang trường khác.');
      }
    }
    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      const duplicate = await this.prisma.user.findUnique({ where: { email } });
      if (duplicate && duplicate.id !== target.id) throw new ConflictException('Email đã được sử dụng.');
      dto.email = email;
    }
    return this.prisma.user.update({
      where: { id },
      data: { ...dto, fullName: dto.fullName?.trim() },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, schoolId: true, updatedAt: true },
    });
  }

  async resetPassword(actor: AuthUser, id: string, password: string) {
    await this.findManagedUser(actor, id);
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { success: true, message: 'Đã đặt lại mật khẩu.' };
  }
}
