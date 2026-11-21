import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SupplyService } from './supply.service';

const types=['application/pdf','image/jpeg','image/png','image/webp'];
const categories=['registration','food_safety','contract','origin','inspection','other'];
const uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text=(value:unknown,max=200)=>{
  if(value===null||value===undefined||value==='')return '';
  if(typeof value!=='string'||value.trim().length>max)throw new BadRequestException('Trường thông tin chứng từ không hợp lệ.');
  return value.trim();
};
const day=(v:unknown)=>{
  if(!v)return null;
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw new BadRequestException('Ngày chứng từ không hợp lệ.');
  const result=new Date(v+'T00:00:00.000Z');
  if(Number.isNaN(result.valueOf())||result.toISOString().slice(0,10)!==v)throw new BadRequestException('Ngày chứng từ không hợp lệ.');
  return result;
};
@Injectable()
export class SupplierDocumentsService{
 constructor(private readonly prisma:PrismaService,private readonly supply:SupplyService){}
 private async supplier(user:AuthUser,kitchenId:string,supplierId:string,write=false){
  await this.supply.permitted(user,kitchenId,write);
  if(!uuid(supplierId))throw new BadRequestException('Nhà cung cấp không hợp lệ.');
  const supplier=await this.prisma.supplier.findFirst({where:{id:supplierId,kitchenId},select:{id:true,kitchenId:true}});
  if(!supplier)throw new NotFoundException('Không tìm thấy nhà cung cấp thuộc bếp.');
  return supplier;
 }
 async list(user:AuthUser,kitchenId:string,supplierId:string){
  await this.supplier(user,kitchenId,supplierId);
  return this.prisma.supplierDocument.findMany({where:{supplierId,isArchived:false},
   select:{id:true,category:true,filename:true,mimeType:true,size:true,documentNumber:true,issuer:true,issuedAt:true,expiresAt:true,createdAt:true},
   orderBy:{createdAt:'desc'}});
 }
 async upload(user:AuthUser,kitchenId:string,supplierId:string,body:any){
  await this.supplier(user,kitchenId,supplierId,true);
  const category=text(body?.category,40);
  if(!categories.includes(category))throw new BadRequestException('Loại hồ sơ không hợp lệ.');
  const filename=text(body?.filename,220);
  if(!filename || /[\\/\x00-\x1f]/.test(filename))throw new BadRequestException('Tên tệp không hợp lệ.');
  const mimeType=text(body?.mimeType,80);
  if(!types.includes(mimeType))throw new BadRequestException('Chỉ chấp nhận PDF, JPG, PNG hoặc WEBP.');
  const base64=body?.base64;
  if(typeof base64!=='string'||base64.length<8||base64.length>3_000_000||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))
   throw new BadRequestException('Tệp không hợp lệ hoặc vượt dung lượng tối đa 2 MB.');
  const data=Buffer.from(base64,'base64');
  if(data.length<8||data.length>2*1024*1024)throw new BadRequestException('Dung lượng tệp không hợp lệ.');
  const valid=mimeType==='application/pdf'?data.subarray(0,5).toString()==='%PDF-':
    mimeType==='image/png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
    mimeType==='image/jpeg'?data[0]===255&&data[1]===216&&data[2]===255:
    data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP';
  if(!valid)throw new BadRequestException('Nội dung tệp không đúng định dạng đã khai báo.');
  const issuedAt=day(body?.issuedAt),expiresAt=day(body?.expiresAt);
  if(issuedAt&&expiresAt&&issuedAt>expiresAt)throw new BadRequestException('Hạn hết hiệu lực không thể trước ngày cấp.');
  return this.prisma.supplierDocument.create({data:{
    supplierId,category,filename,mimeType,size:data.length,data,uploadedById:user.sub,
    documentNumber:text(body?.documentNumber,120)||null,issuer:text(body?.issuer,200)||null,issuedAt,expiresAt,
   },select:{id:true,category:true,filename:true,mimeType:true,size:true,createdAt:true}});
 }
 async download(user:AuthUser,kitchenId:string,supplierId:string,documentId:string){
  await this.supplier(user,kitchenId,supplierId);
  if(!uuid(documentId))throw new BadRequestException('Mã chứng từ không hợp lệ.');
  const file=await this.prisma.supplierDocument.findFirst({where:{id:documentId,supplierId,isArchived:false}});
  if(!file)throw new NotFoundException('Không tìm thấy chứng từ.');
  return {id:file.id,filename:file.filename,mimeType:file.mimeType,base64:Buffer.from(file.data).toString('base64')};
 }
 async archive(user:AuthUser,kitchenId:string,supplierId:string,documentId:string){
  await this.supplier(user,kitchenId,supplierId,true);
  if(!uuid(documentId))throw new BadRequestException('Mã chứng từ không hợp lệ.');
  const document=await this.prisma.supplierDocument.findFirst({where:{id:documentId,supplierId,isArchived:false}});
  if(!document)throw new NotFoundException('Không tìm thấy chứng từ.');
  return this.prisma.supplierDocument.update({where:{id:documentId},data:{isArchived:true},select:{id:true,isArchived:true}});
 }
}
