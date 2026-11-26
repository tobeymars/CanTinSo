import { BadRequestException,
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
import { CreateCentralKitchenDto } from "./dto/create-central-kitchen.dto";

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
        kitchenId: true,
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


  async getMyKitchen(actor: AuthUser) {
    if (actor.role === UserRole.CENTRAL_KITCHEN || (actor.role === UserRole.SCHOOL_KITCHEN && !!actor.kitchenId)) {
      if (!actor.kitchenId) {
        throw new ForbiddenException("Tài khoản bếp trung tâm chưa được gắn với hồ sơ bếp.");
      }
      const now = new Date();
      const kitchen = await this.prisma.kitchen.findFirst({
        where: { id: actor.kitchenId, type: actor.role === UserRole.CENTRAL_KITCHEN ? "CENTRAL" : "SCHOOL", isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          address: true,
          contactName: true,
          phone: true,
          capacity: true,
          schoolId: true,
          ward: { select: { id: true, name: true, code: true } },
          schools: {
            where: {
              isActive: true,
              startsAt: { lte: now },
              OR: [{ endsAt: null }, { endsAt: { gte: now } }],
            },
            orderBy: { startsAt: "desc" },
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              school: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });
      if (!kitchen) throw new NotFoundException("Không tìm thấy bếp trung tâm đang hoạt động được gắn với tài khoản.");
      return { providerType: actor.role === UserRole.CENTRAL_KITCHEN ? "CENTRAL" as const : "SCHOOL" as const, assignmentId: null, startsAt: null, kitchen };
    }

    if ((actor.role !== UserRole.SCHOOL_ADMIN && actor.role !== UserRole.SCHOOL_KITCHEN) || !actor.schoolId) {
      throw new ForbiddenException("Tài khoản chưa được gán trường để xem thông tin bếp phục vụ.");
    }

    const assignment = await this.prisma.kitchenSchoolAssignment.findFirst({
      where: {
        schoolId: actor.schoolId,
        isActive: true,
        endsAt: null,
        kitchen: { is: { type: "CENTRAL", isActive: true } },
      },
      include: {
        kitchen: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            address: true,
            contactName: true,
            phone: true,
            capacity: true,
            ward: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { startsAt: "desc" },
    });

    if (assignment) {
      return {
        providerType: "CENTRAL" as const,
        assignmentId: assignment.id,
        startsAt: assignment.startsAt,
        kitchen: assignment.kitchen,
      };
    }

    const onSiteKitchen = await this.prisma.kitchen.findFirst({
      where: {
        schoolId: actor.schoolId,
        type: "SCHOOL",
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        address: true,
        contactName: true,
        phone: true,
        capacity: true,
        ward: { select: { id: true, name: true, code: true } },
      },
    });

    return onSiteKitchen
      ? { providerType: "SCHOOL" as const, assignmentId: null, startsAt: null, kitchen: onSiteKitchen }
      : null;
  }

  async listCentralKitchens(actor: AuthUser) {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.UBND_ADMIN) {
      throw new ForbiddenException("Bạn không có quyền quản lý bếp trung tâm.");
    }
    if (actor.role === UserRole.UBND_ADMIN && !actor.wardId) {
      throw new ForbiddenException("Tài khoản UBND chưa được gán phường.");
    }
    return this.prisma.kitchen.findMany({
      where: {
        type: "CENTRAL",
        ...(actor.role === UserRole.UBND_ADMIN ? { wardId: actor.wardId! } : {}),
      },
      include: {
        ward: { select: { id: true, name: true, code: true } },
        schools: {
          where: { isActive: true, endsAt: null },
          include: { school: { select: { id: true, name: true, code: true } } },
        },
        users: {
          where: { role: UserRole.CENTRAL_KITCHEN },
          select: { id: true, email: true, fullName: true, isActive: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Bổ sung trường cho bếp đã tồn tại, không tạo bếp hoặc tài khoản mới. */
  async assignCentralKitchenSchools(actor: AuthUser, kitchenId: string, schoolIds: unknown) {
    if (actor.role !== UserRole.UBND_ADMIN && actor.role !== UserRole.SUPER_ADMIN)
      throw new ForbiddenException("Không có quyền phân công trường.");
    if (actor.role === UserRole.UBND_ADMIN && !actor.wardId)
      throw new ForbiddenException("Tài khoản UBND chưa được gán phường.");
    if (!Array.isArray(schoolIds) || schoolIds.length < 1 || schoolIds.length > 100 ||
        schoolIds.some(id => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) ||
        new Set(schoolIds).size !== schoolIds.length)
      throw new BadRequestException("Danh sách trường không hợp lệ hoặc bị trùng.");
    return this.prisma.$transaction(async tx => {
      const kitchen = await tx.kitchen.findUnique({
        where:{id:kitchenId},select:{id:true,type:true,wardId:true,isActive:true},
      });
      if (!kitchen || kitchen.type !== 'CENTRAL') throw new NotFoundException("Không tìm thấy bếp trung tâm.");
      if (!kitchen.isActive) throw new ConflictException("Bếp đang bị khóa.");
      if (!kitchen.wardId || (actor.role === UserRole.UBND_ADMIN && actor.wardId !== kitchen.wardId))
        throw new ForbiddenException("Bếp không thuộc phường quản lý.");
      const schools = await tx.school.findMany({
        where:{id:{in:schoolIds},wardId:kitchen.wardId},
        select:{id:true,name:true},
      });
      if(schools.length !== schoolIds.length)
        throw new ForbiddenException("Có trường không thuộc cùng phường hoặc không tồn tại.");
      const assigned=await tx.kitchenSchoolAssignment.findMany({
        where:{schoolId:{in:schoolIds},isActive:true,endsAt:null},
        include:{school:{select:{name:true}},kitchen:{select:{name:true}}},
      });
      if(assigned.length)
        throw new ConflictException('Trường "'+assigned[0].school.name+'" đang được phân công cho "'+assigned[0].kitchen.name+'".');
      const onsite=await tx.kitchen.findFirst({
        where:{schoolId:{in:schoolIds},type:'SCHOOL',isActive:true},select:{schoolId:true},
      });
      if(onsite) throw new ConflictException("Có trường đang có bếp tại trường hoạt động.");
      await tx.kitchenSchoolAssignment.createMany({
        data:schoolIds.map((schoolId:string)=>({kitchenId,schoolId,isActive:true})),
      });
      return {success:true,assigned:schoolIds.length};
    });
  }

  async createCentralKitchen(actor: AuthUser, dto: CreateCentralKitchenDto) {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.UBND_ADMIN) {
      throw new ForbiddenException("Bạn không có quyền tạo bếp trung tâm.");
    }
    if (actor.role === UserRole.UBND_ADMIN && !actor.wardId) {
      throw new ForbiddenException("Tài khoản UBND chưa được gán phường.");
    }
    const schoolIds = [...new Set(dto.schoolIds)];
    if (schoolIds.length !== dto.schoolIds.length) {
      throw new ConflictException("Danh sách trường bị trùng.");
    }
    const email = dto.adminEmail.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new ConflictException("Email quản trị bếp đã được sử dụng.");
    const existingKitchen = await this.prisma.kitchen.findUnique({ where: { code: dto.code.trim().toUpperCase() } });
    if (existingKitchen) throw new ConflictException("Mã bếp trung tâm đã tồn tại.");
    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const schools = await tx.school.findMany({
        where: {
          id: { in: schoolIds },
          ...(actor.role === UserRole.UBND_ADMIN ? { wardId: actor.wardId! } : {}),
        },
        select: { id: true, wardId: true, name: true },
      });
      if (schools.length !== schoolIds.length) {
        throw new ForbiddenException(
          "Có trường không tồn tại, chưa được gán phường hoặc nằm ngoài phạm vi quản lý của bạn.",
        );
      }
      const wardIds = [...new Set(schools.map((school) => school.wardId).filter((id): id is string => !!id))];
      if (schools.some((school) => !school.wardId) || wardIds.length !== 1) {
        throw new ConflictException(
          "Các trường được chọn phải cùng thuộc một phường và đã được gán phường.",
        );
      }
      const kitchenWardId = wardIds[0];
      if (actor.role === UserRole.UBND_ADMIN && kitchenWardId !== actor.wardId) {
        throw new ForbiddenException("Không được tạo bếp cho phường khác.");
      }
      const alreadyAssigned = await tx.kitchenSchoolAssignment.findMany({
        where: { schoolId: { in: schoolIds }, isActive: true, endsAt: null },
        include: { kitchen: { select: { name: true } }, school: { select: { name: true } } },
      });
      const schoolsWithOnSiteKitchen = await tx.kitchen.findMany({
        where: { type: "SCHOOL", isActive: true, schoolId: { in: schoolIds } },
        select: { schoolId: true },
      });
      if (schoolsWithOnSiteKitchen.length) {
        throw new ConflictException(
          "Có trường đang sử dụng bếp tại trường. Hãy kết thúc mô hình bếp hiện tại trước khi gán bếp trung tâm.",
        );
      }
      if (alreadyAssigned.length) {
        throw new ConflictException(
          `Trường "${alreadyAssigned[0].school.name}" đã được gán cho bếp "${alreadyAssigned[0].kitchen.name}". Hãy kết thúc phân công cũ trước.`,
        );
      }

      const kitchen = await tx.kitchen.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          address: dto.address?.trim() || null,
          contactName: dto.contactName.trim(),
          phone: dto.phone?.trim() || null,
          capacity: dto.capacity ?? null,
          type: "CENTRAL",
          wardId: kitchenWardId,
          schools: {
            create: schoolIds.map((schoolId) => ({ schoolId })),
          },
        },
      });
      const admin = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName: dto.adminFullName.trim(),
          role: UserRole.CENTRAL_KITCHEN,
          kitchenId: kitchen.id,
          schoolId: null,
          wardId: null,
        },
        select: { id: true, email: true, fullName: true, role: true, isActive: true },
      });
      return { ...kitchen, admin };
    });
  }

  private async findManagedUser(actor: AuthUser, id: string) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      include: { kitchen: { select: { wardId: true } } },
    });
    if (!target) {
      throw new NotFoundException("Không tìm thấy tài khoản.");
    }

    const isWardKitchenAdmin =
      actor.role === UserRole.UBND_ADMIN &&
      target.role === UserRole.CENTRAL_KITCHEN &&
      !!actor.wardId &&
      target.kitchen?.wardId === actor.wardId;
    const isSchoolManaged =
      actor.role === UserRole.SCHOOL_ADMIN &&
      !!actor.schoolId &&
      target.schoolId === actor.schoolId;

    if (actor.role !== UserRole.SUPER_ADMIN && !isWardKitchenAdmin && !isSchoolManaged) {
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

    if (actor.role === UserRole.UBND_ADMIN) {
      if (target.role !== UserRole.CENTRAL_KITCHEN || dto.role !== undefined ||
          dto.schoolId !== undefined) {
        throw new ForbiddenException("UBND chỉ được quản lý thông tin và trạng thái tài khoản bếp thuộc phường mình.");
      }
    }

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
    if (nextRole === UserRole.CENTRAL_KITCHEN && !target.kitchenId) {
      throw new ConflictException("Tài khoản Bếp trung tâm phải được gắn với hồ sơ bếp.");
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
        kitchenId: nextRole === UserRole.CENTRAL_KITCHEN ? target.kitchenId : null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        schoolId: true,
        wardId: true,
        kitchenId: true,
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
