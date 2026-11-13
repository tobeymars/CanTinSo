import { Fragment, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { AlertCircle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, ChevronLeft, ChevronRight, FileText, History, Info, Printer, QrCode, Search, ShieldAlert, Truck } from 'lucide-react'
import { lotDocuments, lotMovementLabels, lotRequiresDates, lotSerials, lotSummary, lotWarnings, receiptKindText } from '../packages/domain/lot-detail'
import type { ExpiryInfo, ExpiryState, LotIssue, LotMovement, LotMovementKind, LotProductRow, LotReceipt, LotRecord, LotSummary, LotTransfer, LotWarning } from '../packages/domain/lot-detail'
import type { MovementDocument } from '../packages/domain/stock-detail'
import { acceptsReceiptKind } from '../packages/domain/warehouse-receipt'
import type { Supplier } from './lib/suppliers'
import Select from './components/ui/Select'
import './LotDetail.css'

export type LotDetailProduct = LotProductRow & { name:string; category:string }
type Props = {
  lotId:string; lots:readonly LotRecord[]; products:readonly LotDetailProduct[]
  receipts:readonly LotReceipt[]; issues:readonly LotIssue[]; transfers:readonly LotTransfer[]; suppliers:readonly Supplier[]
  /** Mặt hàng bắt buộc serial khi nhập kho. */
  serialManaged:boolean
  today:string; warningDays:number
  onOpenDocument:(document:MovementDocument)=>void
  /** Mở chi tiết tồn của mặt hàng tại kho, nếu màn hình gọi có hỗ trợ. */
  onOpenStock?:(productRowId:string)=>void
}
type DetailTab='overview'|'warehouses'|'movements'|'trace'|'documents'|'serial'
type KindFilter='all'|LotMovementKind

const tabs:{id:DetailTab;label:string}[]=[{id:'overview',label:'Tổng quan lô hàng'},{id:'warehouses',label:'Tồn kho theo chi nhánh'},{id:'movements',label:'Lịch sử biến động'},{id:'trace',label:'Truy xuất nguồn gốc'},{id:'documents',label:'Chứng từ liên quan'},{id:'serial',label:'Serial & QR'}]
const expiryLabels:Record<ExpiryState,{label:string;tone:string}>={valid:{label:'Còn hạn',tone:'active'},expiring:{label:'Sắp hết hạn',tone:'expiring'},expired:{label:'Hết hạn',tone:'expired'},untracked:{label:'Không quản lý hạn dùng',tone:'inactive'}}
const warningIcons:Record<LotWarning['tone'],ReactNode>={danger:<ShieldAlert size={16}/>,warning:<AlertCircle size={16}/>,info:<Info size={16}/>}
const PAGE_SIZE=8
const NO_DATA='Chưa có dữ liệu'
const NO_LINK='Chưa có dữ liệu liên kết'
const money=new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0})
const number=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3})
const signed=(value:number)=>`${value>0?'+':value<0?'−':''}${number.format(Math.abs(value))}`
const dateOnly=(value?:string)=>{const date=value?new Date(`${value.slice(0,10)}T12:00:00`):null;return date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('vi-VN'):NO_DATA}
const dateTime=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?NO_DATA:date.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
const daysText=(expiry:ExpiryInfo)=>expiry.daysLeft===null?'Không quản lý hạn dùng':expiry.daysLeft<0?`Quá hạn ${-expiry.daysLeft} ngày`:expiry.daysLeft===0?'Hết hạn sau hôm nay':`Còn ${expiry.daysLeft} ngày`

function Badge({tone,children}:{tone:string;children:ReactNode}){return <span className={`management-badge ${tone}`}>{children}</span>}
function Empty({icon,title,text}:{icon:ReactNode;title:string;text?:string}){return <div className="empty-state">{icon}<h3>{title}</h3>{text&&<p>{text}</p>}</div>}
function DocumentLink({document,onOpen}:{document:MovementDocument;onOpen:(document:MovementDocument)=>void}){return <button type="button" className="stock-document-link" onClick={()=>onOpen(document)} aria-label={`Mở chứng từ ${document.number}`}>{document.number}</button>}
function Fact({label,children}:{label:string;children:ReactNode}){return <div><span>{label}</span><strong>{children}</strong></div>}
const quantity=(value:number,unit:string)=>`${number.format(value)} ${unit}`.trim()

