import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { vietnamServiceDate, validateSupervisionWriteDate } from './supervision-date-policy';

const vnMorning=new Date('2026-11-23T01:00:00.000Z');
const vnBeforeMidnight=new Date('2026-11-23T16:59:59.000Z');
const vnNextDay=new Date('2026-11-23T17:00:00.000Z');

test('Vietnam local service day uses UTC+7 calendar boundaries',()=>{
  assert.equal(vietnamServiceDate(vnMorning),'2026-11-23');
  assert.equal(vietnamServiceDate(vnBeforeMidnight),'2026-11-23');
  assert.equal(vietnamServiceDate(vnNextDay),'2026-11-24');
});
test('today can be reported without retrospective reason',()=>{
  assert.equal(validateSupervisionWriteDate('2026-11-23',{note:'Đã kiểm tra'},vnMorning),'');
});
test('future dates are view-only and cannot be submitted',()=>{
  assert.throws(()=>validateSupervisionWriteDate('2026-11-24',{note:'Duyệt trước',lateReason:'Có lý do đầy đủ'},vnMorning),/Ngày phục vụ chưa đến/);
});
test('past dates need a substantive reason',()=>{
  assert.throws(()=>validateSupervisionWriteDate('2026-11-22',{},vnMorning),/lý do bổ sung/);
  assert.throws(()=>validateSupervisionWriteDate('2026-11-22',{lateReason:'Quên'},vnMorning),/lý do bổ sung/);
  assert.equal(validateSupervisionWriteDate('2026-11-22',{lateReason:'  Bổ sung do chứng từ giao hàng đến muộn  '},vnMorning),'Bổ sung do chứng từ giao hàng đến muộn');
});
test('after midnight in Vietnam yesterday becomes historical',()=>{
  assert.throws(()=>validateSupervisionWriteDate('2026-11-23',{},vnNextDay),/lý do bổ sung/);
  assert.equal(validateSupervisionWriteDate('2026-11-24',{},vnNextDay),'');
});
