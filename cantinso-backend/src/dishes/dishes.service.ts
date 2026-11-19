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
import { PreviewDishNutritionDto } from './dto/preview-dish-nutrition.dto';

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

  async listIngredientCatalog(user: AuthUser) {
    this.requireKitchenUser(user);
    return this.prisma.ingredient.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { id: true, code: true, name: true, unit: true, category: true },
    });
  }

  async updateMetadata(user: AuthUser, dishId: string, dto: CreateDishDto) {
    const kitchenId = this.requireKitchenUser(user);
    const dish = await this.prisma.dish.findFirst({
      where: { id: dishId, kitchenId },
      include: { _count: { select: { versions: true, mealPlanItems: true } } },
    });
    if (!dish) throw new NotFoundException('Không tìm thấy món ăn trong phạm vi bếp.');
    // Once a recipe version exists, keep parent identity stable for audit history.
    // The edited name and instructions are stored in the next immutable version snapshot.
    if (dish._count.versions > 0 || dish._count.mealPlanItems > 0) {
      return {
        id: dish.id, code: dish.code, name: dish.name, category: dish.category,
        status: dish.status, kitchenId: dish.kitchenId, createdAt: dish.createdAt,
      };
    }
    return this.prisma.dish.update({
      where: { id: dishId },
      data: { code: dto.code.trim(), name: dto.name.trim(), category: dto.category?.trim() || null },
      select: { id: true, code: true, name: true, category: true, status: true, kitchenId: true, createdAt: true },
    });
  }

  async removeDraft(user: AuthUser, dishId: string) {
    const kitchenId = this.requireKitchenUser(user);
    const dish = await this.prisma.dish.findFirst({
      where: { id: dishId, kitchenId },
      include: { _count: { select: { versions: true, mealPlanItems: true } } },
    });
    if (!dish) throw new NotFoundException('Không tìm thấy món ăn trong phạm vi bếp.');
    if (dish._count.versions > 0 || dish._count.mealPlanItems > 0) {
      throw new BadRequestException('Món đã có phiên bản công thức hoặc được sử dụng trong thực đơn; không thể xóa để bảo toàn lịch sử.');
    }
    await this.prisma.dish.delete({ where: { id: dishId } });
    return { success: true, id: dishId };
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
            recipeSnapshot: true,
            nutritionSnapshot: true,
            ingredients: {
              include: { ingredient: { select: { id: true, code: true, name: true, unit: true } } },
            },
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

  private buildNutritionSnapshot(
    recipeIngredients: CreateDishVersionDto['ingredients'],
    catalogIngredients: Array<{
      id: string;
      code: string;
      name: string;
      unit: string;
      nutritionProfiles: Array<{
        sourceRowNo: number | null;
        sourceCategory: string;
        edibleRatePercent: Prisma.Decimal;
        energyKcal: Prisma.Decimal | null;
        proteinG: Prisma.Decimal | null;
        fatG: Prisma.Decimal | null;
        carbohydrateG: Prisma.Decimal | null;
        fiberG: Prisma.Decimal | null;
        calciumMg: Prisma.Decimal | null;
        ironMg: Prisma.Decimal | null;
        zincMg: Prisma.Decimal | null;
        vitaminARaeMcg: Prisma.Decimal | null;
        nutritionReference: {
          code: string;
          title: string;
          documentNo: string;
          appendix: string;
          sourceUrl: string;
          effectiveAt: Date;
        };
      }>;
    }>,
  ) {
    const nutrientFields = [
      'energyKcal',
      'proteinG',
      'fatG',
      'carbohydrateG',
      'fiberG',
      'calciumMg',
      'ironMg',
      'zincMg',
      'vitaminARaeMcg',
    ] as const;
    type NutrientField = (typeof nutrientFields)[number];
    const totals: Record<NutrientField, number> = {
      energyKcal: 0,
      proteinG: 0,
      fatG: 0,
      carbohydrateG: 0,
      fiberG: 0,
      calciumMg: 0,
      ironMg: 0,
      zincMg: 0,
      vitaminARaeMcg: 0,
    };
    const complete: Record<NutrientField, boolean> = {
      energyKcal: true,
      proteinG: true,
      fatG: true,
      carbohydrateG: true,
      fiberG: true,
      calciumMg: true,
      ironMg: true,
      zincMg: true,
      vitaminARaeMcg: true,
    };
    const catalogById = new Map(catalogIngredients.map((item) => [item.id, item]));
    const details: Array<Record<string, unknown>> = [];
    const warnings: string[] = [];
    let reference: Record<string, unknown> | null = null;

    for (const recipeItem of recipeIngredients) {
      const ingredient = catalogById.get(recipeItem.ingredientId);
      const profile = ingredient?.nutritionProfiles[0];
      if (!ingredient) continue;
      if (!profile) {
        warnings.push(`Chưa có hồ sơ dinh dưỡng Phụ lục 7 cho nguyên liệu "${ingredient.name}".`);
        for (const field of nutrientFields) complete[field] = false;
        details.push({
          ingredientId: ingredient.id,
          ingredientCode: ingredient.code,
          ingredientName: ingredient.name,
          quantity: recipeItem.quantity,
          unitCode: recipeItem.unitCode,
          status: 'MISSING_NUTRITION_PROFILE',
        });
        continue;
      }

      reference = {
        code: profile.nutritionReference.code,
        title: profile.nutritionReference.title,
        documentNo: profile.nutritionReference.documentNo,
        appendix: profile.nutritionReference.appendix,
        sourceUrl: profile.nutritionReference.sourceUrl,
        effectiveAt: profile.nutritionReference.effectiveAt.toISOString().slice(0, 10),
      };

      const unit = recipeItem.unitCode.trim().toLowerCase();
      const gramsPerUnit: Record<string, number> = {
        g: 1, gram: 1, grams: 1,
        kg: 1000, kilogram: 1000, kilograms: 1000,
        mg: 0.001,
      };
      const gramsFactor = gramsPerUnit[unit];
      if (!gramsFactor) {
        warnings.push(`Không thể quy đổi "${recipeItem.unitCode}" của nguyên liệu "${ingredient.name}" sang gam; cần nhập định lượng theo g, kg hoặc mg.`);
        for (const field of nutrientFields) complete[field] = false;
        details.push({
          ingredientId: ingredient.id,
          ingredientCode: ingredient.code,
          ingredientName: ingredient.name,
          quantity: recipeItem.quantity,
          unitCode: recipeItem.unitCode,
          status: 'UNSUPPORTED_UNIT',
        });
        continue;
      }

      const grossWeightG = recipeItem.quantity * gramsFactor;
      const edibleWeightG = grossWeightG * Number(profile.edibleRatePercent) / 100;
      const contribution: Record<string, number | null> = {};
      for (const field of nutrientFields) {
        const value = profile[field];
        if (value === null) {
          complete[field] = false;
          contribution[field] = null;
        } else {
          const amount = Number(value) * edibleWeightG / 100;
          totals[field] += amount;
          contribution[field] = Number(amount.toFixed(4));
        }
      }
      details.push({
        ingredientId: ingredient.id,
        ingredientCode: ingredient.code,
        ingredientName: ingredient.name,
        sourceRowNo: profile.sourceRowNo,
        sourceCategory: profile.sourceCategory,
        quantity: recipeItem.quantity,
        unitCode: recipeItem.unitCode,
        grossWeightG: Number(grossWeightG.toFixed(3)),
        edibleRatePercent: Number(profile.edibleRatePercent),
        edibleWeightG: Number(edibleWeightG.toFixed(3)),
        contribution,
        status: 'CALCULATED',
      });
    }

    const result: Record<string, unknown> = {};
    for (const field of nutrientFields) {
      result[field] = complete[field] ? Number(totals[field].toFixed(2)) : null;
    }
    return {
      calculationMethod: 'ANNEX_7_PER_100G_EDIBLE_PORTION',
      calculatedAt: new Date().toISOString(),
      reference,
      totals: result,
      coverage: {
        ingredientCount: recipeIngredients.length,
        calculatedCount: details.filter((item) => item.status === 'CALCULATED').length,
        missingProfileCount: details.filter((item) => item.status === 'MISSING_NUTRITION_PROFILE').length,
        unsupportedUnitCount: details.filter((item) => item.status === 'UNSUPPORTED_UNIT').length,
        complete: warnings.length === 0 && nutrientFields.every((field) => complete[field]),
      },
      ingredients: details,
      warnings,
    };
  }

  async previewNutrition(user: AuthUser, dto: PreviewDishNutritionDto) {
    this.requireKitchenUser(user);
    const normalize = (value: string) => value.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('vi')
      .replace(/đ/g, 'd')
      .trim();
    const catalogIngredients = await this.prisma.ingredient.findMany({
      where: {
        nutritionProfiles: {
          some: {
            nutritionReference: {
              code: 'MOH-3958-QD-BYT-2025-APPENDIX-7-V1',
            },
          },
        },
      },
      include: {
        nutritionProfiles: {
          where: {
            nutritionReference: {
              code: 'MOH-3958-QD-BYT-2025-APPENDIX-7-V1',
            },
          },
          include: {
            nutritionReference: {
              select: {
                code: true,
                title: true,
                documentNo: true,
                appendix: true,
                sourceUrl: true,
                effectiveAt: true,
              },
            },
          },
        },
      },
    });
    const byName = new Map(catalogIngredients.map((item) => [normalize(item.name), item]));
    const resolved = dto.ingredients.flatMap((item) => {
      const ingredient = byName.get(normalize(item.ingredientName));
      return ingredient ? [{
        ingredientId: ingredient.id,
        quantity: item.quantity,
        unitCode: item.unitCode,
      }] : [];
    });
    const snapshot = this.buildNutritionSnapshot(resolved, catalogIngredients) as {
      totals: Record<string, unknown>;
      coverage: {
        ingredientCount: number;
        calculatedCount: number;
        missingProfileCount: number;
        unsupportedUnitCount: number;
        complete: boolean;
      };
      ingredients: Array<Record<string, unknown>>;
      warnings: string[];
    };
    const missing = dto.ingredients.filter((item) => !byName.has(normalize(item.ingredientName)));
    if (missing.length) {
      snapshot.coverage.ingredientCount = dto.ingredients.length;
      snapshot.coverage.missingProfileCount += missing.length;
      snapshot.coverage.complete = false;
      for (const field of Object.keys(snapshot.totals)) snapshot.totals[field] = null;
      for (const item of missing) {
        snapshot.ingredients.push({
          ingredientName: item.ingredientName,
          quantity: item.quantity,
          unitCode: item.unitCode,
          status: 'MISSING_CATALOG_INGREDIENT',
        });
        snapshot.warnings.push(`Không tìm thấy "${item.ingredientName}" trong danh mục thực phẩm có dữ liệu Phụ lục 7.`);
      }
    } else {
      snapshot.coverage.ingredientCount = dto.ingredients.length;
    }
    return snapshot;
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
      include: {
        nutritionProfiles: {
          where: {
            nutritionReference: {
              code: 'MOH-3958-QD-BYT-2025-APPENDIX-7-V1',
            },
          },
          include: {
            nutritionReference: {
              select: {
                code: true,
                title: true,
                documentNo: true,
                appendix: true,
                sourceUrl: true,
                effectiveAt: true,
              },
            },
          },
        },
      },
    });
    if (foundIngredients.length !== ingredientIds.length) {
      throw new BadRequestException('Có nguyên liệu không tồn tại trong danh mục chuẩn.');
    }

    const nutritionSnapshot = this.buildNutritionSnapshot(dto.ingredients, foundIngredients);

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
          nutritionSnapshot: nutritionSnapshot as Prisma.InputJsonValue,
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
    const kitchen = await this.prisma.kitchen.findFirst({
      where: { id: kitchenId, isActive: true },
      select: { type: true, schoolId: true },
    });
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
    if (kitchen?.type === 'SCHOOL' && kitchen.schoolId) assignedIds.add(kitchen.schoolId);
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
