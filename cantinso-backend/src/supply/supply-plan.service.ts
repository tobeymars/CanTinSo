import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { SupplyService } from './supply.service';
import { canonicalQuantity } from './quantity-units';

const round3=(value:number)=>Math.ceil((value-0.000000001)*1000)/1000;
type IssueLine={ingredientId:string;name:string;unit:string;plannedQuantity:number;stockAvailable:number;shortage:number;dishes:Array<{dishVersionId:string;name:string;quantity:number}>;issueQuantity:number};
@Injectable()
export class SupplyPlanService {
  constructor(private readonly prisma:PrismaService,private readonly supply:SupplyService){}
  async list(user:AuthUser,kitchenId:string){
    await this.supply.permitted(user,kitchenId,true);
    const plans=await this.prisma.mealPlan.findMany({
      where:{kitchenId,revisions:{some:{status:'APPROVED'}}},
      orderBy:[{serviceDate:'desc'},{mealType:'asc'}],take:100,
      select:{id:true,schoolId:true,serviceDate:true,mealType:true,
        school:{select:{name:true}},
        revisions:{where:{status:'APPROVED'},orderBy:{revisionNo:'desc'},take:1,select:{
          id:true,revisionNo:true,decidedAt:true,
        }},
      },
    });
    return plans.filter(p=>p.revisions.length).map(p=>({
      id:p.id,schoolId:p.schoolId,schoolName:p.school.name,serviceDate:p.serviceDate.toISOString().slice(0,10),
      mealType:p.mealType,revisionId:p.revisions[0].id,revisionNo:p.revisions[0].revisionNo,
      approvedAt:p.revisions[0].decidedAt,
    }));
  }
  async detail(user:AuthUser,kitchenId:string,revisionId:string){
    await this.supply.permitted(user,kitchenId,true);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(revisionId))
      throw new BadRequestException('Mã phiên bản thực đơn không hợp lệ.');
    const revision=await this.prisma.mealPlanRevision.findFirst({
      where:{id:revisionId,status:'APPROVED',mealPlan:{kitchenId}},
      select:{id:true,revisionNo:true,mealPlan:{select:{
        schoolId:true,school:{select:{name:true}},serviceDate:true,mealType:true,
      }},ageGroups:{select:{ageGroupId:true,plannedServings:true,ageGroup:{select:{name:true}}}},
      items:{select:{isDefault:true,mealSlot:true,
        portions:{select:{ageGroupId:true,portionFactor:true}},
        dishVersion:{select:{id:true,recipeSnapshot:true,dish:{select:{name:true}},ingredients:{
          select:{ingredientId:true,quantity:true,unitCode:true,ingredient:{select:{name:true,unit:true}}},
        }}},
      }}},
    });
    if(!revision)throw new BadRequestException('Chỉ được lập dự trù từ phiên bản thực đơn đã được BGH duyệt và thuộc bếp.');
    const warnings:string[]=[];
    const rows=new Map<string,IssueLine>();
    const activeItems=revision.items.filter(item=>item.isDefault);
    if(activeItems.length!==revision.items.length)
      warnings.push('Các món thay thế không được cộng vào dự trù mặc định; cần xác nhận món thực tế trước khi xuất.');
    const validAgeGroups=revision.ageGroups.filter(g=>g.plannedServings>0);
    for(const item of activeItems){
      let portions=0;
      for(const age of validAgeGroups){
        const itemPortion=item.portions.find(p=>p.ageGroupId===age.ageGroupId);
        const factor=Number(itemPortion?.portionFactor??1);
        if(!Number.isFinite(factor)||factor<=0){
          warnings.push('Hệ số khẩu phần không hợp lệ ở món '+item.dishVersion.dish.name);
          continue;
        }
        portions+=age.plannedServings*factor;
      }
      if(!portions)continue;
      for(const detail of item.dishVersion.ingredients){
        let converted:number;
        try{
          // Recipes contain quantities for one serving. No arbitrary processing-loss uplift.
          converted=canonicalQuantity(Number(detail.quantity)*portions,detail.unitCode,detail.ingredient.unit).quantity;
        }catch{
          warnings.push('Không quy đổi được '+detail.ingredient.name+' ('+detail.unitCode+
            ') sang đơn vị kho '+detail.ingredient.unit+'; phải tính lại thủ công.');
          continue;
        }
        const prior=rows.get(detail.ingredientId);
        const row=prior??{ingredientId:detail.ingredientId,name:detail.ingredient.name,unit:detail.ingredient.unit,
          plannedQuantity:0,stockAvailable:0,shortage:0,dishes:[],issueQuantity:0};
        row.plannedQuantity+=converted;
        row.dishes.push({dishVersionId:item.dishVersion.id,name:item.dishVersion.dish.name,quantity:converted});
        rows.set(detail.ingredientId,row);
      }
    }
    const lots=await this.prisma.inventoryLot.findMany({
      where:{kitchenId,ingredientId:{in:[...rows.keys()]},status:'AVAILABLE',remainingQty:{gt:0}},
      select:{ingredientId:true,remainingQty:true,expiryDate:true,lotCode:true},
    });
    const today=new Date().toISOString().slice(0,10);
    const serviceDay=revision.mealPlan.serviceDate.toISOString().slice(0,10);
    const validLots=lots.filter(l=>!l.expiryDate || (l.expiryDate.toISOString().slice(0,10)>=today &&
      l.expiryDate.toISOString().slice(0,10)>=serviceDay));
    const issues=await this.prisma.stockVoucher.findMany({
      where:{kitchenId,kind:{in:['ISSUE','RETURN']},schoolId:revision.mealPlan.schoolId,
        serviceDate:revision.mealPlan.serviceDate,mealType:revision.mealPlan.mealType},
      select:{kind:true,lotId:true,quantity:true},
    });
    const lotIngredient=await this.prisma.inventoryLot.findMany({
      where:{kitchenId,id:{in:issues.map(i=>i.lotId).filter((id):id is string=>!!id)}},
      select:{id:true,ingredientId:true},
    });
    const ingredientByLot=new Map(lotIngredient.map(l=>[l.id,l.ingredientId]));
    for(const issue of issues){
      const ingredientId=issue.lotId?ingredientByLot.get(issue.lotId):undefined;
      const row=ingredientId?rows.get(ingredientId):undefined;
      if(row)row.issueQuantity+=(issue.kind==='ISSUE'?1:-1)*Number(issue.quantity??0);
    }
    for(const row of rows.values()){
      row.plannedQuantity=round3(row.plannedQuantity);
      row.issueQuantity=Math.round(row.issueQuantity*1000)/1000;
      row.stockAvailable=Math.round(validLots.filter(l=>l.ingredientId===row.ingredientId)
        .reduce((sum,l)=>sum+Number(l.remainingQty),0)*1000)/1000;
      row.shortage=Math.max(0,Math.round((row.plannedQuantity-row.issueQuantity-row.stockAvailable)*1000)/1000);
    }
    warnings.push('Định lượng dự trù lấy từ công thức/suất trước khi áp dụng hao hụt chưa được chuẩn hóa. Phải cân thực tế, kiểm tra điều kiện lô và xác nhận phiếu xuất.');
    if(!activeItems.length)warnings.push('Thực đơn chưa có món mặc định để dự trù.');
    return {revisionId:revision.id,revisionNo:revision.revisionNo,schoolId:revision.mealPlan.schoolId,
      schoolName:revision.mealPlan.school.name,serviceDate:serviceDay,mealType:revision.mealPlan.mealType,
      ageGroups:validAgeGroups.map(a=>({name:a.ageGroup.name,plannedServings:a.plannedServings})),
      items:[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi')),warnings};
  }
}
