/**
 * Tính toán cho modal "Chi tiết lô hàng": nhận diện lô theo ID, sổ biến động của đúng lô, tồn theo kho, hạn dùng, giá vốn và cảnh báo.
 * Thuần TypeScript, chỉ đọc lô và chứng từ đã có; không sửa tồn, không đổi trạng thái chứng từ khi mở chi tiết.
 * Một lô có thể nằm ở nhiều kho: mỗi kho là một bản ghi lô riêng, nối với lô gốc qua `originLotId` (do phiếu chuyển kho tạo).
 */
import { acceptsReceiptKind, receiptKindLabel } from './warehouse-receipt'
import type { MovementDocument } from './stock-detail'

/** Bản ghi lô tại một kho. `status` là cờ hạn dùng trên sổ lô; trạng thái hiển thị còn tính lại theo ngày hiện tại. */
export type LotRecord = { id:string; number:string; productId:string; warehouse:string; manufacturedAt?:string; expiresAt?:string; remaining:number; status:'active'|'expiring'|'expired'; unitCost?:number; originLotId?:string }
export type LotProductRow = { id:string; code:string; warehouse:string; unit:string; unitCost:number; reserved?:number; category?:string }
export type LotReceiptLine = { id?:string; productId:string; baseQuantity:number; lotNumber?:string; unitPrice?:number; conversionFactor?:number; amount?:number; serials?:readonly string[] }
export type LotReceipt = { id:string; number:string; date:string; warehouse:string; status:string; creator?:string; supplier?:string; supplierId?:string; kind?:string; description?:string; reference?:string; invoiceNumber?:string; fileName?:string; productId?:string; quantity?:number; unitPrice?:number; lotNumber?:string; lines?:readonly LotReceiptLine[] }
/** `lotId` nếu phiếu xuất ghi đúng bản ghi lô; phiếu cũ chỉ có `lotNumber`. */
export type LotIssue = { id:string; number:string; date:string; branch:string; status:string; creator?:string; receiver?:string; kind:string; description?:string; productId:string; quantity:number; lotNumber?:string; lotId?:string }
export type LotTransferLine = { id:string; productId:string; lotId:string|null; quantity:number; destinationLotId?:string|null }
/** Phiếu chuyển một dòng kiểu cũ không có `lines` nên không gắn được với lô nào. */
export type LotTransfer = { id:string; number:string; date:string; from:string; to:string; status:string; creator?:string; description?:string; lines?:readonly LotTransferLine[] }
export type LotDocuments = { receipts:readonly LotReceipt[]; issues:readonly LotIssue[]; transfers:readonly LotTransfer[] }

export type LotMovementKind = 'receipt'|'receipt_extra'|'issue'|'transfer_out'|'transfer_in'|'adjustment_in'|'adjustment_out'
export const lotMovementLabels:Record<LotMovementKind,string> = { receipt:'Nhập kho', receipt_extra:'Nhập bổ sung', issue:'Xuất kho', transfer_out:'Chuyển kho đi', transfer_in:'Chuyển kho đến', adjustment_in:'Điều chỉnh tăng', adjustment_out:'Điều chỉnh giảm' }

export type LotMovement = {
  id:string; at:string; kind:LotMovementKind; label:string
  /** Có dấu: dương là tăng, âm là giảm tại `warehouse`. */
  quantity:number
  warehouse:string; source:string|null; destination:string|null
  document:MovementDocument
  /** Loại nghiệp vụ ghi trên chứng từ, ví dụ "Xuất chế biến". */
  documentKind:string|null
  actor:string|null; note:string|null
  /** Hai dòng đi/đến của cùng một dòng phiếu chuyển kho có chung khóa này. */
  pairKey:string|null
  /** Tồn của lô tại `warehouse` trước và sau nghiệp vụ, tính trên toàn bộ lịch sử (không theo trang). */
  before:number; after:number
}

