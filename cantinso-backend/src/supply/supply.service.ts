import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { Prisma } from '@prisma/client';
import { canonicalQuantity } from './quantity-units';
import { validateStockEvidence, validateStockInspection } from './stock-voucher-policy';

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const str = (value: unknown, label: string, max = 200, required = true) => {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length > max || (required && !v)) throw new BadRequestException(label + ' không hợp lệ.');
  return v;
};
const dateValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Ngày hết hạn phải đúng YYYY-MM-DD.');
  const result = new Date(value+'T00:00:00.000Z');
  if (Number.isNaN(result.valueOf()) || result.toISOString().slice(0,10)!==value) throw new BadRequestException('Ngày hết hạn không hợp lệ.');
  return result;
};
@Injectable()
export class SupplyService {
  constructor(private readonly prisma:PrismaService) {}
  private isOperator(user:AuthUser) {return ['CENTRAL_KITCHEN','SCHOOL_KITCHEN'].includes(user.role);}
  async permitted(user:AuthUser, kitchenId:string, write=false) {
    if (!uuid(kitchenId)) throw new BadRequestException('Mã bếp không hợp lệ.');
    const kitchen=await this.prisma.kitchen.findUnique({where:{id:kitchenId},select:{id:true,name:true,type:true,schoolId:true,wardId:true,isActive:true}});
    if (!kitchen || !kitchen.isActive) throw new NotFoundException('Không tìm thấy bếp hoạt động.');
    if (write && !this.isOperator(user)) throw new ForbiddenException('Chỉ tài khoản bếp được ghi nhận kho.');
    if (this.isOperator(user)) {
      if (!user.kitchenId || user.kitchenId!==kitchenId) throw new ForbiddenException('Không thuộc bếp này.');
    } else if (user.role==='SCHOOL_ADMIN') {
      if (!user.schoolId) throw new ForbiddenException();
      if (kitchen.schoolId!==user.schoolId) {
        const a=await this.prisma.kitchenSchoolAssignment.findFirst({where:{kitchenId,schoolId:user.schoolId,isActive:true,OR:[{endsAt:null},{endsAt:{gte:new Date()}}]}});
        if (!a) throw new ForbiddenException('Bếp không phục vụ trường này.');
      }
    } else if(user.role==='UBND_ADMIN') {
      if (!user.wardId || kitchen.wardId!==user.wardId) throw new ForbiddenException('Không thuộc địa bàn quản lý.');
    } else throw new ForbiddenException();
    return kitchen;
  }
  async kitchens(user:AuthUser) {
    if (this.isOperator(user)) {
      if (!user.kitchenId) return [];
      return this.prisma.kitchen.findMany({where:{id:user.kitchenId,isActive:true},select:{id:true,name:true,type:true}});
    }
    if (user.role==='SCHOOL_ADMIN' && user.schoolId) return this.prisma.kitchen.findMany({
      where:{isActive:true,OR:[{schoolId:user.schoolId},{schools:{some:{schoolId:user.schoolId,isActive:true,OR:[{endsAt:null},{endsAt:{gte:new Date()}}]}}}]},
      select:{id:true,name:true,type:true},
    });
    if (user.role==='UBND_ADMIN' && user.wardId) return this.prisma.kitchen.findMany({
      where:{isActive:true,wardId:user.wardId},select:{id:true,name:true,type:true}});
    return [];
  }
  async schools(user:AuthUser,kitchenId:string) {
    const kitchen=await this.permitted(user,kitchenId);
    const assigned=await this.prisma.kitchenSchoolAssignment.findMany({
      where:{kitchenId,isActive:true,OR:[{endsAt:null},{endsAt:{gte:new Date()}}]},
      include:{school:{select:{id:true,name:true}}},
      orderBy:{createdAt:'desc'},
    });
    const rows=assigned.map(item=>item.school);
    if(kitchen.schoolId&&!rows.some(item=>item.id===kitchen.schoolId)){
      const school=await this.prisma.school.findUnique({where:{id:kitchen.schoolId},select:{id:true,name:true}});
      if(school)rows.push(school);
    }
    return rows.filter((item,index)=>rows.findIndex(x=>x.id===item.id)===index);
  }
  async ingredients(user:AuthUser,kitchenId:string) {
    await this.permitted(user,kitchenId);
    return this.prisma.ingredient.findMany({select:{id:true,code:true,name:true,unit:true,category:true},orderBy:{name:'asc'},take:1000});
  }
  async suppliers(user:AuthUser,kitchenId:string) {
    await this.permitted(user,kitchenId);
    return this.prisma.supplier.findMany({where:{kitchenId},orderBy:{name:'asc'},select:{id:true,code:true,name:true,taxCode:true,contactName:true,phone:true,email:true,address:true,note:true,status:true,createdAt:true}});
  }
  async saveSupplier(user:AuthUser,kitchenId:string,input:any,id?:string) {
    await this.permitted(user,kitchenId,true);
    const code=str(input?.code,'Mã nhà cung cấp',50);
    const name=str(input?.name,'Tên nhà cung cấp');
    const data={code,name,taxCode:str(input?.taxCode,'Mã số thuế',60,false)||null,contactName:str(input?.contactName,'Người liên hệ',150,false)||null,phone:str(input?.phone,'Điện thoại',40,false)||null,email:str(input?.email,'Email',150,false)||null,address:str(input?.address,'Địa chỉ',300,false)||null,note:str(input?.note,'Ghi chú',500,false)||null};
    if (id) {
      if (!uuid(id)) throw new BadRequestException('Mã nhà cung cấp không hợp lệ.');
      const exists=await this.prisma.supplier.findFirst({where:{id,kitchenId}});
      if (!exists) throw new NotFoundException('Không tìm thấy nhà cung cấp thuộc bếp.');
      try{return await this.prisma.supplier.update({where:{id},data});}
      catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002') throw new ConflictException('Mã nhà cung cấp đã tồn tại.');throw error;}
    }
    try{return await this.prisma.supplier.create({data:{...data,kitchenId}});}
    catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002') throw new ConflictException('Mã nhà cung cấp đã tồn tại.');throw error;}
  }
  async importSuppliers(user:AuthUser,kitchenId:string,input:unknown){
    await this.permitted(user,kitchenId,true);
    if(!Array.isArray(input)||input.length<1||input.length>100)throw new BadRequestException('Danh sách cần từ 1 đến 100 nhà cung cấp.');
    const rows=input.map(item=>{
      if(!item||typeof item!=='object')throw new BadRequestException('Dòng nhà cung cấp không hợp lệ.');
      const row=item as Record<string,unknown>;
      return {
        kitchenId,
        code:str(row.code,'Mã nhà cung cấp',50),
        name:str(row.name,'Tên nhà cung cấp',200),
        contactName:str(row.contactName??row.contact,'Người liên hệ',150,false)||null,
        taxCode:str(row.taxCode,'Mã số thuế',60,false)||null,
        phone:str(row.phone,'Điện thoại',40,false)||null,
        email:str(row.email,'Email',150,false)||null,
        address:str(row.address,'Địa chỉ',300,false)||null,
        note:str(row.note,'Ghi chú',500,false)||null,
      };
    });
    if(new Set(rows.map(row=>row.code)).size!==rows.length)throw new BadRequestException('Danh sách có mã nhà cung cấp trùng nhau.');
    try{
      const result=await this.prisma.supplier.createMany({data:rows});
      return {imported:result.count,financialDataImported:false};
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')
        throw new ConflictException('Có mã nhà cung cấp đã tồn tại trong bếp. Hãy kiểm tra trước khi nhập.');
      throw error;
    }
  }
  async supplierStatus(user:AuthUser,kitchenId:string,id:string,status:unknown) {
    await this.permitted(user,kitchenId,true);
    if(!uuid(id) || !['ACTIVE','INACTIVE'].includes(String(status)))throw new BadRequestException('Nhà cung cấp hoặc trạng thái không hợp lệ.');
    const exists=await this.prisma.supplier.findFirst({where:{id,kitchenId}});
    if(!exists)throw new NotFoundException('Nhà cung cấp không thuộc bếp.');
    return this.prisma.supplier.update({where:{id},data:{status:status as 'ACTIVE'|'INACTIVE'}});
  }
  async minimums(user:AuthUser,kitchenId:string){
    await this.permitted(user,kitchenId);
    return this.prisma.kitchenStockMinimum.findMany({
      where:{kitchenId},
      select:{ingredientId:true,minimumQty:true,ingredient:{select:{name:true,unit:true}}},
      orderBy:{ingredient:{name:'asc'}},
    });
  }
  async setMinimum(user:AuthUser,kitchenId:string,ingredientId:string,body:any){
    await this.permitted(user,kitchenId,true);
    if(!uuid(ingredientId))throw new BadRequestException('Nguyên liệu không hợp lệ.');
    const item=await this.prisma.ingredient.findUnique({where:{id:ingredientId},select:{id:true,unit:true}});
    if(!item)throw new NotFoundException('Không tìm thấy nguyên liệu.');
    const value=canonicalQuantity(body?.minimumQty,body?.unit,item.unit,{allowZero:true}).quantity;
    return this.prisma.kitchenStockMinimum.upsert({
      where:{kitchenId_ingredientId:{kitchenId,ingredientId}},
      create:{kitchenId,ingredientId,minimumQty:value,updatedById:user.sub},
      update:{minimumQty:value,updatedById:user.sub},
    });
  }
  async lots(user:AuthUser,kitchenId:string) {
    await this.permitted(user,kitchenId);
    const lots=await this.prisma.inventoryLot.findMany({where:{kitchenId},include:{ingredient:{select:{id:true,name:true,unit:true}},supplier:{select:{id:true,name:true,contactName:true,phone:true}}},orderBy:{receivedAt:'desc'},take:500});
    return lots.map(l=>({...l,quantity:Number(l.quantity),remainingQty:Number(l.remainingQty)}));
  }
  async receipt(user:AuthUser,kitchenId:string,input:any) {
    // The old one-line endpoint cannot record purchase documents and inspection
    // atomically. Do not allow it to bypass the evidence-backed purchase receipt.
    await this.permitted(user,kitchenId,true);
    throw new BadRequestException('Hãy dùng Phiếu nhập nhiều dòng có kiểm nhận, hình ảnh và chứng từ. Không được nhập lô trực tiếp.');
  }
  async issue(user:AuthUser,kitchenId:string,lotId:string,input:any){
    await this.permitted(user,kitchenId,true);
    if(!uuid(lotId)) throw new BadRequestException('Mã lô không hợp lệ.');
    const reason=str(input?.note,'Lý do xuất kho',500);
    const voucherNumber=str(input?.voucherNumber,'Số phiếu xuất',60);
    const inspection=validateStockInspection(input?.inspection,'ISSUE');
    const evidences=validateStockEvidence(input?.evidences,'ISSUE');
    if(inspection.documentNumber!==voucherNumber)
      throw new BadRequestException('Số phiếu xuất phải trùng số chứng từ trong biên bản kiểm xuất.');
    const schoolId=input?.schoolId;
    const serviceDate=input?.serviceDate;
    const mealType=input?.mealType;
    if(!uuid(schoolId) || typeof serviceDate!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !['BREAKFAST','LUNCH','SNACK'].includes(mealType))
      throw new BadRequestException('Cần xác định trường, ngày và bữa sử dụng lô.');
    const day=new Date(serviceDate+'T00:00:00.000Z');
    const dayEnd=new Date(serviceDate+'T23:59:59.999Z');
    if(Number.isNaN(day.valueOf())||day.toISOString().slice(0,10)!==serviceDate)throw new BadRequestException('Ngày bữa không hợp lệ.');
    const kitchen=await this.prisma.kitchen.findUnique({where:{id:kitchenId},select:{schoolId:true}});
    const assigned=kitchen?.schoolId===schoolId || !!(await this.prisma.kitchenSchoolAssignment.findFirst({
      where:{kitchenId,schoolId,isActive:true,startsAt:{lte:dayEnd},OR:[{endsAt:null},{endsAt:{gte:day}}]},
      select:{id:true},
    }));
    if(!assigned)throw new ForbiddenException('Trường không thuộc bếp phục vụ tại ngày được chọn.');
    let issuedForPlan:{revisionId:string;dishVersionIds:string[];ingredientId:string}|null=null;
    if(input?.mealPlanRevisionId!==undefined && input?.mealPlanRevisionId!==''){
      if(!uuid(input.mealPlanRevisionId))throw new BadRequestException('Mã phiên bản thực đơn không hợp lệ.');
      const revision=await this.prisma.mealPlanRevision.findFirst({
        where:{id:input.mealPlanRevisionId,status:'APPROVED',
          mealPlan:{kitchenId,schoolId,serviceDate:day,mealType}},
        select:{id:true,items:{where:{isDefault:true},select:{
          dishVersionId:true,dishVersion:{select:{ingredients:{select:{ingredientId:true}}}},
        }}},
      });
      if(!revision)throw new ForbiddenException('Phiếu xuất phải gắn với đúng phiên bản thực đơn đã duyệt của trường, ngày và bữa.');
      const selected=revision.items.filter(item=>item.dishVersion.ingredients.some(line=>line.ingredientId===input.ingredientId));
      if(!uuid(input.ingredientId)||!selected.length)
        throw new BadRequestException('Nguyên liệu không nằm trong các món mặc định của thực đơn đã duyệt.');
      issuedForPlan={revisionId:revision.id,ingredientId:input.ingredientId,dishVersionIds:selected.map(item=>item.dishVersionId)};
    }
    try{return await this.prisma.$transaction(async tx=>{
      const lot=await tx.inventoryLot.findFirst({where:{id:lotId,kitchenId},select:{id:true,ingredientId:true,remainingQty:true,status:true,expiryDate:true,unit:true}});
      if(!lot) throw new NotFoundException('Không tìm thấy lô thuộc bếp.');
      if(issuedForPlan && lot.ingredientId!==issuedForPlan.ingredientId)
        throw new BadRequestException('Lô xuất không trùng nguyên liệu dự trù trong thực đơn đã duyệt.');
      if(lot.status!=='AVAILABLE' || (lot.expiryDate && lot.expiryDate.getTime()<Date.now()-86400000) || (lot.expiryDate && lot.expiryDate.getTime()<day.getTime())) throw new ConflictException('Lô đã hết hạn tại ngày sử dụng hoặc không đủ điều kiện xuất.');
      const entered=canonicalQuantity(input?.quantity,input?.unit,lot.unit);
      const quantity=entered.quantity;
      const current=Number(lot.remainingQty);
      if(current<quantity) throw new ConflictException('Không đủ số lượng tồn.');
      const changed=await tx.inventoryLot.updateMany({where:{id:lotId,kitchenId,status:'AVAILABLE',remainingQty:{gte:quantity}},data:{remainingQty:{decrement:quantity},...(current===quantity?{status:'DEPLETED' as const}:{})}});
      if(changed.count!==1) throw new ConflictException('Tồn kho đã thay đổi; vui lòng tải lại.');
      const voucher=await tx.stockVoucher.create({data:{
        kitchenId,number:voucherNumber,kind:'ISSUE',lotId,schoolId,serviceDate:day,mealType,
        quantity,unit:lot.unit,inspection:{...inspection,...(issuedForPlan?{approvedPlan:issuedForPlan}: {})},postedById:user.sub,
      }});
      await tx.stockVoucherEvidence.createMany({data:evidences.map(file=>({
        voucherId:voucher.id,category:file.category,filename:file.filename,mimeType:file.mimeType,
        size:file.size,sha256:file.sha256,data:Uint8Array.from(file.data),uploadedById:user.sub,
      }))});
      await tx.traceEvent.create({data:{lotId,eventType:'ISSUED',actorId:user.sub,description:reason,metadata:{
        kind:'ISSUE',voucherId:voucher.id,voucherNumber,quantity,unit:lot.unit,
        enteredQuantity:entered.enteredQuantity,enteredUnit:entered.enteredUnit,schoolId,serviceDate,mealType,
        ...(issuedForPlan?{approvedPlan:issuedForPlan}:{}),
      }}});
      return {lotId,quantity,remainingQty:current-quantity,voucherId:voucher.id};
    });
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002')
        throw new ConflictException('Số phiếu xuất đã tồn tại. Không được ghi trừ kho lần hai.');
      throw error;
    }
  }
  async returnIssue(user:AuthUser,kitchenId:string,sourceVoucherId:string,input:any){
    await this.permitted(user,kitchenId,true);
    if(!uuid(sourceVoucherId))throw new BadRequestException('Phiếu xuất gốc không hợp lệ.');
    const number=str(input?.voucherNumber,'Số phiếu nhập hoàn',60);
    const reason=str(input?.reason,'Lý do nhập hoàn',500);
    if(reason.length<10)throw new BadRequestException('Lý do nhập hoàn tối thiểu 10 ký tự.');
    if(input?.unusedAndSafe!==true)
      throw new BadRequestException('Chỉ nhập hoàn nguyên liệu chưa chế biến và còn đủ điều kiện bảo quản, sử dụng.');
    const inspection=validateStockInspection(input?.inspection,'RETURN');
    if(inspection.documentNumber!==number)
      throw new BadRequestException('Số chứng từ nhập hoàn không khớp mã phiếu.');
    const evidences=validateStockEvidence(input?.evidences,'RETURN');
    try{return await this.prisma.$transaction(async tx=>{
      const source=await tx.stockVoucher.findFirst({
        where:{id:sourceVoucherId,kitchenId,kind:'ISSUE',status:'POSTED'},
        select:{id:true,lotId:true,schoolId:true,serviceDate:true,mealType:true,quantity:true,unit:true},
      });
      if(!source || !source.lotId || !source.quantity || !source.unit)
        throw new NotFoundException('Không thấy phiếu xuất gốc thuộc bếp.');
      const lot=await tx.inventoryLot.findFirst({
        where:{id:source.lotId,kitchenId},select:{id:true,remainingQty:true,quantity:true,status:true,expiryDate:true,unit:true},
      });
      if(!lot || !['AVAILABLE','DEPLETED'].includes(lot.status) ||
        (lot.expiryDate && lot.expiryDate.getTime()<Date.now()-86400000))
        throw new ConflictException('Lô đang cách ly/hết hạn hoặc không thể hoàn về tồn khả dụng.');
      const entered=canonicalQuantity(input?.quantity,input?.unit,lot.unit);
      const quantity=entered.quantity;
      const previous=await tx.stockVoucher.aggregate({
        where:{sourceVoucherId,kind:'RETURN',status:'POSTED'},_sum:{quantity:true},
      });
      const outstanding=Number(source.quantity)-Number(previous._sum.quantity??0);
      if(quantity>outstanding+0.00000001)
        throw new ConflictException('Lượng hoàn vượt phần nguyên liệu còn có thể hoàn của phiếu xuất.');
      if(Number(lot.remainingQty)+quantity>Number(lot.quantity)+0.00000001)
        throw new ConflictException('Nhập hoàn vượt số lượng gốc của lô.');
      const voucher=await tx.stockVoucher.create({data:{
        kitchenId,number,kind:'RETURN',sourceVoucherId,
        lotId:lot.id,schoolId:source.schoolId,serviceDate:source.serviceDate,mealType:source.mealType,
        quantity,unit:lot.unit,inspection:{...inspection,reason,unusedAndSafe:true},
        postedById:user.sub,
      }});
      await tx.stockVoucherEvidence.createMany({data:evidences.map(file=>({
        voucherId:voucher.id,category:file.category,filename:file.filename,
        mimeType:file.mimeType,size:file.size,sha256:file.sha256,
        data:Uint8Array.from(file.data),uploadedById:user.sub,
      }))});
      const changed=await tx.inventoryLot.updateMany({
        where:{id:lot.id,kitchenId,status:lot.status,remainingQty:lot.remainingQty},
        data:{remainingQty:{increment:quantity},status:'AVAILABLE'},
      });
      if(changed.count!==1)throw new ConflictException('Tồn lô thay đổi trong khi hoàn; vui lòng kiểm tra lại.');
      await tx.traceEvent.create({data:{
        lotId:lot.id,eventType:'RETURNED',actorId:user.sub,description:reason,
        metadata:{kind:'RETURN',voucherId:voucher.id,sourceVoucherId,quantity,unit:lot.unit,
          schoolId:source.schoolId,serviceDate:source.serviceDate?.toISOString().slice(0,10),mealType:source.mealType},
      }});
      return {voucherId:voucher.id,sourceVoucherId,lotId:lot.id,quantity,remainingQty:Number(lot.remainingQty)+quantity};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')
        throw new ConflictException('Mã phiếu nhập hoàn đã tồn tại.');
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2034')
        throw new ConflictException('Tồn kho hoặc lượng hoàn vừa thay đổi. Vui lòng tải lại.');
      throw error;
    }
  }
  async lotStatus(user:AuthUser,kitchenId:string,lotId:string,body:any){
    await this.permitted(user,kitchenId,true);
    if(!uuid(lotId))throw new BadRequestException('Mã lô không hợp lệ.');
    const status=body?.status;
    if(!['AVAILABLE','QUARANTINED'].includes(status))throw new BadRequestException('Trạng thái lô không hợp lệ.');
    const reason=str(body?.note,'Lý do thay đổi trạng thái',500);
    return this.prisma.$transaction(async tx=>{
      const lot=await tx.inventoryLot.findFirst({where:{id:lotId,kitchenId}});
      if(!lot)throw new NotFoundException('Không tìm thấy lô thuộc bếp.');
      if(lot.status===status)throw new ConflictException('Lô đã ở trạng thái này.');
      if(status==='AVAILABLE' && (lot.remainingQty.lte(0)||lot.expiryDate&&lot.expiryDate.getTime()<Date.now()-86400000))
        throw new ConflictException('Không thể mở cách ly lô hết hạn hoặc đã hết tồn.');
      if(lot.status!=='AVAILABLE'&&lot.status!=='QUARANTINED')
        throw new ConflictException('Không thể thay đổi trạng thái của lô này.');
      const changed=await tx.inventoryLot.updateMany({where:{id:lotId,kitchenId,status:lot.status},data:{status}});
      if(changed.count!==1)throw new ConflictException('Trạng thái lô đã thay đổi, vui lòng tải lại.');
      await tx.traceEvent.create({data:{lotId,eventType:status==='QUARANTINED'?'REJECTED':'INSPECTED',actorId:user.sub,description:reason,metadata:{status,previousStatus:lot.status}}});
      return {lotId,status};
    });
  }
  async moveLot(user:AuthUser,kitchenId:string,lotId:string,body:any){
    await this.permitted(user,kitchenId,true);
    if(!uuid(lotId))throw new BadRequestException('Mã lô không hợp lệ.');
    const location=str(body?.location,'Vị trí kho mới',120);
    const reason=str(body?.note,'Lý do chuyển vị trí',500);
    return this.prisma.$transaction(async tx=>{
      const lot=await tx.inventoryLot.findFirst({where:{id:lotId,kitchenId},select:{id:true,storageLocation:true,status:true}});
      if(!lot)throw new NotFoundException('Không tìm thấy lô thuộc bếp.');
      if(lot.storageLocation===location)throw new ConflictException('Lô đã ở vị trí này.');
      if(lot.status==='DEPLETED')throw new ConflictException('Lô đã hết hàng, không thể chuyển.');
      const changed=await tx.inventoryLot.updateMany({where:{id:lotId,kitchenId,storageLocation:lot.storageLocation},data:{storageLocation:location}});
      if(changed.count!==1)throw new ConflictException('Vị trí vừa thay đổi. Hãy tải lại.');
      await tx.traceEvent.create({data:{lotId,eventType:'STORED',actorId:user.sub,location,description:reason,metadata:{oldLocation:lot.storageLocation,newLocation:location}}});
      return {lotId,location};
    });
  }
  async movements(user:AuthUser,kitchenId:string){
    await this.permitted(user,kitchenId);
    return this.prisma.traceEvent.findMany({where:{lot:{kitchenId}},include:{lot:{select:{lotCode:true,ingredient:{select:{name:true}}}}},orderBy:{occurredAt:'desc'},take:200});
  }
}
