import { describe, expect, it } from 'vitest'
import { isAdjustment, lotState, productMovements, sortLots, totalBalances, warehouseBalances } from './stock-detail'
import type { StockLot, StockRow } from './stock-detail'

const row=(patch:Partial<StockRow>={}):StockRow=>({id:'p1',code:'HH1',warehouse:'Kho A',quantity:50,reserved:0,minimum:10,unitCost:1000,unit:'kg',...patch})
const lot=(patch:Partial<StockLot>={}):StockLot=>({id:'l1',number:'LO-1',productId:'p1',warehouse:'Kho A',manufacturedAt:'2026-09-01',expiresAt:'2027-01-01',remaining:10,status:'active',...patch})

describe('lot state',()=>{
 it('marks empty lots as out of stock before looking at expiry',()=>{
  expect(lotState(lot({remaining:0,status:'expired'}))).toBe('out')
  expect(lotState(lot({remaining:0,status:'active'}))).toBe('out')
  expect(lotState(lot({remaining:5,status:'expired'}))).toBe('expired')
  expect(lotState(lot({remaining:5,status:'expiring'}))).toBe('expiring')
  expect(lotState(lot({remaining:5}))).toBe('available')
 })
})

describe('warehouse balances',()=>{
 it('excludes expired lots from availability and keeps untracked stock in the on-hand total',()=>{
  const [balance]=warehouseBalances([row({quantity:50,reserved:5})],[lot({remaining:12,status:'expired'}),lot({id:'l2',remaining:20})])
  expect(balance).toMatchObject({onHand:50,lotTracked:32,untracked:18,expired:12,availableBeforeReservation:38,reservedApplied:5,available:33,value:50000,belowMinimum:false})
 })
 it('never lets reservations push availability below zero or count twice',()=>{
  const [balance]=warehouseBalances([row({quantity:4,reserved:2,minimum:20})],[lot({remaining:4,status:'expired'})])
  expect(balance).toMatchObject({onHand:4,expired:4,availableBeforeReservation:0,reserved:2,reservedApplied:0,available:0,belowMinimum:true})
 })
 it('splits one product across warehouses, including stock that only exists as lots',()=>{
  const balances=warehouseBalances([row(),row({id:'p2',warehouse:'Kho B',quantity:8,reserved:1})],[lot({id:'l3',productId:'p2',warehouse:'Kho C',remaining:6})])
  expect(balances.map(item=>[item.warehouse,item.onHand,item.available])).toEqual([['Kho A',50,50],['Kho B',8,7],['Kho C',6,6]])
  expect(totalBalances(balances)).toMatchObject({onHand:64,available:63})
 })
 it('flags lots that exceed the book balance instead of hiding the gap',()=>{
  const [balance]=warehouseBalances([row({quantity:5})],[lot({remaining:9})])
  expect(balance).toMatchObject({onHand:9,untracked:0,lotsExceedBook:true})
 })
 it('ignores lots of other products',()=>{
  expect(warehouseBalances([row()],[lot({productId:'other',remaining:99,status:'expired'})])[0]).toMatchObject({expired:0,available:50})
 })
})

describe('lot ordering',()=>{
 const lots=[lot({id:'a',number:'A',expiresAt:'2026-12-01'}),lot({id:'b',number:'B',expiresAt:'2026-10-25',status:'expiring'}),lot({id:'c',number:'C',expiresAt:'2026-10-18',status:'expired'}),lot({id:'d',number:'D',remaining:0,expiresAt:'2026-10-20'}),lot({id:'e',number:'E',expiresAt:''})]
 it('puts usable lots first by expiry (FEFO), then expired, then empty ones',()=>expect(sortLots(lots).map(item=>item.number)).toEqual(['B','A','E','C','D']))
 it('can sort purely by expiry date, missing dates last',()=>expect(sortLots(lots,'expiry').map(item=>item.number)).toEqual(['C','D','B','A','E']))
})

describe('product movements',()=>{
 const documents={
  receipts:[{id:'r1',number:'NK1',date:'2026-10-20T08:00',warehouse:'Kho A',status:'completed',creator:'Lan',productId:'p1',quantity:10,kind:'Nhập hàng từ nhà cung cấp'},{id:'r2',number:'NK2',date:'2026-10-21T08:00',warehouse:'Kho A',status:'completed',productId:'p1',quantity:2,kind:'Nhập điều chỉnh',description:'Kiểm kê thừa'},{id:'r3',number:'NK3',date:'2026-10-22T08:00',warehouse:'Kho A',status:'completed'}],
  issues:[{id:'i1',number:'XK1',date:'2026-10-20T10:00',branch:'Kho A',status:'completed',productId:'p1',quantity:4,kind:'Xuất chế biến',description:'Bữa trưa'},{id:'i2',number:'XK2',date:'2026-10-23T10:00',branch:'Kho A',status:'draft',productId:'p1',quantity:9,kind:'Xuất sử dụng',description:''},{id:'i3',number:'XK3',date:'2026-10-24T10:00',branch:'Kho A',status:'completed',productId:'other',quantity:1,kind:'Xuất sử dụng',description:''}],
  transfers:[{id:'t1',number:'CK1',date:'2026-10-19T09:00',from:'Kho B',to:'Kho A',status:'completed',creator:'Admin',productId:'p1',quantity:3}],
 }
 const moves=productMovements(new Set(['p1']),documents)
 it('keeps only completed documents of this product, newest first, with signed quantities',()=>{
  expect(moves.map(move=>[move.document.number,move.quantity,move.warehouse])).toEqual([['NK2',2,'Kho A'],['XK1',-4,'Kho A'],['NK1',10,'Kho A'],['CK1',3,'Kho A'],['CK1',-3,'Kho B']])
 })
 it('separates adjustments from ordinary receipts and issues',()=>{
  expect(moves.filter(isAdjustment).map(move=>[move.document.number,move.label,move.reason])).toEqual([['NK2','Điều chỉnh tăng','Kiểm kê thừa']])
  expect(moves.find(move=>move.document.number==='NK1')?.kind).toBe('receipt')
 })
 it('does not invent actors or lots that the documents do not record',()=>{
  expect(moves.find(move=>move.document.number==='XK1')).toMatchObject({actor:null,lotNumber:null})
 })
 it('creates independent movements for matching lines of a multi-line receipt',()=>{
  const result=productMovements(new Set(['p1']),{receipts:[{id:'multi',number:'NK-MULTI',date:'2026-10-27T08:00',warehouse:'Kho A',status:'completed',kind:'RAW_MATERIALS',lines:[{id:'line-a',productId:'p1',baseQuantity:2,lotNumber:'LOT-A'},{id:'line-b',productId:'p2',baseQuantity:4,lotNumber:'LOT-B'}]}],issues:[],transfers:[]})
  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({id:'multi:line-a:in',label:'Nhập nguyên, nhiên liệu',quantity:2,lotNumber:'LOT-A'})
 })
})