/** Nội dung modal "Chi tiết lô hàng": 6 tab đọc từ sổ lô và chứng từ kho đã hoàn thành; không tạo hay sửa số liệu. */
export default function LotDetail(props:Props){
  const {lotId,lots,products,receipts,issues,transfers,today,warningDays}=props
  const [tab,setTab]=useState<DetailTab>('overview')
  const summary=useMemo(()=>lotSummary({lotId,lots,products,documents:{receipts,issues,transfers},today,warningDays}),[lotId,lots,products,receipts,issues,transfers,today,warningDays])
  if(!summary) return <Empty icon={<AlertCircle/>} title="Không tìm thấy lô hàng" text="Lô không còn trong dữ liệu kho hoặc nằm ngoài phạm vi được xem."/>

  const primary=summary.allocations[0]!
  const product=products.find(item=>item.id===primary.productId)??null
  const unit=summary.balances.find(item=>item.unit)?.unit??product?.unit??''
  const warnings=lotWarnings(summary,{unit,requiresDates:product?lotRequiresDates(product):false})
  const expiry=expiryLabels[summary.expiry.state]
  const storing=summary.balances.filter(item=>item.onHand>0)

  const selectTab=(next:DetailTab)=>{setTab(next);requestAnimationFrame(()=>document.getElementById(`lot-tab-${next}`)?.focus())}
  const onTabKey=(event:KeyboardEvent<HTMLDivElement>)=>{const index=tabs.findIndex(item=>item.id===tab);const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index-1+tabs.length)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;if(next<0)return;event.preventDefault();selectTab(tabs[next]!.id)}

  return <div className="stock-detail lot-detail">
    <div className="lot-detail-head">
      <p><span>Mã lô</span><strong>{summary.number}</strong></p>
      <div className="lot-detail-badges" aria-label="Trạng thái hiện tại">{summary.onHand<=0&&<Badge tone="out">Hết hàng</Badge>}<Badge tone={expiry.tone}>{expiry.label}</Badge>{!summary.consistent&&<Badge tone="expired">Cần đối soát</Badge>}<Badge tone="inactive">Dữ liệu minh họa</Badge></div>
    </div>

    <div className="management-detail-grid stock-detail-summary lot-detail-summary">
      <Fact label="Hàng hóa">{product?`${product.code} · ${product.name}`:NO_DATA}</Fact>
      <Fact label="Kho đang lưu">{storing.length===0?'Không còn tồn':storing.length===1?storing[0]!.warehouse:`${storing.length} kho`}</Fact>
      <Fact label="Tồn hiện tại">{quantity(summary.onHand,unit)}</Fact>
      <Fact label="Tồn khả dụng">{quantity(summary.available,unit)}</Fact>
      <Fact label="Hạn sử dụng">{dateOnly(primary.expiresAt)}<small>{daysText(summary.expiry)}</small></Fact>
      <Fact label="Giá trị tồn">{summary.value===null?NO_DATA:money.format(summary.value)}</Fact>
    </div>

    {warnings.length>0&&<ul className="lot-warnings" aria-label="Cảnh báo lô hàng">{warnings.map(item=><li key={item.code} className={item.tone}>{warningIcons[item.tone]}<span>{item.message}</span></li>)}</ul>}

    <div className="stock-detail-tabs" role="tablist" aria-label="Nhóm thông tin lô hàng" onKeyDown={onTabKey}>
      {tabs.map(item=><button key={item.id} type="button" role="tab" id={`lot-tab-${item.id}`} aria-selected={tab===item.id} aria-controls={`lot-panel-${item.id}`} tabIndex={tab===item.id?0:-1} onClick={()=>setTab(item.id)}>{item.label}</button>)}
    </div>

    <div className="stock-detail-panel" role="tabpanel" id={`lot-panel-${tab}`} aria-labelledby={`lot-tab-${tab}`}>
      {tab==='overview'&&<OverviewPanel summary={summary} product={product} unit={unit} warningDays={warningDays} onOpenDocument={props.onOpenDocument}/>}
      {tab==='warehouses'&&<WarehousesPanel summary={summary} unit={unit} onOpenStock={props.onOpenStock}/>}
      {tab==='movements'&&<MovementsPanel summary={summary} unit={unit} onOpenDocument={props.onOpenDocument}/>}
      {tab==='trace'&&<TracePanel summary={summary} unit={unit} suppliers={props.suppliers} onOpenDocument={props.onOpenDocument}/>}
      {tab==='documents'&&<DocumentsPanel summary={summary} onOpenDocument={props.onOpenDocument}/>}
      {tab==='serial'&&<SerialPanel summary={summary} product={product} receipts={receipts} serialManaged={props.serialManaged}/>}
    </div>
  </div>
}