export type ExpiryState = 'valid'|'expiring'|'expired'|'untracked'
/** `state` là trạng thái áp dụng; `computed` chỉ theo ngày; `recorded` là cờ trên sổ lô. */
export type ExpiryInfo = { state:ExpiryState; computed:ExpiryState; daysLeft:number|null; recorded:LotRecord['status']; recordedMismatch:boolean }
export type CostSource = 'lot'|'receipt'

export type LotWarehouseBalance = {
  warehouse:string; allocationIds:string[]; productRowId:string|null; unit:string
  /** Tồn có sẵn trên sổ lô nhưng chưa có phiếu nhập/chuyển đến tại kho này. */
  opening:number
  inbound:number; outbound:number
  /** Theo sổ lô (cơ chế tồn đang chạy). */
  onHand:number
  expired:number
  /** Tồn thực tế − tồn hết hạn. Giữ chỗ đang ghi theo mặt hàng, chưa phân bổ theo lô nên chưa trừ ở đây. */
  available:number
  /** Giữ chỗ của dòng tồn mặt hàng tại kho (không riêng lô). */
  productReserved:number
  expiry:ExpiryInfo
  unitCost:number|null; costSource:CostSource|null; value:number|null
  /** Giá vốn của dòng tồn mặt hàng tại kho; chỉ để tham khảo, không phải giá vốn riêng của lô. */
  productUnitCost:number|null
  /** Sổ lô − (tồn đầu kỳ + Σ biến động). Khác 0 là dữ liệu cần đối soát. */
  mismatch:number
}

export type LotSource = { receipt:LotReceipt; line:LotReceiptLine; quantity:number; unitCost:number|null; amount:number|null }

export type LotSummary = {
  rootId:string; number:string; allocations:LotRecord[]; productIds:string[]
  /** Mới nhất trước. */
  movements:LotMovement[]
  balances:LotWarehouseBalance[]
  /** Phiếu nhập (không gồm điều chỉnh) ghi nhận lô, cũ nhất trước. */
  sources:LotSource[]
  initialQuantity:number|null; supplemental:number; issued:number; transferred:number; adjustmentIn:number; adjustmentOut:number; opening:number
  onHand:number; expired:number; available:number
  /** Tồn đầu kỳ + nhập − xuất ± điều chỉnh; chuyển kho nội bộ triệt tiêu nên không có trong công thức. */
  expectedOnHand:number
  negativeRunning:boolean; consistent:boolean
  expiry:ExpiryInfo
  unitCost:number|null; costSource:CostSource|null; value:number|null; initialValue:number|null
}

const EPSILON=1e-6
const round3=(value:number)=>Math.round(value*1000)/1000
const positive=(value:number|undefined)=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:0
const lotKey=(value?:string)=>(value??'').trim().toLocaleLowerCase('vi')
const RECEIPT_ADJUSTMENTS=new Set(['ADJUSTMENT','Nhập điều chỉnh'])
const ISSUE_ADJUSTMENT='Xuất điều chỉnh'
const inboundKinds=new Set<LotMovementKind>(['receipt','receipt_extra','transfer_in'])
const sameTimeRank:Record<LotMovementKind,number>={receipt:0,receipt_extra:0,adjustment_in:0,transfer_out:1,transfer_in:2,issue:3,adjustment_out:3}

export const lotRootId=(lot:Pick<LotRecord,'id'|'originLotId'>)=>lot.originLotId??lot.id

/** Mọi bản ghi của cùng một lô ở các kho, nối bằng ID lô gốc; không ghép theo tên hàng hay số lô trùng ngẫu nhiên. */
export function lotAllocations<L extends LotRecord>(lots:readonly L[],lotId:string):L[] {
  const selected=lots.find(lot=>lot.id===lotId)
  if(!selected) return []
  const root=lotRootId(selected)
  return lots.filter(lot=>lotRootId(lot)===root).sort((a,b)=>Number(lotRootId(b)===b.id)-Number(lotRootId(a)===a.id))
}

const dayNumber=(value?:string)=>{const match=value?.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!match)return null;const time=Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]));return Number.isNaN(time)?null:Math.round(time/86_400_000)}
const severity=(state:ExpiryState|LotRecord['status'])=>state==='expired'?2:state==='expiring'?1:0

