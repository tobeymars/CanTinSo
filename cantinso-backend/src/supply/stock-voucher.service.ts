import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SupplyService } from './supply.service';
import { createHash } from 'node:crypto';

@Injectable()
export class StockVoucherService {
  constructor(private readonly prisma:PrismaService,private readonly supply:SupplyService){}
  private async scope(user:AuthUser,kitchenId:string){
    const kitchen=await this.supply.permitted(user,kitchenId);
    const receivingSchool=user.role==='SCHOOL_ADMIN'&&kitchen.type==='CENTRAL';
    return {where:{kitchenId,...(receivingSchool?{kind:'ISSUE',schoolId:user.schoolId}: {})},
      receivingSchool};
  }
  async list(user:AuthUser,kitchenId:string){
    const {where}=await this.scope(user,kitchenId);
    const rows=await this.prisma.stockVoucher.findMany({where,
      include:{evidences:{select:{id:true,category:true,filename:true,mimeType:true,size:true,sha256:true,createdAt:true}},
        receipt:{select:{id:true,number:true,supplier:{select:{name:true}},lines:{
          include:{lot:{select:{lotCode:true,ingredient:{select:{name:true,unit:true}}}}}}}}},
      orderBy:{postedAt:'desc'},take:200});
    return rows.map(row=>({...row,quantity:row.quantity===null?null:Number(row.quantity)}));
  }
  async evidence(user:AuthUser,kitchenId:string,voucherId:string,evidenceId:string){
    const {where}=await this.scope(user,kitchenId);
    const voucher=await this.prisma.stockVoucher.findFirst({where:{...where,id:voucherId},select:{id:true}});
    if(!voucher)throw new NotFoundException('Không tìm thấy phiếu kho trong phạm vi được phép.');
    const item=await this.prisma.stockVoucherEvidence.findFirst({
      where:{id:evidenceId,voucherId},
      select:{id:true,filename:true,mimeType:true,sha256:true,data:true},
    });
    if(!item)throw new NotFoundException('Không tìm thấy minh chứng thuộc phiếu.');
    const actual=createHash('sha256').update(item.data).digest('hex');
    if(actual!==item.sha256)throw new ForbiddenException('Tệp minh chứng có dấu hiệu không toàn vẹn.');
    return {filename:item.filename,mimeType:item.mimeType,sha256:item.sha256,base64:Buffer.from(item.data).toString('base64')};
  }
}
