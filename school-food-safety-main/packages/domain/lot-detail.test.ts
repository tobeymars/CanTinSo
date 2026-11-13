import { describe, expect, it } from 'vitest'
import { lotAllocations, lotDocuments, lotExpiry, lotSerials, lotSummary, lotWarnings } from './lot-detail'
import type { LotDocuments, LotIssue, LotProductRow, LotReceipt, LotRecord, LotTransfer } from './lot-detail'

const TODAY='2026-10-27'
const products:LotProductRow[]=[{id:'p1',code:'HH1',warehouse:'Kho A',unit:'kg',unitCost:9000,reserved:2},{id:'p1b',code:'HH1',warehouse:'Kho B',unit:'kg',unitCost:9500,reserved:0},{id:'p2',code:'HH2',warehouse:'Kho A',unit:'kg',unitCost:1000}]
const lot=(patch:Partial<LotRecord>={}):LotRecord=>({id:'l1',number:'LO-1',productId:'p1',warehouse:'Kho A',manufacturedAt:'2026-10-01',expiresAt:'2027-01-01',remaining:6,status:'active',...patch})
const receipt=(patch:Partial<LotReceipt>={}):LotReceipt=>({id:'r1',number:'NK1',date:'2026-10-20T08:00',warehouse:'Kho A',status:'completed',creator:'Lan',supplier:'NCC Xanh',supplierId:'s1',kind:'RAW_MATERIALS',invoiceNumber:'HĐ-01',fileName:'hoa-don.pdf',lines:[{id:'a',productId:'p1',baseQuantity:10,lotNumber:'LO-1',amount:100000,serials:[]}],...patch})
const transfer=(patch:Partial<LotTransfer>={}):LotTransfer=>({id:'t1',number:'CK1',date:'2026-10-21T09:00',from:'Kho A',to:'Kho B',status:'completed',creator:'Minh',lines:[{id:'x',productId:'p1',lotId:'l1',quantity:4,destinationLotId:'l1b'}],...patch})
const issue=(patch:Partial<LotIssue>={}):LotIssue=>({id:'i1',number:'XK1',date:'2026-10-22T10:00',branch:'Kho B',status:'completed',creator:'Hòa',receiver:'Bếp B',kind:'Xuất chế biến',description:'Bữa trưa',productId:'p1b',quantity:1,lotId:'l1b',...patch})
const summarize=(lots:LotRecord[],documents:Partial<LotDocuments>,lotId='l1',warningDays=7)=>lotSummary({lotId,lots,products,documents:{receipts:[],issues:[],transfers:[],...documents},today:TODAY,warningDays})!

describe('lot identity',()=>{
 it('groups every warehouse copy of a lot by its origin id, not by a matching lot number',()=>{
  const lots=[lot(),lot({id:'l1b',productId:'p1b',warehouse:'Kho B',originLotId:'l1'}),lot({id:'other',productId:'p2'})]
  expect(lotAllocations(lots,'l1b').map(item=>item.id)).toEqual(['l1','l1b'])
  expect(lotAllocations(lots,'missing')).toEqual([])
 })
})