function OverviewPanel({summary,product,unit,warningDays,onOpenDocument}:{summary:LotSummary;product:LotDetailProduct|null;unit:string;warningDays:number;onOpenDocument:(document:MovementDocument)=>void}){
  const primary=summary.allocations[0]!
  const source=summary.sources[0]
  const expiry=expiryLabels[summary.expiry.state]
  const storing=summary.balances.filter(item=>item.onHand>0)
  const adjustment=summary.adjustmentIn-summary.adjustmentOut
  const productCost=summary.balances.find(item=>item.productUnitCost!==null)?.productUnitCost??null
  const stats:Array<[string,ReactNode,string?]>=[
    ['Nhập ban đầu',summary.initialQuantity===null?NO_DATA:quantity(summary.initialQuantity,unit),source?`Phiếu ${source.receipt.number}`:'Chưa có phiếu nhập gốc'],
    ['Nhập bổ sung',quantity(summary.supplemental,unit),`${Math.max(0,summary.sources.length-1)} phiếu nhập thêm`],
    ['Đã xuất',quantity(summary.issued,unit),'Xuất sử dụng/bán khỏi kho'],
    ['Đã chuyển',quantity(summary.transferred,unit),'Nội bộ, không đổi tổng tồn lô'],
    ['Điều chỉnh',`${signed(adjustment)} ${unit}`.trim(),`Tăng ${number.format(summary.adjustmentIn)} · giảm ${number.format(summary.adjustmentOut)}`],
    ['Tồn hiện tại',quantity(summary.onHand,unit),`${summary.balances.filter(item=>item.onHand>0).length} kho đang giữ`],
    ['Tồn hết hạn',quantity(summary.expired,unit),'Không được sử dụng'],
    ['Tồn khả dụng',quantity(summary.available,unit),'Tồn thực tế − tồn hết hạn'],
    ['Đã giữ chỗ',NO_DATA,'Giữ chỗ đang ghi theo mặt hàng, chưa theo lô'],
    ...(summary.opening>0?[['Tồn đầu kỳ chưa có chứng từ',quantity(summary.opening,unit),'Có trên sổ lô, chưa có phiếu nhập'] as [string,ReactNode,string]]:[]),
  ]
  return <>
    <h3 className="management-subheading">A. Thông tin hàng hóa</h3>
    <div className="management-detail-grid lot-facts">
      <Fact label="Mã lô">{summary.number}</Fact>
      <Fact label="Mã hàng hóa">{product?.code??NO_DATA}</Fact>
      <Fact label="Tên hàng hóa">{product?.name??NO_DATA}</Fact>
      <Fact label="Phân loại">{product?acceptsReceiptKind(product,'STOCK_GOODS')?'Hàng hóa':'Nguyên, nhiên liệu':NO_DATA}</Fact>
      <Fact label="Nhóm hàng">{product?.category??NO_DATA}</Fact>
      <Fact label="Đơn vị tính chuẩn">{unit||NO_DATA}</Fact>
      <Fact label="Kho/chi nhánh đang lưu trữ">{storing.length?storing.map(item=>item.warehouse).join(', '):'Không còn tồn tại kho nào'}</Fact>
      <Fact label="Trạng thái lô"><Badge tone={summary.onHand<=0?'out':expiry.tone}>{summary.onHand<=0?'Hết hàng':expiry.label}</Badge></Fact>
    </div>

    <h3 className="management-subheading">B. Thông tin nhập kho</h3>
    {source?<div className="management-detail-grid lot-facts">
      <Fact label="Ngày giờ nhập">{dateTime(source.receipt.date)}</Fact>
      <Fact label="Số phiếu nhập gốc"><DocumentLink document={{type:'receipt',id:source.receipt.id,number:source.receipt.number}} onOpen={onOpenDocument}/></Fact>
      <Fact label="Loại nhập kho">{receiptKindText(source.receipt.kind)??NO_DATA}</Fact>
      <Fact label="Nhà cung cấp">{source.receipt.supplier||NO_DATA}</Fact>
      <Fact label="Người lập phiếu">{source.receipt.creator||NO_DATA}</Fact>
      <Fact label="Người nhận hàng">Chưa ghi nhận</Fact>
      <Fact label="Số hóa đơn mua hàng">{source.receipt.invoiceNumber||NO_DATA}</Fact>
      <Fact label="Tham chiếu chứng từ">{source.receipt.reference||NO_DATA}</Fact>
    </div>:<p className="stock-detail-missing">{NO_DATA} · Chưa có phiếu nhập nào ghi nhận lô {summary.number}{summary.opening>0?`; ${quantity(summary.opening,unit)} là tồn đầu kỳ chưa có chứng từ`:''}. Không suy diễn nhà cung cấp hoặc ngày nhập.</p>}

    <h3 className="management-subheading">C. Ngày sản xuất và hạn sử dụng</h3>
    <div className="management-detail-grid lot-facts">
      <Fact label="Ngày sản xuất">{dateOnly(primary.manufacturedAt)}</Fact>
      <Fact label="Hạn sử dụng">{dateOnly(primary.expiresAt)}</Fact>
      <Fact label="Số ngày còn hạn">{daysText(summary.expiry)}</Fact>
      <Fact label="Trạng thái sử dụng"><Badge tone={expiry.tone}>{expiry.label}</Badge></Fact>
    </div>
    <p className="stock-detail-note">Tính theo ngày hiện tại; “Sắp hết hạn” khi còn từ 0 đến {warningDays} ngày (ngưỡng cấu hình của phân hệ kho).</p>

    <h3 className="management-subheading">D. Tổng hợp số lượng</h3>
    <div className="lot-stat-grid">{stats.map(([label,value,note])=><article key={label}><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</article>)}</div>
    <p className={`lot-formula ${summary.consistent?'ok':'gap'}`}>
      <span>Tồn toàn lô = tồn đầu kỳ {number.format(summary.opening)} + nhập {number.format((summary.initialQuantity??0)+summary.supplemental)} − xuất {number.format(summary.issued)} {adjustment<0?'−':'+'} điều chỉnh {number.format(Math.abs(adjustment))} = <strong>{quantity(summary.expectedOnHand,unit)}</strong></span>
      <span>Sổ lô: <strong>{quantity(summary.onHand,unit)}</strong> · {summary.consistent?'Khớp chứng từ':'Lệch chứng từ, cần đối soát'}</span>
    </p>
    <p className="stock-detail-note">Chuyển kho nội bộ chỉ đổi phân bổ giữa các kho, không làm thay đổi tồn toàn lô. Tồn khả dụng = tồn thực tế − tồn hết hạn; giữ chỗ chưa được ghi theo lô nên chưa trừ.</p>

    <h3 className="management-subheading">E. Giá vốn</h3>
    <div className="management-detail-grid lot-facts">
      <Fact label="Đơn giá vốn của lô">{summary.unitCost===null?NO_DATA:`${money.format(summary.unitCost)} / ${unit}`}<small>{summary.costSource==='lot'?'Theo giá vốn ghi trên lô':summary.costSource==='receipt'?'Theo đơn giá phiếu nhập gốc':productCost!==null?`Giá vốn mặt hàng tại kho ${money.format(productCost)}, không riêng lô`:''}</small></Fact>
      <Fact label="Giá trị tồn hiện tại">{summary.value===null?NO_DATA:money.format(summary.value)}</Fact>
      <Fact label="Tổng giá trị nhập ban đầu">{summary.initialValue===null?NO_DATA:money.format(summary.initialValue)}</Fact>
      <Fact label="Phương pháp định giá">Chưa có cấu hình<small>Hệ thống chưa khai báo phương pháp định giá</small></Fact>
    </div>
  </>
}

