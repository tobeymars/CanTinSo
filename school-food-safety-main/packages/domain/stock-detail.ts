/**
 * Tính toán cho modal "Chi tiết tồn kho": tồn theo kho, trạng thái lô và sổ biến động.
 * Thuần TypeScript, không phụ thuộc UI; dữ liệu đầu vào là sổ tồn, lô và chứng từ hiện có.
 */

/** Một dòng sổ tồn: một mặt hàng trong một kho. */
export type StockRow = { id:string; code:string; warehouse:string; quantity:number; reserved:number; minimum:number; unitCost:number; unit:string }
/** `status` là cờ hạn dùng do nguồn dữ liệu cung cấp; không tự suy ra từ đồng hồ máy người dùng. */
export type StockLot = { id:string; number:string; productId:string; warehouse:string; manufacturedAt?:string; expiresAt?:string; remaining:number; status:'active'|'expiring'|'expired' }
export type LotState = 'available'|'expiring'|'expired'|'out'

export type WarehouseBalance = {
  warehouse:string
  unit:string
  /** Tồn thực tế = tổng tồn các lô + phần chưa định danh lô. */
  onHand:number
  lotTracked:number
  untracked:number
  /** Tồn còn lại thuộc các lô đã hết hạn. */
  expired:number
  /** Tồn thực tế − tồn hết hạn. */
  availableBeforeReservation:number
  /** Giữ chỗ ghi nhận trên sổ tồn. */
  reserved:number
  /** Phần giữ chỗ được trừ: không vượt quá lượng khả dụng trước giữ chỗ. */
  reservedApplied:number
  /** Khả dụng trước giữ chỗ − giữ chỗ hợp lệ; không âm. */
  available:number
  minimum:number
  belowMinimum:boolean
  value:number
  /** Tổng tồn các lô lớn hơn số dư sổ tồn: dữ liệu cần đối soát. */
  lotsExceedBook:boolean
}

export type MovementKind = 'receipt'|'issue'|'transfer_out'|'transfer_in'|'adjustment_in'|'adjustment_out'
export type MovementDocument = { type:'receipt'|'issue'|'transfer'; id:string; number:string }
export type StockMovement = { id:string; at:string; kind:MovementKind; label:string; quantity:number; warehouse:string; lotNumber:string|null; document:MovementDocument; actor:string|null; reason:string|null }

export type ReceiptLineDocument = { id?:string; productId:string; baseQuantity:number; lotNumber?:string }
export type ReceiptDocument = { id:string; number:string; date:string; warehouse:string; status:string; creator?:string; productId?:string; quantity?:number; kind?:string; description?:string; lotNumber?:string; lines?:readonly ReceiptLineDocument[] }
export type IssueDocument = { id:string; number:string; date:string; branch:string; status:string; creator?:string; productId:string; quantity:number; kind:string; description:string; lotNumber?:string }
export type TransferDocument = { id:string; number:string; date:string; from:string; to:string; status:string; creator?:string; productId:string; quantity:number; description?:string }

const RECEIPT_ADJUSTMENT='Nhập điều chỉnh'
const RECEIPT_ADJUSTMENT_CODE='ADJUSTMENT'
const ISSUE_ADJUSTMENT='Xuất điều chỉnh'

/** Lô hết hàng được nhận diện trước hạn dùng: không còn gì để sử dụng hay xử lý. */
export function lotState(lot:Pick<StockLot,'remaining'|'status'>):LotState {
  if(!(lot.remaining>0)) return 'out'
  return lot.status==='expired'?'expired':lot.status==='expiring'?'expiring':'available'
}

const positive=(value:number)=>Number.isFinite(value)&&value>0?value:0

/** Tồn theo từng kho của một mặt hàng; `rows` là mọi dòng sổ tồn cùng mã hàng. */
export function warehouseBalances(rows:readonly StockRow[],lots:readonly StockLot[]):WarehouseBalance[] {
  const ids=new Set(rows.map(row=>row.id))
  const productLots=lots.filter(lot=>ids.has(lot.productId))
  const warehouses=[...new Set([...rows.map(row=>row.warehouse),...productLots.map(lot=>lot.warehouse)])]
  const fallback=rows[0]
  return warehouses.map(warehouse=>{
    const inWarehouse=rows.filter(row=>row.warehouse===warehouse)
    const lotsHere=productLots.filter(lot=>lot.warehouse===warehouse)
    const book=inWarehouse.reduce((sum,row)=>sum+positive(row.quantity),0)
    const lotTracked=lotsHere.reduce((sum,lot)=>sum+positive(lot.remaining),0)
    const onHand=Math.max(book,lotTracked)
    const expired=lotsHere.filter(lot=>lotState(lot)==='expired').reduce((sum,lot)=>sum+positive(lot.remaining),0)
    const availableBeforeReservation=Math.max(0,onHand-expired)
    const reserved=inWarehouse.reduce((sum,row)=>sum+positive(row.reserved),0)
    const reservedApplied=Math.min(reserved,availableBeforeReservation)
    const available=availableBeforeReservation-reservedApplied
    const minimum=inWarehouse[0]?.minimum??fallback?.minimum??0
    const unitCost=inWarehouse[0]?.unitCost??fallback?.unitCost??0
    return { warehouse, unit:inWarehouse[0]?.unit??fallback?.unit??'', onHand, lotTracked, untracked:onHand-lotTracked, expired, availableBeforeReservation, reserved, reservedApplied, available, minimum, belowMinimum:available<minimum, value:onHand*unitCost, lotsExceedBook:lotTracked>book }
  })
}