describe('lot ledger',()=>{
 const lots=[lot(),lot({id:'l1b',productId:'p1b',warehouse:'Kho B',originLotId:'l1',remaining:3})]
 const summary=summarize(lots,{receipts:[receipt()],transfers:[transfer()],issues:[issue()]})
 it('keeps the lot total when stock moves between warehouses and splits it correctly per warehouse',()=>{
  expect(summary).toMatchObject({initialQuantity:10,supplemental:0,issued:1,transferred:4,opening:0,onHand:9,expectedOnHand:9,consistent:true})
  expect(summary.balances.map(item=>[item.warehouse,item.inbound,item.outbound,item.onHand,item.available])).toEqual([['Kho A',10,4,6,6],['Kho B',4,1,3,3]])
 })
 it('lists movements newest first with running balance per warehouse and links both legs of a transfer',()=>{
  expect(summary.movements.map(move=>[move.label,move.document.number,move.warehouse,move.quantity,move.before,move.after])).toEqual([
   ['Xuất kho','XK1','Kho B',-1,4,3],['Chuyển kho đến','CK1','Kho B',4,0,4],['Chuyển kho đi','CK1','Kho A',-4,10,6],['Nhập kho','NK1','Kho A',10,0,10],
  ])
  const legs=summary.movements.filter(move=>move.document.number==='CK1')
  expect(new Set(legs.map(move=>move.pairKey)).size).toBe(1)
  expect(legs.every(move=>move.source==='Kho A'&&move.destination==='Kho B')).toBe(true)
 })
 it('takes the lot cost from the receipt line, never from a sale price',()=>{
  expect(summary).toMatchObject({unitCost:10000,costSource:'receipt',value:90000,initialValue:100000})
  expect(summary.balances[0]).toMatchObject({productUnitCost:9000,productReserved:2})
 })
 it('prefers a cost recorded on the lot itself',()=>{
  expect(summarize([lot({unitCost:12000,remaining:10})],{receipts:[receipt()]})).toMatchObject({unitCost:12000,costSource:'lot',value:120000})
 })
 it('ignores drafts, documents of other lots or products, and issues that do not record a lot',()=>{
  const noise={
   receipts:[receipt(),receipt({id:'r2',number:'NK2',status:'draft'}),receipt({id:'r3',number:'NK3',lines:[{productId:'p2',baseQuantity:5,lotNumber:'LO-1'}]})],
   issues:[issue({id:'i2',number:'XK2',branch:'Kho A',productId:'p1',lotId:undefined,lotNumber:undefined,quantity:3}),issue({id:'i3',number:'XK3',status:'draft'})],
   transfers:[transfer({id:'t2',number:'CK2',status:'draft'}),transfer({id:'t3',number:'CK3',lines:undefined})],
  }
  const result=summarize([lot({remaining:10})],noise)
  expect(result.movements.map(move=>move.document.number)).toEqual(['NK1'])
  expect(result.consistent).toBe(true)
 })
 it('matches legacy issues by lot number and product code, case-insensitively',()=>{
  const result=summarize([lot({remaining:7})],{receipts:[receipt()],issues:[issue({branch:'Kho A',productId:'p1',lotId:undefined,lotNumber:' lo-1 ',quantity:3})]})
  expect(result).toMatchObject({issued:3,onHand:7,consistent:true})
 })
 it('separates supplemental receipts and stock-count adjustments from the original receipt',()=>{
  const result=summarize([lot({remaining:14})],{receipts:[receipt(),receipt({id:'r2',number:'NK2',date:'2026-10-23T08:00',lines:[{productId:'p1',baseQuantity:5,lotNumber:'LO-1',amount:50000}]}),receipt({id:'r3',number:'NK3',date:'2026-10-24T08:00',kind:'ADJUSTMENT',supplier:'',lines:[{productId:'p1',baseQuantity:1,lotNumber:'LO-1'}]})],issues:[issue({id:'i4',number:'XK4',date:'2026-10-25T08:00',branch:'Kho A',productId:'p1',lotId:'l1',kind:'Xuất điều chỉnh',quantity:2})]})
  expect(result).toMatchObject({initialQuantity:10,supplemental:5,adjustmentIn:1,adjustmentOut:2,expectedOnHand:14,consistent:true})
  expect(result.movements.map(move=>move.label)).toEqual(['Điều chỉnh giảm','Điều chỉnh tăng','Nhập bổ sung','Nhập kho'])
  expect(result.sources.map(source=>source.receipt.number)).toEqual(['NK1','NK2'])
 })
})

describe('opening balance and reconciliation',()=>{
 it('labels stock without any receipt as undocumented opening balance instead of inventing a receipt',()=>{
  const result=summarize([lot({remaining:12})],{})
  expect(result).toMatchObject({initialQuantity:null,opening:12,onHand:12,expectedOnHand:12,consistent:true,unitCost:null,value:null})
  expect(lotWarnings(result,{unit:'kg',requiresDates:true}).map(item=>item.code)).toEqual(['MISSING_ORIGIN'])
 })
 it('starts the running balance from the opening balance when only outflows are documented',()=>{
  const result=summarize([lot({remaining:8})],{issues:[issue({branch:'Kho A',productId:'p1',lotId:'l1',quantity:4})]})
  expect(result).toMatchObject({opening:12,issued:4,consistent:true})
  expect(result.movements[0]).toMatchObject({before:12,after:8})
 })
 it('flags a lot whose book quantity does not match its documents',()=>{
  const result=summarize([lot({remaining:7})],{receipts:[receipt()]})
  expect(result.consistent).toBe(false)
  expect(result.balances[0]!.mismatch).toBe(-3)
  expect(lotWarnings(result,{unit:'kg',requiresDates:true}).find(item=>item.code==='INCONSISTENT')?.message).toContain('Kho A: sổ lô 7 kg, chứng từ cộng dồn 10 kg')
 })
 it('flags documented movements into a warehouse that holds no copy of the lot',()=>{
  const result=summarize([lot({remaining:6})],{receipts:[receipt()],transfers:[transfer()]})
  expect(result.balances.map(item=>[item.warehouse,item.onHand,item.mismatch])).toEqual([['Kho A',6,0],['Kho B',0,-4]])
  expect(result.consistent).toBe(false)
 })
})

