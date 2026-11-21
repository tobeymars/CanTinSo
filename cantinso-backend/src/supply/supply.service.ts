import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { Prisma } from '@prisma/client';

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const str = (value: unknown, label: string, max = 200, required = true) => {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length > max || (required && !v)) throw new BadRequestException(label + ' không hợp lệ.');
  return v;
};
const qty = (value: unknown) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n) || n <= 0 || n > 100000000 || Math.round(n*1000)!==n*1000)
    throw new BadRequestException('Số lượng phải lớn hơn 0 và tối đa ba chữ số thập phân.');
  return n;
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
  private async permitted(user:AuthUser, kitchenId:string, write=false) {
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
    return this.prisma.supplier.findMany({where:{kitchenId},orderBy:{name:'asc'},select:{id:true,code:true,name:true,taxCode:true,contactName:true,phone:true,email:true,address:true,status:true,createdAt:true}});
  }
  async saveSupplier(user:AuthUser,kitchenId:string,input:any,id?:string) {
    await this.permitted(user,kitchenId,true);
    const code=str(input?.code,'Mã nhà cung cấp',50);
    const name=str(input?.name,'Tên nhà cung cấp');
    const data={code,name,taxCode:str(input?.taxCode,'Mã số thuế',60,false)||null,contactName:str(input?.contactName,'Người liên hệ',150,false)||null,phone:str(input?.phone,'Điện thoại',40,false)||null,email:str(input?.email,'Email',150,false)||null,address:str(input?.address,'Địa chỉ',300,false)||null};
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
  async lots(user:AuthUser,kitchenId:string) {
    await this.permitted(user,kitchenId);
    const lots=await this.prisma.inventoryLot.findMany({where:{kitchenId},include:{ingredient:{select:{id:true,name:true,unit:true}},supplier:{select:{id:true,name:true,contactName:true,phone:true}}},orderBy:{receivedAt:'desc'},take:500});
    return lots.map(l=>({...l,quantity:Number(l.quantity),remainingQty:Number(l.remainingQty)}));
  }
  async receipt(user:AuthUser,kitchenId:string,input:any) {
    await this.permitted(user,kitchenId,true);
    const lotCode=str(input?.lotCode,'Mã lô',100);
    const quantity=qty(input?.quantity);
    if (!uuid(input?.ingredientId) || !uuid(input?.supplierId)) throw new BadRequestException('Phải chọn nguyên liệu và nhà cung cấp thực tế.');
    const [ingredient,supplier]=await Promise.all([
      this.prisma.ingredient.findUnique({where:{id:input.ingredientId}}),
      this.prisma.supplier.findFirst({where:{id:input.supplierId,kitchenId,status:'ACTIVE'}}),
    ]);
    if(!ingredient || !supplier) throw new BadRequestException('Nguyên liệu hoặc nhà cung cấp không hợp lệ.');
    const expiryDate=dateValue(input?.expiryDate);
    if (expiryDate && expiryDate.getTime()<Date.now()-86400000) throw new BadRequestException('Không nhập lô đã hết hạn.');
    try {
      return await this.prisma.$transaction(async tx=>{
        const lot=await tx.inventoryLot.create({data:{kitchenId,lotCode,ingredientId:ingredient.id,supplierId:supplier.id,quantity,remainingQty:quantity,unit:ingredient.unit,expiryDate,storageLocation:str(input?.storageLocation,'Vị trí lưu kho',120,false)||null}});
        await tx.traceEvent.create({data:{lotId:lot.id,eventType:'RECEIVED',actorId:user.sub,description:str(input?.note,'Ghi chú',500,false)||'Nhập kho',metadata:{quantity,unit:ingredient.unit}}});
        return lot;
      });
    } catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002') throw new ConflictException('Mã lô đã tồn tại trong kho bếp.');throw error;}
  }
  async issue(user:AuthUser,kitchenId:string,lotId:string,input:any){
    await this.permitted(user,kitchenId,true);
    if(!uuid(lotId)) throw new BadRequestException('Mã lô không hợp lệ.');
    const quantity=qty(input?.quantity);
    const reason=str(input?.note,'Lý do xuất kho',500);
    const schoolId=input?.schoolId;
    const serviceDate=input?.serviceDate;
    const mealType=input?.mealType;
    if(!uuid(schoolId) || typeof serviceDate!=='string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(serviceDate) || !['BREAKFAST','LUNCH','SNACK'].includes(mealType))
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
    return this.prisma.$transaction(async tx=>{
      const lot=await tx.inventoryLot.findFirst({where:{id:lotId,kitchenId},select:{id:true,remainingQty:true,status:true,expiryDate:true}});
      if(!lot) throw new NotFoundException('Không tìm thấy lô thuộc bếp.');
      if(lot.status!=='AVAILABLE' || (lot.expiryDate && lot.expiryDate.getTime()<Date.now()-86400000)) throw new ConflictException('Lô không đủ điều kiện xuất.');
      const current=Number(lot.remainingQty);
      if(current<quantity) throw new ConflictException('Không đủ số lượng tồn.');
      const changed=await tx.inventoryLot.updateMany({where:{id:lotId,kitchenId,status:'AVAILABLE',remainingQty:{gte:quantity}},data:{remainingQty:{decrement:quantity},...(current===quantity?{status:'DEPLETED' as const}:{})}});
      if(changed.count!==1) throw new ConflictException('Tồn kho đã thay đổi; vui lòng tải lại.');
      await tx.traceEvent.create({data:{lotId,eventType:'ISSUED',actorId:user.sub,description:reason,metadata:{kind:'ISSUE',quantity,schoolId,serviceDate,mealType}}});
      return {lotId,quantity,remainingQty:current-quantity};
    });
  }
  async movements(user:AuthUser,kitchenId:string){
    await this.permitted(user,kitchenId);
    return this.prisma.traceEvent.findMany({where:{lot:{kitchenId}},include:{lot:{select:{lotCode:true,ingredient:{select:{name:true}}}}},orderBy:{occurredAt:'desc'},take:200});
  }
}
