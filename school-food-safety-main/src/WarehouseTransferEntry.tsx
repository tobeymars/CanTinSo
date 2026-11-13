import Select from './components/ui/Select'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, Check, Eraser, Eye, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { allocateFefo, checkTransfer, describeLines, sourceAvailability, transferLines, transferTotal } from '../packages/domain/warehouse-transfer'
import type { TransferDraftLine, TransferProblem, TransferStockLot, TransferStockRow, TransferVoucher } from '../packages/domain/warehouse-transfer'
import { nextTransferNumber } from '../packages/domain/warehouse-ledger'
import type { LedgerProblem } from '../packages/domain/warehouse-ledger'
import { configuredUnits } from '../packages/domain/warehouse-receipt'
import './WarehouseTransferEntry.css'

export type TransferEntryResult = { ok:true; voucher:TransferVoucher }|{ ok:false; problems:LedgerProblem[] }
type Props = {
  vouchers:TransferVoucher[]; products:TransferStockRow[]; lots:TransferStockLot[]
  /** Chỉ các kho vai trò hiện tại được thao tác. */
  warehouses:string[]
  canEdit:boolean; actorName:string; focusId?:string
  onSaveDraft:(voucher:TransferVoucher)=>TransferEntryResult
  onComplete:(voucher:TransferVoucher)=>TransferEntryResult
}
type FormLine = { id:string; productId:string; query:string; lotId:string|null; quantity:string; unitCode:string }
type Header = { from:string; to:string; date:string; description:string }
type Shown = LedgerProblem|TransferProblem

