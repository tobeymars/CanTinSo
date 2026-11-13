import Select from './components/ui/Select'
import { useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, History, Search, SlidersHorizontal, Tags } from 'lucide-react'
import { isAdjustment, lotState, productMovements, sortLots, totalBalances, warehouseBalances } from '../packages/domain/stock-detail'
import type { IssueDocument, LotState, MovementDocument, ReceiptDocument, StockLot, StockMovement, StockRow, TransferDocument } from '../packages/domain/stock-detail'

type DetailTab='warehouses'|'lots'|'movements'|'adjustments'|'trace'
type MovementFilter='all'|'in'|'out'|'transfer'|'adjustment'
type DetailProduct=StockRow&{name:string;category:string}
type DetailReceipt=ReceiptDocument&{supplier:string;fileName?:string}
type DetailIssue=IssueDocument&{receiver:string}
type Props={product:DetailProduct;rows:DetailProduct[];lots:StockLot[];receipts:DetailReceipt[];issues:DetailIssue[];transfers:TransferDocument[];onOpenDocument:(document:MovementDocument)=>void}

const tabs:{id:DetailTab;label:string}[]=[{id:'warehouses',label:'Theo kho'},{id:'lots',label:'Theo lô / hạn dùng'},{id:'movements',label:'Lịch sử nhập xuất'},{id:'adjustments',label:'Điều chỉnh'},{id:'trace',label:'Truy xuất nguồn gốc'}]
const lotLabels:Record<LotState,{label:string;tone:string}>={available:{label:'Còn hạn',tone:'active'},expiring:{label:'Sắp hết hạn',tone:'expiring'},expired:{label:'Hết hạn',tone:'expired'},out:{label:'Hết hàng',tone:'out'}}
const movementFilters:Record<MovementFilter,string>={all:'Tất cả nghiệp vụ',in:'Nhập kho',out:'Xuất kho',transfer:'Chuyển kho',adjustment:'Điều chỉnh'}
const PAGE_SIZE=8
const NO_LINK='Chưa có dữ liệu liên kết'
const money=new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0})
const number=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2})
const signed=(value:number)=>`${value>0?'+':value<0?'−':''}${number.format(Math.abs(value))}`
const dateOnly=(value?:string)=>{const date=value?new Date(`${value}T12:00:00`):null;return date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('vi-VN'):'Chưa có dữ liệu'}
const dateTime=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Chưa có dữ liệu':date.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
const matchesFilter=(move:StockMovement,filter:MovementFilter)=>filter==='all'||(filter==='adjustment'?isAdjustment(move):filter==='transfer'?move.kind==='transfer_in'||move.kind==='transfer_out':filter==='in'?move.kind==='receipt':move.kind==='issue')

function Badge({tone,children}:{tone:string;children:ReactNode}){return <span className={`management-badge ${tone}`}>{children}</span>}
function Empty({icon,title,text}:{icon:ReactNode;title:string;text?:string}){return <div className="empty-state">{icon}<h3>{title}</h3>{text&&<p>{text}</p>}</div>}
function DocumentLink({document,onOpen}:{document:MovementDocument;onOpen:(document:MovementDocument)=>void}){return <button type="button" className="stock-document-link" onClick={()=>onOpen(document)} aria-label={`Mở chứng từ ${document.number}`}>{document.number}</button>}

