import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canKitchenRecordStage, stageOrderFor } from './stage-responsibility';

const kitchenId='kitchen-central';
test('central kitchen dispatches, school receives, then kitchen records portioning and readiness',()=>{
 assert.deepEqual(stageOrderFor('CENTRAL'),['DISPATCHED','ARRIVED','PLATED','READY']);
});
test('on-site cooking has only its own portioning and readiness stages',()=>{
 assert.deepEqual(stageOrderFor('SCHOOL'),['PLATED','READY']);
});
test('producer central kitchen can record portioning, readiness and dispatch',()=>{
 for(const stage of ['PLATED','READY','DISPATCHED'] as const){
  assert.equal(canKitchenRecordStage('CENTRAL_KITCHEN',kitchenId,kitchenId,'CENTRAL',stage),true);
 }
 assert.equal(canKitchenRecordStage('CENTRAL_KITCHEN',kitchenId,kitchenId,'CENTRAL','ARRIVED'),false);
});
test('receiving school cannot report central kitchen operational stages',()=>{
 for(const stage of stageOrderFor('CENTRAL')){
  assert.equal(canKitchenRecordStage('SCHOOL_KITCHEN',undefined,kitchenId,'CENTRAL',stage),false);
  assert.equal(canKitchenRecordStage('SCHOOL_KITCHEN',kitchenId,kitchenId,'CENTRAL',stage),false);
  assert.equal(canKitchenRecordStage('SCHOOL_ADMIN',undefined,kitchenId,'CENTRAL',stage),false);
 }
});
test('school cooking kitchen may report its stages but not central kitchen stages',()=>{
 assert.equal(canKitchenRecordStage('SCHOOL_KITCHEN','onsite','onsite','SCHOOL','PLATED'),true);
 assert.equal(canKitchenRecordStage('SCHOOL_KITCHEN','onsite','onsite','SCHOOL','READY'),true);
 assert.equal(canKitchenRecordStage('SCHOOL_KITCHEN','onsite','onsite','SCHOOL','DISPATCHED'),false);
 assert.equal(canKitchenRecordStage('SCHOOL_KITCHEN','onsite',kitchenId,'CENTRAL','PLATED'),false);
});
