import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canonicalQuantity, unitOptions } from './quantity-units';

test('kilograms entered for grams-based ingredient are converted before stock write',()=>{
  assert.equal(canonicalQuantity(5,'kg','g').quantity,5000);
  assert.equal(canonicalQuantity(0.5,'kg','g').quantity,500);
});
test('grams entered for kg-based ingredient normalize to decimal stock quantity',()=>{
  assert.equal(canonicalQuantity(500,'g','kg').quantity,0.5);
  assert.equal(canonicalQuantity(1,'g','kg').quantity,0.001);
});
test('litres and millilitres convert without a density assumption',()=>{
  assert.equal(canonicalQuantity(1.5,'lít','ml').quantity,1500);
  assert.equal(canonicalQuantity(500,'ml','lít').quantity,0.5);
});
test('units of different physical dimensions do not convert',()=>{
  assert.throws(()=>canonicalQuantity(5,'kg','lít'));
  assert.throws(()=>canonicalQuantity(1,'chai','kg'));
  assert.throws(()=>canonicalQuantity(2,'chai','hộp'));
});
test('counted goods preserve their exact label and quantities',()=>{
  assert.equal(canonicalQuantity(12,'chai','chai').quantity,12);
  assert.throws(()=>canonicalQuantity(0.5,'chai','chai'));
  assert.deepEqual(unitOptions('hộp'),['hộp']);
});
test('stored canonical precision cannot silently round',()=>{
  assert.throws(()=>canonicalQuantity(0.1,'g','kg')); // 0.0001kg is beyond 3 decimals
  assert.throws(()=>canonicalQuantity(0.0000001,'kg','g'));
});
test('minimum stock may be zero to disable an alert',()=>{
  assert.equal(canonicalQuantity(0,'g','kg',{allowZero:true}).quantity,0);
  assert.throws(()=>canonicalQuantity(0,'g','kg'));
});
test('purchase amount is based on entered purchase unit, not canonical quantity',()=>{
  const entry=canonicalQuantity(2,'kg','g');
  const pricePerKg=100000;
  assert.equal(entry.enteredQuantity*pricePerKg,200000);
  assert.equal(entry.quantity,2000);
  assert.equal(200000/entry.quantity,100); // VND per canonical g
});
