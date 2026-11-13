import { describe, expect, it } from 'vitest'
import { allocateFefo, checkTransfer, completeTransfer, describeLines, sourceAvailability, transferLines, TransferRejected } from './warehouse-transfer'
import type { TransferDraftLine, TransferStockLot, TransferStockRow, TransferVoucher } from './warehouse-transfer'

const A='Canteen Trường Học A';const B='Canteen Trường Học B'
const row=(id:string,code:string,name:string,warehouse:string,quantity:number,unit:string,unitCost:number,reserved=0):TransferStockRow=>({id,code,name,warehouse,quantity,reserved,minimum:0,unitCost,unit})
const lot=(id:string,number:string,productId:string,remaining:number,expiresAt:string,status:TransferStockLot['status']='active',unitCost?:number):TransferStockLot=>({id,number,productId,warehouse:A,manufacturedAt:'2026-10-01',expiresAt,remaining,status,...(unitCost===undefined?{}:{unitCost})})
// Thịt heo tại kho A: 30 kg, 5 kg thuộc lô hết hạn, 3 kg đã giữ chỗ → khả dụng 22 kg
const stock={
 products:[row('pork-a','TH','Thịt heo',A,30,'kg',100000,3),row('rice-a','GAO','Gạo',A,50,'kg',20000),row('oil-a','DAU','Dầu ăn',A,8,'lít',45000),row('bread-a','BM','Bánh mì',A,120,'cái',5000),row('pork-b','TH','Thịt heo',B,2,'kg',100000)],
 lots:[lot('lo-0','LO-000','pork-a',5,'2026-10-15','expired'),lot('lo-1','LO-001','pork-a',10,'2026-10-30','expiring'),lot('lo-2','LO-002','pork-a',15,'2026-11-05','active',98000),lot('lo-r','LO-R01','rice-a',50,'2027-03-01')],
}
const line=(id:string,productId:string,quantity:number,lotId:string|null=null):TransferDraftLine=>({id,productId,lotId,quantity})
const voucher=(lines:TransferDraftLine[],patch:Partial<TransferVoucher>={}):TransferVoucher=>({id:'t1',number:'CK000002',date:'2026-10-27T09:00',from:A,to:B,creator:'Admin DEMO',status:'draft',total:0,version:1,lines:describeLines(stock,lines),...patch})
let seq=0;const newId=()=>`new-${++seq}`
const codes=(lines:TransferDraftLine[],from=A,to=B)=>checkTransfer(stock,{from,to},lines).errors.map(error=>error.code)

describe('source availability',()=>{
 it('excludes expired lots and reservations, lists lots FEFO',()=>{
  const pork=sourceAvailability(stock,'pork-a')!
  expect(pork).toMatchObject({onHand:30,expired:5,reserved:3,available:22,untracked:0,unit:'kg'})
  expect(pork.lots.map(option=>[option.lot.number,option.transferable])).toEqual([['LO-001',true],['LO-002',true],['LO-000',false]])
 })
})

describe('checking a transfer',()=>{
 it('accepts one product, or many products with different units in a single voucher',()=>{
  expect(codes([line('1','oil-a',5)])).toEqual([])
  expect(codes([line('1','pork-a',10,'lo-1'),line('2','rice-a',50,'lo-r'),line('3','oil-a',5),line('4','bread-a',100)])).toEqual([])
 })
 it('reports the available quantity when the product total exceeds it',()=>{
  const {errors}=checkTransfer(stock,{from:A,to:B},[line('1','pork-a',10,'lo-1'),line('2','pork-a',15,'lo-2')])
  expect(errors).toEqual([{code:'AVAILABLE_EXCEEDED',message:'Số lượng chuyển vượt tồn khả dụng (22 kg).',lineIds:['1','2']}])
 })
 it('sums lines that reuse the same lot before comparing with the lot balance',()=>{
  expect(checkTransfer(stock,{from:A,to:B},[line('1','pork-a',6,'lo-1'),line('2','pork-a',6,'lo-1')]).errors).toEqual([{code:'LOT_EXCEEDED',message:'Số lượng chuyển từ lô LO-001 vượt tồn của lô (10 kg).',lineIds:['1','2']}])
 })
 it('blocks expired lots, missing lots on lot-managed goods and same-warehouse transfers; warns on expiring lots',()=>{
  expect(codes([line('1','pork-a',1,'lo-0')])).toEqual(['LOT_EXPIRED'])
  expect(codes([line('1','pork-a',1)])).toEqual(['LOT_REQUIRED'])
  expect(codes([line('1','oil-a',1)],A,A)).toEqual(['SAME_WAREHOUSE'])
  expect(codes([])).toEqual(['NO_LINES'])
  expect(codes([line('1','oil-a',0)])).toEqual(['QUANTITY_INVALID'])
  expect(checkTransfer(stock,{from:A,to:B},[line('1','pork-a',2,'lo-1')]).warnings.map(warning=>warning.message)).toEqual(['Lô LO-001 sắp hết hạn (HSD 30/10/2026).'])
 })
 it('rejects lines left over from a previous source warehouse',()=>{
  expect(codes([line('1','pork-a',1,'lo-1')],B,A)).toEqual(['PRODUCT_NOT_IN_SOURCE'])
 })
})