function WarehousesPanel({summary,unit,onOpenStock}:{summary:LotSummary;unit:string;onOpenStock?:(productRowId:string)=>void}){
  const total=(key:'onHand'|'expired'|'available')=>summary.balances.reduce((sum,item)=>sum+item[key],0)
  const reserved=summary.balances.filter(item=>item.productReserved>0)
  return <>
    <div className="table-scroll"><table><thead><tr><th>Kho/chi nhánh</th><th>Tổng nhập</th><th>Tổng xuất</th><th>Tồn hiện tại</th><th>Hết hạn</th><th>Giữ chỗ</th><th>Khả dụng</th><th>Đơn vị</th></tr></thead>
      <tbody>{summary.balances.map(item=><tr key={item.warehouse}>
        <td>{onOpenStock&&item.productRowId?<button type="button" className="stock-document-link" onClick={()=>onOpenStock(item.productRowId!)} aria-label={`Xem tồn kho mặt hàng tại ${item.warehouse}`}>{item.warehouse}</button>:<strong>{item.warehouse}</strong>}{Math.abs(item.mismatch)>1e-6&&<small className="stock-detail-alert">Lệch {signed(item.mismatch)} so với chứng từ</small>}</td>
        <td>{number.format(item.inbound)}{item.opening>0&&<small>Gồm {number.format(item.opening)} tồn đầu kỳ chưa có chứng từ</small>}</td>
        <td>{number.format(item.outbound)}</td>
        <td><strong>{number.format(item.onHand)}</strong></td>
        <td className={item.expired>0?'stock-qty out':''}>{number.format(item.expired)}</td>
        <td>—{item.productReserved>0&&<small>Mặt hàng tại kho giữ {number.format(item.productReserved)}</small>}</td>
        <td><strong>{number.format(item.available)}</strong>{item.expiry.state==='expired'&&item.onHand>0&&<Badge tone="expired">Hết hạn</Badge>}</td>
        <td>{item.unit||unit}</td>
      </tr>)}</tbody>
      {summary.balances.length>1&&<tfoot><tr><th>Toàn lô</th><th>—</th><th>—</th><th>{number.format(total('onHand'))}</th><th>{number.format(total('expired'))}</th><th>—</th><th>{number.format(total('available'))}</th><th>{unit}</th></tr></tfoot>}
    </table></div>
    <p className="stock-detail-note">Mỗi dòng là phần của cùng một lô tại một kho; tổng toàn lô không cộng trùng hàng chuyển kho. Tổng nhập/xuất của từng kho gồm cả chuyển kho nội bộ nên không cộng dồn ở dòng toàn lô. Hàng hết hạn không tính vào khả dụng.</p>
    {reserved.length>0&&<p className="stock-detail-note">Giữ chỗ đang được ghi theo mặt hàng tại kho ({reserved.map(item=>`${item.warehouse}: ${quantity(item.productReserved,unit)}`).join(' · ')}), chưa phân bổ cho lô nào nên không trừ vào khả dụng của lô.</p>}
  </>
}

