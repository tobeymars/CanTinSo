import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DishApprovalEventType,
  DishApprovalStatus,
  DishVersionStatus,
  Prisma,
} from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { CreateDishVersionDto } from './dto/create-dish-version.dto';

@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireKitchenUser(user: AuthUser): string {
    if (
      !['CENTRAL_KITCHEN', 'SCHOOL_KITCHEN'].includes(user.role) ||
      !user.kitchenId
    ) {
      throw new ForbiddenException('Tài khoản không thuộc phạm vi vận hành của bếp.');
    }
    return user.kitchenId;
  }

  private requireSchoolApprover(user: AuthUser): string {
    if (user.role !== 'SCHOOL_ADMIN' || !user.schoolId) {
      throw new ForbiddenException('Chỉ quản trị trường được phân quyền mới có thể duyệt món.');
    }
    return user.schoolId;
  }

  async create(user: AuthUser, dto: CreateDishDto) {
    const kitchenId = this.requireKitchenUser(user);
    const kitchen = await this.prisma.kitchen.findFirst({
      where: { id: kitchenId, isActive: true },
      select: { id: true },
    });
    if (!kitchen) throw new ForbiddenException('Bếp không tồn tại hoặc đã ngừng hoạt động.');

    return this.prisma.dish.create({
      data: {
        kitchenId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        category: dto.category?.trim() || null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        status: true,
        kitchenId: true,
        createdAt: true,
      },
    });
  }

  async listForKitchen(user: AuthUser) {
    const kitchenId = this.requireKitchenUser(user);
    return this.prisma.dish.findMany({
      where: { kitchenId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
          select: {
            id: true,
            versionNo: true,
            status: true,
            createdAt: true,
            approvals: {
              select: {
                id: true,
                schoolId: true,
                status: true,
                submittedAt: true,
                decidedAt: true,
                decisionNote: true,
                school: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async getOneForKitchen(user: AuthUser, dishId: string) {
    const kitchenId = this.requireKitchenUser(user);
    const dish = await this.prisma.dish.findFirst({
      where: { id: dishId, kitchenId },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          include: {
            ingredients: {
              include: { ingredient: { select: { id: true, code: true, name: true, unit: true } } },
            },
            approvals: {
              include: { school: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!dish) throw new NotFoundException('Không tìm thấy món ăn trong phạm vi bếp.');
    return dish;
  }

  async createVersion(user: AuthUser, dishId: string, dto: CreateDishVersionDto) {
    const kitchenId = this.requireKitchenUser(user);
    const dish = await this.prisma.dish.findFirst({
      where: { id: dishId, kitchenId },
      select: { id: true },
    });
    if (!dish) throw new NotFoundException('Không tìm thấy món ăn trong phạm vi bếp.');

    const ingredientIds = dto.ingredients.map((item) => item.ingredientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      throw new BadRequestException('Mỗi nguyên liệu chỉ được khai báo một lần trong một phiên bản công thức.');
    }
    const foundIngredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true },
    });
    if (foundIngredients.length !== ingredientIds.length) {
      throw new BadRequestException('Có nguyên liệu không tồn tại trong danh mục chuẩn.');
    }

    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.dishVersion.findFirst({
        where: { dishId },
        orderBy: { versionNo: 'desc' },
        select: { versionNo: true },
      });
      const version = await tx.dishVersion.create({
        data: {
          dishId,
          versionNo: (latest?.versionNo ?? 0) + 1,
          createdById: user.sub,
          recipeSnapshot: dto.recipeSnapshot as Prisma.InputJsonValue,
          nutritionSnapshot: dto.nutritionSnapshot as Prisma.InputJsonValue | undefined,
          allergenSnapshot: dto.allergenSnapshot as Prisma.InputJsonValue | undefined,
        },
      });
      await tx.dishIngredient.createMany({
        data: dto.ingredients.map((item) => ({
          dishVersionId: version.id,
          ingredientId: item.ingredientId,
          quantity: new Prisma.Decimal(item.quantity),
          unitCode: item.unitCode.trim(),
          preparationNote: item.preparationNote?.trim() || null,
        })),
      });
      return tx.dishVersion.findUnique({
        where: { id: version.id },
        include: {
          ingredients: {
            include: { ingredient: { select: { id: true, code: true, name: true, unit: true } } },
          },
        },
      });
    });
  }

  async submitVersion(
    user: AuthUser,
    dishId: string,
    versionId: string,
    schoolIds: string[],
  ) {
    const kitchenId = this.requireKitchenUser(user);
    const uniqueSchoolIds = [...new Set(schoolIds)];
    if (uniqueSchoolIds.length !== schoolIds.length) {
      throw new BadRequestException('Danh sách trường bị trùng.');
    }

    const version = await this.prisma.dishVersion.findFirst({
      where: { id: versionId, dishId, dish: { kitchenId } },
      select: { id: true, status: true },
    });
    if (!version) throw new NotFoundException('Không tìm thấy phiên bản món trong phạm vi bếp.');
    if (version.status !== DishVersionStatus.DRAFT) {
      throw new BadRequestException('Chỉ phiên bản DRAFT mới được gửi duyệt. Nếu cần chỉnh sửa, hãy tạo phiên bản mới.');
    }

    const now = new Date();
    const assignments = await this.prisma.kitchenSchoolAssignment.findMany({
      where: {
        kitchenId,
        schoolId: { in: uniqueSchoolIds },
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      select: { schoolId: true },
    });
    const assignedIds = new Set(assignments.map((item) => item.schoolId));
    const invalidIds = uniqueSchoolIds.filter((id) => !assignedIds.has(id));
    if (invalidIds.length) {
      throw new ForbiddenException('Có trường không nằm trong phân công bếp còn hiệu lực.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.dishVersion.update({
        where: { id: versionId },
        data: { status: DishVersionStatus.SUBMITTED, submittedAt: now },
      });
      await tx.dishApproval.createMany({
        data: uniqueSchoolIds.map((schoolId) => ({
          schoolId,
          dishVersionId: versionId,
          status: DishApprovalStatus.PENDING,
          submittedAt: now,
        })),
      });
      const approvals = await tx.dishApproval.findMany({
        where: { dishVersionId: versionId },
        include: { school: { select: { id: true, name: true } } },
      });
      for (const approval of approvals) {
        await tx.dishApprovalEvent.create({
          data: {
            dishApprovalId: approval.id,
            eventType: DishApprovalEventType.SUBMITTED,
            actorId: user.sub,
            actorRole: user.role as any,
            note: null,
            occurredAt: now,
          },
        });
      }
      return approvals;
    });
  }

  async pendingApprovals(user: AuthUser) {
    const schoolId = this.requireSchoolApprover(user);
    return this.prisma.dishApproval.findMany({
      where: { schoolId, status: DishApprovalStatus.PENDING },
      orderBy: { submittedAt: 'asc' },
      include: {
        school: { select: { id: true, name: true } },
        dishVersion: {
          include: {
            dish: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                kitchen: { select: { id: true, name: true, type: true } },
              },
            },
            ingredients: {
              include: { ingredient: { select: { id: true, code: true, name: true, unit: true } } },
            },
          },
        },
      },
    });
  }

  async decideApproval(
    user: AuthUser,
    approvalId: string,
    decision: 'APPROVED' | 'RETURNED',
    reason?: string,
  ) {
    const schoolId = this.requireSchoolApprover(user);
    if (decision === 'RETURNED' && !reason?.trim()) {
      throw new BadRequestException('Bắt buộc nhập lý do trả lại món.');
    }
    const approval = await this.prisma.dishApproval.findFirst({
      where: { id: approvalId, schoolId },
      select: { id: true, status: true },
    });
    if (!approval) throw new NotFoundException('Không tìm thấy yêu cầu duyệt món của trường.');
    if (approval.status !== DishApprovalStatus.PENDING) {
      throw new BadRequestException('Yêu cầu này đã được xử lý, không thể quyết định lại.');
    }

    const now = new Date();
    const status = decision === 'APPROVED'
      ? DishApprovalStatus.APPROVED
      : DishApprovalStatus.RETURNED;
    const eventType = decision === 'APPROVED'
      ? DishApprovalEventType.APPROVED
      : DishApprovalEventType.RETURNED;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.dishApproval.updateMany({
        where: { id: approvalId, schoolId, status: DishApprovalStatus.PENDING },
        data: {
          status,
          decidedAt: now,
          decidedById: user.sub,
          decisionNote: reason?.trim() || null,
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Yêu cầu đã được xử lý bởi một thao tác khác.');
      }
      const updated = await tx.dishApproval.findUniqueOrThrow({
        where: { id: approvalId },
        include: {
          school: { select: { id: true, name: true } },
          dishVersion: {
            include: { dish: { select: { id: true, code: true, name: true } } },
          },
        },
      });
      await tx.dishApprovalEvent.create({
        data: {
          dishApprovalId: approvalId,
          eventType,
          actorId: user.sub,
          actorRole: user.role as any,
          note: reason?.trim() || null,
          occurredAt: now,
        },
      });
      return updated;
    });
  }
}