describe('expiry',()=>{
 const at=(expiresAt:string|undefined,status:LotRecord['status']='active')=>lotExpiry({expiresAt,status},TODAY,7)
 it('derives the state from today and the configured warning window',()=>{
  expect(at('2026-10-26')).toMatchObject({state:'expired',daysLeft:-1})
  expect(at('2026-10-27')).toMatchObject({state:'expiring',daysLeft:0})
  expect(at('2026-11-03')).toMatchObject({state:'expiring',daysLeft:7})
  expect(at('2026-11-04')).toMatchObject({state:'valid',daysLeft:8})
  expect(at(undefined)).toMatchObject({state:'untracked',daysLeft:null,recordedMismatch:false})
  expect(lotExpiry({expiresAt:'2026-11-04',status:'active'},TODAY,10).state).toBe('expiring')
 })
 it('never relaxes a stricter flag on the lot book and reports stale flags',()=>{
  expect(at('2027-01-01','expired')).toMatchObject({state:'expired',computed:'valid',recordedMismatch:true})
  expect(at('2026-10-21','expiring')).toMatchObject({state:'expired',computed:'expired',recordedMismatch:true})
 })
 it('excludes expired stock from availability and warns about it',()=>{
  const result=summarize([lot({expiresAt:'2026-10-20',status:'expiring',remaining:5})],{})
  expect(result).toMatchObject({onHand:5,expired:5,available:0})
  expect(lotWarnings(result,{unit:'kg',requiresDates:true}).map(item=>item.code)).toEqual(['EXPIRED','NO_AVAILABLE','MISSING_ORIGIN','STATUS_STALE'])
 })
 it('reports out-of-stock lots and missing mandatory dates',()=>{
  const result=summarize([lot({remaining:0,manufacturedAt:'',expiresAt:''})],{})
  expect(lotWarnings(result,{unit:'kg',requiresDates:true}).map(item=>item.code)).toEqual(['OUT_OF_STOCK','MISSING_DATES','MISSING_ORIGIN'])
  expect(lotWarnings(result,{unit:'kg',requiresDates:false}).map(item=>item.code)).not.toContain('MISSING_DATES')
 })
})

describe('serials and documents',()=>{
 const withSerials=receipt({lines:[{productId:'p1',baseQuantity:2,lotNumber:'LO-1',serials:['SN-1','SN-2']}]})
 const elsewhere=receipt({id:'r9',number:'NK9',lines:[{productId:'p2',baseQuantity:1,lotNumber:'LO-9',serials:['sn-2']}]})
 it('lists serials recorded on the lot receipts and marks duplicates across the system',()=>{
  const result=summarize([lot({remaining:2})],{receipts:[withSerials]})
  expect(lotSerials(result,[withSerials,elsewhere]).map(item=>[item.serial,item.receiptNumber,item.duplicate])).toEqual([['SN-1','NK1',false],['SN-2','NK1',true]])
 })
 it('collects each related document once, including invoice and attachment metadata',()=>{
  const lots=[lot(),lot({id:'l1b',productId:'p1b',warehouse:'Kho B',originLotId:'l1',remaining:3})]
  const rows=lotDocuments(summarize(lots,{receipts:[receipt()],transfers:[transfer()],issues:[issue()]}))
  expect(rows.map(row=>[row.label,row.number])).toEqual([['Phiếu nhập kho','NK1'],['Phiếu chuyển kho','CK1'],['Phiếu xuất kho','XK1'],['Hóa đơn mua hàng','HĐ-01'],['File đính kèm','hoa-don.pdf']])
  expect(rows.find(row=>row.type==='attachment')).toMatchObject({document:null,status:'Chỉ lưu tên tệp, chưa tải lên máy chủ'})
 })
})
