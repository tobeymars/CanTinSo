import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, CreditCard, Download, ReceiptText, Wallet } from 'lucide-react'
import { createSupplyPayment, reverseSupplyPayment } from './lib/supplyApi'
import type { SupplyFinance } from './lib/supplyApi'
import './SupplierManagement.css'

const cash=(v:number)=>v.toLocaleString('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0})
const unitCost=(v:number)=>v.toLocaleString('vi-VN',{maximumFractionDigits:6})+' đ'
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)
const downloadCsv=(filename:string,rows:string[][])=>{
  const content='\uFEFF'+rows.map(row=>row.map(cell=>'"'+cell.replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url)
}
export default function RealSupplierFinance({kitchenId,finance,canEdit,busy,execute}:{
  kitchenId:string;finance:SupplyFinance;canEdit:boolean;busy:boolean;
  execute:(action:()=>Promise<unknown>,success:string)=>Promise<void>
}){
  const [filter,setFilter]=useState('')
  const [reversingId,setReversingId]=useState<string|null>(null)
  const [reversalReason,setReversalReason]=useState('')
  const [debtOnly,setDebtOnly]=useState(false)
  const [tab,setTab]=useState<'receipts'|'payments'>('receipts')
  const [paymentFormOpen,setPaymentFormOpen]=useState(false)
  const [expanded,setExpanded]=useState<string|null>(null)
  const [receiptId,setReceiptId]=useState('')
  const [reference,setReference]=useState('')
  const [amount,setAmount]=useState('')
  const [method,setMethod]=useState<'BANK_TRANSFER'|'CASH'|'OTHER'>('BANK_TRANSFER')
  const [paidAt,setPaidAt]=useState(today)
  const [note,setNote]=useState('')
  const filtered=useMemo(()=>finance.suppliers.filter(row=>(row.name+' '+row.code).toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi'))&&(!debtOnly||row.debt>0)),[finance.suppliers,filter,debtOnly])
  const selected=finance.receipts.find(row=>row.id===receiptId)
  const outstanding=finance.receipts.filter(row=>row.debt>0)
  function submit(event:FormEvent){
    event.preventDefault()
    if(!selected)return
    void execute(async()=>{
      await createSupplyPayment(kitchenId,{receiptId:selected.id,reference,amount:Number(amount),method,paidAt,note})
      setReceiptId('');setReference('');setAmount('');setNote('');setPaymentFormOpen(false)
    },'Đã ghi nhận phiếu thanh toán và cập nhật công nợ.')
  }
  return <div className="supply-finance supply-finance-redesign">
    <div className="supply-supplier-finance-actions">
      {canEdit&&<button type="button" className={paymentFormOpen?'outline':'primary'}
        onClick={()=>setPaymentFormOpen(open=>!open)}>
        {paymentFormOpen?'Đóng biểu mẫu':'Ghi nhận thanh toán'}
      </button>}
    </div>
    <div className="management-kpis supply-finance-kpis">
      {[
        {label:'Tổng nhà cung cấp',value:String(finance.totals.suppliers),desc:finance.totals.activeSuppliers+' đang hoạt động',Icon:Building2},
        {label:'Tổng giá trị nhập',value:cash(finance.totals.totalPurchase),desc:'Phiếu nhập có đơn giá',Icon:ReceiptText},
        {label:'Đã thanh toán',value:cash(finance.totals.paid),desc:'Phiếu chi đã ghi nhận',Icon:CreditCard},
        {label:'Còn phải trả',value:cash(finance.totals.debt),desc:'Công nợ các phiếu nhập',Icon:Wallet},
      ].map(({label,value,desc,Icon})=><article className="card" key={label}><Icon size={20}/><span>{label}</span><strong>{value}</strong><small>{desc}</small></article>)}
    </div>
    {finance.totals.unpricedLots>0&&<p role="note" className="muted">Có {finance.totals.unpricedLots} lô nhập trước khi có chứng từ định giá. Các lô này chưa được tính vào doanh số mua và công nợ; cần đối chiếu chứng từ để ghi nhận, không tự gán giá trị 0.</p>}
    <section className="card management-table-card supply-panel supply-finance-panel">
      <header className="card-header"><div><div className="section-kicker">ĐỐI CHIẾU CÔNG NỢ</div><h3>Nhà cung cấp và thanh toán</h3></div>
        <button type="button" className="outline" onClick={()=>downloadCsv('cong-no-nha-cung-cap.csv',[['Mã','Nhà cung cấp','Tổng mua VND','Đã trả VND','Còn nợ VND'],...filtered.map(row=>[row.code,row.name,String(row.totalPurchase),String(row.paid),String(row.debt)])])}><Download size={15}/>Xuất CSV</button>
      </header>
      <div className="management-toolbar supply-filterbar">
        <label>Tìm mã hoặc tên <input value={filter} onChange={event=>setFilter(event.target.value)} placeholder="Tìm nhà cung cấp"/></label>
        <label className="management-check"><input type="checkbox" checked={debtOnly} onChange={event=>setDebtOnly(event.target.checked)}/>Còn công nợ</label>
      </div>
      <div className="supply-table-scroll supply-finance-scroll"><table className="management-table supply-table supply-finance-suppliers-table"><thead><tr><th>Mã</th><th>Tên</th><th>Tổng mua</th><th>Đã trả</th><th>Còn phải trả</th><th>Phiếu nhập</th></tr></thead><tbody>
        {filtered.map(row=><tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{cash(row.totalPurchase)}</td><td>{cash(row.paid)}</td><td className={row.debt>0?'management-debt':''}>{cash(row.debt)}</td><td>{row.receipts}</td></tr>)}
      </tbody></table></div>
      {!filtered.length&&<p className="muted">Không có nhà cung cấp phù hợp.</p>}
    </section>
    <section className="card management-table-card supply-panel supply-finance-panel">
      <header className="card-header"><div><div className="section-kicker">CHỨNG TỪ MUA HÀNG</div><h3>Phiếu nhập và thanh toán</h3></div>
        <div style={{display:'flex',gap:8}}><button type="button" className={tab==='receipts'?'primary':'outline'} onClick={()=>setTab('receipts')}>Phiếu nhập ({finance.receipts.length})</button><button type="button" className={tab==='payments'?'primary':'outline'} onClick={()=>setTab('payments')}>Thanh toán ({finance.payments.length})</button></div></header>
      {tab==='receipts'&&<div className="supply-table-scroll supply-finance-scroll"><table className="management-table supply-table supply-finance-receipts-table"><thead><tr><th>Số phiếu</th><th>Ngày</th><th>Nhà cung cấp</th><th>Tổng tiền</th><th>Đã trả</th><th>Còn nợ</th><th>Chi tiết</th></tr></thead><tbody>
        {finance.receipts.map(row=><tr key={row.id}><td><strong>{row.number}</strong><small style={{display:'block'}}>{row.invoiceNumber||'Chưa có số hóa đơn'}</small></td><td>{new Date(row.createdAt).toLocaleDateString('vi-VN')}</td><td>{row.supplier.name}</td><td>{cash(row.total)}</td><td>{cash(row.paid)}</td><td>{cash(row.debt)}</td><td><button type="button" className="outline" onClick={()=>setExpanded(current=>current===row.id?null:row.id)}>{expanded===row.id?'Ẩn':'Xem'}</button></td></tr>)}
      </tbody></table></div>}
      {tab==='receipts'&&expanded&&finance.receipts.some(row=>row.id===expanded)&&(()=>{
        const receipt=finance.receipts.find(row=>row.id===expanded)!
        return <div className="supply-receipt-detail">
          <div className="supply-section-heading">
            <div><span className="supply-step">CHI TIẾT PHIẾU NHẬP</span><h3>{receipt.number} · {receipt.supplier.name}</h3></div>
            <button className="outline" type="button" onClick={()=>setExpanded(null)}>Đóng chi tiết</button>
          </div>
          <div className="supply-receipt-detail__rows">
            {receipt.lines.map(line=><div className="supply-receipt-detail__line" key={line.id}>
              <div><strong>{line.lot.ingredient.name}</strong><small>Mã lô: {line.lot.lotCode}</small></div>
              <div><span>Số lượng</span><strong>{line.enteredQuantity??line.quantity} {line.enteredUnit??line.lot.ingredient.unit}</strong></div>
              <div><span>Đơn giá</span><strong>{unitCost(line.unitPrice)} / {line.enteredUnit??line.lot.ingredient.unit}</strong></div>
              <div><span>Thành tiền</span><strong>{cash(line.amount)}</strong></div>
            </div>)}
          </div>
          <div className="supply-receipt-detail__total"><span>Tổng tiền phiếu</span><strong>{cash(receipt.total)}</strong></div>
        </div>
      })()}
      {tab==='payments'&&<div className="supply-table-scroll supply-finance-scroll"><table className="management-table supply-table supply-finance-payments-table"><thead><tr><th>Ngày trả</th><th>Mã phiếu chi</th><th>Nhà cung cấp</th><th>Phiếu nhập</th><th>Hình thức</th><th>Số tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
        {finance.payments.map(row=><tr key={row.id}><td>{new Date(row.paidAt).toLocaleDateString('vi-VN')}</td><td>{row.reference}</td><td>{row.supplier.name}</td><td>{row.receipt.number}</td><td>{row.method==='BANK_TRANSFER'?'Chuyển khoản':row.method==='CASH'?'Tiền mặt':'Khác'}</td><td>{cash(row.amount)}</td><td>{row.reversedAt?'Đã hủy · '+new Date(row.reversedAt).toLocaleDateString('vi-VN'):'Đã ghi nhận'}</td><td>
          {canEdit&&!row.reversedAt&&<button type="button" className="outline" disabled={busy} onClick={()=>{setReversingId(row.id);setReversalReason('')}}>Hủy bút toán</button>}
          {row.reversedAt&&<small>{row.reversalReason}</small>}
          {reversingId===row.id&&<form onSubmit={event=>{event.preventDefault();void execute(async()=>{await reverseSupplyPayment(kitchenId,row.id,reversalReason);setReversingId(null);setReversalReason('')},'Đã hủy bút toán và cập nhật lại công nợ.')}} style={{display:'grid',gap:6}}>
            <label>Lý do hủy *<input required minLength={5} maxLength={500} value={reversalReason} onChange={event=>setReversalReason(event.target.value)}/></label>
            <button type="submit" className="primary" disabled={busy}>Xác nhận hủy</button><button type="button" className="outline" onClick={()=>setReversingId(null)}>Đóng</button>
          </form>}
        </td></tr>)}
      </tbody></table></div>}
      {(tab==='receipts'&&!finance.receipts.length||tab==='payments'&&!finance.payments.length)&&<p className="muted">Chưa có chứng từ trong hệ thống.</p>}
    </section>
    {canEdit&&paymentFormOpen&&<section className="card supply-panel supply-payment-panel">
      <div className="supply-section-heading"><h3>Ghi nhận thanh toán nhà cung cấp</h3><button type="button" className="outline" onClick={()=>setPaymentFormOpen(false)}>Về danh sách</button></div>
      <p className="muted">Chỉ ghi nhận khoản thanh toán thực tế, không tự đánh dấu đã trả khi nhập kho. Mỗi khoản thanh toán liên kết với một phiếu nhập.</p>
      <form className="supply-form-grid" onSubmit={submit}>
        <label>Phiếu nhập còn nợ *<select required value={receiptId} onChange={event=>{setReceiptId(event.target.value);setAmount('')}}><option value="">Chọn phiếu nhập</option>{outstanding.map(row=><option value={row.id} key={row.id}>{row.number} · {row.supplier.name} · còn {cash(row.debt)}</option>)}</select></label>
        <label>Mã phiếu chi *<input required value={reference} maxLength={100} onChange={event=>setReference(event.target.value)}/></label>
        <label>Số tiền thanh toán (VND) *<input type="number" min="1" step="1" required max={selected?.debt} value={amount} onChange={event=>setAmount(event.target.value)}/></label>
        <label>Hình thức thanh toán <select value={method} onChange={event=>setMethod(event.target.value as typeof method)}><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CASH">Tiền mặt</option><option value="OTHER">Khác</option></select></label>
        <label>Ngày thanh toán <input type="date" required value={paidAt} onChange={event=>setPaidAt(event.target.value)}/></label>
        <label>Diễn giải / chứng từ <input value={note} maxLength={500} onChange={event=>setNote(event.target.value)}/></label>
        <div className="supply-form-actions"><button className="primary" type="submit" disabled={busy||!selected}>Lưu thanh toán</button><button type="button" className="outline" onClick={()=>setPaymentFormOpen(false)}>Hủy</button></div>
      </form>
      {!outstanding.length&&<p className="muted">Không có phiếu nhập còn nợ.</p>}
    </section>}
  </div>
}
