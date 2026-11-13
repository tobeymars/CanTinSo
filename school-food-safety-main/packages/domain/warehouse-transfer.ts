/**
 * Phiếu chuyển kho nhiều dòng: kiểm tra tồn khả dụng, gợi ý lô FEFO và ghi sổ hai kho.
 * Thuần TypeScript; cùng công thức tồn khả dụng với modal "Chi tiết tồn kho" (`warehouseBalances`).
 * Mọi hàm trả dữ liệu mới, không sửa mảng/bản ghi đầu vào.
 */
import { lotState, sortLots, warehouseBalances } from './stock-detail'
import type { LotState, StockLot, StockRow } from './stock-detail'

/** Một dòng sổ tồn (mặt hàng × kho). `id` là khóa của dòng tồn tại kho đó. */
export type TransferStockRow = StockRow & { name:string }
/** Lô tại một kho. `unitCost` theo lô nếu có; `originLotId` giữ liên kết với lô gốc khi lô được chuyển sang kho khác. */
export type TransferStockLot = StockLot & { unitCost?:number; originLotId?:string }
export type TransferStock<P extends TransferStockRow=TransferStockRow,L extends TransferStockLot=TransferStockLot> = { products:readonly P[]; lots:readonly L[] }

/**
 * Dòng do người dùng nhập. `productId` là dòng tồn tại kho xuất; `quantity` luôn theo đơn vị tồn kho.
 * `enteredQuantity`/`enteredUnit` chỉ lưu lại số liệu theo đơn vị người dùng đã chọn khi có quy đổi.
 */
export type TransferDraftLine = { id:string; productId:string; lotId:string|null; quantity:number; enteredQuantity?:number; enteredUnit?:string }
/** Dòng đã chốt: giá vốn và thành tiền luôn được tính lại từ tồn kho tại thời điểm ghi, không lấy từ client. */
export type TransferLineRecord = TransferDraftLine & {
  productCode:string; productName:string; unit:string
  lotNumber:string|null; manufacturedAt:string|null; expiresAt:string|null
  unitCost:number; amount:number
  destinationProductId?:string; destinationLotId?:string|null
}
export type TransferVoucher = {
  id:string; number:string; date:string; from:string; to:string; description?:string; creator:string
  status:'draft'|'completed'; total:number
  lines?:TransferLineRecord[]
  /** Tăng mỗi lần phiếu đổi trạng thái; dùng để chặn ghi đè đồng thời. */
  version?:number
  completedAt?:string
  /** Phiếu một dòng kiểu cũ. */
  productId?:string; quantity?:number
}

export type TransferProblemCode =
  |'WAREHOUSE_REQUIRED'|'SAME_WAREHOUSE'|'NO_LINES'|'PRODUCT_REQUIRED'|'PRODUCT_NOT_IN_SOURCE'|'QUANTITY_INVALID'
  |'LOT_NOT_IN_SOURCE'|'LOT_EXPIRED'|'LOT_EMPTY'|'LOT_EXCEEDED'|'LOT_REQUIRED'|'AVAILABLE_EXCEEDED'
  |'LOT_EXPIRING'|'ALREADY_COMPLETED'|'NOT_FOUND'
export type TransferProblem = { code:TransferProblemCode; message:string; lineIds:string[] }
export type TransferCheck = { errors:TransferProblem[]; warnings:TransferProblem[] }

export class TransferRejected extends Error {
  readonly problems:TransferProblem[]
  constructor(problems:TransferProblem[]) { super(problems.map(problem=>problem.message).join(' '));this.name='TransferRejected';this.problems=problems }
}

