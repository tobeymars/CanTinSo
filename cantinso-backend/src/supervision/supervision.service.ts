import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { validateSupervisionWriteDate } from './supervision-date-policy';
import { validateFoodSafetyForm } from './food-safety-forms';
import { verifySamplesBeforeDispatch } from './dispatch-sample-policy';
import { validateArrivalReceipt, arrivalAllowsService } from './arrival-receipt';

const checkIds = ['ingredient_receipt', 'processing', 'before_serving', 'food_sample'];
const stages = ['DISPATCHED', 'ARRIVED', 'PLATED', 'READY'];
const asObject = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
const asArray = (v: unknown): any[] => Array.isArray(v) ? v : [];
const canonical = (value: unknown): string => JSON.stringify(value, (_key, entry:unknown) =>
  entry && typeof entry === 'object' && !Array.isArray(entry)
    ? Object.fromEntries(Object.entries(entry).sort(([a],[b])=>a.localeCompare(b)))
    : entry);

@Injectable()
export class SupervisionService {
  constructor(private readonly prisma: PrismaService) {}
  private async scope(user: AuthUser, schoolId: string, date: string, mealType: string) {
    if (!/^[0-9a-f-]{36}$/i.test(schoolId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['BREAKFAST','LUNCH','SNACK'].includes(mealType))
      throw new BadRequestException('Trường, ngày hoặc bữa không hợp lệ.');
    const serviceDate = new Date(date + 'T00:00:00.000Z');
    const serviceDayEnd = new Date(date + 'T23:59:59.999Z');
    if (Number.isNaN(serviceDate.valueOf()) || serviceDate.toISOString().slice(0,10) !== date) throw new BadRequestException('Ngày không hợp lệ.');
    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { id:true, wardId:true } });
    if (!school) throw new NotFoundException('Không tìm thấy trường.');
    if (user.role === 'SCHOOL_ADMIN' && user.schoolId !== schoolId) throw new ForbiddenException('Không thuộc trường được quản lý.');
    if (user.role === 'UBND_ADMIN' && (!user.wardId || school.wardId !== user.wardId)) throw new ForbiddenException('Không thuộc địa bàn được quản lý.');
    const assignment = await this.prisma.kitchenSchoolAssignment.findFirst({where:{schoolId,isActive:true,startsAt:{lte:serviceDayEnd},OR:[{endsAt:null},{endsAt:{gte:serviceDate}}]},select:{kitchenId:true}});
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
  async context(user: AuthUser, schoolId: string, date: string, mealType: string) {
    const scope = await this.scope(user, schoolId, date, mealType);
    const [plan, lots, kitchen, legalDocuments, issues] = await Promise.all([
      this.prisma.mealPlan.findUnique({
        where: {schoolId_serviceDate_mealType: {schoolId:scope.schoolId,serviceDate:scope.serviceDate,mealType:scope.mealType as 'BREAKFAST'|'LUNCH'|'SNACK'}},
        include: {
          revisions: {
            where: { status: 'APPROVED' },
            orderBy: { revisionNo: 'desc' },
            take: 1,
            include: {
              ageGroups: { select: { plannedServings: true } },
              items: {
                include: {
                  dishVersion: {
                    include: { dish: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.inventoryLot.findMany({
        where:{kitchenId:scope.kitchenId, receivedAt:{lte:new Date(date+'T23:59:59.999Z')}},
        include:{ingredient:{select:{name:true}},supplier:{select:{name:true,contactName:true,phone:true}}},
        orderBy:{receivedAt:'desc'},
        take:200,
      }),
      this.prisma.kitchen.findUnique({where:{id:scope.kitchenId},select:{id:true,name:true,type:true}}),
      this.prisma.kitchenLegalDocument.findMany({where:{kitchenId:scope.kitchenId},select:{id:true,title:true,status:true,expiresAt:true},orderBy:{updatedAt:'desc'}}),
      this.prisma.traceEvent.findMany({where:{eventType:'ISSUED' as const,lot:{kitchenId:scope.kitchenId},AND:[
          {metadata:{path:['schoolId'],equals:scope.schoolId}},
          {metadata:{path:['serviceDate'],equals:date}},
          {metadata:{path:['mealType'],equals:mealType}},
        ]},select:{lotId:true,metadata:true}}),
    ]);
    const issued = new Map<string,number>();
    for(const row of issues){const amount=Number(asObject(row.metadata).quantity);if(Number.isFinite(amount)&&amount>0)issued.set(row.lotId,(issued.get(row.lotId)??0)+amount);}
    return {
      schoolId:scope.schoolId,serviceDate:date,mealType,kitchen,
      legalDocuments:legalDocuments.map(doc=>({...doc,expiresAt:doc.expiresAt?.toISOString().slice(0,10)??null})),
      menu:plan?.revisions[0] ? {id:plan.id,servings:plan.revisions[0].ageGroups.reduce((total,item)=>total+item.plannedServings,0),status:plan.revisions[0].status,
        dishes:plan.revisions[0]?.items.map(item=>({id:item.id,name:item.dishVersion.dish.name})) ?? []} : null,
      lots:lots.filter(lot=>issued.has(lot.id)).map(lot=>({
        itemId:lot.id,ingredientName:lot.ingredient.name,lotCode:lot.lotCode,
        supplierName:lot.supplier.name,supplierContact:lot.supplier.contactName || lot.supplier.phone || '',
        expiresAt:lot.expiryDate?.toISOString().slice(0,10) ?? null,
        quantityAvailable:issued.get(lot.id)??0,unit:lot.unit,status:lot.status,
        receivedAt:lot.receivedAt.toISOString(),
      })),
    };
  }
  private key(s: Awaited<ReturnType<SupervisionService['scope']>>) { return {schoolId_serviceDate_mealType:{schoolId:s.schoolId,serviceDate:s.serviceDate,mealType:s.mealType}}; }
  async read(user: AuthUser, schoolId: string, date: string, mealType: string) {
    const s = await this.scope(user,schoolId,date,mealType);
    const record = await this.prisma.supervisionMeal.findUnique({where:this.key(s),include:{events:{orderBy:{createdAt:'asc'}}}});
    const checks=asObject(record?.checks), stages=asObject(record?.stages), approvals=asArray(record?.approvals);
    const snapshot=canonical({checks,journey:stages});
    const latest=approvals.at(-1);
    return {checks,stages,approvals,approvalCurrent:!!latest && latest.snapshot===snapshot,events:record?.events??[]};
  }
  async act(user: AuthUser, schoolId: string, date: string, mealType: string, body: any) {
    const s = await this.scope(user,schoolId,date,mealType);
    if (!body || typeof body !== 'object') throw new BadRequestException('Dữ liệu không hợp lệ.');
    const {action,itemId} = body;
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length < 5 || note.length > 1000) throw new BadRequestException('Ghi chú phải có từ 5 đến 1000 ký tự.');
    if (!['check_report','check_confirm','check_revision','check_reopen','stage_report','stage_confirm','stage_arrival_confirm','stage_arrival_resolve','stage_reopen','meal_confirm','sample_dispose','sample_hold'].includes(action)) throw new BadRequestException('Thao tác không hợp lệ.');
    if (action.startsWith('check_') && !checkIds.includes(itemId)) throw new BadRequestException('Mục kiểm thực không hợp lệ.');
    if (action.startsWith('stage_') && !stages.includes(itemId)) throw new BadRequestException('Mốc vận hành không hợp lệ.');
    if ((action.endsWith('_confirm') || action === 'check_revision' || action === 'check_reopen' || action === 'stage_reopen' || action === 'stage_arrival_resolve') && user.role !== 'SCHOOL_ADMIN') throw new ForbiddenException('Chỉ BGH được xác nhận.');
    if ((action === 'check_report' || action === 'stage_report') && !['CENTRAL_KITCHEN','SCHOOL_KITCHEN'].includes(user.role)) throw new ForbiddenException('Chỉ bếp được báo cáo.');
    const sampleLifecycle=['sample_dispose','sample_hold'].includes(action);
    const lateReason = sampleLifecycle ? '' : validateSupervisionWriteDate(date,body);
    try {
      return await this.prisma.$transaction(async tx => {
      await tx.supervisionMeal.upsert({where:this.key(s),create:{...s,checks:{},stages:{},approvals:[]},update:{}});
      const current = await tx.supervisionMeal.findUniqueOrThrow({where:this.key(s)});
      const checks = asObject(current.checks), journey = asObject(current.stages), approvals = asArray(current.approvals);
      const eventId = randomUUID();
      const entry = {id:eventId,actorId:user.sub,actorRole:user.role,at:new Date().toISOString(),note,...(lateReason?{lateReason}:{})};
      const latestApproval=approvals.at(-1);
      const approved=!!latestApproval && latestApproval.snapshot===canonical({checks,journey});
      if (approved && action!=='check_reopen' && action!=='stage_reopen' && !sampleLifecycle)
        throw new ConflictException('Bữa đã được BGH xác nhận tổng thể. BGH cần mở điều chỉnh mục cụ thể trước khi cập nhật.');
      if(sampleLifecycle){
        const inspection=checks['food_sample']?.inspection;
        if(!inspection || !Array.isArray(inspection.dishes) || inspection.dishes.length===0)throw new ConflictException('Chưa có hồ sơ lấy mẫu đã ghi nhận.');
        if(!['CENTRAL_KITCHEN','SCHOOL_KITCHEN'].includes(user.role) && action==='sample_dispose')
          throw new ForbiddenException('Chỉ nhân viên bếp được ghi nhận hủy mẫu.');
        if(action==='sample_hold'){
          const holds=await tx.supervisionEvent.findMany({where:{mealId:current.id,action:{in:['sample_hold','sample_dispose']}}});
          if(holds.some(row=>row.action==='sample_hold'))throw new ConflictException('Đã có yêu cầu giữ mẫu; không được tự hủy.');
          if(holds.some(row=>row.action==='sample_dispose'))throw new ConflictException('Một phần mẫu đã bị hủy; không thể ghi nhận giữ mẫu toàn bộ hồi tố. Cần lập biên bản riêng.');
          await tx.supervisionEvent.create({data:{id:eventId,mealId:current.id,actorId:user.sub,actorRole:user.role,action,itemId:'food_sample',payload:{note}}});
          return {success:true,id:eventId};
        }
        const dishId=typeof body.dishId==='string'?body.dishId:'';
        const sample=inspection.dishes.find((line:any)=>line.dishId===dishId);
        if(!sample)throw new BadRequestException('Món lấy mẫu không thuộc hồ sơ này.');
        if(body.noHoldConfirmed!==true)throw new BadRequestException('Phải xác nhận không có nghi ngờ ngộ độc hoặc yêu cầu giữ mẫu trước khi hủy.');
        const disposedBy=typeof body.disposedBy==='string'?body.disposedBy.trim():'';
        if(disposedBy.length<2||disposedBy.length>200)throw new BadRequestException('Cần ghi rõ người thực hiện hủy mẫu.');
        const taken=new Date(sample.takenAt+':00+07:00').getTime();
        const now=Date.now();
        if(!Number.isFinite(taken)||now-taken<24*60*60*1000)
          throw new ConflictException('Mẫu chưa đủ 24 giờ kể từ khi lấy; không được hủy.');
        const prior=await tx.supervisionEvent.findMany({where:{mealId:current.id,action:{in:['sample_dispose','sample_hold']}}});
        if(prior.some(row=>row.action==='sample_hold'))throw new ConflictException('Đang có yêu cầu giữ mẫu; không được hủy.');
        if(prior.some(row=>row.action==='sample_dispose' && asObject(row.payload).dishId===dishId))
          throw new ConflictException('Mẫu món này đã ghi nhận hủy.');
        await tx.supervisionEvent.create({data:{id:eventId,mealId:current.id,actorId:user.sub,actorRole:user.role,
          action:'sample_dispose',itemId:dishId,payload:{dishId,dishName:sample.dishName,disposedBy,disposedAt:new Date().toISOString(),
            note,noHoldConfirmed:true}}});
        return {success:true,id:eventId};
      }
      if (action === 'check_report') {
        if (checks[itemId] && !['revision_requested'].includes(checks[itemId].status)) throw new ConflictException('Mục đã báo cáo.');
        if (typeof body.evidenceRef !== 'string' || !body.evidenceRef.trim()) throw new BadRequestException('Thiếu tham chiếu hồ sơ.');
        if (itemId === 'ingredient_receipt') {
          if (!Array.isArray(body.ingredientReceipts) || body.ingredientReceipts.length === 0 || body.ingredientReceipts.length > 100)
            throw new BadRequestException('Cần chọn nguyên liệu tiếp nhận từ kho.');
          const ids = body.ingredientReceipts.map((line:any) => line?.itemId);
          if (ids.some((id:any) => typeof id !== 'string') || new Set(ids).size !== ids.length)
            throw new BadRequestException('Lô nguyên liệu không hợp lệ hoặc bị trùng.');
          const lots = await tx.inventoryLot.findMany({
            where:{kitchenId:s.kitchenId,id:{in:ids}},
            include:{ingredient:{select:{name:true}},supplier:{select:{name:true,contactName:true,phone:true}}},
          });
          if (lots.length !== ids.length) throw new BadRequestException('Lô nguyên liệu không thuộc bếp phục vụ trường đang giám sát.');
          const issues=await tx.traceEvent.findMany({where:{
            lotId:{in:ids},eventType:'ISSUED',
            AND:[
              {metadata:{path:['schoolId'],equals:s.schoolId}},
              {metadata:{path:['serviceDate'],equals:date}},
              {metadata:{path:['mealType'],equals:mealType}},
            ],
          },select:{lotId:true,metadata:true}});
          const issued=new Map<string,number>();
          for(const row of issues){
            const amount=Number(asObject(row.metadata).quantity);
            if(Number.isFinite(amount)&&amount>0)issued.set(row.lotId,(issued.get(row.lotId)??0)+amount);
          }
          if(ids.some((id:string)=>!issued.has(id)))throw new BadRequestException('Lô chưa được xuất cho trường, ngày và bữa đang kiểm thực.');
          const normalized = body.ingredientReceipts.map((line:any)=>{
            const lot=lots.find(item=>item.id===line.itemId)!;
            const displayQuantity=Number(line.quantity);
            const displayUnit=typeof line.unit==='string'&&line.unit.trim()?line.unit.trim():lot.unit;
            const unitKey=(unit:string)=>unit.toLowerCase();
            const factor=(unit:string):number|null=>{
              const key=unitKey(unit);
              if(key==='mg')return 0.001;
              if(key==='g'||key==='ml')return 1;
              if(key==='kg'||key==='l'||key==='lít'||key==='lit')return 1000;
              return null;
            };
            const group=(unit:string)=>['mg','g','kg'].includes(unitKey(unit))?'mass':['ml','l','lít','lit'].includes(unitKey(unit))?'volume':null;
            const sameUnit=unitKey(displayUnit)===unitKey(lot.unit);
            if(!sameUnit && (!group(displayUnit)||group(displayUnit)!==group(lot.unit)))
              throw new BadRequestException('Đơn vị thực nhận không tương thích với lô nguyên liệu.');
            const quantity= sameUnit ? displayQuantity : displayQuantity*(factor(displayUnit)!/factor(lot.unit)!);
            const normalizedQuantity=Math.round(quantity*1000)/1000;
            if (!Number.isFinite(displayQuantity)||displayQuantity<=0||!Number.isFinite(quantity)||normalizedQuantity<=0||
                Math.abs(quantity-normalizedQuantity)>0.0000001||normalizedQuantity>(issued.get(lot.id)??0)+0.0000001)
              throw new BadRequestException('Số lượng thực nhận không hợp lệ hoặc vượt số đã xuất; chỉ lưu tối đa ba chữ số thập phân theo đơn vị kho.');
            if (lot.expiryDate && lot.expiryDate.getTime() < s.serviceDate.getTime())
              throw new BadRequestException('Lô hết hạn tại ngày bữa ăn.');
            if (lot.receivedAt > new Date(date+'T23:59:59.999Z'))
              throw new BadRequestException('Lô chưa được tiếp nhận tại ngày bữa ăn.');
            const documentsStatus=line.documentsStatus;
            const sensoryStatus=line.sensoryStatus;
            const storageCondition=typeof line.storageCondition==='string'?line.storageCondition.trim():'';
            const handling=typeof line.handling==='string'?line.handling.trim():'';
            if(!['pass','fail'].includes(documentsStatus)||!['pass','fail'].includes(sensoryStatus))
              throw new BadRequestException('Phải ghi Đạt/Không đạt cho chứng từ và cảm quan từng lô nguyên liệu.');
            if(!storageCondition||storageCondition.length>500||!handling||handling.length>1000)
              throw new BadRequestException('Cần ghi điều kiện bảo quản và biện pháp xử lý/ghi chú từng lô.');
            return {itemId:lot.id,ingredientName:lot.ingredient.name,lotCode:lot.lotCode,
              supplierName:lot.supplier.name,supplierContact:lot.supplier.contactName || lot.supplier.phone || '',
              expiresAt:lot.expiryDate?.toISOString().slice(0,10) ?? '',
              quantity:normalizedQuantity,unit:lot.unit,displayQuantity,displayUnit,
              documentsStatus,sensoryStatus,storageCondition,handling};
          });
          body.ingredientReceipts=normalized;
        }
        let inspection: ReturnType<typeof validateFoodSafetyForm> | undefined;
        if(['processing','before_serving','food_sample'].includes(itemId)){
          const plan=await tx.mealPlan.findUnique({
            where:{schoolId_serviceDate_mealType:{schoolId:s.schoolId,serviceDate:s.serviceDate,mealType:s.mealType as 'BREAKFAST'|'LUNCH'|'SNACK'}},
            include:{revisions:{where:{status:'APPROVED'},orderBy:{revisionNo:'desc'},take:1,
              include:{items:{include:{dishVersion:{include:{dish:true}}}},ageGroups:{select:{plannedServings:true}}}}}
          });
          const dishes=plan?.revisions[0]?.items.map(item=>({id:item.id,name:item.dishVersion.dish.name}))??[];
          const plannedServings=plan?.revisions[0]?.ageGroups.reduce((sum,item)=>sum+item.plannedServings,0);
          inspection=validateFoodSafetyForm(itemId as 'processing'|'before_serving'|'food_sample',body.inspection,dishes,date,plannedServings);
          if(itemId==='food_sample' && inspection.notApplicable!==true){
            const cooking=asObject(checks.processing?.inspection);
            if(!Array.isArray(cooking.dishes))
              throw new ConflictException('Cần ghi kiểm thực bước 2 và thời điểm chế biến xong trước khi lấy mẫu.');
            for(const line of inspection.dishes){
              const cooked=cooking.dishes.find((item:any)=>item.dishId===line.dishId);
              const takenAt=typeof line.takenAt==='string'?Date.parse(line.takenAt+':00+07:00'):NaN;
              const cookedAt=typeof cooked?.cookedAt==='string'?Date.parse(cooked.cookedAt+':00+07:00'):NaN;
              if(!Number.isFinite(takenAt)||!Number.isFinite(cookedAt)||takenAt<cookedAt)
                throw new BadRequestException('Thời điểm lấy mẫu phải sau khi chế biến xong món '+line.dishName+'.');
            }
          }
          if(itemId==='food_sample' && journey.DISPATCHED){
            const dispatchedAt=Date.parse(journey.DISPATCHED.at);
            const sampleLines: {takenAt?:string}[] = inspection.dishes;
            if(inspection.notApplicable!==true && sampleLines.some(line=>typeof line.takenAt==='string' && Date.parse(line.takenAt+':00+07:00')>dispatchedAt))
              throw new BadRequestException('Không thể ghi nhận mẫu lấy sau khi đã xuất bếp. Cần rà soát hồ sơ vận hành.');
          }
          if(itemId==='food_sample' && checks.before_serving?.inspection?.dishes){
            for(const sample of inspection.dishes){
              const served=checks.before_serving.inspection.dishes.find((line:any)=>line.dishId===sample.dishId);
              if(typeof served?.servedAt==='string' && typeof sample.takenAt==='string' && sample.takenAt>served.servedAt)
                throw new BadRequestException('Mẫu '+sample.dishName+' phải được lấy trước thời điểm bắt đầu ăn.');
            }
          }
          if(itemId==='before_serving' && checks.food_sample?.inspection?.dishes){
            for(const served of inspection.dishes){
              const sample=checks.food_sample.inspection.dishes.find((line:any)=>line.dishId===served.dishId);
              if(typeof sample?.takenAt==='string' && typeof served.servedAt==='string' && sample.takenAt>served.servedAt)
                throw new BadRequestException('Đã ghi lấy mẫu '+served.dishName+' sau giờ bắt đầu ăn. Cần rà soát lại hồ sơ.');
            }
          }
        }
        const ingredientPass=itemId==='ingredient_receipt' && Array.isArray(body.ingredientReceipts)
          ? body.ingredientReceipts.every((line:any)=>line.documentsStatus==='pass' && line.sensoryStatus==='pass')
          : undefined;
        const evidence={evidenceRef:body.evidenceRef.trim(),ingredientReceipts:body.ingredientReceipts??[],...(inspection?{inspection}:{}),...(ingredientPass!==undefined?{ingredientPass}:{})};
        checks[itemId] = {status:'reported',...evidence,history:[...(checks[itemId]?.history??[]),{...entry,action:'report',status:'reported',...evidence}]};
      } else if (action === 'check_reopen') {
        if (checks[itemId]?.status!=='confirmed')
          throw new ConflictException('Chỉ được mở điều chỉnh mục kiểm thực đã xác nhận.');
        checks[itemId]={...checks[itemId],status:'revision_requested',history:[...(checks[itemId].history??[]),{...entry,action:'reopen',status:'revision_requested'}]};
      } else if (action === 'check_confirm' || action === 'check_revision') {
        if (checks[itemId]?.status !== 'reported') throw new ConflictException('Mục chưa chờ xác nhận.');
        if(action==='check_confirm' && checks[itemId]?.ingredientPass===false)
          throw new ConflictException('Lô nguyên liệu có kết quả Không đạt. BGH phải yêu cầu bổ sung/xử lý trước khi xác nhận.');
        if(action==='check_confirm' && checks[itemId]?.ingredientPass===undefined && itemId==='ingredient_receipt')
          throw new ConflictException('Báo cáo bước 1 theo mẫu cũ chưa có đánh giá cảm quan/chứng từ. Cần yêu cầu bổ sung.');
        if(action==='check_confirm' && checks[itemId]?.inspection?.isPass===false)
          throw new ConflictException('Kết quả kiểm tra có nội dung Không đạt. BGH phải yêu cầu bổ sung/xử lý, không được xác nhận đạt.');
        if(action==='check_confirm' && ['processing','before_serving','food_sample'].includes(itemId) && !checks[itemId]?.inspection)
          throw new ConflictException('Báo cáo theo mẫu cũ thiếu thông tin kiểm thực. BGH cần yêu cầu bổ sung trước khi xác nhận.');
        const status = action === 'check_confirm' ? 'confirmed' : 'revision_requested';
        checks[itemId] = {...checks[itemId],status,history:[...checks[itemId].history,{...entry,action:action==='check_confirm'?'confirm':'request_revision',status}]};
      } else if (action === 'stage_report') {
        const previousStage=journey[itemId];
        if (previousStage && !previousStage.revisionRequested) throw new ConflictException('Mốc đã báo cáo.');
        const required = s.kitchenId && (await tx.kitchen.findUnique({where:{id:s.kitchenId},select:{type:true}}))?.type === 'CENTRAL' ? stages : ['PLATED','READY'];
        if (!required.includes(itemId) || (!previousStage && required.find(x=>!journey[x])!==itemId)) throw new ConflictException('Cần báo cáo mốc theo thứ tự.');
        if (itemId === 'DISPATCHED' && user.role !== 'CENTRAL_KITCHEN') throw new ForbiddenException('Chỉ bếp trung tâm được báo cáo xuất bếp.');
        if (itemId === 'DISPATCHED') verifySamplesBeforeDispatch(
          checks.food_sample, checks.processing, new Date(entry.at),
        );
        if (itemId !== 'DISPATCHED' && user.role !== 'SCHOOL_KITCHEN') throw new ForbiddenException('Chỉ bếp tại trường được báo cáo mốc này.');
        if (required[0]==='DISPATCHED' && ['PLATED','READY'].includes(itemId) &&
          (!journey.ARRIVED?.confirmed || !arrivalAllowsService(journey.ARRIVED.arrival)))
          throw new ConflictException('BGH chưa chấp nhận phiếu giao nhận. Không được chuyển sang ra món hoặc phục vụ.');
        if (itemId === 'READY' && (typeof body.photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(body.photo) || body.photo.length>1100000)) throw new BadRequestException('Cần ảnh thực tế hợp lệ tối đa 750 KB.');
        journey[itemId] = {...entry,status:itemId,time:new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}),confirmed:false,photos:itemId==='READY'?[body.photo]:[],
          history:[...(previousStage?.history??[]),...(previousStage?[{...previousStage,history:undefined}]:[])]};
      } else if (action === 'stage_arrival_confirm' || action === 'stage_arrival_resolve') {
        // BGH directly records and confirms the handover at its own school.
        // This is a receipt of delivery, not a food-safety certification.
        if (itemId !== 'ARRIVED') throw new BadRequestException('Chỉ hỗ trợ xác nhận mốc Đến trường.');
        const kitchen = await tx.kitchen.findUnique({where:{id:s.kitchenId},select:{type:true}});
        if (kitchen?.type !== 'CENTRAL') throw new ConflictException('Bếp tại trường không có mốc Đến trường.');
        if (!journey.DISPATCHED || journey.DISPATCHED.revisionRequested) throw new ConflictException('Bếp trung tâm phải báo cáo Xuất bếp hợp lệ trước khi tiếp nhận.');
        const previous = journey.ARRIVED;
        if (action === 'stage_arrival_confirm' && previous) throw new ConflictException('Mốc Đến trường đã có hồ sơ. Vui lòng sử dụng quy trình duyệt hoặc điều chỉnh hiện có.');
        if (action === 'stage_arrival_resolve' && (!previous?.confirmed || arrivalAllowsService(previous.arrival)))
          throw new ConflictException('Chỉ được lập phiếu xử lý lại khi kết quả tiếp nhận trước đó chưa được chấp nhận.');
        const plan = await tx.mealPlan.findUnique({
          where:{schoolId_serviceDate_mealType:{schoolId:s.schoolId,serviceDate:s.serviceDate,mealType:s.mealType as 'BREAKFAST'|'LUNCH'|'SNACK'}},
          include:{revisions:{where:{status:'APPROVED'},orderBy:{revisionNo:'desc'},take:1,
            include:{items:{include:{dishVersion:{include:{dish:true}}}},ageGroups:{select:{plannedServings:true}}}}}},
        });
        const revision = plan?.revisions[0];
        const dishes = revision?.items.map(row=>({id:row.id,name:row.dishVersion.dish.name}))??[];
        const plannedServings=revision?.ageGroups.reduce((sum,row)=>sum+row.plannedServings,0)??0;
        const arrival = validateArrivalReceipt(body,dishes,plannedServings,date,journey.DISPATCHED.at);
        journey.ARRIVED = {...entry,status:'ARRIVED',
          time:new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}),
          confirmed:true,confirmedAt:entry.at,confirmedBy:user.sub,confirmationNote:note,
          note,photos:arrival.photo?[arrival.photo]:[],arrival,
          history:previous?[...(previous.history??[]),{...previous,history:undefined}]:[]};
      } else if (action === 'stage_reopen') {
        if (!journey[itemId]?.confirmed) throw new ConflictException('Chỉ được mở điều chỉnh mốc đã xác nhận.');
        journey[itemId] = {...journey[itemId],confirmed:false,revisionRequested:true,
          reopenedAt:entry.at,reopenedBy:user.sub,reopenReason:note,
          history:[...(journey[itemId].history??[]),{...entry,action:'reopen'}]};
      } else if (action === 'stage_confirm') {
        if (!journey[itemId] || journey[itemId].confirmed || journey[itemId].revisionRequested) throw new ConflictException('Mốc chưa được bếp báo cáo bổ sung để xác nhận.');
        let arrival;
        if(itemId==='ARRIVED'){
          const plan=await tx.mealPlan.findUnique({
            where:{schoolId_serviceDate_mealType:{schoolId:s.schoolId,serviceDate:s.serviceDate,mealType:s.mealType as 'BREAKFAST'|'LUNCH'|'SNACK'}},
            include:{revisions:{where:{status:'APPROVED'},orderBy:{revisionNo:'desc'},take:1,
              include:{items:{include:{dishVersion:{include:{dish:true}}}},ageGroups:{select:{plannedServings:true}}}}}},
          });
          const revision=plan?.revisions[0];
          arrival=validateArrivalReceipt(body,revision?.items.map(row=>({id:row.id,name:row.dishVersion.dish.name}))??[],
            revision?.ageGroups.reduce((sum,row)=>sum+row.plannedServings,0)??0,date,journey.DISPATCHED?.at??entry.at);
        }
        journey[itemId] = {...journey[itemId],confirmed:true,confirmedAt:entry.at,confirmedBy:user.sub,confirmationNote:note,...(arrival?{arrival,photos:arrival.photo?[arrival.photo]:[]}: {})};
      } else {
        const kitchen = await tx.kitchen.findUnique({where:{id:s.kitchenId},select:{type:true}});
        const required = kitchen?.type==='CENTRAL' ? stages : ['PLATED','READY'];
        if (checkIds.some(id=>checks[id]?.status!=='confirmed') || required.some(id=>!journey[id]?.confirmed)) throw new ConflictException('Chưa đủ điều kiện xác nhận tổng thể.');
        if (kitchen?.type==='CENTRAL' && !arrivalAllowsService(journey.ARRIVED?.arrival))
          throw new ConflictException('Phiếu giao nhận có vấn đề chưa xử lý, không được duyệt hoàn tất bữa ăn.');
        const snapshot = canonical({checks,journey});
        if (approvals.at(-1)?.snapshot===snapshot) throw new ConflictException('Đã xác nhận tổng thể.');
        approvals.push({...entry,snapshot});
      }
      const updated = await tx.supervisionMeal.update({where:this.key(s),data:{checks:checks as Prisma.InputJsonValue,stages:journey as Prisma.InputJsonValue,approvals:approvals as Prisma.InputJsonValue}});
      await tx.supervisionEvent.create({data:{id:eventId,mealId:updated.id,actorId:user.sub,actorRole:user.role,action,itemId:typeof itemId==='string'?itemId:'meal',payload:{note,...((['stage_arrival_confirm','stage_arrival_resolve'].includes(action) || (action==='stage_confirm' && itemId==='ARRIVED'))?{receivedServings:body.receivedServings,result:body.result,arrivalTime:body.arrivalTime,deliveryPerson:body.deliveryPerson,receiptChecked:true}:{}),...(lateReason?{lateReason}:{})}}});
      return {success:true,id:eventId};
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    } catch(error) {
      if(error instanceof Prisma.PrismaClientKnownRequestError && ['P2034','P2002'].includes(error.code))
        throw new ConflictException('Hồ sơ vừa được cập nhật bởi tài khoản khác. Vui lòng tải lại trang để thao tác trên dữ liệu mới nhất.');
      throw error;
    }
  }
}
