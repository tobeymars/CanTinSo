import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SupplyPlanService } from './supply-plan.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SupplyService } from './supply.service';
import type { AuthUser } from '../common/current-user.decorator';

const kitchenId='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const schoolId='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const revisionId='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const ingredientId='dddddddd-dddd-4ddd-dddd-dddddddddddd';
const lotId='eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
const now=new Date('2026-11-30T00:00:00.000Z');
const user={sub:'ffffffff-ffff-4fff-ffff-ffffffffffff',role:'CENTRAL_KITCHEN',kitchenId} as AuthUser;
const approved={
 id:revisionId,revisionNo:3,
 mealPlan:{schoolId,school:{name:'Trường kiểm thử'},serviceDate:now,mealType:'LUNCH'},
 ageGroups:[{ageGroupId:'age-1',plannedServings:100,ageGroup:{name:'Nhóm 1–2'}}],
 items:[{isDefault:true,mealSlot:'LUNCH',portions:[],
   dishVersion:{id:'dish-version-1',recipeSnapshot:{},dish:{name:'Thịt kho'},
     ingredients:[{ingredientId,quantity:0.05,unitCode:'kg',
       ingredient:{name:'Thịt heo',unit:'kg'}}]}}],
};
function setup(revision:unknown=approved){
 const db={
  mealPlan:{findMany:async()=>[]},
  mealPlanRevision:{findFirst:async()=>revision},
  inventoryLot:{findMany:async()=>[{id:lotId,ingredientId,remainingQty:4,expiryDate:null,lotCode:'L-001'}]},
  stockVoucher:{findMany:async()=>[
   {kind:'ISSUE',lotId,quantity:1.5},
   {kind:'RETURN',lotId,quantity:0.5},
  ]},
 };
 const scope={permitted:async()=>({id:kitchenId})};
 return new SupplyPlanService(db as unknown as PrismaService,scope as unknown as SupplyService);
}
test('approved recipe multiplies per-serving quantity and subtracts actual net issues',async()=>{
 const result=await setup().detail(user,kitchenId,revisionId);
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].plannedQuantity,5);
 assert.equal(result.items[0].issueQuantity,1);
 assert.equal(result.items[0].stockAvailable,4);
 assert.equal(result.items[0].shortage,0);
 assert.equal(result.items[0].dishes[0].name,'Thịt kho');
 assert.equal(result.revisionNo,3);
});
test('no approved revision cannot create a demand forecast',async()=>{
 await assert.rejects(()=>setup(null).detail(user,kitchenId,revisionId),/được BGH duyệt/);
});
test('unknown conversion does not invent a purchase yield or subtract stock',async()=>{
 const row=structuredClone(approved);
 row.items[0].dishVersion.ingredients[0].unitCode='hộp';
 const result=await setup(row).detail(user,kitchenId,revisionId);
 assert.equal(result.items.length,0);
 assert.ok(result.warnings.some(w=>w.includes('Không quy đổi')));
 assert.ok(result.warnings.some(w=>w.includes('hao hụt')));
});
test('a replacement dish is not automatically doubled into the forecast',async()=>{
 const row=structuredClone(approved);
 row.items.push({...structuredClone(row.items[0]),isDefault:false});
 const result=await setup(row).detail(user,kitchenId,revisionId);
 assert.equal(result.items[0].plannedQuantity,5);
 assert.ok(result.warnings.some(w=>w.includes('thay thế')));
});