const EPSILON=1e-9
const quantityFormat=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3})
const round3=(value:number)=>Math.round(value*1000)/1000
const qty=(value:number,unit:string)=>`${quantityFormat.format(round3(value))} ${unit}`.trim()
const isoDate=(value?:string|null)=>{const match=value?.match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[3]}/${match[2]}/${match[1]}`:'chưa có'}
const problem=(code:TransferProblemCode,message:string,lineIds:string[]=[]):TransferProblem=>({code,message,lineIds})

/** Các dòng của phiếu, kể cả phiếu một dòng kiểu cũ. */
export function transferLines(voucher:TransferVoucher):TransferDraftLine[] {
  if(voucher.lines?.length) return voucher.lines
  return voucher.productId&&voucher.quantity?[{id:`${voucher.id}:legacy`,productId:voucher.productId,lotId:null,quantity:voucher.quantity}]:[]
}

export type LotOption<L extends TransferStockLot=TransferStockLot> = { lot:L; state:LotState; transferable:boolean }
export type SourceAvailability<L extends TransferStockLot=TransferStockLot> = {
  onHand:number; expired:number; reserved:number; available:number; untracked:number; unit:string
  /** Lô của mặt hàng tại kho xuất theo FEFO; lô hết hạn/hết hàng có `transferable=false`. */
  lots:LotOption<L>[]
}

/** Tồn của một dòng tồn tại kho xuất: tổng tồn, hết hạn, giữ chỗ, khả dụng và các lô. */
export function sourceAvailability<P extends TransferStockRow,L extends TransferStockLot>(stock:TransferStock<P,L>,productId:string):SourceAvailability<L>|null {
  const row=stock.products.find(item=>item.id===productId)
  if(!row) return null
  const lots=stock.lots.filter(lot=>lot.productId===row.id&&lot.warehouse===row.warehouse)
  const balance=warehouseBalances([row],lots).find(item=>item.warehouse===row.warehouse)
  return {
    onHand:balance?.onHand??0, expired:balance?.expired??0, reserved:balance?.reservedApplied??0, available:balance?.available??0, untracked:balance?.untracked??0, unit:row.unit,
    lots:sortLots(lots).map(lot=>{const state=lotState(lot);return {lot,state,transferable:state==='available'||state==='expiring'}}),
  }
}

/**
 * Kiểm tra phiếu với tồn kho hiện tại. Số lượng của các dòng cùng mặt hàng/cùng lô được cộng dồn trước khi so tồn,
 * nên tách một lô ra nhiều dòng cũng không vượt được tồn.
 */
export function checkTransfer<P extends TransferStockRow,L extends TransferStockLot>(stock:TransferStock<P,L>,header:{from:string;to:string},lines:readonly TransferDraftLine[]):TransferCheck {
  const errors:TransferProblem[]=[];const warnings:TransferProblem[]=[]
  if(!header.from||!header.to) errors.push(problem('WAREHOUSE_REQUIRED','Chọn kho xuất và kho nhập.'))
  else if(header.from===header.to) errors.push(problem('SAME_WAREHOUSE','Kho xuất và kho nhập phải khác nhau.'))
  if(!lines.length) errors.push(problem('NO_LINES','Thêm ít nhất một dòng hàng hóa.'))
  const valid:{line:TransferDraftLine;row:P;lot:L|null}[]=[]
  for(const line of lines){
    const row=stock.products.find(item=>item.id===line.productId)
    if(!line.productId||!row){errors.push(problem('PRODUCT_REQUIRED','Chọn hàng hóa cho dòng chuyển kho.',[line.id]));continue}
    if(row.warehouse!==header.from){errors.push(problem('PRODUCT_NOT_IN_SOURCE',`${row.name} không có trong kho xuất ${header.from}; chọn lại hàng hóa.`,[line.id]));continue}
    if(!Number.isFinite(line.quantity)||line.quantity<=0){errors.push(problem('QUANTITY_INVALID',`Số lượng chuyển của ${row.name} phải lớn hơn 0.`,[line.id]));continue}
    let lot:L|null=null
    if(line.lotId){
      lot=stock.lots.find(item=>item.id===line.lotId)??null
      if(!lot||lot.productId!==row.id||lot.warehouse!==header.from){errors.push(problem('LOT_NOT_IN_SOURCE',`Lô đã chọn của ${row.name} không thuộc kho xuất; chọn lại lô.`,[line.id]));continue}
      const state=lotState(lot)
      if(state==='expired'){errors.push(problem('LOT_EXPIRED',`Lô ${lot.number} đã hết hạn; không chuyển như hàng sử dụng bình thường.`,[line.id]));continue}
      if(state==='out'){errors.push(problem('LOT_EMPTY',`Lô ${lot.number} đã hết hàng.`,[line.id]));continue}
      if(state==='expiring') warnings.push(problem('LOT_EXPIRING',`Lô ${lot.number} sắp hết hạn (HSD ${isoDate(lot.expiresAt)}).`,[line.id]))
    }
    valid.push({line,row,lot})
  }
  const byRow=new Map<string,typeof valid>()
  for(const entry of valid) byRow.set(entry.row.id,[...(byRow.get(entry.row.id)??[]),entry])
  for(const [rowId,entries] of byRow){
    const row=entries[0]!.row
    const availability=sourceAvailability(stock,rowId)!
    const byLot=new Map<string|null,typeof entries>()
    for(const entry of entries) byLot.set(entry.lot?.id??null,[...(byLot.get(entry.lot?.id??null)??[]),entry])
    for(const [lotId,group] of byLot){
      const requested=group.reduce((sum,entry)=>sum+entry.line.quantity,0)
      const ids=group.map(entry=>entry.line.id)
      if(lotId){
        const lot=group[0]!.lot!
        if(requested>lot.remaining+EPSILON) errors.push(problem('LOT_EXCEEDED',`Số lượng chuyển từ lô ${lot.number} vượt tồn của lô (${qty(lot.remaining,row.unit)}).`,ids))
      }else if(availability.lots.length&&requested>availability.untracked+EPSILON){
        errors.push(problem('LOT_REQUIRED',availability.untracked>0?`Chọn lô cho ${row.name}: chỉ còn ${qty(availability.untracked,row.unit)} chưa định danh lô.`:`Chọn lô cho ${row.name}; mặt hàng được quản lý theo lô.`,ids))
      }
    }
    const requested=entries.reduce((sum,entry)=>sum+entry.line.quantity,0)
    if(requested>availability.available+EPSILON) errors.push(problem('AVAILABLE_EXCEEDED',`Số lượng chuyển vượt tồn khả dụng (${qty(availability.available,row.unit)}).`,entries.map(entry=>entry.line.id)))
  }
  return {errors,warnings}
}

/**
 * Tự chọn lô theo FEFO cho các dòng chưa chọn lô của mặt hàng quản lý lô: tách dòng theo lô còn hạn gần hết hạn trước.
 * Không đổi các dòng người dùng đã chọn lô; phần đã dành cho các dòng đó được trừ trước khi phân bổ.
 * Phần vượt tổng các lô giữ ở dòng không lô để bước kiểm tra báo lỗi rõ ràng.
 */
export function allocateFefo<P extends TransferStockRow,L extends TransferStockLot>(stock:TransferStock<P,L>,lines:readonly TransferDraftLine[],newId:()=>string):TransferDraftLine[] {
  const used=new Map<string,number>()
  for(const line of lines) if(line.lotId&&line.quantity>0) used.set(line.lotId,(used.get(line.lotId)??0)+line.quantity)
  const result:TransferDraftLine[]=[]
  for(const line of lines){
    const availability=line.lotId||!(line.quantity>0)?null:sourceAvailability(stock,line.productId)
    if(!availability||!availability.lots.length){result.push(line);continue}
    let remaining=line.quantity;let first=true
    for(const option of availability.lots){
      if(!option.transferable||remaining<=EPSILON) continue
      const free=round3(option.lot.remaining-(used.get(option.lot.id)??0))
      if(free<=EPSILON) continue
      const take=round3(Math.min(free,remaining))
      used.set(option.lot.id,(used.get(option.lot.id)??0)+take)
      result.push({id:first?line.id:newId(),productId:line.productId,lotId:option.lot.id,quantity:take})
      remaining=round3(remaining-take);first=false
    }
    if(remaining>EPSILON) result.push({id:first?line.id:newId(),productId:line.productId,lotId:null,quantity:remaining})
  }
  return result
}

/** Giá vốn của dòng: theo lô nếu lô có giá vốn riêng, nếu không theo dòng tồn tại kho xuất. */
function lineCost(row:TransferStockRow,lot:TransferStockLot|null) { return lot?.unitCost??row.unitCost }

/** Ghép thông tin hiển thị/giá vốn cho dòng nháp từ tồn kho hiện tại. */
export function describeLines<P extends TransferStockRow,L extends TransferStockLot>(stock:TransferStock<P,L>,lines:readonly TransferDraftLine[]):TransferLineRecord[] {
  return lines.map(line=>{
    const row=stock.products.find(item=>item.id===line.productId)
    const lot=line.lotId?stock.lots.find(item=>item.id===line.lotId)??null:null
    const unitCost=row?lineCost(row,lot):0
    const quantity=Number.isFinite(line.quantity)&&line.quantity>0?line.quantity:0
    return {...line,productCode:row?.code??'',productName:row?.name??'',unit:row?.unit??'',lotNumber:lot?.number??null,manufacturedAt:lot?.manufacturedAt||null,expiresAt:lot?.expiresAt||null,unitCost,amount:Math.round(quantity*unitCost)}
  })
}

export const transferTotal=(lines:readonly Pick<TransferLineRecord,'amount'>[])=>lines.reduce((sum,line)=>sum+line.amount,0)

/**
 * Hoàn thành phiếu: kiểm tra lại toàn bộ với tồn kho truyền vào, rồi ghi giảm kho xuất và ghi tăng kho nhập theo đúng lô.
 * Tất cả hoặc không: bất kỳ dòng nào lỗi thì ném `TransferRejected` và không trả trạng thái mới.
 * Lô ở kho nhận giữ số lô, NSX, HSD, giá vốn và `originLotId` của lô gốc. Phiếu đã hoàn thành không được ghi lại lần hai.
 */
export function completeTransfer<P extends TransferStockRow,L extends TransferStockLot>(stock:TransferStock<P,L>,voucher:TransferVoucher,options:{now:string;newId:()=>string}):{products:P[];lots:L[];voucher:TransferVoucher} {
  if(voucher.status==='completed') throw new TransferRejected([problem('ALREADY_COMPLETED',`Phiếu ${voucher.number} đã hoàn thành; không ghi nhận tồn lần nữa.`)])
  const lines=transferLines(voucher)
  const check=checkTransfer(stock,voucher,lines)
  if(check.errors.length) throw new TransferRejected(check.errors)
  const products=[...stock.products];const lots=[...stock.lots]
  const update=<T extends {id:string}>(items:T[],id:string,change:(item:T)=>T)=>{const index=items.findIndex(item=>item.id===id);items[index]=change(items[index]!);return items[index]!}
  const records:TransferLineRecord[]=[]
  for(const [index,line] of lines.entries()){
    const source=products.find(item=>item.id===line.productId)!
    const sourceLot=line.lotId?lots.find(item=>item.id===line.lotId)!:null
    const unitCost=lineCost(source,sourceLot)
    update(products,source.id,item=>({...item,quantity:round3(item.quantity-line.quantity)}))
    let destination=products.find(item=>item.code===source.code&&item.warehouse===voucher.to)
    if(!destination){destination={...source,id:options.newId(),warehouse:voucher.to,quantity:0,reserved:0};products.push(destination)}
    destination=update(products,destination.id,item=>({...item,quantity:round3(item.quantity+line.quantity)}))
    let destinationLotId:string|null=null
    if(sourceLot){
      update(lots,sourceLot.id,item=>({...item,remaining:round3(item.remaining-line.quantity)}))
      const existing=lots.find(item=>item.productId===destination!.id&&item.warehouse===voucher.to&&item.number===sourceLot.number)
      const target=existing??(()=>{const created={...sourceLot,id:options.newId(),productId:destination!.id,warehouse:voucher.to,remaining:0,unitCost,originLotId:sourceLot.originLotId??sourceLot.id};lots.push(created);return created})()
      destinationLotId=update(lots,target.id,item=>({...item,remaining:round3(item.remaining+line.quantity)})).id
    }
    const [record]=describeLines({products:[source],lots:sourceLot?[sourceLot]:[]},[line])
    records.push({...record!,id:line.id||`${voucher.id}:${index}`,unitCost,amount:Math.round(line.quantity*unitCost),destinationProductId:destination.id,destinationLotId})
  }
  if(products.some(item=>item.quantity<-EPSILON)||lots.some(item=>item.remaining<-EPSILON)) throw new TransferRejected([problem('AVAILABLE_EXCEEDED','Tồn kho không được âm sau khi chuyển.')])
  return {products,lots,voucher:{...voucher,lines:records,total:transferTotal(records),status:'completed',completedAt:options.now,version:(voucher.version??0)+1,productId:undefined,quantity:undefined}}
}