/** Nội dung modal "Chi tiết tồn kho": 5 tab đọc từ sổ tồn, lô và chứng từ kho hiện có; không tạo số liệu mới. */
export default function StockDetail({product,rows,lots,receipts,issues,transfers,onOpenDocument}:Props){
  const [tab,setTab]=useState<DetailTab>('warehouses')
  const [lotSort,setLotSort]=useState<'fefo'|'expiry'>('fefo')
  const [traceLotId,setTraceLotId]=useState<string|null>(null)
  const [query,setQuery]=useState('');const [filter,setFilter]=useState<MovementFilter>('all');const [from,setFrom]=useState('');const [to,setTo]=useState('');const [page,setPage]=useState(1)

  const ids=new Set(rows.map(row=>row.id))
  const balances=warehouseBalances(rows,lots)
  const totals=totalBalances(balances)
  const productLots=sortLots(lots.filter(lot=>ids.has(lot.productId)),lotSort)
  const movements=productMovements(ids,{receipts,issues,transfers})
  const adjustments=movements.filter(isAdjustment)
  const needle=query.trim().toLocaleLowerCase('vi')
  const filtered=movements.filter(move=>matchesFilter(move,filter)&&(!from||move.at.slice(0,10)>=from)&&(!to||move.at.slice(0,10)<=to)&&(!needle||[move.document.number,move.warehouse,move.label,move.lotNumber??'',move.actor??''].join(' ').toLocaleLowerCase('vi').includes(needle)))
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));const currentPage=Math.min(page,pages);const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE)
  const lowStock=balances.filter(balance=>balance.belowMinimum)
  const traceLot=productLots.find(lot=>lot.id===traceLotId)??null
  const unit=product.unit

  const selectTab=(next:DetailTab)=>{setTab(next);requestAnimationFrame(()=>document.getElementById(`stock-tab-${next}`)?.focus())}
  const onTabKey=(event:KeyboardEvent<HTMLDivElement>)=>{const index=tabs.findIndex(item=>item.id===tab);const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index-1+tabs.length)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;if(next<0)return;event.preventDefault();selectTab(tabs[next]!.id)}
  const openTrace=(lotId:string)=>{setTraceLotId(lotId);setTab('trace')}
  const resetPage=<T,>(setter:(value:T)=>void)=>(value:T)=>{setter(value);setPage(1)}

  const lotTable=()=>productLots.length?<div className="table-scroll"><table><thead><tr><th>Số lô</th><th>Kho</th><th>Số lượng còn lại</th><th>Ngày sản xuất</th><th>Hạn sử dụng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{productLots.map(lot=>{const state=lotLabels[lotState(lot)];return <tr key={lot.id}><td><strong>{lot.number}</strong></td><td>{lot.warehouse}</td><td>{number.format(Math.max(0,lot.remaining))} {unit}</td><td>{dateOnly(lot.manufacturedAt)}</td><td>{dateOnly(lot.expiresAt)}</td><td><Badge tone={state.tone}>{state.label}</Badge></td><td><button type="button" className="text-button" onClick={()=>openTrace(lot.id)} aria-label={`Truy xuất lô ${lot.number}`}>Truy xuất<ArrowRight size={14}/></button></td></tr>})}</tbody></table></div>:<Empty icon={<Tags/>} title="Mặt hàng chưa có lô" text="Nguồn gốc theo lô chỉ có khi nghiệp vụ nhập kho đã ghi nhận lô thực tế."/>

  return <div className="stock-detail">
    <div className="management-detail-grid stock-detail-summary">
      <div><span>Mã hàng</span><strong>{product.code}</strong></div>
      <div><span>Phân loại</span><strong>{product.category}</strong></div>
      <div><span>Kho</span><strong title={balances.map(item=>item.warehouse).join(', ')}>{balances.length===1?balances[0]!.warehouse:`${balances.length} kho`}</strong></div>
      <div><span>Đơn vị tính</span><strong>{unit}</strong></div>
      <div><span>Tổng tồn</span><strong>{number.format(totals.onHand)} {unit}</strong></div>
      <div><span>Tồn khả dụng</span><strong>{number.format(totals.available)} {unit}</strong>{lowStock.length>0&&<Badge tone="low">Dưới định mức</Badge>}</div>
      <div><span>Định mức tối thiểu{balances.length>1?' (mỗi kho)':''}</span><strong>{number.format(product.minimum)} {unit}</strong></div>
      <div><span>Giá vốn / đơn vị</span><strong>{money.format(product.unitCost)}</strong></div>
    </div>

    <div className="stock-detail-tabs" role="tablist" aria-label="Nhóm thông tin tồn kho" onKeyDown={onTabKey}>
      {tabs.map(item=><button key={item.id} type="button" role="tab" id={`stock-tab-${item.id}`} aria-selected={tab===item.id} aria-controls={`stock-panel-${item.id}`} tabIndex={tab===item.id?0:-1} aria-label={item.id==='adjustments'&&adjustments.length>0?`${item.label} (${adjustments.length})`:undefined} onClick={()=>setTab(item.id)}>{item.label}{item.id==='adjustments'&&adjustments.length>0&&<span className="stock-tab-count" aria-hidden="true">{adjustments.length}</span>}</button>)}
    </div>

    <div className="stock-detail-panel" role="tabpanel" id={`stock-panel-${tab}`} aria-labelledby={`stock-tab-${tab}`}>
      {tab==='warehouses'&&<>
        {lowStock.length>0&&<div className="stock-detail-warning" role="status"><AlertCircle size={17}/><p>{lowStock.map(item=>`${item.warehouse}: khả dụng ${number.format(item.available)} ${unit}, thấp hơn định mức ${number.format(item.minimum)} ${unit}`).join(' · ')}.</p></div>}
        <div className="table-scroll"><table><thead><tr><th>Kho</th><th>Tồn thực tế</th><th>Tồn hết hạn</th><th>Khả dụng trước giữ chỗ</th><th>Đã giữ chỗ</th><th>Tồn khả dụng</th><th>Đơn vị</th><th>Giá trị ước tính</th></tr></thead>
          <tbody>{balances.map(item=><tr key={item.warehouse}>
            <td><strong>{item.warehouse}</strong></td>
            <td>{number.format(item.onHand)}{item.untracked>0&&<small>Gồm {number.format(item.untracked)} chưa định danh lô</small>}{item.lotsExceedBook&&<small className="stock-detail-alert">Tồn theo lô vượt sổ tồn · cần đối soát</small>}</td>
            <td className={item.expired>0?'stock-qty out':''}>{number.format(item.expired)}</td>
            <td>{number.format(item.availableBeforeReservation)}</td>
            <td>{number.format(item.reserved)}{item.reservedApplied<item.reserved&&<small>Chỉ trừ {number.format(item.reservedApplied)} còn khả dụng</small>}</td>
            <td><strong>{number.format(item.available)}</strong>{item.belowMinimum&&<Badge tone="low">Dưới định mức</Badge>}</td>
            <td>{item.unit}</td>
            <td>{money.format(item.value)}</td>
          </tr>)}</tbody>
          {balances.length>1&&<tfoot><tr><th>Tổng</th><th>{number.format(totals.onHand)}</th><th>{number.format(totals.expired)}</th><th>{number.format(totals.availableBeforeReservation)}</th><th>{number.format(totals.reserved)}</th><th>{number.format(totals.available)}</th><th>{unit}</th><th>{money.format(totals.value)}</th></tr></tfoot>}
        </table></div>
        <p className="stock-detail-note">Tồn khả dụng = tồn thực tế − tồn hết hạn − giữ chỗ hợp lệ (không vượt phần còn khả dụng). Hàng hết hạn không được tính là khả dụng. Giá trị ước tính = tồn thực tế × giá vốn hiện có.</p>
      </>}

      {tab==='lots'&&<>
        <div className="management-toolbar stock-detail-toolbar"><label><span>Sắp xếp</span><Select label="Sắp xếp" size="sm" value={lotSort} onValueChange={value=>setLotSort(value==='expiry'?'expiry':'fefo')}><option value="fefo">Ưu tiên lô còn tồn sắp hết hạn (FEFO)</option><option value="expiry">Hạn sử dụng tăng dần</option></Select></label></div>
        {lotTable()}
        {totals.untracked>0&&<p className="stock-detail-note">{number.format(totals.untracked)} {unit} tồn chưa định danh lô nên chưa có ngày sản xuất, hạn dùng để theo dõi theo lô.</p>}
      </>}

      {tab==='movements'&&<>
        <div className="management-toolbar stock-detail-toolbar">
          <label className="grow"><span>Tìm biến động</span><div><Search size={15}/><input value={query} onChange={event=>resetPage(setQuery)(event.target.value)} placeholder="Chứng từ, kho, lô, người thực hiện…"/></div></label>
          <label><span>Nghiệp vụ</span><Select label="Nghiệp vụ" size="sm" value={filter} onValueChange={value=>resetPage(setFilter)(value as MovementFilter)}>{Object.entries(movementFilters).map(([value,label])=><option value={value} key={value}>{label}</option>)}</Select></label>
          <label><span>Từ ngày</span><input type="date" value={from} max={to||undefined} onChange={event=>resetPage(setFrom)(event.target.value)}/></label>
          <label><span>Đến ngày</span><input type="date" value={to} min={from||undefined} onChange={event=>resetPage(setTo)(event.target.value)}/></label>
        </div>
        {!movements.length?<Empty icon={<History/>} title="Chưa có biến động kho được ghi nhận" text="Biến động được lấy từ phiếu nhập, xuất và chuyển kho đã hoàn thành của mặt hàng này."/>
          :!filtered.length?<Empty icon={<Search/>} title="Không có biến động phù hợp bộ lọc"/>
          :<><div className="table-scroll"><table><thead><tr><th>Thời gian</th><th>Nghiệp vụ</th><th>Số lượng</th><th>Kho</th><th>Lô</th><th>Chứng từ</th><th>Người thực hiện</th></tr></thead><tbody>{visible.map(move=><tr key={move.id}><td>{dateTime(move.at)}</td><td>{move.label}</td><td className={`stock-qty ${move.quantity<0?'out':'in'}`}><strong>{signed(move.quantity)} {unit}</strong></td><td>{move.warehouse}</td><td>{move.lotNumber??'—'}</td><td><DocumentLink document={move.document} onOpen={onOpenDocument}/></td><td>{move.actor??'Chưa ghi nhận'}</td></tr>)}</tbody></table></div>
            <footer className="management-pagination"><span>{filtered.length} biến động</span><div><button type="button" aria-label="Trang trước" disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}><ChevronLeft/></button><strong>{currentPage}/{pages}</strong><button type="button" aria-label="Trang sau" disabled={currentPage>=pages} onClick={()=>setPage(currentPage+1)}><ChevronRight/></button></div></footer></>}
        <p className="stock-detail-note">Chỉ tính phiếu đã hoàn thành; phiếu lưu tạm không phát sinh biến động. Bấm số chứng từ để mở phiếu tại phân hệ tương ứng.</p>
      </>}

      {tab==='adjustments'&&(adjustments.length?<>
        <div className="table-scroll"><table><thead><tr><th>Thời gian</th><th>Chứng từ</th><th>Kho</th><th>Lô</th><th>Trước điều chỉnh</th><th>Sau điều chỉnh</th><th>Chênh lệch</th><th>Lý do</th><th>Người thực hiện</th></tr></thead><tbody>{adjustments.map(move=><tr key={move.id}><td>{dateTime(move.at)}</td><td><DocumentLink document={move.document} onOpen={onOpenDocument}/></td><td>{move.warehouse}</td><td>{move.lotNumber??'—'}</td><td>—</td><td>—</td><td className={`stock-qty ${move.quantity<0?'out':'in'}`}><strong>{signed(move.quantity)} {unit}</strong></td><td>{move.reason??'Chưa ghi lý do'}</td><td>{move.actor??'Chưa ghi nhận'}</td></tr>)}</tbody></table></div>
        <p className="stock-detail-note">Lấy từ phiếu “Nhập điều chỉnh” và “Xuất điều chỉnh” đã hoàn thành; nhập, xuất thông thường không hiển thị tại đây. Phiếu điều chỉnh hiện chưa lưu số lượng trước/sau kiểm kê.</p>
      </>:<Empty icon={<SlidersHorizontal/>} title="Chưa có điều chỉnh từ kiểm kê trong sổ biến động."/>)}

      {tab==='trace'&&(!traceLot?<>
        <p className="stock-detail-note">Chọn một lô để truy xuất theo đúng mã lô.</p>
        {lotTable()}
      </>:<TraceDetail lot={traceLot} product={product} receipts={receipts} issues={issues} movements={movements} onBack={()=>setTraceLotId(null)} onOpenDocument={onOpenDocument}/>)}
    </div>
  </div>
}