/**
 * Hạn dùng theo ngày hiện tại và ngưỡng cảnh báo cấu hình. Còn hạn đến hết ngày HSD (`daysLeft` = 0).
 * Không bao giờ nới lỏng hơn cờ trên sổ lô: nếu sổ ghi hết hạn/sắp hết hạn thì giữ mức chặt hơn và báo lệch.
 */
export function lotExpiry(lot:Pick<LotRecord,'expiresAt'|'status'>,today:string,warningDays:number):ExpiryInfo {
  const expires=dayNumber(lot.expiresAt);const now=dayNumber(today)
  const daysLeft=expires===null||now===null?null:expires-now
  const computed:ExpiryState=daysLeft===null?'untracked':daysLeft<0?'expired':daysLeft<=warningDays?'expiring':'valid'
  const recorded=lot.status
  const state:ExpiryState=severity(recorded)>severity(computed)?(recorded==='expired'?'expired':'expiring'):computed
  return { state, computed, daysLeft, recorded, recordedMismatch:severity(recorded)!==severity(computed) }
}

function receiptLines(receipt:LotReceipt):LotReceiptLine[] {
  if(receipt.lines?.length) return [...receipt.lines]
  return receipt.productId?[{id:'legacy',productId:receipt.productId,baseQuantity:receipt.quantity??0,lotNumber:receipt.lotNumber,unitPrice:receipt.unitPrice}]:[]
}

/** Giá vốn trên đơn vị tồn kho của dòng phiếu nhập: thành tiền / số lượng quy đổi. */
function lineUnitCost(line:LotReceiptLine):number|null {
  const quantity=positive(line.baseQuantity)
  if(!quantity) return null
  if(typeof line.amount==='number'&&Number.isFinite(line.amount)&&line.amount>=0) return line.amount/quantity
  if(typeof line.unitPrice==='number'&&Number.isFinite(line.unitPrice)&&line.unitPrice>=0) return line.unitPrice/(positive(line.conversionFactor)||1)
  return null
}

export const receiptKindText=(kind?:string)=>kind==='STOCK_GOODS'||kind==='RAW_MATERIALS'?receiptKindLabel(kind):kind&&RECEIPT_ADJUSTMENTS.has(kind)?'Nhập điều chỉnh':kind||null

type Draft = Omit<LotMovement,'before'|'after'>

/**
 * Chi tiết đầy đủ của một lô. `lotId` là bản ghi lô người dùng mở; kết quả gồm mọi kho đang giữ cùng lô.
 * Chỉ tính chứng từ đã hoàn thành và gắn đúng lô (ID lô, hoặc số lô + mã hàng với phiếu kiểu cũ).
 */
