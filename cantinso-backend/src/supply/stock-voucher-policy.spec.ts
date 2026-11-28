import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateStockEvidence,validateStockInspection} from './stock-voucher-policy';

const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,0]).toString('base64');
const pdf=Buffer.from('%PDF-1.4\n123456789').toString('base64');
const receiptFiles=()=>[
 {category:'DELIVERY_NOTE',filename:'giao.pdf',mimeType:'application/pdf',base64:pdf},
 {category:'LOT_PHOTO',filename:'lo.jpg',mimeType:'image/jpeg',base64:jpeg},
];
const inspection=()=>({
 inspector:'Nhân viên kho',counterparty:'Người bàn giao',location:'Khu kiểm nhận',
 documentNumber:'PN-001',actualTime:'08:30',temperatureC:'',documents:'PASS',
 packaging:'PASS',sensory:'PASS',transport:'PASS',quantity:'PASS',weighing:'PASS',remarks:'',
});
test('verified receipt includes source document and lot photo with content hashes',()=>{
 const files=validateStockEvidence(receiptFiles(),'RECEIPT');
 assert.equal(files.length,2);assert.equal(files[0].sha256.length,64);
});
test('reject missing required stock evidence',()=>{
 assert.throws(()=>validateStockEvidence([receiptFiles()[0]],'RECEIPT'),/2 đến 8/);
 assert.throws(()=>validateStockEvidence([{...receiptFiles()[0],category:'OTHER'},receiptFiles()[1]],'RECEIPT'),/DELIVERY_NOTE/);
});
test('reject MIME spoofing and corrupted base64',()=>{
 assert.throws(()=>validateStockEvidence([{...receiptFiles()[0],mimeType:'image/png'},receiptFiles()[1]],'RECEIPT'),/định dạng/);
 assert.throws(()=>validateStockEvidence([{...receiptFiles()[0],base64:'%%%bad'},receiptFiles()[1]],'RECEIPT'),/base64/);
});
test('reject issue without weigh and item photos',()=>{
 assert.throws(()=>validateStockEvidence(receiptFiles(),'ISSUE'),/ISSUE_PHOTO/);
});
test('passing receiving inspection records only verified checks',()=>{
 const res=validateStockInspection(inspection(),'RECEIPT');
 assert.equal(res.checks.documents,'PASS');
});
test('cannot accept unchecked or failed receiving conditions',()=>{
 assert.throws(()=>validateStockInspection({...inspection(),sensory:'PENDING'},'RECEIPT'),/sensory/);
});
test('cannot issue without actual weighing',()=>{
 assert.throws(()=>validateStockInspection({...inspection(),weighing:'PENDING'},'ISSUE'),/weighing/);
});
test('reject invalid time and non numeric measured temperature',()=>{
 assert.throws(()=>validateStockInspection({...inspection(),actualTime:'99:99'},'RECEIPT'),/HH:mm/);
 assert.throws(()=>validateStockInspection({...inspection(),temperatureC:'bad'},'RECEIPT'),/Nhiệt độ/);
});

test('return requires photo of unused stock and weighing proof',()=>{
 const files=[
  {category:'RETURN_PHOTO',filename:'return.jpg',mimeType:'image/jpeg',base64:jpeg},
  {category:'SCALE_PHOTO',filename:'scale.jpg',mimeType:'image/jpeg',base64:jpeg},
 ];
 const valid=validateStockEvidence(files,'RETURN');
 assert.equal(valid.length,2);
 assert.throws(()=>validateStockEvidence(receiptFiles(),'RETURN'),/RETURN_PHOTO/);
});
test('return inspection must verify storage and safe handling',()=>{
 assert.throws(()=>validateStockInspection({...inspection(),transport:'PENDING'},'RETURN'),/transport/);
 assert.equal(validateStockInspection(inspection(),'RETURN').checks.transport,'PASS');
});
