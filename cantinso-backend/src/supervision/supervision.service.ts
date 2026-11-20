import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupervisionMeal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';

const checkIds = ['ingredient_receipt', 'processing', 'before_serving', 'food_sample'];
const stages = ['DISPATCHED', 'ARRIVED', 'PLATED', 'READY'];
const asObject = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
const asArray = (v: unknown): any[] => Array.isArray(v) ? v : [];
@Injectable()
export class SupervisionService {
  constructor(private readonly prisma: PrismaService) {}
  private async scope(user: AuthUser, schoolId: string, date: string, mealType: string) {
    if (!/^[0-9a-f-]{36}$/i.test(schoolId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['BREAKFAST','LUNCH','SNACK'].includes(mealType))
      throw new BadRequestException('Trường, ngày hoặc bữa không hợp lệ.');
    const serviceDate = new Date(date + 'T00:00:00.000Z');
    if (Number.isNaN(serviceDate.valueOf()) || serviceDate.toISOString().slice(0,10) !== date) throw new BadRequestException('Ngày không hợp lệ.');
    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { id:true, wardId:true } });
    if (!school) throw new NotFoundException('Không tìm thấy trường.');
    if (user.role === 'SCHOOL_ADMIN' && user.schoolId !== schoolId) throw new ForbiddenException('Không thuộc trường được quản lý.');
    if (user.role === 'UBND_ADMIN' && (!user.wardId || school.wardId !== user.wardId)) throw new ForbiddenException('Không thuộc địa bàn được quản lý.');
    const assignment = await this.prisma.kitchenSchoolAssignment.findFirst({where:{schoolId,isActive:true,startsAt:{lte:serviceDate},OR:[{endsAt:null},{endsAt:{gte:serviceDate}}]},select:{kitchenId:true}});
    const onSite = await this.prisma.kitchen.findFirst({where:{schoolId,isActive:true},select:{id:true}});
    const kitchenId = assignment?.kitchenId ?? onSite?.id;
    if (!kitchenId) throw new BadRequestException('Trường chưa có bếp phục vụ tại ngày này.');
    if (['CENTRAL_KITCHEN','SCHOOL_KITCHEN'].includes(user.role) && user.kitchenId !== kitchenId) {
      const receiving = user.role === 'SCHOOL_KITCHEN' && user.schoolId === schoolId;
      if (!receiving) throw new ForbiddenException('Không thuộc bếp hoặc trường được phân công.');
    }
    if (!['CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN','UBND_ADMIN'].includes(user.role)) throw new ForbiddenException();
    return { schoolId, kitchenId, serviceDate, mealType };
  }
  private key(s: Awaited<ReturnType<SupervisionService['scope']>>) { return {schoolId_serviceDate_mealType:{schoolId:s.schoolId,serviceDate:s.serviceDate,mealType:s.mealType}}; }
  async read(user: AuthUser, schoolId: string, date: string, mealType: string) {
    const s = await this.scope(user,schoolId,date,mealType);
    const record = await this.prisma.supervisionMeal.findUnique({where:this.key(s),include:{events:{orderBy:{createdAt:'asc'}}}});
    return {checks:asObject(record?.checks),stages:asObject(record?.stages),approvals:asArray(record?.approvals),events:record?.events??[]};
  }
  async act(user: AuthUser, schoolId: string, date: string, mealType: string, body: any) {
    const s = await this.scope(user,schoolId,date,mealType);
    if (!body || typeof body !== 'object') throw new BadRequestException('Dữ liệu không hợp lệ.');
    const {action,itemId} = body;
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length < 5 || note.length > 1000) throw new BadRequestException('Ghi chú phải có từ 5 đến 1000 ký tự.');
    if (!['check_report','check_confirm','check_revision','stage_report','stage_confirm','meal_confirm'].includes(action)) throw new BadRequestException('Thao tác không hợp lệ.');
    if (action.startsWith('check_') && !checkIds.includes(itemId)) throw new BadRequestException('Mục kiểm thực không hợp lệ.');
    if (action.startsWith('stage_') && !stages.includes(itemId)) throw new BadRequestException('Mốc vận hành không hợp lệ.');
    if ((action.endsWith('_confirm') || action === 'check_revision') && user.role !== 'SCHOOL_ADMIN') throw new ForbiddenException('Chỉ BGH được xác nhận.');
    if ((action === 'check_report' || action === 'stage_report') && !['CENTRAL_KITCHEN','SCHOOL_KITCHEN'].includes(user.role)) throw new ForbiddenException('Chỉ bếp được báo cáo.');
    return this.prisma.$transaction(async tx => {
      await tx.supervisionMeal.upsert({where:this.key(s),create:{...s,checks:{},stages:{},approvals:[]},update:{}});
      const current = await tx.supervisionMeal.findUniqueOrThrow({where:this.key(s)});
      const checks = asObject(current.checks), journey = asObject(current.stages), approvals = asArray(current.approvals);
      const eventId = crypto.randomUUID();
      const entry = {id:eventId,actorId:user.sub,actorRole:user.role,at:new Date().toISOString(),note};
      if (action === 'check_report') {
        if (checks[itemId] && !['revision_requested'].includes(checks[itemId].status)) throw new ConflictException('Mục đã báo cáo.');
        if (typeof body.evidenceRef !== 'string' || !body.evidenceRef.trim()) throw new BadRequestException('Thiếu tham chiếu hồ sơ.');
        if (itemId === 'ingredient_receipt' && (!Array.isArray(body.ingredientReceipts) || !body.ingredientReceipts.length)) throw new BadRequestException('Thiếu nguyên liệu tiếp nhận.');
        checks[itemId] = {status:'reported',evidenceRef:body.evidenceRef.trim(),ingredientReceipts:body.ingredientReceipts??[],history:[...(checks[itemId]?.history??[]),{...entry,action:'report',status:'reported',evidenceRef:body.evidenceRef.trim(),ingredientReceipts:body.ingredientReceipts??[]}]};
      } else if (action === 'check_confirm' || action === 'check_revision') {
        if (checks[itemId]?.status !== 'reported') throw new ConflictException('Mục chưa chờ xác nhận.');
        const status = action === 'check_confirm' ? 'confirmed' : 'revision_requested';
        checks[itemId] = {...checks[itemId],status,history:[...checks[itemId].history,{...entry,action:action==='check_confirm'?'confirm':'request_revision',status}]};
      } else if (action === 'stage_report') {
        if (journey[itemId]) throw new ConflictException('Mốc đã báo cáo.');
        const required = s.kitchenId && (await tx.kitchen.findUnique({where:{id:s.kitchenId},select:{type:true}}))?.type === 'CENTRAL' ? stages : ['PLATED','READY'];
        if (!required.includes(itemId) || required.find(x=>!journey[x])!==itemId) throw new ConflictException('Cần báo cáo mốc theo thứ tự.');
        if (itemId === 'DISPATCHED' && user.role !== 'CENTRAL_KITCHEN') throw new ForbiddenException('Chỉ bếp trung tâm được báo cáo xuất bếp.');
        if (itemId !== 'DISPATCHED' && user.role !== 'SCHOOL_KITCHEN') throw new ForbiddenException('Chỉ bếp tại trường được báo cáo mốc này.');
        if (itemId === 'READY' && (typeof body.photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(body.photo) || body.photo.length>1100000)) throw new BadRequestException('Cần ảnh thực tế hợp lệ tối đa 750 KB.');
        journey[itemId] = {...entry,status:itemId,time:new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}),confirmed:false,photos:itemId==='READY'?[body.photo]:[]};
      } else if (action === 'stage_confirm') {
        if (!journey[itemId] || journey[itemId].confirmed) throw new ConflictException('Mốc không chờ xác nhận.');
        journey[itemId] = {...journey[itemId],confirmed:true,confirmedAt:entry.at,confirmedBy:user.sub,confirmationNote:note};
      } else {
        const kitchen = await tx.kitchen.findUnique({where:{id:s.kitchenId},select:{type:true}});
        const required = kitchen?.type==='CENTRAL' ? stages : ['PLATED','READY'];
        if (checkIds.some(id=>checks[id]?.status!=='confirmed') || required.some(id=>!journey[id]?.confirmed)) throw new ConflictException('Chưa đủ điều kiện xác nhận tổng thể.');
        const snapshot = JSON.stringify({checks,journey});
        if (approvals.at(-1)?.snapshot===snapshot) throw new ConflictException('Đã xác nhận tổng thể.');
        approvals.push({...entry,snapshot});
      }
      const updated = await tx.supervisionMeal.update({where:this.key(s),data:{checks:checks as Prisma.InputJsonValue,stages:journey as Prisma.InputJsonValue,approvals:approvals as Prisma.InputJsonValue}});
      await tx.supervisionEvent.create({data:{id:eventId,mealId:updated.id,actorId:user.sub,actorRole:user.role,action,itemId:typeof itemId==='string'?itemId:'meal',payload:{note}}});
      return {success:true,id:eventId};
    });
  }
}
