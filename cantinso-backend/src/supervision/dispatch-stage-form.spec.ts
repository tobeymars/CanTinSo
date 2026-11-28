import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateDispatchStageReport } from './dispatch-stage-form';
const photo='data:image/png;base64,iVBORw0KGgo=';
const dishes=[{id:'item-a',name:'Thịt kho'},{id:'item-b',name:'Canh rau'}];
const good=()=>({
 dispatchTime:'10:30',handlerName:'Nhân viên bếp',deliveryPerson:'Nhân viên giao hàng',
 transportUnit:'Xe vận chuyển thực phẩm',actualServings:100,packaging:'PASS',sensory:'PASS',
 dishChecks:[{dishId:'item-a',status:'PASS',servings:100},{dishId:'item-b',status:'PASS',servings:100}],
 photo,discrepancyNote:''
});
test('approved menu dispatch stores each dish, actual counts and handover parties',()=>{
 const r=validateDispatchStageReport(good(),dishes,100);
 assert.equal(r.hasIssue,false);
 assert.equal(r.dishChecks[1].name,'Canh rau');
 assert.equal(r.dispatchTime,'10:30');
 assert.equal(r.actualServings,100);
});
test('cannot submit empty or duplicate dishes',()=>{
 assert.throws(()=>validateDispatchStageReport({...good(),dishChecks:[good().dishChecks[0],good().dishChecks[0]]},dishes,100),/lặp/);
 assert.throws(()=>validateDispatchStageReport({...good(),dishChecks:[]},dishes,100),/đối chiếu đủ/);
});
test('detects short actual counts and requires detailed treatment note',()=>{
 assert.throws(()=>validateDispatchStageReport({...good(),actualServings:95},dishes,100),/sai lệch/);
 const result=validateDispatchStageReport({...good(),actualServings:95,discrepancyNote:'Đã ngừng bàn giao để kiểm đếm lại.'},dishes,100);
 assert.equal(result.hasIssue,true);
});
test('photo and transport handover are mandatory',()=>{
 assert.throws(()=>validateDispatchStageReport({...good(),photo:''},dishes,100),/ảnh/);
 assert.throws(()=>validateDispatchStageReport({...good(),deliveryPerson:''},dishes,100),/người nhận/);
 assert.throws(()=>validateDispatchStageReport({...good(),dispatchTime:'25:00'},dishes,100),/HH:mm/);
});
test('cannot report dispatch without approved dish quantities',()=>{
 assert.throws(()=>validateDispatchStageReport(good(),[],0),/thực đơn được duyệt/);
});