export function lotSummary(input:{lotId:string;lots:readonly LotRecord[];products:readonly LotProductRow[];documents:LotDocuments;today:string;warningDays:number}):LotSummary|null {
  const allocations=lotAllocations(input.lots,input.lotId)
  const primary=allocations[0]
  if(!primary) return null
  const allocationIds=new Set(allocations.map(lot=>lot.id))
  const codes=new Set(allocations.map(lot=>input.products.find(row=>row.id===lot.productId)?.code).filter((code):code is string=>Boolean(code)))
  const productIds=new Set([...allocations.map(lot=>lot.productId),...input.products.filter(row=>codes.has(row.code)).map(row=>row.id)])
  const key=lotKey(primary.number)
  const drafts:Draft[]=[]
  const sources:LotSource[]=[]

  for(const receipt of input.documents.receipts){
    if(receipt.status!=='completed') continue
    const adjustment=RECEIPT_ADJUSTMENTS.has(receipt.kind??'')
    for(const [index,line] of receiptLines(receipt).entries()){
      const quantity=positive(line.baseQuantity)
      if(!quantity||!productIds.has(line.productId)||lotKey(line.lotNumber)!==key) continue
      if(!adjustment){const unitCost=lineUnitCost(line);sources.push({receipt,line,quantity,unitCost,amount:typeof line.amount==='number'?line.amount:unitCost===null?null:Math.round(unitCost*quantity)})}
      drafts.push({id:`${receipt.id}:${line.id??index}:in`,at:receipt.date,kind:adjustment?'adjustment_in':'receipt',label:'',quantity,warehouse:receipt.warehouse,source:adjustment?null:receipt.supplier||null,destination:receipt.warehouse,document:{type:'receipt',id:receipt.id,number:receipt.number},documentKind:receiptKindText(receipt.kind),actor:receipt.creator||null,note:receipt.description||null,pairKey:null})
    }
  }
  for(const issue of input.documents.issues){
    if(issue.status!=='completed') continue
    const quantity=positive(issue.quantity)
    const linked=issue.lotId?allocationIds.has(issue.lotId):productIds.has(issue.productId)&&lotKey(issue.lotNumber)===key&&key!==''
    if(!quantity||!linked) continue
    const adjustment=issue.kind===ISSUE_ADJUSTMENT
    drafts.push({id:`${issue.id}:out`,at:issue.date,kind:adjustment?'adjustment_out':'issue',label:'',quantity:-quantity,warehouse:issue.branch,source:issue.branch,destination:adjustment?null:issue.receiver||null,document:{type:'issue',id:issue.id,number:issue.number},documentKind:issue.kind||null,actor:issue.creator||null,note:issue.description||null,pairKey:null})
  }
  for(const transfer of input.documents.transfers){
    if(transfer.status!=='completed') continue
    const document:MovementDocument={type:'transfer',id:transfer.id,number:transfer.number}
    for(const line of transfer.lines??[]){
      const quantity=positive(line.quantity)
      const linked=(line.lotId!==null&&allocationIds.has(line.lotId))||(typeof line.destinationLotId==='string'&&allocationIds.has(line.destinationLotId))
      if(!quantity||!linked) continue
      const pairKey=`${transfer.id}:${line.id}`
      const base={at:transfer.date,label:'',source:transfer.from,destination:transfer.to,document,documentKind:'Chuyển kho',actor:transfer.creator||null,note:transfer.description||null,pairKey}
      drafts.push({...base,id:`${pairKey}:out`,kind:'transfer_out',quantity:-quantity,warehouse:transfer.from})
      drafts.push({...base,id:`${pairKey}:in`,kind:'transfer_in',quantity,warehouse:transfer.to})
    }
  }

  // Thứ tự thời gian; cùng thời điểm: nhập/điều chỉnh tăng → chuyển đi → chuyển đến → xuất, để tồn trung gian không âm giả.
  const chronological=drafts.sort((a,b)=>a.at.localeCompare(b.at)||sameTimeRank[a.kind]-sameTimeRank[b.kind]||a.id.localeCompare(b.id))
  let firstReceipt=true
  for(const move of chronological){if(move.kind==='receipt'){if(!firstReceipt)move.kind='receipt_extra';firstReceipt=false}move.label=lotMovementLabels[move.kind]}
  sources.sort((a,b)=>a.receipt.date.localeCompare(b.receipt.date)||a.receipt.id.localeCompare(b.receipt.id))

  const warehouses=[...new Set([...allocations.map(lot=>lot.warehouse),...chronological.map(move=>move.warehouse)])]
  const firstSourceCost=sources.find(source=>source.unitCost!==null)?.unitCost??null
  const lotCost=(lots:readonly LotRecord[]):{unitCost:number|null;costSource:CostSource|null}=>{const own=lots.find(lot=>typeof lot.unitCost==='number'&&Number.isFinite(lot.unitCost))?.unitCost;return own!==undefined?{unitCost:own,costSource:'lot'}:firstSourceCost!==null?{unitCost:firstSourceCost,costSource:'receipt'}:{unitCost:null,costSource:null}}

  const opening=new Map<string,number>()
  const partial=warehouses.map(warehouse=>{
    const here=allocations.filter(lot=>lot.warehouse===warehouse)
    const moves=chronological.filter(move=>move.warehouse===warehouse)
    const onHand=round3(here.reduce((sum,lot)=>sum+positive(lot.remaining),0))
    const net=moves.reduce((sum,move)=>sum+move.quantity,0)
    const start=moves.some(move=>inboundKinds.has(move.kind))?0:Math.max(0,round3(onHand-net))
    opening.set(warehouse,start)
    const reference=here[0]??primary
    const expiry=lotExpiry(reference,input.today,input.warningDays)
    const expired=expiry.state==='expired'?onHand:0
    const row=input.products.find(item=>item.id===reference.productId&&item.warehouse===warehouse)??input.products.find(item=>codes.has(item.code)&&item.warehouse===warehouse)??null
    const {unitCost,costSource}=lotCost(here.length?here:[primary])
    return {
      warehouse, allocationIds:here.map(lot=>lot.id), productRowId:row?.id??null, unit:row?.unit??input.products.find(item=>item.id===primary.productId)?.unit??'',
      opening:start, inbound:round3(start+moves.filter(move=>move.quantity>0).reduce((sum,move)=>sum+move.quantity,0)), outbound:round3(-moves.filter(move=>move.quantity<0).reduce((sum,move)=>sum+move.quantity,0)),
      onHand, expired, available:round3(onHand-expired), productReserved:positive(row?.reserved), expiry,
      unitCost, costSource, value:unitCost===null?null:Math.round(onHand*unitCost), productUnitCost:row?row.unitCost:null,
      mismatch:round3(onHand-(start+net)),
    } satisfies LotWarehouseBalance
  })

  const running=new Map(opening)
  let negativeRunning=false
  const movements:LotMovement[]=chronological.map(move=>{const before=running.get(move.warehouse)??0;const after=round3(before+move.quantity);running.set(move.warehouse,after);if(after<-EPSILON)negativeRunning=true;return {...move,before:round3(before),after}}).reverse()

  const sum=(kind:LotMovementKind)=>round3(Math.abs(chronological.filter(move=>move.kind===kind).reduce((total,move)=>total+move.quantity,0)))
  const initial=chronological.find(move=>move.kind==='receipt')
  const totalOpening=round3(partial.reduce((total,item)=>total+item.opening,0))
  const supplemental=sum('receipt_extra');const issued=sum('issue');const adjustmentIn=sum('adjustment_in');const adjustmentOut=sum('adjustment_out')
  const onHand=round3(partial.reduce((total,item)=>total+item.onHand,0))
  const expectedOnHand=round3(totalOpening+(initial?.quantity??0)+supplemental-issued+adjustmentIn-adjustmentOut)
  const consistent=!negativeRunning&&Math.abs(expectedOnHand-onHand)<=EPSILON&&partial.every(item=>Math.abs(item.mismatch)<=EPSILON)
  const values=partial.map(item=>item.value)
  const {unitCost,costSource}=lotCost(allocations)
  const original=sources[0]

  return {
    rootId:lotRootId(primary), number:primary.number, allocations, productIds:[...productIds],
    movements, balances:partial, sources,
    initialQuantity:initial?.quantity??null, supplemental, issued, transferred:sum('transfer_out'), adjustmentIn, adjustmentOut, opening:totalOpening,
    onHand, expired:round3(partial.reduce((total,item)=>total+item.expired,0)), available:round3(partial.reduce((total,item)=>total+item.available,0)),
    expectedOnHand, negativeRunning, consistent,
    expiry:lotExpiry(primary,input.today,input.warningDays),
    unitCost, costSource, value:values.some(value=>value===null)?null:values.reduce<number>((total,value)=>total+(value??0),0),
    initialValue:original?.amount??null,
  }
}

