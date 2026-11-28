import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MealPlanApprovalEventType, MealPlanRevisionStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type PlanInput = {
  schoolId: string; serviceDate: string; mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  ageGroups: Array<{ ageGroupId: string; plannedServings: number; notes?: string }>;
  items: Array<{ dishVersionId: string; mealSlot: string; sequence?: number; isDefault?: boolean; note?: string;
    portions?: Array<{ ageGroupId: string; portionFactor?: number; unitCode: string; overrideReason?: string }> }>;
};

@Injectable()
export class MealPlansService {
  constructor(private readonly prisma: PrismaService,private readonly notifications:NotificationsService) {}

  async listAgeGroups() {
    const groups = [
      { code: 'KINDERGARTEN_UNSPECIFIED', name: 'Mầm non · cần quy chuẩn riêng', minAgeMonths: null, maxAgeMonths: null, sortOrder: 0 },
      { code: 'GRADES_1_2', name: 'Tiểu học · Lớp 1–2', minAgeMonths: 72, maxAgeMonths: 95, sortOrder: 1 },
      { code: 'GRADES_3_4', name: 'Tiểu học · Lớp 3–4', minAgeMonths: 96, maxAgeMonths: 119, sortOrder: 2 },
      { code: 'GRADES_5', name: 'Tiểu học · Lớp 5', minAgeMonths: 120, maxAgeMonths: 131, sortOrder: 3 },
      { code: 'GRADES_3_5', name: 'Nhóm dữ liệu cũ · Lớp 3–5', minAgeMonths: null, maxAgeMonths: null, sortOrder: 4 },
      { code: 'AGES_10_11', name: 'THCS · 10–11 tuổi', minAgeMonths: 120, maxAgeMonths: 143, sortOrder: 5 },
      { code: 'GRADES_6_9', name: 'THCS · 12–14 tuổi', minAgeMonths: 144, maxAgeMonths: 179, sortOrder: 6 },
      { code: 'GRADES_10_12', name: 'THPT · 15–19 tuổi', minAgeMonths: 180, maxAgeMonths: 239, sortOrder: 7 },
    ];
    await this.prisma.mealPlanAgeGroup.createMany({ data: groups, skipDuplicates: true });
    return this.prisma.mealPlanAgeGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  private kitchenId(user: AuthUser) {
    if (!['CENTRAL_KITCHEN', 'SCHOOL_KITCHEN'].includes(user.role) || !user.kitchenId) {
      throw new ForbiddenException('Tài khoản không thuộc phạm vi vận hành của bếp.');
    }
    return user.kitchenId;
  }

  async list(user: AuthUser) {
    // School-side receiving staff: only the school's approved menus, never the
    // central kitchen's plans for other assigned schools or draft revisions.
    if (user.role === 'SCHOOL_KITCHEN' && !user.kitchenId) {
      if (!user.schoolId) throw new ForbiddenException('Tài khoản chưa được gắn với trường.');
      return this.prisma.mealPlan.findMany({
        where: { schoolId: user.schoolId, revisions: { some: { status: 'APPROVED' } } },
        orderBy: [{ serviceDate: 'desc' }, { mealType: 'asc' }],
        include: { school: { select: { id: true, name: true } },
          revisions: { where: { status: 'APPROVED' }, orderBy: { revisionNo: 'desc' }, include: this.revisionInclude() } },
      });
    }
    if (user.role === 'SCHOOL_ADMIN') {
      if (!user.schoolId) throw new ForbiddenException('Tài khoản chưa được gắn với trường.');
      return this.prisma.mealPlan.findMany({
        where: { schoolId: user.schoolId },
        orderBy: [{ serviceDate: 'desc' }, { mealType: 'asc' }],
        include: { school: { select: { id: true, name: true } }, kitchen: { select: { id: true, code: true, name: true } }, revisions: {
          orderBy: { revisionNo: 'desc' }, include: this.revisionInclude(),
        } },
      });
    }
    if (user.role === 'UBND_ADMIN') {
      if (!user.wardId) throw new ForbiddenException('Tài khoản UBND chưa được gắn với phường quản lý.');
      return this.prisma.mealPlan.findMany({
        where: { school: { wardId: user.wardId }, revisions: { some: { status: 'APPROVED' } } },
        orderBy: [{ serviceDate: 'desc' }, { mealType: 'asc' }],
        include: { school: { select: { id: true, name: true } }, kitchen: { select: { id: true, code: true, name: true } }, revisions: {
          where: { status: 'APPROVED' }, orderBy: { revisionNo: 'desc' }, include: this.revisionInclude(),
        } },
      });
    }
    const kitchenId = this.kitchenId(user);
    return this.prisma.mealPlan.findMany({
      where: { kitchenId },
      orderBy: [{ serviceDate: 'desc' }, { mealType: 'asc' }],
      include: { school: { select: { id: true, name: true } }, revisions: {
        orderBy: { revisionNo: 'desc' }, include: this.revisionInclude(),
      } },
    });
  }

  private revisionInclude(): Prisma.MealPlanRevisionInclude {
    return {
      ageGroups: { include: { ageGroup: true } },
      items: { orderBy: [{ mealSlot: 'asc' }, { sequence: 'asc' }], include: {
        portions: { include: { ageGroup: true } },
        dishVersion: { include: { dish: { select: { id: true, code: true, name: true, kitchenId: true } },
          ingredients: { include: { ingredient: { select: { id: true, code: true, name: true, unit: true } } } },
          approvals: { select: { schoolId: true, status: true } } },
      } } },
      proposedBy: { select: { id: true, fullName: true, role: true } },
      decidedBy: { select: { id: true, fullName: true, role: true } },
      events: { orderBy: { occurredAt: 'asc' }, include: { actor: { select: { id: true, fullName: true, role: true } } } },
    };
  }

  async history(user: AuthUser, mealPlanId: string) {
    let where: Prisma.MealPlanWhereInput;
    if (user.role === 'SCHOOL_ADMIN') {
      if (!user.schoolId) throw new ForbiddenException('Tài khoản chưa được gắn với trường.');
      where = { id: mealPlanId, schoolId: user.schoolId };
    } else if (user.role === 'UBND_ADMIN') {
      if (!user.wardId) throw new ForbiddenException('Tài khoản UBND chưa được gắn với phường quản lý.');
      where = { id: mealPlanId, school: { wardId: user.wardId }, revisions: { some: { status: 'APPROVED' } } };
    } else if (user.role === 'SCHOOL_KITCHEN' && !user.kitchenId && user.schoolId) {
      where = { id: mealPlanId, schoolId: user.schoolId, revisions: { some: { status: 'APPROVED' } } };
    } else {
      throw new ForbiddenException('Chỉ tài khoản được phân quyền mới xem được lịch sử thực đơn.');
    }
    const plan = await this.prisma.mealPlan.findFirst({
      where,
      include: { school: { select: { id: true, name: true } }, revisions: { ...((user.role === 'UBND_ADMIN' || (user.role === 'SCHOOL_KITCHEN' && !user.kitchenId)) ? { where: { status: 'APPROVED' as const } } : {}), orderBy: { revisionNo: 'desc' }, include: this.revisionInclude() } },
    });
    if (!plan) throw new NotFoundException('Không tìm thấy thực đơn trong phạm vi được phép xem.');
    return plan;
  }
  async create(user: AuthUser, raw: unknown) {
    const kitchenId = this.kitchenId(user);
    const body = raw as PlanInput;
    if (!body || !body.schoolId || !/^\d{4}-\d{2}-\d{2}$/.test(body.serviceDate) ||
      !['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].includes(body.mealType) ||
      !Array.isArray(body.ageGroups) || !body.ageGroups.length || !Array.isArray(body.items) || !body.items.length) {
      throw new BadRequestException('Thiếu trường, ngày phục vụ, loại bữa, nhóm tuổi hoặc món ăn.');
    }
    if (body.ageGroups.some(x => !Number.isInteger(x.plannedServings) || x.plannedServings < 0) ||
      body.items.some(x => !x.dishVersionId || !x.mealSlot?.trim())) {
      throw new BadRequestException('Số suất phải là số nguyên không âm; mỗi món phải có phiên bản và khung bữa.');
    }
    const date = new Date(`${body.serviceDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Ngày phục vụ không hợp lệ.');
    const assignment = await this.prisma.kitchenSchoolAssignment.findFirst({
      where: { kitchenId, schoolId: body.schoolId, isActive: true, startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
      include: { kitchen: { select: { isActive: true } } },
    });
    if (!assignment?.kitchen.isActive) throw new ForbiddenException('Bếp chưa được phân công hoạt động cho trường này.');
    const ageIds = [...new Set(body.ageGroups.map(x => x.ageGroupId))];
    const ageRows = await this.prisma.mealPlanAgeGroup.findMany({ where: { id: { in: ageIds }, isActive: true }, select: { id: true } });
    if (ageRows.length !== ageIds.length) throw new BadRequestException('Có nhóm tuổi không hợp lệ.');
    const versionIds = [...new Set(body.items.map(x => x.dishVersionId))];
    if (versionIds.length !== body.items.length) throw new BadRequestException('Không thêm trùng một phiên bản món vào cùng thực đơn.');
    const approved = await this.prisma.dishVersion.findMany({
      where: { id: { in: versionIds }, status: 'SUBMITTED', dish: { kitchenId }, approvals: { some: { schoolId: body.schoolId, status: 'APPROVED' } } },
      select: { id: true },
    });
    if (approved.length !== versionIds.length) throw new BadRequestException('Chỉ được lập thực đơn bằng món có phiên bản đã được trường này duyệt.');
    return this.prisma.$transaction(async tx => {
      const plan = await tx.mealPlan.upsert({
        where: { schoolId_serviceDate_mealType: { schoolId: body.schoolId, serviceDate: date, mealType: body.mealType } },
        create: { schoolId: body.schoolId, kitchenId, serviceDate: date, mealType: body.mealType, servings: body.ageGroups.reduce((s,x)=>s+x.plannedServings,0), status: 'DRAFT' },
        update: { kitchenId, servings: body.ageGroups.reduce((s,x)=>s+x.plannedServings,0), status: 'DRAFT' },
      });
      const latest = await tx.mealPlanRevision.findFirst({ where: { mealPlanId: plan.id }, orderBy: { revisionNo: 'desc' }, select: { revisionNo: true } });
      const revision = await tx.mealPlanRevision.create({
        data: {
          mealPlanId: plan.id, revisionNo: (latest?.revisionNo ?? 0) + 1, proposedById: user.sub,
          ageGroups: { create: body.ageGroups.map(x => ({ ageGroupId: x.ageGroupId, plannedServings: x.plannedServings, notes: x.notes?.trim() || null })) },
          items: { create: body.items.map(x => ({ dishVersionId: x.dishVersionId, mealSlot: x.mealSlot.trim(), sequence: x.sequence ?? 0,
            isDefault: x.isDefault ?? true, note: x.note?.trim() || null,
            portions: x.portions?.length ? { create: x.portions.map(p => ({ ageGroupId: p.ageGroupId, portionFactor: p.portionFactor ?? 1, unitCode: p.unitCode, overrideReason: p.overrideReason?.trim() || null })) } : undefined,
          })) },
        },
        include: this.revisionInclude(),
      });
      return { ...revision, mealPlan: plan };
    });
  }

  async submit(user: AuthUser, revisionId: string) {
    const kitchenId = this.kitchenId(user);
    const revision = await this.prisma.mealPlanRevision.findFirst({ where: { id: revisionId, mealPlan: { kitchenId } }, include: { mealPlan: true } });
    if (!revision) throw new NotFoundException('Không tìm thấy bản thực đơn trong phạm vi bếp.');
    if (!['DRAFT', 'RETURNED'].includes(revision.status)) throw new BadRequestException('Chỉ bản nháp hoặc bản được trả lại mới được gửi duyệt.');
    const result=await this.prisma.$transaction(async tx => {
      const changed = await tx.mealPlanRevision.updateMany({ where: { id: revisionId, status: revision.status }, data: { status: 'SUBMITTED', submittedAt: new Date(), decidedAt: null, decidedById: null, decisionNote: null } });
      if (changed.count !== 1) throw new BadRequestException('Bản thực đơn vừa được cập nhật ở thao tác khác.');
      await tx.mealPlan.update({ where: { id: revision.mealPlanId }, data: { status: 'SUBMITTED' } });
      await tx.mealPlanApprovalEvent.create({ data: { revisionId, eventType: 'SUBMITTED', actorId: user.sub, actorRole: user.role as any } });
      return tx.mealPlanRevision.findUnique({ where: { id: revisionId }, include: this.revisionInclude() });
    });
    await this.notifications.forSchool('meal-plan-submitted:'+revisionId,revision.mealPlan.schoolId,
      'MENU_SUBMITTED','Thực đơn đang chờ duyệt','Bếp đã gửi thực đơn cần Ban Giám hiệu phê duyệt.',
      '/thuc-don',user.sub,'SCHOOL_ADMIN');
    return result;
  }

  async decide(user: AuthUser, revisionId: string, decision: 'APPROVED' | 'RETURNED', note?: string) {
    if (user.role !== 'SCHOOL_ADMIN' || !user.schoolId) throw new ForbiddenException('Chỉ quản trị trường được duyệt thực đơn.');
    if (decision === 'RETURNED' && !note?.trim()) throw new BadRequestException('Bắt buộc nhập lý do trả thực đơn.');
    const revision = await this.prisma.mealPlanRevision.findFirst({ where: { id: revisionId, mealPlan: { schoolId: user.schoolId } }, include: { mealPlan: true } });
    if (!revision) throw new NotFoundException('Không tìm thấy thực đơn của trường.');
    if (revision.status !== MealPlanRevisionStatus.SUBMITTED) throw new BadRequestException('Bản thực đơn không ở trạng thái chờ duyệt.');
    const status = decision === 'APPROVED' ? MealPlanRevisionStatus.APPROVED : MealPlanRevisionStatus.RETURNED;
    const eventType = decision === 'APPROVED' ? MealPlanApprovalEventType.APPROVED : MealPlanApprovalEventType.RETURNED;
    const result=await this.prisma.$transaction(async tx => {
      const changed = await tx.mealPlanRevision.updateMany({ where: { id: revisionId, status: 'SUBMITTED' }, data: { status, decidedAt: new Date(), decidedById: user.sub, decisionNote: note?.trim() || null } });
      if (changed.count !== 1) throw new BadRequestException('Bản thực đơn vừa được xử lý bởi thao tác khác.');
      await tx.mealPlan.update({ where: { id: revision.mealPlanId }, data: { status: decision } });
      await tx.mealPlanApprovalEvent.create({ data: { revisionId, eventType, actorId: user.sub, actorRole: user.role as any, note: note?.trim() || null } });
      return tx.mealPlanRevision.findUnique({ where: { id: revisionId }, include: this.revisionInclude() });
    });
    await this.notifications.forSchool('meal-plan-decision:'+revisionId+':'+decision,
      revision.mealPlan.schoolId,'MENU_'+decision,
      decision==='APPROVED'?'Thực đơn đã được duyệt':'Thực đơn cần chỉnh sửa',
      decision==='APPROVED'?'Ban Giám hiệu đã duyệt thực đơn của trường.':'Ban Giám hiệu đã trả thực đơn để bếp chỉnh sửa.',
      '/thuc-don',user.sub,'CENTRAL_KITCHEN');
    return result;
  }
}