const money=new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0})
const number=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3})
const productLabel=(row:Pick<TransferStockRow,'code'|'name'>)=>`${row.code} · ${row.name}`
const dateOnly=(value?:string|null)=>{const match=value?.match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[3]}/${match[2]}/${match[1]}`:'Chưa có'}
const dateTime=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
/** Ngày giờ hiện tại theo giờ Việt Nam cho ô datetime-local, không phụ thuộc múi giờ thiết bị. */
const vietnamNow=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T')
const unitsOf=(row:TransferStockRow)=>{const units=configuredUnits(row);return units.length?units:[{code:row.unit,label:row.unit,factor:1}]}
const blankLine=():FormLine=>({id:crypto.randomUUID(),productId:'',query:'',lotId:null,quantity:'',unitCode:''})

function Dialog({title,kicker,children,onClose}:{title:string;kicker:string;children:ReactNode;onClose:()=>void}){
  return <div className="management-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="management-modal transfer-modal" role="dialog" aria-modal="true" aria-label={title}><div className="dialog-head"><div><div className="section-kicker">{kicker}</div><h2>{title}</h2></div><button type="button" className="icon-button" aria-label="Đóng" onClick={onClose}><X/></button></div>{children}</section></div>
}
function Messages({items,tone,live=false}:{items:Shown[];tone:'error'|'warning';live?:boolean}){return items.length?<ul className={`transfer-messages ${tone}`} role={live?'alert':undefined}>{items.map((item,index)=><li key={`${item.code}-${index}`}><AlertCircle size={14}/>{item.message}</li>)}</ul>:null}

/** Danh sách và form phiếu chuyển kho nhiều dòng (nhiều mặt hàng, nhiều lô). Lưu/ghi sổ do `onSaveDraft`/`onComplete` thực hiện. */
export default function WarehouseTransferEntry({vouchers,products,lots,warehouses,canEdit,actorName,focusId,onSaveDraft,onComplete}:Props){
  const [editing,setEditing]=useState<TransferVoucher|null>(null)
  const [viewing,setViewing]=useState<TransferVoucher|null>(null)
  const [notice,setNotice]=useState('')
  const startNew=()=>setEditing({id:crypto.randomUUID(),number:'',date:vietnamNow(),from:warehouses[0]??'',to:warehouses[1]??'',description:'',creator:actorName,status:'draft',total:0,lines:[]})
  const stock={products,lots}
  return <>
    <section className="card management-table-card">
      <div className="card-header"><div><div className="section-kicker">ĐIỀU PHỐI GIỮA CÁC KHO</div><h2>Danh sách chuyển kho</h2><p className="muted">Một phiếu có thể chuyển nhiều hàng hóa và nhiều lô; tồn chỉ thay đổi khi phiếu hoàn thành.</p></div>{canEdit&&<button className="primary" onClick={startNew}><Plus size={16}/>Tạo phiếu mới</button>}</div>
      {notice&&<div className="local-toast" role="status"><Check size={16}/>{notice}<button type="button" aria-label="Đóng thông báo" onClick={()=>setNotice('')}><X size={15}/></button></div>}
      <div className="table-scroll"><table><thead><tr><th>Số phiếu</th><th>Ngày chuyển</th><th>Chi nhánh xuất</th><th>Chi nhánh nhập</th><th>Số dòng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Người tạo</th><th>Thao tác</th></tr></thead>
        <tbody>{vouchers.map(item=>{const editable=canEdit&&item.status==='draft';return <tr key={item.id} id={`warehouse-document-${item.id}`} className={item.id===focusId?'selected-row':undefined}><td><strong>{item.number||'Chưa cấp số'}</strong></td><td>{dateTime(item.date)}</td><td>{item.from}</td><td>{item.to}</td><td>{transferLines(item).length}</td><td>{money.format(item.total)}</td><td><span className={`management-badge ${item.status}`}>{item.status==='completed'?'Hoàn thành':'Lưu tạm'}</span></td><td>{item.creator}</td><td>{editable?<button type="button" className="text-button" onClick={()=>setEditing(item)} aria-label={`Sửa phiếu ${item.number}`}><Pencil size={14}/>Sửa</button>:<button type="button" className="text-button" onClick={()=>setViewing(item)} aria-label={`Xem chi tiết phiếu ${item.number}`}><Eye size={14}/>Chi tiết</button>}</td></tr>})}</tbody>
      </table></div>
      {!vouchers.length&&<div className="empty-state"><h3>Chưa có phiếu chuyển kho</h3></div>}
    </section>
    {editing&&<TransferForm key={editing.id} voucher={editing} stock={stock} warehouses={warehouses} existing={vouchers} onClose={()=>setEditing(null)} onSaveDraft={onSaveDraft} onComplete={onComplete} onDone={message=>{setEditing(null);setNotice(message)}}/>}
    {viewing&&<TransferView voucher={viewing} stock={stock} onClose={()=>setViewing(null)}/>}
  </>
}

function TransferForm({voucher,stock,warehouses,existing,onClose,onSaveDraft,onComplete,onDone}:{voucher:TransferVoucher;stock:{products:TransferStockRow[];lots:TransferStockLot[]};warehouses:string[];existing:TransferVoucher[];onClose:()=>void;onSaveDraft:Props['onSaveDraft'];onComplete:Props['onComplete'];onDone:(message:string)=>void}){
  const {products,lots}=stock
  const toFormLine=(line:TransferDraftLine):FormLine=>{const row=products.find(item=>item.id===line.productId);return {id:line.id,productId:line.productId,query:row?productLabel(row):'',lotId:line.lotId,quantity:String(line.enteredQuantity??line.quantity),unitCode:line.enteredUnit??row?.unit??''}}
  const [header,setHeader]=useState<Header>({from:voucher.from,to:voucher.to,date:voucher.date,description:voucher.description??''})
  const [lines,setLines]=useState<FormLine[]>(()=>{const saved=transferLines(voucher).map(toFormLine);return saved.length?saved:[blankLine()]})
  const [attempted,setAttempted]=useState(false)
  const [submitProblems,setSubmitProblems]=useState<LedgerProblem[]>([])
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)

  const rowOf=(line:FormLine)=>products.find(item=>item.id===line.productId)
  const factorOf=(line:FormLine)=>{const row=rowOf(line);return row?unitsOf(row).find(unit=>unit.code===line.unitCode)?.factor??1:1}
  const draftLines:TransferDraftLine[]=lines.map(line=>{const entered=Number(line.quantity);const factor=factorOf(line);const base=Number.isFinite(entered)?Math.round(entered*factor*1000)/1000:Number.NaN;const row=rowOf(line);return {id:line.id,productId:line.productId,lotId:line.lotId,quantity:line.quantity===''?0:base,...(row&&line.unitCode&&line.unitCode!==row.unit?{enteredQuantity:entered,enteredUnit:line.unitCode}:{})}})
  const check=checkTransfer(stock,header,draftLines)
  const described=describeLines(stock,draftLines)
  const total=transferTotal(described)
  const sourceProducts=products.filter(item=>item.warehouse===header.from)
  const dateError:Shown[]=attempted&&!header.date?[{code:'WAREHOUSE_REQUIRED',message:'Chọn ngày giờ chuyển kho.',lineIds:[]}]:[]
  const generalErrors=[...dateError,...check.errors.filter(item=>!item.lineIds.length&&(attempted||item.code==='SAME_WAREHOUSE')),...submitProblems.filter(item=>!item.lineIds.length)]
  const lineMessages=(line:FormLine,tone:'error'|'warning'):Shown[]=>{const touched=attempted||line.productId!==''||line.quantity!=='';const source=tone==='error'?[...check.errors,...submitProblems]:check.warnings;return touched?source.filter(item=>item.lineIds.includes(line.id)):[]}

  const updateLine=(id:string,change:Partial<FormLine>)=>{setSubmitProblems([]);setLines(current=>current.map(line=>line.id===id?{...line,...change}:line))}
  const chooseProduct=(line:FormLine,query:string)=>{const needle=query.trim().toLocaleLowerCase('vi');const match=sourceProducts.find(item=>productLabel(item).toLocaleLowerCase('vi')===needle||item.code.toLocaleLowerCase('vi')===needle);updateLine(line.id,match?{query:productLabel(match),productId:match.id,lotId:null,unitCode:match.unit}:{query,productId:'',lotId:null,unitCode:''})}
  /** Đổi kho xuất: ánh xạ từng dòng sang dòng tồn cùng mã hàng (và cùng số lô) ở kho mới; dòng không ánh xạ được sẽ được báo lỗi. */
  const changeSource=(from:string)=>{
    let unmatched=0
    const next=lines.map(line=>{
      const row=rowOf(line);if(!row)return line
      const mapped=products.find(item=>item.code===row.code&&item.warehouse===from)
      if(!mapped){unmatched++;return line}
      const oldLot=line.lotId?lots.find(item=>item.id===line.lotId):null
      const newLot=oldLot?lots.find(item=>item.productId===mapped.id&&item.number===oldLot.number):null
      if(oldLot&&!newLot)unmatched++
      return {...line,productId:mapped.id,lotId:newLot?.id??null}
    })
    setLines(next);setHeader(current=>({...current,from}));setSubmitProblems([])
    setNotice(lines.some(line=>line.productId)?`Đã đổi kho xuất sang ${from}. Tồn khả dụng và lô được tính lại theo kho mới${unmatched?`; ${unmatched} dòng cần chọn lại hàng hóa hoặc lô`:''}.`:'')
  }
  const autoFefo=()=>{
    const allocated=allocateFefo(stock,draftLines.filter(line=>line.productId),()=>crypto.randomUUID())
    const byId=new Map(lines.map(line=>[line.id,line]))
    setLines([...allocated.map(line=>{const row=products.find(item=>item.id===line.productId);const original=byId.get(line.id);return original&&original.lotId===line.lotId?original:{id:line.id,productId:line.productId,query:row?productLabel(row):'',lotId:line.lotId,quantity:String(line.quantity),unitCode:row?.unit??''}}),...lines.filter(line=>!line.productId)])
    setNotice('Đã tự chọn lô theo FEFO cho các dòng chưa chọn lô; các lô đã chọn thủ công được giữ nguyên.')
  }
  /** Phiếu gửi đi luôn ở trạng thái nháp; chỉ sổ kho mới chuyển sang hoàn thành sau khi ghi tồn. */
  const build=():TransferVoucher=>{const kept=described.filter(line=>line.productId);return {...voucher,date:header.date,from:header.from,to:header.to,description:header.description.trim(),status:'draft',lines:kept,total:transferTotal(kept),productId:undefined,quantity:undefined}}
  const submit=(mode:'draft'|'complete')=>{
    if(busy)return
    setAttempted(true);setSubmitProblems([])
    const structural=check.errors.filter(item=>['WAREHOUSE_REQUIRED','SAME_WAREHOUSE','NO_LINES','PRODUCT_REQUIRED','QUANTITY_INVALID'].includes(item.code))
    if(!header.date||(mode==='draft'?structural.length:check.errors.length))return
    setBusy(true)
    const result=(mode==='draft'?onSaveDraft:onComplete)(build())
    setBusy(false)
    if(!result.ok){setSubmitProblems(result.problems);return}
    onDone(mode==='draft'?`Đã lưu tạm phiếu ${result.voucher.number}; tồn kho chưa thay đổi.`:`Đã hoàn thành phiếu ${result.voucher.number}: ghi giảm ${result.voucher.from}, ghi tăng ${result.voucher.to}.`)
  }

  const voucherNumber=voucher.number||`${nextTransferNumber(existing)} (tự cấp khi lưu)`
  return <Dialog title={voucher.number?`Phiếu chuyển kho ${voucher.number}`:'Thêm mới phiếu chuyển kho'} kicker="CHỨNG TỪ KHO · DỮ LIỆU MINH HỌA" onClose={onClose}>
    <form className="management-form transfer-form" noValidate onSubmit={event=>{event.preventDefault();submit('complete')}}>
      <section className="transfer-section" aria-label="Thông tin chung">
        <div className="management-form-grid transfer-header-grid">
          <label>Chi nhánh xuất<Select label="Chi nhánh xuất" value={header.from} onValueChange={value=>changeSource(value)}>{warehouses.map(item=><option key={item}>{item}</option>)}</Select></label>
          <label>Chi nhánh nhập<Select label="Chi nhánh nhập" value={header.to} onValueChange={value=>{setHeader(current=>({...current,to:value}));setSubmitProblems([])}}>{warehouses.map(item=><option key={item} disabled={item===header.from}>{item}</option>)}</Select></label>
          <label>Thời gian (giờ Việt Nam)<input type="datetime-local" value={header.date} required onChange={event=>setHeader(current=>({...current,date:event.target.value}))}/></label>
          <label>Diễn giải<input value={header.description} maxLength={250} onChange={event=>setHeader(current=>({...current,description:event.target.value}))}/></label>
          <label>Số phiếu<input value={voucherNumber} readOnly/></label>
          <label>Người lập phiếu<input value={voucher.creator} readOnly/></label>
        </div>
        <Messages items={generalErrors} tone="error" live/>
      </section>
      <section className="transfer-section" aria-label="Chi tiết hàng hóa chuyển kho">
        <div className="transfer-line-toolbar"><h3>Chi tiết hàng hóa</h3><div>
          <button type="button" className="outline" onClick={()=>setLines(current=>[...current,blankLine()])}><Plus size={15}/>Thêm dòng</button>
          <button type="button" className="outline" disabled={!lines.some(line=>line.productId&&!line.lotId)} onClick={autoFefo}><Sparkles size={15}/>Tự chọn lô theo FEFO</button>
          <button type="button" className="outline danger-text" disabled={!lines.length} onClick={()=>{setLines([]);setNotice('');setSubmitProblems([])}}><Eraser size={15}/>Xóa hết dòng</button>
        </div></div>
        {notice&&<p className="transfer-notice" role="status">{notice}</p>}
        <datalist id="transfer-product-options">{sourceProducts.map(item=><option key={item.id} value={productLabel(item)}/>)}</datalist>
        <div className="transfer-lines-scroll"><table className="transfer-lines">
          <thead><tr><th>#</th><th>Mã hàng hóa</th><th>Tên hàng hóa</th><th>Số lô</th><th>Hạn sử dụng</th><th>Đơn vị tính</th><th>Tồn khả dụng</th><th>Số lượng chuyển</th><th>Đơn giá vốn</th><th>Thành tiền</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody>{lines.map((line,index)=>{
            const row=rowOf(line);const availability=row?sourceAvailability(stock,row.id):null;const record=described[index]!;const errors=lineMessages(line,'error');const warnings=lineMessages(line,'warning');const position=index+1
            const lotOption=availability?.lots.find(option=>option.lot.id===line.lotId)
            return [<tr key={line.id} className={errors.length?'has-error':undefined}>
              <td>{position}</td>
              <td><strong>{row?.code??'—'}</strong></td>
              <td><input aria-label={`Hàng hóa dòng ${position}`} list="transfer-product-options" value={line.query} placeholder="Tìm mã hoặc tên hàng…" aria-invalid={errors.length>0} onChange={event=>chooseProduct(line,event.target.value)}/></td>
              <td><Select label={`Số lô dòng ${position}`} size="sm" value={line.lotId??''} disabled={!row} onValueChange={value=>updateLine(line.id,{lotId:value||null})}>
                <option value="">{availability?.lots.length&&availability.untracked<=0?'Chọn lô…':'Không theo lô'}</option>
                {availability?.lots.map(option=><option key={option.lot.id} value={option.lot.id} disabled={!option.transferable}>{option.lot.number} · HSD {dateOnly(option.lot.expiresAt)} · còn {number.format(option.lot.remaining)} {row?.unit}{option.state==='expired'?' · đã hết hạn':option.state==='out'?' · hết hàng':option.state==='expiring'?' · sắp hết hạn':''}</option>)}
              </Select>{lotOption&&<small>NSX {dateOnly(lotOption.lot.manufacturedAt)}</small>}</td>
              <td>{record.lotNumber?<>{dateOnly(record.expiresAt)}{lotOption?.state==='expiring'&&<span className="management-badge expiring">Sắp hết hạn</span>}</>:'—'}</td>
              <td>{row&&unitsOf(row).length>1?<Select label={`Đơn vị tính dòng ${position}`} size="sm" value={line.unitCode} onValueChange={value=>updateLine(line.id,{unitCode:value})}>{unitsOf(row).map(unit=><option key={unit.code} value={unit.code}>{unit.label}</option>)}</Select>:row?.unit??'—'}</td>
              <td>{availability?<><strong>{number.format(availability.available)} {row?.unit}</strong><small>Tổng {number.format(availability.onHand)} · Hết hạn {number.format(availability.expired)} · Giữ chỗ {number.format(availability.reserved)}</small>{lotOption&&<small>Lô còn {number.format(lotOption.lot.remaining)} {row?.unit}</small>}</>:'—'}</td>
              <td><input aria-label={`Số lượng chuyển dòng ${position}`} type="number" inputMode="decimal" min="0" step="any" value={line.quantity} aria-invalid={errors.length>0} onChange={event=>updateLine(line.id,{quantity:event.target.value})}/>{record.quantity>0&&line.unitCode!==row?.unit&&row&&<small>= {number.format(record.quantity)} {row.unit}</small>}</td>
              <td>{row?money.format(record.unitCost):'—'}</td>
              <td><strong>{money.format(record.amount)}</strong></td>
              <td><button type="button" className="icon-button transfer-remove-line" aria-label={`Xóa dòng ${position}`} onClick={()=>{setSubmitProblems([]);setLines(current=>current.filter(item=>item.id!==line.id))}}><Trash2 size={16}/></button></td>
            </tr>,(errors.length>0||warnings.length>0)&&<tr key={`${line.id}-messages`} className="transfer-line-messages"><td colSpan={11}><Messages items={errors} tone="error"/><Messages items={warnings} tone="warning"/></td></tr>]})}</tbody>
        </table></div>
        {!lines.length&&<div className="empty-state"><h3>Chưa có dòng hàng hóa</h3><p>Bấm “Thêm dòng” để chọn hàng hóa cần chuyển.</p></div>}
        <div className="transfer-summary"><span>Tổng số dòng hàng <strong>{lines.filter(line=>line.productId).length}</strong></span><span>Tổng giá trị chuyển kho <strong>{money.format(total)}</strong></span></div>
        <p className="demo-note">Giá vốn lấy theo lô (nếu có) hoặc theo tồn kho xuất, không sửa tay. Thành tiền = số lượng × đơn giá vốn. Chuyển kho nội bộ không ghi nhận doanh thu hay mua hàng. Khi hoàn thành, tồn và lô được kiểm tra lại với dữ liệu mới nhất trước khi ghi.</p>
      </section>
      <div className="management-form-actions transfer-actions">
        <button type="button" className="outline" onClick={onClose}>Hủy</button>
        <button type="button" className="outline" disabled={busy} onClick={()=>submit('draft')}>Lưu tạm</button>
        <button type="submit" className="primary" disabled={busy}>Hoàn thành</button>
      </div>
    </form>
  </Dialog>
}

function TransferView({voucher,stock,onClose}:{voucher:TransferVoucher;stock:{products:TransferStockRow[];lots:TransferStockLot[]};onClose:()=>void}){
  const lines=voucher.lines?.length?voucher.lines:describeLines(stock,transferLines(voucher))
  return <Dialog title={`Phiếu chuyển kho ${voucher.number}`} kicker={voucher.status==='completed'?'ĐÃ HOÀN THÀNH · CHỈ XEM':'LƯU TẠM · CHỈ XEM'} onClose={onClose}>
    <div className="management-detail-grid transfer-view-grid">
      <div><span>Chi nhánh xuất</span><strong>{voucher.from}</strong></div><div><span>Chi nhánh nhập</span><strong>{voucher.to}</strong></div><div><span>Thời gian</span><strong>{dateTime(voucher.date)}</strong></div>
      <div><span>Người lập</span><strong>{voucher.creator}</strong></div><div><span>Diễn giải</span><strong>{voucher.description||'—'}</strong></div><div><span>Tổng giá trị</span><strong>{money.format(voucher.total)}</strong></div>
    </div>
    <div className="table-scroll transfer-view-lines"><table><thead><tr><th>Mã hàng</th><th>Tên hàng</th><th>Số lô</th><th>Hạn sử dụng</th><th>Số lượng</th><th>Đơn giá vốn</th><th>Thành tiền</th></tr></thead><tbody>{lines.map(line=><tr key={line.id}><td><strong>{line.productCode||'—'}</strong></td><td>{line.productName||'Chưa có dữ liệu liên kết'}</td><td>{line.lotNumber??'—'}</td><td>{line.lotNumber?dateOnly(line.expiresAt):'—'}</td><td>{number.format(line.quantity)} {line.unit}{line.enteredUnit&&line.enteredUnit!==line.unit?<small>Nhập {number.format(line.enteredQuantity??0)} {line.enteredUnit}</small>:null}</td><td>{money.format(line.unitCost)}</td><td>{money.format(line.amount)}</td></tr>)}</tbody></table></div>
    {voucher.status==='completed'&&<p className="demo-note">Đã ghi giảm tồn {voucher.from} và ghi tăng tồn {voucher.to} theo từng dòng và lô; giá vốn của lô giữ nguyên.</p>}
  </Dialog>
}