function MovementsPanel({summary,unit,onOpenDocument}:{summary:LotSummary;unit:string;onOpenDocument:(document:MovementDocument)=>void}){
  const [kind,setKind]=useState<KindFilter>('all');const [from,setFrom]=useState('');const [to,setTo]=useState('');const [page,setPage]=useState(1);const [open,setOpen]=useState<string|null>(null)
  const filtered=summary.movements.filter(move=>(kind==='all'||move.kind===kind)&&(!from||move.at.slice(0,10)>=from)&&(!to||move.at.slice(0,10)<=to))
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));const currentPage=Math.min(page,pages);const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE)
  const reset=<T,>(setter:(value:T)=>void)=>(value:T)=>{setter(value);setPage(1);setOpen(null)}
  const counterpart=(move:LotMovement)=>move.pairKey?summary.movements.find(item=>item.pairKey===move.pairKey&&item.id!==move.id)??null:null
  const party=(move:LotMovement,side:'source'|'destination')=>{const value=move[side];if(!value)return '—';const role=side==='source'&&(move.kind==='receipt'||move.kind==='receipt_extra')?'Nhà cung cấp':side==='destination'&&move.kind==='issue'?'Người nhận':null;return role?<><small className="lot-cell-label">{role}</small>{value}</>:value}
  return <>
    <div className="management-toolbar stock-detail-toolbar">
      <label><span>Loại giao dịch</span><Select label="Loại giao dịch" size="sm" value={kind} onValueChange={value=>reset(setKind)(value as KindFilter)}><option value="all">Tất cả nghiệp vụ</option>{(Object.keys(lotMovementLabels) as LotMovementKind[]).map(value=><option value={value} key={value}>{lotMovementLabels[value]}</option>)}</Select></label>
      <label><span>Từ ngày</span><input type="date" value={from} max={to||undefined} onChange={event=>reset(setFrom)(event.target.value)}/></label>
      <label><span>Đến ngày</span><input type="date" value={to} min={from||undefined} onChange={event=>reset(setTo)(event.target.value)}/></label>
    </div>
    {!summary.movements.length?<Empty icon={<History/>} title="Chưa có biến động được ghi nhận cho lô" text={`Chỉ hiển thị phiếu nhập, xuất, chuyển kho đã hoàn thành có ghi đúng lô.${summary.opening>0?` ${quantity(summary.opening,unit)} trên sổ lô là tồn đầu kỳ chưa có chứng từ.`:''}`}/>
      :!filtered.length?<Empty icon={<Search/>} title="Không có biến động phù hợp bộ lọc"/>
      :<><div className="table-scroll"><table className="lot-movements"><thead><tr><th>Thời gian</th><th>Loại nghiệp vụ</th><th>Số lượng</th><th>Tồn trước</th><th>Tồn sau</th><th>Kho nguồn</th><th>Kho đích</th><th>Số chứng từ</th><th>Người thực hiện</th><th>Diễn giải</th><th>Thao tác</th></tr></thead>
        <tbody>{visible.map(move=>{const pair=counterpart(move);const expanded=open===move.id;return <Fragment key={move.id}>
          <tr className={expanded?'selected-row':undefined}>
            <td>{dateTime(move.at)}</td>
            <td>{move.label}{move.documentKind&&move.documentKind!==move.label&&<small>{move.documentKind}</small>}</td>
            <td className={`stock-qty ${move.quantity<0?'out':'in'}`}><strong>{signed(move.quantity)} {unit}</strong></td>
            <td>{number.format(move.before)}<small>tại {move.warehouse}</small></td>
            <td><strong>{number.format(move.after)}</strong></td>
            <td>{party(move,'source')}</td>
            <td>{party(move,'destination')}</td>
            <td><DocumentLink document={move.document} onOpen={onOpenDocument}/></td>
            <td>{move.actor??'Chưa ghi nhận'}</td>
            <td>{move.note??'—'}</td>
            <td><button type="button" className="text-button" aria-expanded={expanded} aria-controls={`lot-move-${move.id}`} onClick={()=>setOpen(expanded?null:move.id)} aria-label={`${expanded?'Ẩn':'Xem'} chi tiết ${move.label} ${move.document.number}`}>{expanded?'Ẩn':'Chi tiết'}</button></td>
          </tr>
          {expanded&&<tr id={`lot-move-${move.id}`} className="lot-movement-detail"><td colSpan={11}>
            <div className="management-detail-grid lot-facts">
              <Fact label="Chứng từ">{move.document.number}{move.documentKind&&<small>{move.documentKind}</small>}</Fact>
              <Fact label="Kho phát sinh">{move.warehouse}</Fact>
              <Fact label="Tồn tại kho">{number.format(move.before)} → {number.format(move.after)} {unit}</Fact>
              {pair&&<Fact label="Dòng đối ứng cùng phiếu">{pair.label} {signed(pair.quantity)} {unit} tại {pair.warehouse}<small>Tồn {number.format(pair.before)} → {number.format(pair.after)}</small></Fact>}
            </div>
            <button type="button" className="outline" onClick={()=>onOpenDocument(move.document)}><FileText size={15}/>Mở phiếu {move.document.number}</button>
          </td></tr>}
        </Fragment>})}</tbody></table></div>
        <footer className="management-pagination"><span>{filtered.length} biến động</span><div><button type="button" aria-label="Trang trước" disabled={currentPage<=1} onClick={()=>{setPage(currentPage-1);setOpen(null)}}><ChevronLeft/></button><strong>{currentPage}/{pages}</strong><button type="button" aria-label="Trang sau" disabled={currentPage>=pages} onClick={()=>{setPage(currentPage+1);setOpen(null)}}><ChevronRight/></button></div></footer></>}
    <p className="stock-detail-note">Mới nhất trước. Tồn trước/sau tính tại kho phát sinh trên toàn bộ lịch sử của lô, không phụ thuộc bộ lọc hay trang. Phiếu lưu tạm không tạo biến động. Hệ thống chưa có biên bản kiểm kê riêng; chênh lệch kiểm kê được ghi qua phiếu nhập/xuất điều chỉnh. Chưa có nghiệp vụ hoàn trả.</p>
  </>
}

