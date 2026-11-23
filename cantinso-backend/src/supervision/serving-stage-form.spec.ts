import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateServingStageReport} from './serving-stage-form';

const dishes=[{id:'a',name:'Cơm'},{id:'b',name:'Canh'}];
const form=()=>({actualServings:100,occurredAt:'11:00',handlerName:'Nhân viên bếp',
 sanitaryCondition:'PASS',servingAreaChecked:true,discrepancyNote:'',
 dishChecks:[{dishId:'a',status:'PASS'},{dishId:'b',status:'PASS'}]});
const check=(body:any,stage:'PLATED'|'READY'='PLATED')=>
 validateServingStageReport(body,stage,dishes,100,'2026-11-20');
test('valid plated report',()=>assert.equal(check(form()).actualServings,100));
test('valid ready report with area confirmation',()=>assert.equal(check(form(),'READY').sanitaryCondition,'PASS'));
test('missing dish is rejected',()=>assert.throws(()=>check({...form(),dishChecks:[]}),/đầy đủ/));
test('plating discrepancy requires note',()=>assert.throws(()=>check({...form(),actualServings:99}),/hướng xử lý/));
test('plating discrepancy can be logged with handling',()=>assert.equal(check({...form(),actualServings:99,discrepancyNote:'Đang xử lý thiếu 1 suất ăn'}).actualServings,99));
test('ready is blocked with outstanding issues',()=>assert.throws(()=>check({...form(),sanitaryCondition:'ISSUE',discrepancyNote:'Đang xử lý khu vực phục vụ'},'READY'),/Chưa xử lý/));
test('ready requires area confirmation',()=>assert.throws(()=>check({...form(),servingAreaChecked:false},'READY'),/kiểm tra/));
test('cannot report a future timestamp',()=>assert.throws(()=>check({...form(),occurredAt:'bad'}),/HH:mm/));