function TraceDetail({lot,product,receipts,issues,movements,onBack,onOpenDocument}:{lot:StockLot;product:DetailProduct;receipts:DetailReceipt[];issues:DetailIssue[];movements:StockMovement[];onBack:()=>void;onOpenDocument:(document:MovementDocument)=>void}){
  const unit=product.unit
  const sources=receipts.filter(receipt=>receipt.status==='completed'&&receipt.lotNumber===lot.number&&receipt.productId===lot.productId)
  const usage=movements.filter(move=>move.lotNumber===lot.number&&move.quantity<0)
  const received=sources.reduce((sum,receipt)=>sum+(receipt.quantity??0),0)
  const issued=usage.reduce((sum,move)=>sum-move.quantity,0)
  const state=lotLabels[lotState(lot)]
  return <div className="stock-trace">
    <button type="button" className="outline stock-trace-back" onClick={onBack}><ArrowLeft size={15}/>Danh sách lô</button>
    <h3 className="management-subheading">Thông tin lô <Badge tone={state.tone}>{state.label}</Badge></h3>
    <div className="management-detail-grid stock-detail-summary">
      <div><span>Mã lô</span><strong>{lot.number}</strong></div>
      <div><span>Tên hàng hóa</span><strong>{product.name}</strong></div>
      <div><span>Kho lưu trữ</span><strong>{lot.warehouse}</strong></div>
      <div><span>Ngày sản xuất</span><strong>{dateOnly(lot.manufacturedAt)}</strong></div>
      <div><span>Hạn sử dụng</span><strong>{dateOnly(lot.expiresAt)}</strong></div>
      <div><span>Số lượng nhập ban đầu</span><strong>{sources.length?`${number.format(received)} ${unit}`:NO_LINK}</strong></div>
      <div><span>Số lượng đã xuất</span><strong>{usage.length?`${number.format(issued)} ${unit}`:NO_LINK}</strong></div>
      <div><span>Số lượng còn lại</span><strong>{number.format(Math.max(0,lot.remaining))} {unit}</strong></div>
    </div>
    <h3 className="management-subheading">Nguồn nhập</h3>
    {sources.length?<div className="table-scroll"><table><thead><tr><th>Nhà cung cấp</th><th>Phiếu nhập</th><th>Ngày nhập</th><th>Số lượng nhập</th><th>Chứng từ nguồn gốc</th></tr></thead><tbody>{sources.map(receipt=><tr key={receipt.id}><td>{receipt.supplier}</td><td><DocumentLink document={{type:'receipt',id:receipt.id,number:receipt.number}} onOpen={onOpenDocument}/></td><td>{dateTime(receipt.date)}</td><td>{number.format(receipt.quantity??0)} {unit}</td><td>{receipt.fileName||NO_LINK}</td></tr>)}</tbody></table></div>:<p className="stock-detail-missing">{NO_LINK} · Chưa có phiếu nhập nào ghi nhận lô {lot.number}; không suy diễn nhà cung cấp hoặc xuất xứ.</p>}
    <h3 className="management-subheading">Lịch sử sử dụng</h3>
    {usage.length?<div className="table-scroll"><table><thead><tr><th>Thời gian xuất</th><th>Số lượng xuất</th><th>Phiếu xuất</th><th>Đối tượng sử dụng</th></tr></thead><tbody>{usage.map(move=>{const issue=issues.find(item=>item.id===move.document.id);return <tr key={move.id}><td>{dateTime(move.at)}</td><td className="stock-qty out"><strong>{signed(move.quantity)} {unit}</strong></td><td><DocumentLink document={move.document} onOpen={onOpenDocument}/></td><td>{issue?`${issue.kind} · ${issue.receiver}`:NO_LINK}</td></tr>})}</tbody></table></div>:<p className="stock-detail-missing">{NO_LINK} · Chưa có phiếu xuất nào ghi nhận lô {lot.number}; không suy diễn liên kết với bếp ăn hoặc suất ăn.</p>}
  </div>
}