function TraceStep({index,icon,title,ready,children}:{index:number;icon:ReactNode;title:string;ready:boolean;children:ReactNode}){
  return <li className={ready?'ready':'missing'}><span className="lot-trace-marker" aria-hidden="true">{icon}</span><div><header><h3><small>Bước {index}</small>{title}</h3><Badge tone={ready?'active':'inactive'}>{ready?'Có chứng từ':NO_DATA}</Badge></header>{children}</div></li>
}

function TracePanel({summary,unit,suppliers,onOpenDocument}:{summary:LotSummary;unit:string;suppliers:readonly Supplier[];onOpenDocument:(document:MovementDocument)=>void}){
  const chronological=[...summary.movements].reverse()
  const receipts=chronological.filter(move=>move.kind==='receipt'||move.kind==='receipt_extra')
  const transfers=chronological.filter(move=>move.kind==='transfer_out')
  const issues=chronological.filter(move=>move.kind==='issue')
  const openingAt=summary.balances.filter(item=>item.opening>0)
  return <>
    <ol className="lot-trace" aria-label="Hành trình lô hàng">
      <TraceStep index={1} icon={<Truck size={16}/>} title="Nguồn cung cấp" ready={summary.sources.length>0}>
        {summary.sources.length?summary.sources.map(({receipt})=>{const supplier=receipt.supplierId?suppliers.find(item=>item.id===receipt.supplierId):undefined;return <div className="management-detail-grid lot-facts" key={receipt.id}>
          <Fact label="Nhà cung cấp">{supplier?.name??receipt.supplier??NO_DATA}{!supplier&&<small>Chưa liên kết hồ sơ nhà cung cấp</small>}</Fact>
          <Fact label="Mã nhà cung cấp">{supplier?.code??NO_DATA}</Fact>
          <Fact label="Địa chỉ">{supplier?.address||NO_DATA}</Fact>
          <Fact label="Liên hệ">{[supplier?.phone,supplier?.email].filter(Boolean).join(' · ')||NO_DATA}</Fact>
          <Fact label="Số hóa đơn">{receipt.invoiceNumber||NO_DATA}</Fact>
          <Fact label="Chứng từ nguồn gốc">{receipt.fileName?<>{receipt.fileName}<small>Chỉ lưu tên tệp, chưa tải lên máy chủ</small></>:NO_DATA}</Fact>
        </div>}):<p className="stock-detail-missing">{NO_LINK} · Không có phiếu nhập nào ghi nhận lô {summary.number}; không suy diễn nhà cung cấp hoặc xuất xứ.</p>}
      </TraceStep>
      <TraceStep index={2} icon={<ArrowDownToLine size={16}/>} title="Nhập kho" ready={receipts.length>0}>
        {receipts.length?<div className="table-scroll"><table><thead><tr><th>Phiếu nhập</th><th>Ngày giờ nhập</th><th>Kho tiếp nhận</th><th>Số lượng nhập</th><th>Người thực hiện</th></tr></thead><tbody>{receipts.map(move=><tr key={move.id}><td><DocumentLink document={move.document} onOpen={onOpenDocument}/>{move.kind==='receipt'&&<small>Phiếu nhập gốc</small>}</td><td>{dateTime(move.at)}</td><td>{move.warehouse}</td><td className="stock-qty in"><strong>{signed(move.quantity)} {unit}</strong></td><td>{move.actor??'Chưa ghi nhận'}</td></tr>)}</tbody></table></div>:<p className="stock-detail-missing">{NO_LINK} · Chưa có phiếu nhập kho của lô.</p>}
        {openingAt.length>0&&<p className="stock-detail-note">Tồn đầu kỳ chưa có chứng từ: {openingAt.map(item=>`${item.warehouse} ${quantity(item.opening,unit)}`).join(' · ')}.</p>}
      </TraceStep>
      <TraceStep index={3} icon={<ArrowLeftRight size={16}/>} title="Lưu trữ và chuyển kho" ready={transfers.length>0}>
        <p className="lot-trace-text">Kho lưu trữ: {summary.allocations.map(item=>item.warehouse).join(', ')}</p>
        {transfers.length?<div className="table-scroll"><table><thead><tr><th>Phiếu chuyển kho</th><th>Thời gian chuyển</th><th>Kho xuất</th><th>Kho nhận</th><th>Số lượng chuyển</th></tr></thead><tbody>{transfers.map(move=><tr key={move.id}><td><DocumentLink document={move.document} onOpen={onOpenDocument}/></td><td>{dateTime(move.at)}</td><td>{move.source}</td><td>{move.destination}</td><td><strong>{quantity(-move.quantity,unit)}</strong></td></tr>)}</tbody></table></div>:<p className="stock-detail-missing">Chưa có phiếu chuyển kho đã hoàn thành ghi đúng lô này.</p>}
      </TraceStep>
      <TraceStep index={4} icon={<ArrowUpFromLine size={16}/>} title="Xuất sử dụng" ready={issues.length>0}>
        {issues.length?<div className="table-scroll"><table><thead><tr><th>Phiếu xuất kho</th><th>Ngày xuất</th><th>Số lượng xuất</th><th>Người/bộ phận nhận</th><th>Bếp ăn, thực đơn, suất ăn</th></tr></thead><tbody>{issues.map(move=><tr key={move.id}><td><DocumentLink document={move.document} onOpen={onOpenDocument}/></td><td>{dateTime(move.at)}</td><td className="stock-qty out"><strong>{signed(move.quantity)} {unit}</strong></td><td>{[move.documentKind,move.destination].filter(Boolean).join(' · ')||NO_DATA}</td><td>{NO_LINK}</td></tr>)}</tbody></table></div>:<p className="stock-detail-missing">{NO_LINK} · Chưa có phiếu xuất nào ghi nhận lô {summary.number}; không suy diễn liên kết với bếp ăn hoặc suất ăn.</p>}
      </TraceStep>
      <TraceStep index={5} icon={<Boxes size={16}/>} title="Tồn hiện tại" ready={summary.allocations.length>0}>
        <div className="table-scroll"><table><thead><tr><th>Kho đang chứa lô</th><th>Tồn hiện tại</th><th>Hạn dùng</th><th>Khả dụng</th></tr></thead><tbody>{summary.balances.map(item=>{const state=expiryLabels[item.expiry.state];return <tr key={item.warehouse}><td><strong>{item.warehouse}</strong></td><td>{quantity(item.onHand,unit)}</td><td><Badge tone={state.tone}>{state.label}</Badge></td><td>{item.onHand<=0?<Badge tone="out">Hết hàng</Badge>:item.available>0?quantity(item.available,unit):<Badge tone="expired">Không khả dụng</Badge>}</td></tr>})}</tbody></table></div>
      </TraceStep>
    </ol>
    <p className="stock-detail-note">Truy xuất theo ID lô và chứng từ đã hoàn thành; không suy luận đường đi của hàng hóa từ tên sản phẩm. Phiếu xuất hiện chưa lưu liên kết tới bếp ăn, thực đơn hoặc suất ăn.</p>
  </>
}