export type LotWarningCode = 'EXPIRED'|'EXPIRING'|'OUT_OF_STOCK'|'NO_AVAILABLE'|'MISSING_DATES'|'MISSING_ORIGIN'|'INCONSISTENT'|'STATUS_STALE'
export type LotWarning = { code:LotWarningCode; tone:'danger'|'warning'|'info'; message:string }

const quantityFormat=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3})
const qty=(value:number,unit:string)=>`${quantityFormat.format(round3(value))} ${unit}`.trim()
const recordedLabels:Record<LotRecord['status'],string>={active:'Còn sử dụng',expiring:'Sắp hết hạn',expired:'Đã hết hạn'}

/** Mặt hàng thuộc nhóm nguyên, nhiên liệu bắt buộc ngày sản xuất và hạn dùng khi nhập (cùng quy tắc với phiếu nhập). */
export const lotRequiresDates=(product:{category:string})=>acceptsReceiptKind(product,'RAW_MATERIALS')

/** Cảnh báo tính từ dữ liệu lô, chứng từ và ngày hiện tại; chỉ để hiển thị, không tự sửa dữ liệu. */
export function lotWarnings(summary:LotSummary,options:{unit:string;requiresDates:boolean}):LotWarning[] {
  const warnings:LotWarning[]=[];const {expiry}=summary;const unit=options.unit
  if(summary.onHand>EPSILON&&expiry.state==='expired') warnings.push({code:'EXPIRED',tone:'danger',message:expiry.daysLeft!==null&&expiry.daysLeft<0?`Lô đã hết hạn ${-expiry.daysLeft} ngày, còn ${qty(summary.expired,unit)} tồn không được sử dụng; cần cách ly và xử lý theo quy trình.`:`Sổ lô ghi nhận lô đã hết hạn; ${qty(summary.expired,unit)} tồn không được sử dụng.`})
  if(summary.onHand>EPSILON&&expiry.state==='expiring') warnings.push({code:'EXPIRING',tone:'warning',message:expiry.daysLeft===null?'Sổ lô ghi nhận lô sắp hết hạn; ưu tiên sử dụng trước (FEFO).':expiry.daysLeft===0?'Hôm nay là ngày cuối cùng của hạn sử dụng; ưu tiên sử dụng trước (FEFO).':`Lô còn ${expiry.daysLeft} ngày đến hạn sử dụng; ưu tiên sử dụng trước (FEFO).`})
  if(summary.onHand<=EPSILON) warnings.push({code:'OUT_OF_STOCK',tone:'info',message:'Lô không còn tồn ở kho nào.'})
  else if(summary.available<=EPSILON) warnings.push({code:'NO_AVAILABLE',tone:'warning',message:'Tồn khả dụng của lô bằng 0.'})
  if(options.requiresDates&&(!summary.allocations[0]?.manufacturedAt||!summary.allocations[0]?.expiresAt)) warnings.push({code:'MISSING_DATES',tone:'warning',message:'Nguyên liệu bắt buộc ngày sản xuất và hạn sử dụng nhưng lô chưa có đủ thông tin.'})
  if(!summary.sources.length) warnings.push({code:'MISSING_ORIGIN',tone:'warning',message:summary.opening>EPSILON?`Chưa có phiếu nhập nào ghi nhận lô; ${qty(summary.opening,unit)} là tồn đầu kỳ chưa có chứng từ nguồn gốc.`:'Chưa có phiếu nhập nào ghi nhận lô; thiếu thông tin nguồn gốc.'})
  else if(summary.sources.some(source=>!source.receipt.supplier)) warnings.push({code:'MISSING_ORIGIN',tone:'warning',message:'Có phiếu nhập của lô chưa ghi nhà cung cấp.'})
  if(!summary.consistent){
    const gaps=summary.balances.filter(item=>Math.abs(item.mismatch)>EPSILON).map(item=>`${item.warehouse}: sổ lô ${qty(item.onHand,unit)}, chứng từ cộng dồn ${qty(item.onHand-item.mismatch,unit)}`)
    warnings.push({code:'INCONSISTENT',tone:'danger',message:`Dữ liệu tồn lô không nhất quán, cần đối soát${gaps.length?` (${gaps.join('; ')})`:summary.negativeRunning?' (tồn theo thứ tự chứng từ có thời điểm bị âm)':''}.`})
  }
  if(expiry.recordedMismatch&&summary.onHand>EPSILON) warnings.push({code:'STATUS_STALE',tone:'info',message:severity(expiry.recorded)>severity(expiry.computed)?`Sổ lô ghi "${recordedLabels[expiry.recorded]}", chặt hơn hạn dùng tính theo ngày; giữ mức chặt hơn.`:`Sổ lô vẫn ghi "${recordedLabels[expiry.recorded]}" nhưng theo hạn dùng và ngày hiện tại lô đã ${expiry.computed==='expired'?'hết hạn':'sắp hết hạn'}. Mở chi tiết không tự sửa sổ lô.`})
  return warnings
}

