import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SupplyService } from './supply.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/current-user.decorator';

const schoolA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const schoolB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const centralId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const onsiteId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const onsiteOtherId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const principal={role:'SCHOOL_ADMIN',schoolId:schoolA,sub:'ffffffff-ffff-4fff-8fff-ffffffffffff'} as AuthUser;
const kitchens=[
 {id:centralId,name:'Bếp trung tâm',type:'CENTRAL',schoolId:null,wardId:schoolA,isActive:true},
 {id:onsiteId,name:'Bếp trường A',type:'SCHOOL',schoolId:schoolA,wardId:schoolA,isActive:true},
 {id:onsiteOtherId,name:'Bếp trường B',type:'SCHOOL',schoolId:schoolB,wardId:schoolA,isActive:true},
];
const setup=()=>{
 let assignmentCalls=0;
 const prisma={
  kitchen:{
   findUnique:async ({where}:{where:{id:string}})=>kitchens.find(k=>k.id===where.id)??null,
   findMany:async ({where}:{where:{type?:string;schoolId?:string;isActive?:boolean}})=>kitchens.filter(k=>
    (!where.type||where.type===k.type)&&(!where.schoolId||where.schoolId===k.schoolId)&&
    (!where.isActive||k.isActive)),
  },
  kitchenSchoolAssignment:{findFirst:async()=>{assignmentCalls++;return {id:'assignment'};}},
 };
 return {service:new SupplyService(prisma as unknown as PrismaService),getAssignmentCalls:()=>assignmentCalls};
};
test('BGH cannot access an assigned central-kitchen warehouse',async()=>{
 const {service,getAssignmentCalls}=setup();
 await assert.rejects(()=>service.permitted(principal,centralId),/BGH chỉ được xem kho/);
 assert.equal(getAssignmentCalls(),0,'school assignment must not authorize stock viewing');
});
test('BGH can view own on-site school kitchen read-only',async()=>{
 const {service}=setup();
 assert.equal((await service.permitted(principal,onsiteId)).id,onsiteId);
 await assert.rejects(()=>service.permitted(principal,onsiteId,true),/Chỉ tài khoản bếp/);
});
test('BGH cannot see a different school on-site kitchen',async()=>{
 await assert.rejects(()=>setup().service.permitted(principal,onsiteOtherId),/BGH chỉ được xem kho/);
});
test('school warehouse selector includes only its own on-site kitchen',async()=>{
 const result=await setup().service.kitchens(principal);
 assert.deepEqual(result.map(k=>k.id),[onsiteId]);
});
test('school without on-site kitchen gets no warehouse',async()=>{
 const result=await setup().service.kitchens({...principal,schoolId:'11111111-1111-4111-8111-111111111111'} as AuthUser);
 assert.deepEqual(result,[]);
});
test('central kitchen employee retains its own warehouse access',async()=>{
 const {service}=setup();
 const employee={...principal,role:'CENTRAL_KITCHEN',schoolId:null,kitchenId:centralId} as AuthUser;
 assert.equal((await service.permitted(employee,centralId,true)).id,centralId);
});
