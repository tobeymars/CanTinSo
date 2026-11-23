import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateArrivalReceipt, arrivalAllowsService } from './arrival-receipt';

const dishes=[{id:'dish-1',name:'Cơm'},{id:'dish-2',name:'Canh'}];
const sample = () => ({
  arrivalTime:'11:15',deliveryPerson:'Người giao hàng',transportUnit:'Xe giao nhận',
  receivedServings:100,packaging:'OK',sensory:'OK',result:'ACCEPTED',
  dishChecks:[{dishId:'dish-1',status:'MATCH',temperatureC:65},{dishId:'dish-2',status:'MATCH',temperatureC:null}],
  receiptChecked:true,note:'Đã kiểm tra đủ số suất ăn khi tiếp nhận.'
});
const validate = (input:any) => validateArrivalReceipt(input,dishes,100,'2026-11-20','2026-11-20T03:00:00Z');
test('accepts a complete matching delivery receipt',()=>{
  const row=validate(sample());
  assert.equal(row.result,'ACCEPTED');
  assert.equal(row.dishChecks.length,2);
  assert.equal(row.receivedServings,100);
  assert.equal(arrivalAllowsService(row),true);
});
test('refuses to approve a discrepancy',()=>{
  assert.throws(()=>validate({...sample(),receivedServings:99}),/chênh lệch/);
});
test('allows conditional receipt but holds service',()=>{
  const row=validate({...sample(),packaging:'ISSUE',result:'CONDITIONAL'});
  assert.equal(arrivalAllowsService(row),false);
});
test('refuses missing or duplicate dish checks',()=>{
  assert.throws(()=>validate({...sample(),dishChecks:[]}),/đủ các món/);
  assert.throws(()=>validate({...sample(),dishChecks:[{dishId:'dish-1',status:'MATCH'}, {dishId:'dish-1',status:'MATCH'}]}),/trùng/);
});
test('refuses an arrival before dispatch on the same service date',()=>{
  assert.throws(()=>validate({...sample(),arrivalTime:'09:00'}),/Xuất bếp/);
});
test('requires a real checker and a valid delivery conclusion',()=>{
  assert.throws(()=>validate({...sample(),receiptChecked:false}),/kiểm tra/);
  assert.throws(()=>validate({...sample(),result:'YES'}),/Kết luận/);
});
