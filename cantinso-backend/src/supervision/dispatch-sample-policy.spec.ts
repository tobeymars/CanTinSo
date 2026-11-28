import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { verifySamplesBeforeDispatch } from './dispatch-sample-policy';

const processing={
  status:'reported',
  inspection:{isPass:true,dishes:[{dishId:'com',cookedAt:'2026-11-23T09:00'},
    {dishId:'canh',cookedAt:'2026-11-23T09:10'}]},
};
const foodSample={
  status:'reported',
  inspection:{kind:'food_sample',isPass:true,dishes:[
    {dishId:'com',takenAt:'2026-11-23T09:12'},
    {dishId:'canh',takenAt:'2026-11-23T09:15'},
  ]},
};
const dispatchAt=new Date('2026-11-23T09:20:00+07:00');
test('food can be dispatched minutes after samples are collected, no 24-hour delay',()=>{
  assert.doesNotThrow(()=>verifySamplesBeforeDispatch(foodSample,processing,dispatchAt));
});
test('dispatch rejects missing or failed cooking report',()=>{
  assert.throws(()=>verifySamplesBeforeDispatch(foodSample,{},dispatchAt),/bước 2/);
  assert.throws(()=>verifySamplesBeforeDispatch(foodSample,{...processing,inspection:{isPass:false}},dispatchAt),/chưa có kết quả Đạt/);
});
test('dispatch rejects missing food sample and legacy incomplete sample report',()=>{
  assert.throws(()=>verifySamplesBeforeDispatch({},processing,dispatchAt),/lấy mẫu/);
  assert.throws(()=>verifySamplesBeforeDispatch({status:'reported'},processing,dispatchAt),/hồ sơ lưu mẫu hợp lệ/);
});
test('dispatch rejects samples recorded after dispatch',()=>{
  const future={...foodSample,inspection:{...foodSample.inspection,dishes:[
    foodSample.inspection.dishes[0],{dishId:'canh',takenAt:'2026-11-23T09:21'}]}};
  assert.throws(()=>verifySamplesBeforeDispatch(future,processing,dispatchAt),/trước thời điểm xuất bếp/);
});
test('sample collection must occur after cooking each corresponding dish',()=>{
  const early={...foodSample,inspection:{...foodSample.inspection,dishes:[
    foodSample.inspection.dishes[0],{dishId:'canh',takenAt:'2026-11-23T09:09'}]}};
  assert.throws(()=>verifySamplesBeforeDispatch(early,processing,dispatchAt),/sau khi chế biến/);
});
test('one sample per prepared dish must be present',()=>{
  const missing={...foodSample,inspection:{...foodSample.inspection,dishes:[foodSample.inspection.dishes[0]]}};
  assert.throws(()=>verifySamplesBeforeDispatch(missing,processing,dispatchAt),/chưa khớp/);
});
test('explicit below-30-servings exemption can dispatch without samples',()=>{
  const exempt={status:'reported',inspection:{kind:'food_sample',isPass:true,notApplicable:true,
    reason:'Thực đơn được duyệt 20 suất',dishes:[]}};
  assert.doesNotThrow(()=>verifySamplesBeforeDispatch(exempt,processing,dispatchAt));
  assert.throws(()=>verifySamplesBeforeDispatch({status:'reported',inspection:{...exempt.inspection,reason:''}},processing,dispatchAt),/miễn lưu mẫu/);
});