export type LotSerial = { serial:string; receiptId:string; receiptNumber:string; warehouse:string; duplicate:boolean }

/** Serial ghi trên phiếu nhập của lô; `duplicate` khi cùng serial xuất hiện hơn một lần trong mọi phiếu nhập đã hoàn thành. */
export function lotSerials(summary:Pick<LotSummary,'sources'>,receipts:readonly LotReceipt[]):LotSerial[] {
  const counts=new Map<string,number>()
  for(const receipt of receipts){if(receipt.status!=='completed')continue;for(const line of receiptLines(receipt))for(const serial of line.serials??[]){const key=lotKey(serial);if(key)counts.set(key,(counts.get(key)??0)+1)}}
  return summary.sources.flatMap(source=>(source.line.serials??[]).filter(serial=>serial.trim()).map(serial=>({serial:serial.trim(),receiptId:source.receipt.id,receiptNumber:source.receipt.number,warehouse:source.receipt.warehouse,duplicate:(counts.get(lotKey(serial))??0)>1})))
}

export type LotDocumentType = 'receipt'|'issue'|'transfer'|'adjustment'|'invoice'|'attachment'
export type LotDocumentRow = { key:string; type:LotDocumentType; label:string; number:string; date:string; creator:string|null; status:string; document:MovementDocument|null }

