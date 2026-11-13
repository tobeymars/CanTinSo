/**
 * Sổ kho DEMO lưu trong một khóa storage duy nhất: tồn theo kho, lô và phiếu chuyển kho.
 * Đóng vai backend của bản frontend: mỗi thao tác đọc lại bản mới nhất, kiểm tra lại, rồi ghi toàn bộ trong một lần `setItem`,
 * nên phiếu và biến động tồn luôn cùng được ghi hoặc cùng không. Không thay thế transaction/khóa của backend thật.
 */
import { completeTransfer, TransferRejected } from './warehouse-transfer'
import type { TransferProblem, TransferProblemCode, TransferStockLot, TransferStockRow, TransferVoucher } from './warehouse-transfer'

export type KeyValueStorage = { getItem(key:string):string|null; setItem(key:string,value:string):void }
export type WarehouseLedger<P extends TransferStockRow=TransferStockRow,L extends TransferStockLot=TransferStockLot> = { version:number; products:P[]; lots:L[]; transfers:TransferVoucher[] }
export type LedgerProblem = Omit<TransferProblem,'code'> & { code:TransferProblemCode|'VERSION_CONFLICT'|'STORAGE_FAILED' }
export type LedgerResult<P extends TransferStockRow,L extends TransferStockLot> =
  |{ ok:true; ledger:WarehouseLedger<P,L>; voucher:TransferVoucher }
  |{ ok:false; ledger:WarehouseLedger<P,L>; problems:LedgerProblem[] }

export const LEDGER_KEY='demo-warehouse-ledger-v1'

const reject=<P extends TransferStockRow,L extends TransferStockLot>(ledger:WarehouseLedger<P,L>,code:LedgerProblem['code'],message:string):LedgerResult<P,L>=>({ok:false,ledger,problems:[{code,message,lineIds:[]}]})

export function readLedger<P extends TransferStockRow,L extends TransferStockLot>(storage:KeyValueStorage,seed:()=>WarehouseLedger<P,L>):WarehouseLedger<P,L> {
  try{
    const parsed:unknown=JSON.parse(storage.getItem(LEDGER_KEY)??'null')
    if(parsed&&typeof parsed==='object'){
      const value=parsed as Partial<WarehouseLedger<P,L>>
      if(typeof value.version==='number'&&Array.isArray(value.products)&&Array.isArray(value.lots)&&Array.isArray(value.transfers)) return value as WarehouseLedger<P,L>
    }
  }catch{/* dữ liệu hỏng: dùng dữ liệu khởi tạo */}
  return seed()
}

function write<P extends TransferStockRow,L extends TransferStockLot>(storage:KeyValueStorage,ledger:WarehouseLedger<P,L>):boolean {
  try{storage.setItem(LEDGER_KEY,JSON.stringify(ledger));return true}catch{return false}
}

/** Số phiếu do sổ cấp khi lưu lần đầu; không lấy từ client. */
export function nextTransferNumber(transfers:readonly Pick<TransferVoucher,'number'>[]):string {
  const max=transfers.reduce((value,item)=>Math.max(value,Number(item.number.match(/^CK(\d+)$/)?.[1]??0)),0)
  return `CK${String(max+1).padStart(6,'0')}`
}

const upsert=(transfers:readonly TransferVoucher[],voucher:TransferVoucher)=>transfers.some(item=>item.id===voucher.id)?transfers.map(item=>item.id===voucher.id?voucher:item):[voucher,...transfers]

/** Kiểm tra phiếu đang sửa vẫn là bản người dùng đã mở và chưa hoàn thành. */
function guard<P extends TransferStockRow,L extends TransferStockLot>(fresh:WarehouseLedger<P,L>,voucher:TransferVoucher):LedgerResult<P,L>|null {
  const existing=fresh.transfers.find(item=>item.id===voucher.id)
  if(existing?.status==='completed') return reject(fresh,'ALREADY_COMPLETED',`Phiếu ${existing.number} đã hoàn thành; không ghi nhận tồn lần nữa.`)
  if(existing&&(existing.version??0)!==(voucher.version??0)) return reject(fresh,'VERSION_CONFLICT',`Phiếu ${existing.number} vừa được cập nhật ở nơi khác. Mở lại phiếu để xem bản mới nhất.`)
  return null
}

/** Lưu tạm: ghi phiếu và các dòng, không đụng tới tồn kho. */
export function saveTransferDraft<P extends TransferStockRow,L extends TransferStockLot>(storage:KeyValueStorage,seed:()=>WarehouseLedger<P,L>,voucher:TransferVoucher):LedgerResult<P,L> {
  const fresh=readLedger(storage,seed)
  const blocked=guard(fresh,voucher);if(blocked)return blocked
  const existing=fresh.transfers.find(item=>item.id===voucher.id)
  const saved:TransferVoucher={...voucher,status:'draft',number:existing?.number??nextTransferNumber(fresh.transfers),version:(voucher.version??0)+1}
  const next={...fresh,version:fresh.version+1,transfers:upsert(fresh.transfers,saved)}
  return write(storage,next)?{ok:true,ledger:next,voucher:saved}:reject(fresh,'STORAGE_FAILED','Không lưu được phiếu: bộ nhớ trình duyệt đầy hoặc bị chặn.')
}

/**
 * Hoàn thành: kiểm tra lại toàn bộ dòng với tồn kho mới nhất trong storage (không tin số liệu form đang giữ),
 * ghi giảm kho xuất, ghi tăng kho nhập và chốt phiếu trong cùng một lần ghi.
 */
export function completeTransferInLedger<P extends TransferStockRow,L extends TransferStockLot>(storage:KeyValueStorage,seed:()=>WarehouseLedger<P,L>,voucher:TransferVoucher,options:{now:string;newId:()=>string}):LedgerResult<P,L> {
  const fresh=readLedger(storage,seed)
  const blocked=guard(fresh,voucher);if(blocked)return blocked
  const existing=fresh.transfers.find(item=>item.id===voucher.id)
  const numbered:TransferVoucher={...voucher,number:existing?.number??nextTransferNumber(fresh.transfers)}
  try{
    const posted=completeTransfer(fresh,numbered,options)
    const next:WarehouseLedger<P,L>={version:fresh.version+1,products:posted.products,lots:posted.lots,transfers:upsert(fresh.transfers,posted.voucher)}
    return write(storage,next)?{ok:true,ledger:next,voucher:posted.voucher}:reject(fresh,'STORAGE_FAILED','Không hoàn thành được phiếu: bộ nhớ trình duyệt đầy hoặc bị chặn. Tồn kho chưa thay đổi.')
  }catch(error){
    if(error instanceof TransferRejected)return {ok:false,ledger:fresh,problems:error.problems}
    throw error
  }
}
