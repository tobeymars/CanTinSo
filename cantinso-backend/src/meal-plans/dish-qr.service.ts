import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DishQrService {
  constructor(private readonly prisma: PrismaService) {}

  private async scopedPlan(user: AuthUser, planId: string) {
    if (!['CENTRAL_KITCHEN', 'SCHOOL_KITCHEN', 'SCHOOL_ADMIN', 'UBND_ADMIN'].includes(user.role)) throw new ForbiddenException('Không có quyền xem QR.');
    const plan = await this.prisma.mealPlan.findFirst({
      where: { id: planId,
        ...(user.role === 'SCHOOL_ADMIN' ? { schoolId: user.schoolId ?? '__none__' } :
          user.role === 'UBND_ADMIN' ? { school: { wardId: user.wardId ?? '__none__' } } :
          { kitchenId: user.kitchenId ?? '__none__' }) },
      include: { school: { select: { id: true, name: true, wardId: true } }, kitchen: { select: { id: true, name: true, isActive: true } },
        revisions: { orderBy: { revisionNo: 'desc' }, take: 1,
          include: { ageGroups: { include: { ageGroup: true } }, items: { include: { portions: true, dishVersion: { include: {
            dish: { select: { id: true, name: true, kitchenId: true } },
            ingredients: { include: { ingredient: { select: { name: true, unit: true } } } },
          } } } } } } },
    });
    if (!plan) throw new NotFoundException('Không tìm thấy thực đơn thuộc phạm vi tài khoản.');
    return plan;
  }

  private async activeAssignment(kitchenId: string, schoolId: string) {
    const now = new Date();
    const assignment = await this.prisma.kitchenSchoolAssignment.findFirst({
      where: { kitchenId, schoolId, isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    });
    if (!assignment) throw new ForbiddenException('Bếp không còn được phân công phục vụ trường.');
  }

  async list(user: AuthUser, planId: string) {
    const plan = await this.scopedPlan(user, planId);
    const records = await this.prisma.dishQr.findMany({
      where: { mealPlanId: plan.id }, orderBy: { issuedAt: 'asc' },
      include: { ageGroup: { select: { name: true, code: true } },
        revisionItem: { include: { dishVersion: { include: { dish: { select: { name: true } } } } } } },
    });
    const latest = plan.revisions[0];
    return { plan: { id: plan.id, schoolName: plan.school.name, kitchenName: plan.kitchen?.name ?? '',
      serviceDate: plan.serviceDate, mealType: plan.mealType, revisionId: latest?.id ?? null, status: latest?.status ?? 'DRAFT' },
      records: records.map(row => ({ id: row.id, token: row.publicToken, dishName: row.revisionItem.dishVersion.dish.name,
        ageGroup: row.ageGroup.name, ageGroupCode: row.ageGroup.code, revisionId: row.revisionId,
        issuedAt: row.issuedAt, revokedAt: row.revokedAt, revokeReason: row.revokeReason,
        state: row.revokedAt || row.revisionId !== latest?.id || latest?.status !== 'APPROVED' ? 'REVOKED' : 'ACTIVE' })) };
  }

  async issue(user: AuthUser, planId: string) {
    if (!['CENTRAL_KITCHEN', 'SCHOOL_KITCHEN'].includes(user.role) || !user.kitchenId) throw new ForbiddenException('Chỉ bếp được phân công có quyền phát hành QR.');
    const plan = await this.scopedPlan(user, planId);
    if (!plan.kitchen?.isActive || plan.kitchen.id !== user.kitchenId) throw new ForbiddenException('Bếp không hoạt động hoặc không đúng phạm vi.');
    await this.activeAssignment(user.kitchenId, plan.schoolId);
    const revision = plan.revisions[0];
    if (!revision || revision.status !== 'APPROVED') throw new BadRequestException('Chỉ phát hành QR cho phiên bản thực đơn mới nhất đã được BGH duyệt.');
    if (!revision.items.length || !revision.ageGroups.length) throw new BadRequestException('Thực đơn thiếu món hoặc nhóm tuổi.');
    const pairs = revision.items.flatMap(item => revision.ageGroups.filter(group => group.plannedServings > 0 &&
      (!item.portions.length || item.portions.some(portion => portion.ageGroupId === group.ageGroupId)))
      .map(group => ({ item, group })));
    if (!pairs.length) throw new BadRequestException('Không có món phù hợp nhóm tuổi để phát hành.');
    if (revision.items.some(item => item.dishVersion.dish.kitchenId !== user.kitchenId))
      throw new BadRequestException('Thực đơn chứa món không thuộc bếp được phân công.');
    return this.prisma.$transaction(async tx => {
      const current = await tx.mealPlanRevision.findFirst({ where: { mealPlanId: plan.id }, orderBy: { revisionNo: 'desc' }, select: { id: true, status: true } });
      if (current?.id !== revision.id || current.status !== 'APPROVED') throw new BadRequestException('Thực đơn vừa thay đổi. Hãy tải lại.');
      const existing = await tx.dishQr.findMany({ where: { revisionId: revision.id } });
      if (existing.some(row => row.revokedAt)) throw new BadRequestException('QR đã thu hồi không được phát hành lại cho cùng phiên bản. Cần tạo phiên bản thực đơn mới.');
      if (existing.length && existing.length !== pairs.length) throw new BadRequestException('Danh sách QR chưa đồng bộ; cần kiểm tra lại thực đơn.');
      if (!existing.length) {
        await tx.dishQr.createMany({ data: pairs.map(({ item, group }) => ({
          publicToken: randomBytes(24).toString('base64url'), schoolId: plan.schoolId,
          kitchenId: user.kitchenId!, mealPlanId: plan.id, revisionId: revision.id,
          revisionItemId: item.id, ageGroupId: group.ageGroupId, issuedById: user.sub,
        })) });
      }
      return { issued: existing.length || pairs.length, revisionId: revision.id };
    });
  }

  async revoke(user: AuthUser, planId: string, reason: string) {
    if (!['CENTRAL_KITCHEN', 'SCHOOL_KITCHEN'].includes(user.role) || !user.kitchenId) throw new ForbiddenException('Chỉ bếp được phân công có quyền thu hồi QR.');
    if (typeof reason !== 'string' || reason.trim().length < 8 || reason.length > 300) throw new BadRequestException('Lý do thu hồi phải có từ 8 đến 300 ký tự.');
    const plan = await this.scopedPlan(user, planId);
    await this.activeAssignment(user.kitchenId, plan.schoolId);
    const latest = plan.revisions[0];
    if (!latest) throw new BadRequestException('Chưa có phiên bản thực đơn.');
    const result = await this.prisma.dishQr.updateMany({
      where: { mealPlanId: plan.id, revisionId: latest.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedById: user.sub, revokeReason: reason.trim() },
    });
    return { revoked: result.count };
  }

  async publicDetail(token: string) {
    if (!/^[A-Za-z0-9_-]{32}$/.test(token)) throw new NotFoundException('Mã QR không hợp lệ.');
    const row = await this.prisma.dishQr.findUnique({ where: { publicToken: token },
      include: { school: { select: { name: true } }, kitchen: { select: { name: true } },
        mealPlan: { select: { serviceDate: true, mealType: true } },
        ageGroup: { select: { name: true, code: true } },
        revisionItem: { include: { dishVersion: { include: { dish: { select: { name: true } },
          ingredients: { include: { ingredient: { select: { name: true, unit: true } } } } } },
          portions: true } } },
    });
    if (!row) throw new NotFoundException('Không tìm thấy mã QR.');
    const latest = await this.prisma.mealPlanRevision.findFirst({
      where: { mealPlanId: row.mealPlanId }, orderBy: { revisionNo: 'desc' }, select: { id: true, status: true },
    });
    const valid = !row.revokedAt && latest?.id === row.revisionId && latest.status === 'APPROVED';
    const version = row.revisionItem.dishVersion;
    return { state: valid ? 'ACTIVE' : 'REVOKED', revokeReason: row.revokeReason,
      schoolName: row.school.name, kitchenName: row.kitchen.name,
      serviceDate: row.mealPlan.serviceDate, mealType: row.mealPlan.mealType,
      dishName: version.dish.name, ageGroup: row.ageGroup.name, ageGroupCode: row.ageGroup.code,
      recipe: version.recipeSnapshot, nutrition: version.nutritionSnapshot,
      portionFactor: row.revisionItem.portions.find(p => p.ageGroupId === row.ageGroupId)?.portionFactor ?? 1,
      ingredients: version.ingredients.map(i => ({ name: i.ingredient.name, quantity: i.quantity, unit: i.unitCode })),
      issuedAt: row.issuedAt, note: 'Thông tin nguyên liệu là công thức dự kiến, chưa xác nhận lô nguyên liệu hoặc nhật ký chế biến.' };
  }
}
