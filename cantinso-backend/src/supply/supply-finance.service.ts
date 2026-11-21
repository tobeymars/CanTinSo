import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SupplyService } from './supply.service';
import { canonicalQuantity } from './quantity-units';

const code=(v:unknown,label:string,max=100,required=true)=>{
  const value=typeof v==='string'?v.trim():'';
  if(value.length>max || (required && !value))throw new BadRequestException(label+' không hợp lệ.');
  return value;
};
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const money=(v:unknown,allowZero=false)=>{
  const n=Number(v);
  if(v===null||v===undefined||v===''||!Number.isSafeInteger(n)||n<0||n>1000000000000||(!allowZero&&n===0))throw new BadRequestException('Giá trị tiền phải là số nguyên VND hợp lệ.');
  return n;
};
const unitPriceMoney=(v:unknown)=>{
  const value=Number(v);
  if(v===null||v===undefined||v===''||!Number.isFinite(value)||value<=0||value>=1000000000000)
    throw new BadRequestException('Đơn giá trên đơn vị mua phải là số dương.');
  const decimal=new Prisma.Decimal(String(v));
  if(decimal.decimalPlaces()>6)throw new BadRequestException('Đơn giá chỉ hỗ trợ tối đa 6 chữ số thập phân.');
  return decimal.toNumber();
};
const parseDate=(v:unknown)=>{
  if(v===null||v===undefined||v==='')return null;
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw new BadRequestException('Ngày không đúng YYYY-MM-DD.');
  const parsed=new Date(v+'T00:00:00.000Z');
  if(Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==v)throw new BadRequestException('Ngày không hợp lệ.');
  return parsed;
};
@Injectable()
export class SupplyFinanceService {
  constructor(private readonly prisma:PrismaService,private readonly supply:SupplyService){}
  async overview(user:AuthUser,kitchenId:string){
    await this.supply.permitted(user,kitchenId);
    const [suppliers,receipts,payments,unpricedLots]=await Promise.all([
      this.prisma.supplier.findMany({where:{kitchenId},orderBy:{name:'asc'},select:{id:true,code:true,name:true,status:true}}),
      this.prisma.purchaseReceipt.findMany({where:{kitchenId},orderBy:{createdAt:'desc'},include:{
        supplier:{select:{id:true,name:true,code:true}},
        lines:{include:{lot:{include:{ingredient:{select:{name:true,unit:true}}}}}},
        payments:{where:{reversedAt:null},select:{id:true,amount:true}},
      }}),
      this.prisma.supplierPayment.findMany({where:{kitchenId},orderBy:{paidAt:'desc'},include:{
        receipt:{select:{id:true,number:true}},supplier:{select:{id:true,name:true}},
      }}),
      this.prisma.inventoryLot.count({where:{kitchenId,purchaseReceiptLine:null}}),
    ]);
    const supplierRows=suppliers.map(supplier=>{
      const theirs=receipts.filter(receipt=>receipt.supplierId===supplier.id);
      const purchases=theirs.reduce((sum,receipt)=>sum+Number(receipt.total),0);
      const paid=payments.filter(payment=>payment.supplierId===supplier.id && !payment.reversedAt).reduce((sum,payment)=>sum+Number(payment.amount),0);
      return {...supplier,totalPurchase:purchases,paid,debt:purchases-paid,receipts:theirs.length};
    });
    const receiptRows=receipts.map(receipt=>{
      const paid=receipt.payments.reduce((sum,item)=>sum+Number(item.amount),0);
      return {...receipt,total:Number(receipt.total),paid,debt:Number(receipt.total)-paid,
        lines:receipt.lines.map(line=>({...line,quantity:Number(line.quantity),enteredQuantity:line.enteredQuantity===null?null:Number(line.enteredQuantity),unitPrice:Number(line.unitPrice),amount:Number(line.amount)}))};
    });
    const paymentRows=payments.map(payment=>({...payment,amount:Number(payment.amount)}));
    const totalPurchase=supplierRows.reduce((sum,row)=>sum+row.totalPurchase,0);
    const paid=supplierRows.reduce((sum,row)=>sum+row.paid,0);
    return {totals:{suppliers:suppliers.length,activeSuppliers:suppliers.filter(s=>s.status==='ACTIVE').length,totalPurchase,paid,debt:totalPurchase-paid,unpricedLots},suppliers:supplierRows,receipts:receiptRows,payments:paymentRows};
  }
  async createReceipt(user:AuthUser,kitchenId:string,body:any){
    await this.supply.permitted(user,kitchenId,true);
    const number=code(body?.number,'Số phiếu nhập',60);
    const supplierId=body?.supplierId;
    if(!uuid(supplierId))throw new BadRequestException('Nhà cung cấp không hợp lệ.');
    const supplier=await this.prisma.supplier.findFirst({where:{id:supplierId,kitchenId,status:'ACTIVE'},select:{id:true}});
    if(!supplier)throw new BadRequestException('Nhà cung cấp không còn hoạt động trong bếp.');
    const inputLines=body?.lines;
    if(!Array.isArray(inputLines)||inputLines.length<1||inputLines.length>50)throw new BadRequestException('Phiếu nhập cần từ 1 đến 50 dòng.');
    const ingredientIds=[...new Set(inputLines.map((line:any)=>line?.ingredientId))];
    if(ingredientIds.some(id=>!uuid(id)))throw new BadRequestException('Cần chọn nguyên liệu hợp lệ từ danh mục.');
    const ingredients=await this.prisma.ingredient.findMany({where:{id:{in:ingredientIds}},select:{id:true,unit:true}});
    if(ingredients.length!==ingredientIds.length)throw new BadRequestException('Nguyên liệu không hợp lệ.');
    const lines=inputLines.map((line:any)=>{
      const ingredient=ingredients.find(item=>item.id===line.ingredientId)!;
      const lotCode=code(line?.lotCode,'Mã lô',100);
      const entered=canonicalQuantity(line?.quantity,line?.unit,ingredient.unit);
      const unitPrice=unitPriceMoney(line?.unitPrice);
      const amount=Number(new Prisma.Decimal(entered.enteredQuantity).mul(unitPrice).toDecimalPlaces(0,Prisma.Decimal.ROUND_HALF_UP));
      if(!Number.isSafeInteger(amount)||amount>1000000000000)throw new BadRequestException('Thành tiền vượt giới hạn.');
      return {ingredientId:line.ingredientId as string,lotCode,quantity:entered.quantity,enteredQuantity:entered.enteredQuantity,enteredUnit:entered.enteredUnit,unitPrice,amount,expiryDate:parseDate(line?.expiryDate),storageLocation:code(line?.storageLocation,'Vị trí lưu',120,false)||null};
    });
    if(new Set(lines.map(line=>line.lotCode)).size!==lines.length)throw new BadRequestException('Không được nhập trùng mã lô trong phiếu.');
    const today=new Date();today.setUTCHours(0,0,0,0);
    if(lines.some(line=>line.expiryDate&&line.expiryDate<today))throw new BadRequestException('Không tiếp nhận lô đã hết hạn.');
    const total=lines.reduce((sum,line)=>sum+line.amount,0);
    if(!Number.isSafeInteger(total)||total>100000000000000)throw new BadRequestException('Tổng tiền vượt giới hạn.');
    try{
      return await this.prisma.$transaction(async tx=>{
        const receipt=await tx.purchaseReceipt.create({data:{
          kitchenId,supplierId,number,invoiceNumber:code(body?.invoiceNumber,'Số hóa đơn',100,false)||null,
          reference:code(body?.reference,'Tham chiếu',100,false)||null,
          description:code(body?.description,'Diễn giải',500,false)||null,total,createdById:user.sub,
        }});
        for(const line of lines){
          const ingredient=ingredients.find(x=>x.id===line.ingredientId)!;
          const lot=await tx.inventoryLot.create({data:{
            kitchenId,supplierId,ingredientId:line.ingredientId,lotCode:line.lotCode,
            quantity:line.quantity,remainingQty:line.quantity,unit:ingredient.unit,
            expiryDate:line.expiryDate,storageLocation:line.storageLocation,
          }});
          await tx.purchaseReceiptLine.create({data:{
            receiptId:receipt.id,lotId:lot.id,quantity:line.quantity,enteredQuantity:line.enteredQuantity,enteredUnit:line.enteredUnit,unitPrice:line.unitPrice,amount:line.amount,
          }});
          await tx.traceEvent.create({data:{lotId:lot.id,eventType:'RECEIVED',actorId:user.sub,
            description:'Nhập kho theo phiếu '+number,metadata:{receiptId:receipt.id,receiptNumber:number,quantity:line.quantity,unit:ingredient.unit,enteredQuantity:line.enteredQuantity,enteredUnit:line.enteredUnit}}});
        }
        return {id:receipt.id,number,total,lines:lines.length};
      });
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')
        throw new ConflictException('Số phiếu hoặc mã lô đã tồn tại trong kho bếp.');
      throw error;
    }
  }
  async reversePayment(user:AuthUser,kitchenId:string,paymentId:string,body:any){
    await this.supply.permitted(user,kitchenId,true);
    if(!uuid(paymentId))throw new BadRequestException('Mã phiếu chi không hợp lệ.');
    const reason=code(body?.reason,'Lý do hủy bút toán',500);
    if(reason.length<5)throw new BadRequestException('Lý do hủy bút toán phải từ 5 ký tự.');
    const result=await this.prisma.supplierPayment.updateMany({
      where:{id:paymentId,kitchenId,reversedAt:null},
      data:{reversedAt:new Date(),reversedById:user.sub,reversalReason:reason},
    });
    if(!result.count)throw new ConflictException('Phiếu chi đã hủy hoặc không thuộc bếp.');
    return {id:paymentId,reversed:true};
  }
  async pay(user:AuthUser,kitchenId:string,body:any){
    await this.supply.permitted(user,kitchenId,true);
    const receiptId=body?.receiptId;
    if(!uuid(receiptId))throw new BadRequestException('Phải chọn phiếu nhập cần thanh toán.');
    const reference=code(body?.reference,'Mã phiếu chi / tham chiếu',100);
    const amount=money(body?.amount);
    const method=body?.method;
    if(!['BANK_TRANSFER','CASH','OTHER'].includes(method))throw new BadRequestException('Phương thức thanh toán không hợp lệ.');
    const paidAt=parseDate(body?.paidAt)??new Date();
    if(paidAt.getTime()>Date.now())throw new BadRequestException('Không ghi nhận thanh toán ở ngày tương lai.');
    const note=code(body?.note,'Ghi chú',500,false)||null;
    try{
      return await this.prisma.$transaction(async tx=>{
        const receipt=await tx.purchaseReceipt.findFirst({where:{id:receiptId,kitchenId},select:{id:true,supplierId:true,total:true,payments:{where:{reversedAt:null},select:{amount:true}}}});
        if(!receipt)throw new NotFoundException('Phiếu nhập không thuộc bếp.');
        const paid=receipt.payments.reduce((sum,item)=>sum+Number(item.amount),0);
        if(amount>Number(receipt.total)-paid)throw new ConflictException('Số tiền vượt công nợ còn lại của phiếu nhập.');
        const row=await tx.supplierPayment.create({data:{
          kitchenId,receiptId,supplierId:receipt.supplierId,reference,amount,method,paidAt,note,createdById:user.sub,
        }});
        return {id:row.id,reference,amount};
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')throw new ConflictException('Mã phiếu chi đã tồn tại.');
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2034')throw new ConflictException('Công nợ vừa thay đổi. Hãy tải lại và thử lại.');
      throw error;
    }
  }
}
