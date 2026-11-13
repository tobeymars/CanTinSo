import { describe, expect, it } from 'vitest'
import { completeTransferInLedger, LEDGER_KEY, nextTransferNumber, readLedger, saveTransferDraft } from './warehouse-ledger'
import type { KeyValueStorage, WarehouseLedger } from './warehouse-ledger'
import { describeLines } from './warehouse-transfer'
import type { TransferVoucher } from './warehouse-transfer'

const A='Canteen Trường Học A';const B='Canteen Trường Học B'
const seed=():WarehouseLedger=>({version:0,
 products:[{id:'pork-a',code:'TH',name:'Thịt heo',warehouse:A,quantity:30,reserved:0,minimum:0,unitCost:100000,unit:'kg'},{id:'oil-a',code:'DAU',name:'Dầu ăn',warehouse:A,quantity:8,reserved:0,minimum:0,unitCost:45000,unit:'lít'}],
 lots:[{id:'lo-2',number:'LO-002',productId:'pork-a',warehouse:A,manufacturedAt:'2026-10-01',expiresAt:'2026-11-05',remaining:30,status:'active'}],
 transfers:[{id:'old',number:'CK000001',date:'2026-10-18T09:15',from:'Kho Chi Nhánh',to:A,creator:'Admin',status:'completed',total:560000,productId:'x',quantity:20}]})
function memory(fail=false){const map=new Map<string,string>();let writes=0;const storage:KeyValueStorage={getItem:key=>map.get(key)??null,setItem:(key,value)=>{if(fail)throw new Error('quota');writes++;map.set(key,value)}};return {storage,writes:()=>writes,raw:()=>map.get(LEDGER_KEY)}}
const draft=(lines:{id:string;productId:string;lotId:string|null;quantity:number}[],patch:Partial<TransferVoucher>={}):TransferVoucher=>({id:'t1',number:'',date:'2026-10-27T09:00',from:A,to:B,creator:'Admin DEMO',status:'draft',total:0,lines:describeLines(seed(),lines),...patch})
let seq=0;const options={now:'2026-10-27T09:05',newId:()=>`id-${++seq}`}
const stockOf=(ledger:WarehouseLedger,warehouse:string,code:string)=>ledger.products.find(item=>item.warehouse===warehouse&&item.code===code)?.quantity

describe('warehouse ledger',()=>{
 it('numbers vouchers from the ledger and saves drafts without touching stock',()=>{
  const {storage}=memory()
  const saved=saveTransferDraft(storage,seed,draft([{id:'1',productId:'oil-a',lotId:null,quantity:5}]))
  expect(saved.ok&&saved.voucher).toMatchObject({number:'CK000002',status:'draft',version:1})
  const ledger=readLedger(storage,seed)
  expect(ledger.products).toEqual(seed().products);expect(ledger.lots).toEqual(seed().lots)
  expect(nextTransferNumber(ledger.transfers)).toBe('CK000003')
 })
 it('rejects saving over a draft that changed elsewhere',()=>{
  const {storage}=memory()
  const first=saveTransferDraft(storage,seed,draft([{id:'1',productId:'oil-a',lotId:null,quantity:5}]));if(!first.ok)throw new Error('setup')
  expect(saveTransferDraft(storage,seed,{...first.voucher,description:'Bản A'}).ok).toBe(true)
  const stale=saveTransferDraft(storage,seed,{...first.voucher,description:'Bản B'})
  expect(stale.ok?null:stale.problems[0]!.code).toBe('VERSION_CONFLICT')
 })
 it('posts both warehouses and closes the voucher in a single write',()=>{
  const {storage,writes}=memory()
  const result=completeTransferInLedger(storage,seed,draft([{id:'1',productId:'pork-a',lotId:'lo-2',quantity:10},{id:'2',productId:'oil-a',lotId:null,quantity:5}]),options)
  expect(result.ok).toBe(true);expect(writes()).toBe(1)
  const ledger=readLedger(storage,seed)
  expect([stockOf(ledger,A,'TH'),stockOf(ledger,B,'TH'),stockOf(ledger,A,'DAU'),stockOf(ledger,B,'DAU')]).toEqual([20,10,3,5])
  expect(ledger.transfers[0]).toMatchObject({number:'CK000002',status:'completed',total:1225000})
 })
 it('does not deduct stock twice when completion is submitted again',()=>{
  const {storage}=memory()
  const voucher=draft([{id:'1',productId:'oil-a',lotId:null,quantity:5}])
  expect(completeTransferInLedger(storage,seed,voucher,options).ok).toBe(true)
  const again=completeTransferInLedger(storage,seed,voucher,options)
  expect(again.ok?null:again.problems[0]!.code).toBe('ALREADY_COMPLETED')
  expect(stockOf(readLedger(storage,seed),A,'DAU')).toBe(3)
 })
 it('re-reads the latest stock so a second person cannot overdraw the same lot',()=>{
  const {storage}=memory()
  const mine=draft([{id:'1',productId:'pork-a',lotId:'lo-2',quantity:20}],{id:'mine'});const theirs=draft([{id:'1',productId:'pork-a',lotId:'lo-2',quantity:20}],{id:'theirs'})
  expect(completeTransferInLedger(storage,seed,mine,options).ok).toBe(true)
  const late=completeTransferInLedger(storage,seed,theirs,options)
  expect(late.ok?null:late.problems.map(problem=>problem.code)).toEqual(['LOT_EXCEEDED','AVAILABLE_EXCEEDED'])
  const ledger=readLedger(storage,seed)
  expect(ledger.lots.every(lot=>lot.remaining>=0)&&ledger.products.every(item=>item.quantity>=0)).toBe(true)
  expect(ledger.transfers.find(item=>item.id==='theirs')).toBeUndefined()
 })
 it('changes nothing when one line is invalid or storage refuses the write',()=>{
  const {storage,raw}=memory()
  const invalid=completeTransferInLedger(storage,seed,draft([{id:'1',productId:'oil-a',lotId:null,quantity:5},{id:'2',productId:'oil-a',lotId:null,quantity:9}]),options)
  expect(invalid.ok).toBe(false);expect(raw()).toBeUndefined()
  const broken=memory(true)
  const failed=completeTransferInLedger(broken.storage,seed,draft([{id:'1',productId:'oil-a',lotId:null,quantity:5}]),options)
  expect(failed.ok?null:failed.problems[0]!.code).toBe('STORAGE_FAILED')
 })
 it('falls back to seed data when stored data is corrupt',()=>{
  const {storage}=memory();storage.setItem(LEDGER_KEY,'{"version":"x"}')
  expect(readLedger(storage,seed)).toEqual(seed())
 })
})