describe('FEFO allocation',()=>{
 it('splits 15 kg into 10 kg of LO-001 and 5 kg of LO-002',()=>{
  expect(allocateFefo(stock,[line('1','pork-a',15)],newId).map(item=>[item.lotId,item.quantity])).toEqual([['lo-1',10],['lo-2',5]])
 })
 it('never changes lots chosen by hand and allocates around them',()=>{
  const manual=line('m','pork-a',4,'lo-1')
  const result=allocateFefo(stock,[manual,line('1','pork-a',15)],newId)
  expect(result[0]).toBe(manual)
  expect(result.slice(1).map(item=>[item.lotId,item.quantity])).toEqual([['lo-1',6],['lo-2',9]])
 })
 it('leaves an unallocated remainder visible for validation instead of hiding it',()=>{
  const result=allocateFefo(stock,[line('1','pork-a',40)],newId)
  expect(result.map(item=>[item.lotId,item.quantity])).toEqual([['lo-1',10],['lo-2',15],[null,15]])
  expect(checkTransfer(stock,{from:A,to:B},result).errors.map(error=>error.code)).toEqual(['LOT_REQUIRED','AVAILABLE_EXCEEDED'])
 })
})

describe('completing a transfer',()=>{
 it('moves several products and lots in one voucher and updates both warehouses',()=>{
  const draft=voucher([line('1','pork-a',10,'lo-1'),line('2','pork-a',5,'lo-2'),line('3','oil-a',5),line('4','bread-a',100)])
  const result=completeTransfer(stock,draft,{now:'2026-10-27T09:05',newId})
  const quantity=(warehouse:string,code:string)=>result.products.find(item=>item.warehouse===warehouse&&item.code===code)?.quantity
  expect([quantity(A,'TH'),quantity(B,'TH'),quantity(A,'DAU'),quantity(B,'DAU'),quantity(A,'BM'),quantity(B,'BM')]).toEqual([15,17,3,5,20,100])
  const moved=result.lots.filter(item=>item.warehouse===B)
  expect(moved.map(item=>[item.number,item.remaining,item.expiresAt,item.originLotId,item.productId])).toEqual([['LO-001',10,'2026-10-30','lo-1','pork-b'],['LO-002',5,'2026-11-05','lo-2','pork-b']])
  expect(result.lots.find(item=>item.id==='lo-1')?.remaining).toBe(0)
  expect(result.voucher).toMatchObject({status:'completed',completedAt:'2026-10-27T09:05',version:2,total:10*100000+5*98000+5*45000+100*5000})
  expect(result.voucher.lines!.map(item=>[item.lotNumber,item.unitCost])).toEqual([['LO-001',100000],['LO-002',98000],[null,45000],[null,5000]])
 })
 it('keeps the lot cost and ignores amounts sent by the client',()=>{
  const draft=voucher([line('1','pork-a',5,'lo-2')]);draft.lines=draft.lines!.map(item=>({...item,unitCost:1,amount:1}));draft.total=1
  const result=completeTransfer(stock,draft,{now:'t',newId})
  expect(result.voucher.total).toBe(490000)
  expect(result.lots.find(item=>item.warehouse===B&&item.number==='LO-002')?.unitCost).toBe(98000)
 })
 it('is all-or-nothing: one invalid line rejects the whole voucher and leaves stock untouched',()=>{
  const before=JSON.stringify(stock)
  expect(()=>completeTransfer(stock,voucher([line('1','oil-a',5),line('2','pork-a',1,'lo-0')]),{now:'t',newId})).toThrow(TransferRejected)
  expect(JSON.stringify(stock)).toBe(before)
 })
 it('cannot be completed twice',()=>{
  const {voucher:done}=completeTransfer(stock,voucher([line('1','oil-a',5)]),{now:'t',newId})
  expect(()=>completeTransfer(stock,done,{now:'t',newId})).toThrowError(/đã hoàn thành/)
 })
 it('re-checks against the latest stock so two people cannot overdraw one lot',()=>{
  const first=voucher([line('1','pork-a',10,'lo-2')],{id:'t1'});const second=voucher([line('1','pork-a',10,'lo-2')],{id:'t2'})
  expect(checkTransfer(stock,second,transferLines(second)).errors).toEqual([])
  const afterFirst=completeTransfer(stock,first,{now:'t',newId})
  try{completeTransfer(afterFirst,second,{now:'t',newId});expect.unreachable()}catch(error){expect((error as TransferRejected).problems.map(item=>item.code)).toEqual(['LOT_EXCEEDED'])}
  expect(afterFirst.lots.every(item=>item.remaining>=0)).toBe(true)
 })
 it('still reads single-line vouchers saved by the old form',()=>{
  const legacy:TransferVoucher={id:'old',number:'CK000009',date:'2026-10-20T09:00',from:A,to:B,creator:'Admin',status:'draft',total:0,productId:'oil-a',quantity:2}
  expect(completeTransfer(stock,legacy,{now:'t',newId}).voucher.lines!.map(item=>[item.productCode,item.quantity])).toEqual([['DAU',2]])
 })
})