const documentLabels:Record<LotDocumentType,string>={receipt:'Phiếu nhập kho',issue:'Phiếu xuất kho',transfer:'Phiếu chuyển kho',adjustment:'Phiếu điều chỉnh tồn',invoice:'Hóa đơn mua hàng',attachment:'File đính kèm'}

/** Chứng từ liên quan đến lô, mỗi chứng từ một dòng; hóa đơn và file đính kèm lấy từ phiếu nhập gốc. */
export function lotDocuments(summary:Pick<LotSummary,'movements'|'sources'>):LotDocumentRow[] {
  const rows=new Map<string,LotDocumentRow>()
  for(const move of [...summary.movements].reverse()){
    const key=`${move.document.type}:${move.document.id}`
    if(rows.has(key)) continue
    const type:LotDocumentType=move.kind==='adjustment_in'||move.kind==='adjustment_out'?'adjustment':move.document.type
    rows.set(key,{key,type,label:documentLabels[type],number:move.document.number,date:move.at,creator:move.actor,status:'Hoàn thành',document:move.document})
  }
  for(const {receipt} of summary.sources){
    if(receipt.invoiceNumber&&!rows.has(`invoice:${receipt.invoiceNumber}`)) rows.set(`invoice:${receipt.invoiceNumber}`,{key:`invoice:${receipt.invoiceNumber}`,type:'invoice',label:documentLabels.invoice,number:receipt.invoiceNumber,date:receipt.date,creator:receipt.creator||null,status:`Liên kết từ ${receipt.number}`,document:null})
    if(receipt.fileName&&!rows.has(`attachment:${receipt.id}`)) rows.set(`attachment:${receipt.id}`,{key:`attachment:${receipt.id}`,type:'attachment',label:documentLabels.attachment,number:receipt.fileName,date:receipt.date,creator:receipt.creator||null,status:'Chỉ lưu tên tệp, chưa tải lên máy chủ',document:null})
  }
  return [...rows.values()]
}