function DocumentsPanel({summary,onOpenDocument}:{summary:LotSummary;onOpenDocument:(document:MovementDocument)=>void}){
  const rows=lotDocuments(summary)
  return <>
    {rows.length?<div className="table-scroll"><table><thead><tr><th>Loại chứng từ</th><th>Số chứng từ</th><th>Ngày lập</th><th>Người lập</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}>
      <td>{row.label}</td><td><strong>{row.number}</strong></td><td>{dateTime(row.date)}</td><td>{row.creator??'Chưa ghi nhận'}</td>
      <td>{row.document?<Badge tone="completed">{row.status}</Badge>:<span className="lot-muted">{row.status}</span>}</td>
      <td>{row.document?<button type="button" className="text-button" onClick={()=>onOpenDocument(row.document!)} aria-label={`Xem ${row.label} ${row.number}`}>Xem</button>:<span className="lot-muted">{row.type==='attachment'?'Không có tệp trên máy chủ':'Chưa có màn hình chi tiết'}</span>}</td>
    </tr>)}</tbody></table></div>:<Empty icon={<FileText/>} title="Chưa có chứng từ liên quan đến lô" text="Chứng từ xuất hiện khi phiếu nhập, xuất hoặc chuyển kho đã hoàn thành có ghi đúng lô."/>}
    <p className="stock-detail-note">Chưa có trong dữ liệu kho hiện tại: biên bản kiểm kê riêng, chứng nhận chất lượng và tài liệu nguồn gốc riêng của lô. File đính kèm phiếu nhập mới chỉ lưu tên trên trình duyệt, chưa được tải lên hoặc quét an toàn trên máy chủ nên không có thao tác tải.</p>
  </>
}