export type BalanceTotals = Pick<WarehouseBalance,'onHand'|'expired'|'availableBeforeReservation'|'reserved'|'reservedApplied'|'available'|'value'|'untracked'>
export function totalBalances(balances:readonly WarehouseBalance[]):BalanceTotals {
  const sum=(key:keyof BalanceTotals)=>balances.reduce((total,row)=>total+row[key],0)
  return { onHand:sum('onHand'), expired:sum('expired'), availableBeforeReservation:sum('availableBeforeReservation'), reserved:sum('reserved'), reservedApplied:sum('reservedApplied'), available:sum('available'), value:sum('value'), untracked:sum('untracked') }
}

/**
 * Sắp lô theo FEFO: lô còn hàng chưa hết hạn theo hạn dùng tăng dần (lô sắp hết hạn tự lên đầu),
 * sau đó lô đã hết hạn, cuối cùng lô hết hàng. `expiry` sắp thuần theo hạn dùng tăng dần.
 * Lô thiếu hạn dùng luôn xếp sau các lô có hạn trong cùng nhóm.
 */
export function sortLots<T extends Pick<StockLot,'remaining'|'status'|'expiresAt'|'number'>>(lots:readonly T[],mode:'fefo'|'expiry'='fefo'):T[] {
  const rank:Record<LotState,number>={expiring:0,available:0,expired:1,out:2}
  const expiry=(lot:T)=>lot.expiresAt||'9999-12-31'
  return [...lots].sort((a,b)=>(mode==='fefo'?rank[lotState(a)]-rank[lotState(b)]:0)||expiry(a).localeCompare(expiry(b))||a.number.localeCompare(b.number))
}

/** Sổ biến động của một mặt hàng, chỉ từ chứng từ đã hoàn thành; mới nhất trước. */
export function productMovements(productIds:ReadonlySet<string>,documents:{receipts:readonly ReceiptDocument[];issues:readonly IssueDocument[];transfers:readonly TransferDocument[]}):StockMovement[] {
  const moves:StockMovement[]=[]
  for(const receipt of documents.receipts){
    if(receipt.status!=='completed') continue
    const adjustment=receipt.kind===RECEIPT_ADJUSTMENT||receipt.kind===RECEIPT_ADJUSTMENT_CODE
    const label=adjustment?'Điều chỉnh tăng':receipt.kind==='STOCK_GOODS'?'Nhập hàng từ nhà cung cấp':receipt.kind==='RAW_MATERIALS'?'Nhập nguyên, nhiên liệu':receipt.kind||'Nhập kho'
    const lines=receipt.lines?.length?receipt.lines:[{id:'legacy',productId:receipt.productId??'',baseQuantity:receipt.quantity??0,lotNumber:receipt.lotNumber}]
    for(const line of lines){
      if(!line.productId||!productIds.has(line.productId)||!(positive(line.baseQuantity)>0)) continue
      moves.push({id:`${receipt.id}:${line.id??line.productId}:in`,at:receipt.date,kind:adjustment?'adjustment_in':'receipt',label,quantity:positive(line.baseQuantity),warehouse:receipt.warehouse,lotNumber:line.lotNumber||null,document:{type:'receipt',id:receipt.id,number:receipt.number},actor:receipt.creator||null,reason:receipt.description||null})
    }
  }
  for(const issue of documents.issues){
    if(issue.status!=='completed'||!productIds.has(issue.productId)||!(positive(issue.quantity)>0)) continue
    const adjustment=issue.kind===ISSUE_ADJUSTMENT
    moves.push({id:`${issue.id}:out`,at:issue.date,kind:adjustment?'adjustment_out':'issue',label:adjustment?'Điều chỉnh giảm':issue.kind||'Xuất kho',quantity:-positive(issue.quantity),warehouse:issue.branch,lotNumber:issue.lotNumber||null,document:{type:'issue',id:issue.id,number:issue.number},actor:issue.creator||null,reason:issue.description||null})
  }
  for(const transfer of documents.transfers){
    if(transfer.status!=='completed'||!productIds.has(transfer.productId)||!(positive(transfer.quantity)>0)) continue
    const document:MovementDocument={type:'transfer',id:transfer.id,number:transfer.number}
    moves.push({id:`${transfer.id}:out`,at:transfer.date,kind:'transfer_out',label:'Chuyển kho đi',quantity:-positive(transfer.quantity),warehouse:transfer.from,lotNumber:null,document,actor:transfer.creator||null,reason:transfer.description||null})
    moves.push({id:`${transfer.id}:in`,at:transfer.date,kind:'transfer_in',label:'Chuyển kho đến',quantity:positive(transfer.quantity),warehouse:transfer.to,lotNumber:null,document,actor:transfer.creator||null,reason:transfer.description||null})
  }
  return moves.sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id))
}

export const isAdjustment=(move:Pick<StockMovement,'kind'>)=>move.kind==='adjustment_in'||move.kind==='adjustment_out'
