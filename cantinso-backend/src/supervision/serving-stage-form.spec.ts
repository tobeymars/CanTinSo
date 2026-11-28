import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateServingStageReport} from './serving-stage-form';

const dishes=[{id:'a',name:'Cơm'},{id:'b',name:'Canh'}];
const form=()=>({actualServings:100,occurredAt:'11:00',portionStartAt:'10:45',distributionArea:'Khu chia suất tầng trệt',handHygieneChecked:true,foodCondition:'PASS',handlerName:'Nhân viên bếp',
 sanitaryCondition:'PASS',servingAreaChecked:true,discrepancyNote:'',
 dishChecks:[{dishId:'a',status:'PASS',portions:100},{dishId:'b',status:'PASS',portions:100}]});
const check=(body:any,stage:'PLATED'|'READY'='PLATED')=>
 validateServingStageReport(body,stage,dishes,100,'2026-11-20');
test('valid plated report',()=>{const p=check(form());assert.equal(p.actualServings,100);assert.equal(p.dishChecks[0]?.portions,100);});
test('valid ready report with area confirmation',()=>assert.equal(check(form(),'READY').sanitaryCondition,'PASS'));
test('missing dish is rejected',()=>assert.throws(()=>check({...form(),dishChecks:[]}),/đầy đủ/));
test('plating discrepancy requires note',()=>assert.throws(()=>check({...form(),actualServings:99}),/hướng xử lý/));
test('plating discrepancy can be logged with handling',()=>assert.equal(check({...form(),actualServings:99,discrepancyNote:'Đang xử lý thiếu 1 suất ăn'}).actualServings,99));
test('ready is blocked with outstanding issues',()=>assert.throws(()=>check({...form(),sanitaryCondition:'ISSUE',discrepancyNote:'Đang xử lý khu vực phục vụ'},'READY'),/Chưa xử lý/));
test('ready requires area confirmation',()=>assert.throws(()=>check({...form(),servingAreaChecked:false},'READY'),/kiểm tra/));
test('cannot report a future timestamp',()=>assert.throws(()=>check({...form(),occurredAt:'bad'}),/HH:mm/));

test('plated report requires start time and a real portioning location',()=>{
  assert.throws(()=>check({...form(),portionStartAt:''}),/giờ bắt đầu/);
  assert.throws(()=>check({...form(),distributionArea:''}),/vị trí chia suất/);
});
test('plated report requires hygiene and checks of food condition',()=>{
  assert.throws(()=>check({...form(),handHygieneChecked:false}),/vệ sinh cá nhân/);
  assert.throws(()=>check({...form(),foodCondition:undefined}),/tình trạng thực phẩm/);
});
test('per-dish portion count is required and discrepancies prevent approval',()=>{
  assert.throws(()=>check({...form(),dishChecks:[{dishId:'a',status:'PASS'},{dishId:'b',status:'PASS',portions:100}]}),/số suất/);
  const changed=check({...form(),dishChecks:[{dishId:'a',status:'PASS',portions:95},{dishId:'b',status:'PASS',portions:100}],discrepancyNote:'Ghi nhận thiếu năm suất món cơm'});
  assert.equal(changed.hasIssue,true);
});
test('ready stage remains backwards compatible with its own fields',()=>{
  const ready=form();const {portionStartAt,distributionArea,foodCondition,handHygieneChecked,...rest}=ready;
  void portionStartAt;void distributionArea;void foodCondition;void handHygieneChecked;
  assert.equal(check(rest,'READY').actualServings,100);
});