function SerialPanel({summary,product,receipts,serialManaged}:{summary:LotSummary;product:LotDetailProduct|null;receipts:readonly LotReceipt[];serialManaged:boolean}){
  const [query,setQuery]=useState('')
  const primary=summary.allocations[0]!
  const serials=useMemo(()=>lotSerials(summary,receipts),[summary,receipts])
  const applicable=serialManaged||serials.length>0
  const needle=query.trim().toLocaleLowerCase('vi')
  const shown=serials.filter(item=>!needle||item.serial.toLocaleLowerCase('vi').includes(needle))
  const duplicates=serials.filter(item=>item.duplicate).length
  const received=summary.sources.reduce((sum,source)=>sum+source.quantity,0)
  const payload=`${window.location.origin}/quan-ly-kho?lo=${encodeURIComponent(summary.rootId)}`
  useEffect(()=>{const done=()=>document.body.classList.remove('printing-lot-label');window.addEventListener('afterprint',done);return ()=>{window.removeEventListener('afterprint',done);done()}},[])
  const print=()=>{document.body.classList.add('printing-lot-label');window.print()}
  return <>
    <h3 className="management-subheading">Mã QR của lô</h3>
    <section className="lot-qr">
      <figure className="lot-qr-label" aria-label={`Xem trước tem QR lô ${summary.number}`}>
        <QRCodeSVG value={payload} size={132} level="M" marginSize={1} title={`QR lô ${summary.number}`}/>
        <figcaption><strong>{summary.number}</strong><span>{product?.name??NO_DATA}</span><small>NSX: {dateOnly(primary.manufacturedAt)}</small><small>HSD: {dateOnly(primary.expiresAt)}</small></figcaption>
      </figure>
      <div className="lot-qr-info">
        <p>QR định danh đúng lô (ID lô gốc, dùng chung cho mọi kho đang giữ lô), không chỉ định danh mặt hàng. Quét mã mở chi tiết lô trong phân hệ Quản lý kho; người quét cần quyền xem kho.</p>
        <p>Nội dung QR không chứa token đăng nhập, giá vốn, nhà cung cấp hay dữ liệu cá nhân:</p>
        <code>{payload}</code>
        <button type="button" className="primary" onClick={print}><Printer size={16}/>In tem QR</button>
      </div>
    </section>

    <h3 className="management-subheading">Serial</h3>
    {!applicable?<p className="stock-detail-missing">Không áp dụng serial · Mặt hàng được quản lý theo khối lượng/số lượng, không bắt buộc serial.</p>:<>
      <div className="lot-serial-head">
        <p><strong>{number.format(serials.length)}</strong> serial thuộc lô{received>0&&serialManaged?` / ${number.format(received)} đơn vị đã nhập`:''}</p>
        <Badge tone={duplicates?'expired':'active'}>{duplicates?`${duplicates} serial trùng`:'Không phát hiện serial trùng'}</Badge>
      </div>
      {serialManaged&&received>serials.length&&<p className="stock-detail-missing">Số serial ít hơn số lượng đã nhập; cần bổ sung serial cho {number.format(received-serials.length)} đơn vị.</p>}
      <div className="management-toolbar stock-detail-toolbar"><label className="grow"><span>Tìm serial</span><div><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Nhập serial…"/></div></label></div>
      {!serials.length?<Empty icon={<QrCode/>} title="Lô chưa có serial" text="Serial được đăng ký trên phiếu nhập kho của lô."/>
        :!shown.length?<Empty icon={<Search/>} title="Không tìm thấy serial phù hợp"/>
        :<ul className="lot-serial-list">{shown.map(item=><li key={`${item.receiptId}:${item.serial}`}><QrCode size={18}/><div><strong>{item.serial}</strong><span>Phiếu {item.receiptNumber} · {item.warehouse}</span></div><Badge tone={item.duplicate?'expired':'active'}>{item.duplicate?'Trùng':'Hợp lệ'}</Badge></li>)}</ul>}
    </>}
    <p className="stock-detail-note">Serial được đăng ký khi lập phiếu nhập và kiểm tra trùng trên toàn bộ phiếu nhập. Chưa có nghiệp vụ bổ sung hoặc sửa serial sau khi nhập, và chưa theo dõi trạng thái đã sử dụng của từng serial.</p>
  </>
}
