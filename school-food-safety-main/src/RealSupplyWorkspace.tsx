import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, ClipboardList, PackagePlus, Plus, RefreshCw, Truck, X } from 'lucide-react'
import type { ViewRole } from './lib/store'
import {
  getSupplyKitchens,getSupplySuppliers,getSupplyIngredients,getSupplyLots,getSupplyMovements,getSupplySchools,getSupplyFinance,getSupplyMinimums,getStockVouchers,downloadStockVoucherEvidence,returnSupplyIssue,
  issueSupplyLot,saveSupplySupplier,updateSupplySupplierStatus,changeSupplyLotStatus,moveSupplyLot,importSupplySuppliers,setSupplyMinimum,
} from './lib/supplyApi'
import type { SupplySupplier,SupplyLot,StockEvidenceInput,StockVoucher } from './lib/supplyApi'
import { StockInspectionFields,StockEvidenceFields,emptyInspection } from './StockVoucherEvidenceFields'
import './WarehouseManagement.css'
import './RealSupplyWorkspace.css'
import RealSupplierFinance from './RealSupplierFinance'
import RealPurchaseReceipt from './RealPurchaseReceipt'
import RealSupplierDocuments from './RealSupplierDocuments'
import RealWarehouseOverview from './RealWarehouseOverview'
import { convertReceiptQuantity, formatReceiptQuantity, receiptUnitOptions, preferredReceiptUnit, readableStockQuantity } from './lib/supervisionUnits'

function SupplyDialog({onClose,busy,children,title='Tạo phiếu nhập kho',eyebrow='QUẢN LÝ KHO · NHẬP NGUYÊN LIỆU',description='Kiểm nhận hàng hóa, nguyên liệu và lưu ảnh, chứng từ theo từng phiếu.'}:{onClose:()=>void;busy:boolean;children:ReactNode;title?:string;eyebrow?:string;description?:string}){
  const dialogRef=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const dialog=dialogRef.current
    if(!dialog)return
    if(typeof dialog.showModal==='function'){
      try{if(!dialog.open)dialog.showModal()}
      catch{dialog.setAttribute('open','');dialog.classList.add('supply-receipt-modal-fallback')}
    }else{
      dialog.setAttribute('open','')
      dialog.classList.add('supply-receipt-modal-fallback')
    }
    return ()=>{if(dialog.open && typeof dialog.close==='function')dialog.close()}
  },[])
  return <dialog ref={dialogRef} className="supply-receipt-modal" aria-label={title}
    onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
    <header className="supply-receipt-modal__heading">
      <div><small>{eyebrow}</small><h2>{title}</h2><p>{description}</p></div>
      <button type="button" className="supply-receipt-modal__close" title="Đóng cửa sổ" aria-label="Đóng biểu mẫu nhập kho" disabled={busy} onClick={onClose}><X size={20}/></button>
    </header>
    <div className="supply-receipt-modal__content">{children}</div>
  </dialog>
}

const emptySupplier=()=>({code:'',name:'',taxCode:'',contactName:'',phone:'',email:'',address:'',note:''})
const emptyIssue=()=>({voucherNumber:'',quantity:'',unit:'',note:'',schoolId:'',serviceDate:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),mealType:'LUNCH' as 'BREAKFAST'|'LUNCH'|'SNACK'})
const fmt=(value:number)=>value.toLocaleString('vi-VN',{maximumFractionDigits:3})
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString('vi-VN'):'Chưa có'
const expired=(value?:string|null)=>!!value&&value.slice(0,10)<new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)
export default function RealSupplyWorkspace({mode,role}:{mode:'suppliers'|'warehouse';role:ViewRole}){
  const qc=useQueryClient()
  const importRef=useRef<HTMLInputElement>(null)
  const canEdit=role==='central_kitchen'||role==='school_kitchen'
  const kitchenQuery=useQuery({queryKey:['real-supply-kitchens'],queryFn:getSupplyKitchens})
  const [kitchenId,setKitchenId]=useState('')
  const kitchens=kitchenQuery.data??[]
  const activeId=kitchens.some(item=>item.id===kitchenId)?kitchenId:kitchens[0]?.id??''
  const schoolQuery=useQuery({queryKey:['supply-schools',activeId],queryFn:()=>getSupplySchools(activeId),enabled:!!activeId&&mode==='warehouse'})
  const minimums=useQuery({queryKey:['supply-minimums',activeId],queryFn:()=>getSupplyMinimums(activeId),enabled:!!activeId&&mode==='warehouse'})
  const finance=useQuery({queryKey:['supply-finance',activeId],queryFn:()=>getSupplyFinance(activeId),enabled:!!activeId&&canEdit})
  const suppliers=useQuery({queryKey:['supply-suppliers',activeId],queryFn:()=>getSupplySuppliers(activeId),enabled:!!activeId})
  const ingredients=useQuery({queryKey:['supply-ingredients',activeId],queryFn:()=>getSupplyIngredients(activeId),enabled:!!activeId&&mode==='warehouse'})
  const lots=useQuery({queryKey:['supply-lots',activeId],queryFn:()=>getSupplyLots(activeId),enabled:!!activeId&&mode==='warehouse'})
  const movements=useQuery({queryKey:['supply-movements',activeId],queryFn:()=>getSupplyMovements(activeId),enabled:!!activeId&&mode==='warehouse'})
  const vouchers=useQuery({queryKey:['supply-vouchers',activeId],queryFn:()=>getStockVouchers(activeId),enabled:!!activeId&&mode==='warehouse'})
  const [vendor,setVendor]=useState(emptySupplier)
  const [vendorDialogOpen,setVendorDialogOpen]=useState(false)
  const [financeDialogOpen,setFinanceDialogOpen]=useState(false)
  const [statusTarget,setStatusTarget]=useState<SupplySupplier|null>(null)
  const [editingVendor,setEditingVendor]=useState<string|null>(null)
  const [viewingSupplier,setViewingSupplier]=useState<string|null>(null)
  const [supplierSearch,setSupplierSearch]=useState('')
  const [supplierDebtOnly,setSupplierDebtOnly]=useState(false)
  const [supplierPage,setSupplierPage]=useState(1)
  const [issue,setIssue]=useState(emptyIssue)
  const [issueInspection,setIssueInspection]=useState(emptyInspection)
  const [issueEvidences,setIssueEvidences]=useState<StockEvidenceInput[]>([])
  const [selectedVoucher,setSelectedVoucher]=useState<StockVoucher|null>(null)
  const [returnVoucherNumber,setReturnVoucherNumber]=useState('')
  const [returnQuantity,setReturnQuantity]=useState('')
  const [returnReason,setReturnReason]=useState('')
  const [returnSafe,setReturnSafe]=useState(false)
  const [returnInspection,setReturnInspection]=useState(emptyInspection)
  const [returnEvidences,setReturnEvidences]=useState<StockEvidenceInput[]>([])
  const [returnOpen,setReturnOpen]=useState(false)
  const [issueLot,setIssueLot]=useState<SupplyLot|null>(null)
  const [section,setSection]=useState<'overview'|'stock'|'receipts'|'issues'|'transfers'|'lots'|'trace'>('overview')
  const [receiptFormOpen,setReceiptFormOpen]=useState(false)
  const [receiptSearch,setReceiptSearch]=useState('')
  const [receiptPage,setReceiptPage]=useState(1)
  const [receiptViewId,setReceiptViewId]=useState<string|null>(null)
  const [lotSearch,setLotSearch]=useState('')
  const [movementSearch,setMovementSearch]=useState('')
  const [moveLot,setMoveLot]=useState<SupplyLot|null>(null)
  const [newLocation,setNewLocation]=useState('')
  const [moveReason,setMoveReason]=useState('')
  const [statusLot,setStatusLot]=useState<SupplyLot|null>(null)
  const [statusReason,setStatusReason]=useState('')
  const [thresholdIngredient,setThresholdIngredient]=useState('')
  const [thresholdQty,setThresholdQty]=useState('')
  const [thresholdUnit,setThresholdUnit]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{setEditingVendor(null);setVendor(emptySupplier());setIssueLot(null);setViewingSupplier(null);setVendorDialogOpen(false);setFinanceDialogOpen(false);setStatusTarget(null);setSupplierPage(1);setMoveLot(null);setStatusLot(null);setSection('overview');setReceiptFormOpen(false);setReceiptViewId(null);setReceiptSearch('');setReceiptPage(1);setSelectedVoucher(null);setReturnOpen(false);setIssueInspection(emptyInspection());setIssueEvidences([]);setError('');setNotice('')},[activeId])
  async function refresh(){
    await Promise.all([
      qc.invalidateQueries({queryKey:['supply-suppliers',activeId]}),
      qc.invalidateQueries({queryKey:['supply-finance',activeId]}),
      qc.invalidateQueries({queryKey:['supply-lots',activeId]}),
      qc.invalidateQueries({queryKey:['supply-minimums',activeId]}),
      qc.invalidateQueries({queryKey:['supply-movements',activeId]}),
      qc.invalidateQueries({queryKey:['supply-vouchers',activeId]}),
      qc.invalidateQueries({queryKey:['supervision-context']}),
    ])
  }
  async function execute(work:()=>Promise<unknown>,success:string):Promise<void>{
    setBusy(true);setError('');setNotice('')
    try{await work();await refresh();setNotice(success)}
    catch(e){setError(e instanceof Error?e.message:'Không thể lưu dữ liệu.')}
    finally{setBusy(false)}
  }
  function exportWarehouseCsv(){
    const rows=section==='trace'
      ? [['Thời điểm','Mã lô','Nguyên liệu','Loại sự kiện','Diễn giải'],...matchedMovements.map(item=>[item.occurredAt,item.lot.lotCode,item.lot.ingredient.name,item.eventType,item.description??''])]
      : section==='receipts'
        ? [['Phiếu nhập','Ngày nhập','Nhà cung cấp','Tổng tiền VND','Đã trả VND','Còn nợ VND'],...(finance.data?.receipts??[]).map(item=>[item.number,item.createdAt,item.supplier.name,String(item.total),String(item.paid),String(item.debt)])]
        : [['Mã lô','Nguyên liệu','Nhà cung cấp','Số lượng nhập','Số lượng tồn','Đơn vị','Hạn dùng','Vị trí','Trạng thái'],...matchedLots.map(item=>[item.lotCode,item.ingredient.name,item.supplier.name,String(item.quantity),String(item.remainingQty),item.unit,item.expiryDate??'',item.storageLocation??'',item.status])];
    const content='\uFEFF'+rows.map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='bao-cao-kho-'+section+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function exportSupplierList(){
    const rows=[['Mã','Tên','Người liên hệ','Điện thoại','Email','Mã số thuế','Địa chỉ','Ghi chú','Trạng thái'],...(suppliers.data??[]).map(row=>[row.code,row.name,row.contactName??'',row.phone??'',row.email??'',row.taxCode??'',row.address??'',row.note??'',row.status])];
    const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='nha-cung-cap.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  async function importSupplierFile(file?:File){
    if(!file)return;
    if(file.size>1024*1024){setError('Tệp import vượt giới hạn 1 MB.');return}
    try{
      const parsed:unknown=JSON.parse(await file.text())
      const list=Array.isArray(parsed)?parsed:parsed&&typeof parsed==='object'&&'suppliers' in parsed?(parsed as {suppliers:unknown}).suppliers:null;
      if(!Array.isArray(list)||!list.length||list.length>100)throw Error('Chỉ nhận JSON mảng từ 1 đến 100 nhà cung cấp.');
      if(!window.confirm('Nhập '+list.length+' nhà cung cấp vào kho bếp? Chỉ nhập danh tính/liên hệ/ghi chú. Công nợ, giao dịch DEMO và tệp đính kèm KHÔNG được nhập.'))return
      await execute(()=>importSupplySuppliers(activeId,list),'Đã nhập danh sách nhà cung cấp thật; không nhập công nợ DEMO.')
    }catch(error){setError(error instanceof Error?error.message:'Tệp JSON không hợp lệ.')}
  }
  function editVendor(item:SupplySupplier){
    setEditingVendor(item.id);setVendor({code:item.code,name:item.name,taxCode:item.taxCode??'',contactName:item.contactName??'',phone:item.phone??'',email:item.email??'',address:item.address??'',note:item.note??''})
    setVendorDialogOpen(true)
  }
  function submitVendor(e:FormEvent){
    e.preventDefault()
    void execute(async()=>{await saveSupplySupplier(activeId,vendor,editingVendor??undefined);setEditingVendor(null);setVendor(emptySupplier());setVendorDialogOpen(false)},'Đã lưu nhà cung cấp vào dữ liệu bếp.')
  }
  function submitIssue(e:FormEvent){
    e.preventDefault()
    if(!issueLot)return
    void execute(async()=>{await issueSupplyLot(activeId,issueLot.id,{
      quantity:Number(issue.quantity),unit:issue.unit||issueLot.unit,note:issue.note,schoolId:issue.schoolId,serviceDate:issue.serviceDate,mealType:issue.mealType,
      voucherNumber:issue.voucherNumber,inspection:{...issueInspection,documentNumber:issue.voucherNumber},evidences:issueEvidences,
    });setIssueLot(null);setIssue(emptyIssue());setIssueInspection(emptyInspection());setIssueEvidences([])},'Đã ghi sổ phiếu xuất kho và lưu minh chứng. Tồn lô đã được trừ một lần.')
  }
  function submitReturn(e:FormEvent){
    e.preventDefault()
    if(!selectedVoucher?.id||!selectedVoucher.unit)return
    void execute(async()=>{
      await returnSupplyIssue(activeId,selectedVoucher.id,{voucherNumber:returnVoucherNumber,quantity:Number(returnQuantity),
        unit:selectedVoucher.unit!,reason:returnReason,unusedAndSafe:returnSafe,
        inspection:{...returnInspection,documentNumber:returnVoucherNumber},evidences:returnEvidences})
      setSelectedVoucher(null);setReturnOpen(false);setReturnQuantity('');setReturnReason('');setReturnSafe(false)
      setReturnInspection(emptyInspection());setReturnEvidences([])
    },'Đã nhập hoàn nguyên liệu chưa sử dụng, ghi chứng từ và tăng tồn đúng một lần.')
  }
  const filteredSuppliers=(suppliers.data??[]).filter(item=>{const query=supplierSearch.toLocaleLowerCase('vi');return (item.code+' '+item.name+' '+(item.phone??'')).toLocaleLowerCase('vi').includes(query)&&(!supplierDebtOnly||(finance.data?.suppliers.find(row=>row.id===item.id)?.debt??0)>0)})
  const supplierPages=Math.max(1,Math.ceil(filteredSuppliers.length/10))
  const visibleSuppliers=filteredSuppliers.slice((Math.min(supplierPage,supplierPages)-1)*10,Math.min(supplierPage,supplierPages)*10)
  const matchedLots=(lots.data??[]).filter(lot=>(lot.lotCode+' '+lot.ingredient.name+' '+lot.supplier.name).toLocaleLowerCase('vi').includes(lotSearch.toLocaleLowerCase('vi')))
  // A historical finance receipt may predate the new evidence-backed voucher model.
  // Keep it visible without mislabelling it as a fully documented receipt.
  const receiptVouchers=(vouchers.data??[]).filter(v=>v.kind==='RECEIPT')
  const documentedReceiptIds=new Set(receiptVouchers.map(v=>v.receipt?.id).filter(Boolean))
  const receiptRows=[
    ...receiptVouchers.map(v=>({
      id:v.id,number:v.number,postedAt:v.postedAt,supplier:v.receipt?.supplier.name??'Chưa có thông tin',
      lineCount:v.receipt?.lines.length??0,amount:(finance.data?.receipts??[]).find(r=>r.id===v.receipt?.id)?.total??null,
      voucher:v,
    })),
    ...(finance.data?.receipts??[]).filter(r=>!documentedReceiptIds.has(r.id)).map(r=>({
      id:'legacy-'+r.id,number:r.number,postedAt:r.createdAt,supplier:r.supplier.name,
      lineCount:r.lines.length,amount:r.total,voucher:null as StockVoucher|null,
    })),
  ].sort((a,b)=>new Date(b.postedAt).getTime()-new Date(a.postedAt).getTime())
  const filteredReceipts=receiptRows.filter(row=>(row.number+' '+row.supplier+' '+row.postedAt).toLocaleLowerCase('vi').includes(receiptSearch.trim().toLocaleLowerCase('vi')))
  const receiptPageCount=Math.max(1,Math.ceil(filteredReceipts.length/10))
  const shownReceiptPage=Math.min(receiptPage,receiptPageCount)
  const visibleReceipts=filteredReceipts.slice((shownReceiptPage-1)*10,shownReceiptPage*10)
  const viewedReceipt=receiptRows.find(r=>r.id===receiptViewId)
  const matchedMovements=(movements.data??[]).filter(item=>(item.lot.lotCode+' '+item.lot.ingredient.name+' '+(item.description??'')).toLocaleLowerCase('vi').includes(movementSearch.toLocaleLowerCase('vi')))
  function confirmMove(e:FormEvent){e.preventDefault();if(!moveLot)return
    void execute(async()=>{await moveSupplyLot(activeId,moveLot.id,newLocation,moveReason);setMoveLot(null);setNewLocation('');setMoveReason('')},'Đã chuyển vị trí bảo quản và ghi nhật ký.')
  }
  function confirmStatus(e:FormEvent){e.preventDefault();if(!statusLot)return
    const nextStatus=statusLot.status==='QUARANTINED'?'AVAILABLE':'QUARANTINED'
    void execute(async()=>{await changeSupplyLotStatus(activeId,statusLot.id,nextStatus,statusReason);setStatusLot(null);setStatusReason('')},nextStatus==='AVAILABLE'?'Đã mở cách ly lô.':'Đã cách ly lô và ghi rõ lý do.')
  }
  const isLoading=kitchenQuery.isLoading||(!!activeId&&(suppliers.isLoading|| (mode==='warehouse'&&lots.isLoading)))
  const failure=kitchenQuery.error||suppliers.error||lots.error||ingredients.error||movements.error||finance.error||schoolQuery.error||minimums.error
  return <section className="card supply-workspace">
    <div className="card-header supply-workspace__header">
      <div><span className="section-kicker">QUẢN LÝ VẬN HÀNH</span>
        <h2>{mode==='suppliers'?'Nhà cung cấp của bếp':'Quản lý kho bếp'}</h2>
        <p className="muted">Theo dõi nhà cung cấp, nguyên liệu và hoạt động kho của bếp.</p></div>
      <div className="supply-header-actions">
        {activeId&&mode==='warehouse'&&<button type="button" className="outline" onClick={exportWarehouseCsv}>Xuất báo cáo CSV</button>}
        <button type="button" className="outline" onClick={()=>void refresh()} disabled={!activeId}><RefreshCw size={16}/>Làm mới</button>
      </div>
    </div>
    {kitchens.length>1&&<label>Chọn bếp cần xem <select value={activeId} onChange={e=>setKitchenId(e.target.value)}>{kitchens.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select></label>}
    {activeId&&<p className="muted"><strong>Kho: {kitchens.find(k=>k.id===activeId)?.name}</strong> · {canEdit?'Có quyền cập nhật':'Chỉ xem'}</p>}
    {isLoading&&<p role="status">Đang tải thông tin…</p>}
    {failure&&<p className="error" role="alert">{failure instanceof Error?failure.message:'Không tải được dữ liệu kho.'}</p>}
    {!isLoading&&!failure&&!activeId&&<div className="empty-state">Tài khoản chưa được phân quyền xem bếp nào.</div>}
    {error&&<p className="error" role="alert">{error}</p>}
    {notice&&<p role="status" className="supervision-status-message">{notice}</p>}
    {activeId&&mode==='suppliers'&&<>
      <div className="supply-supplier-summary">
        <div className="supply-section-heading supply-supplier-heading">
          <div>
            <h3><Truck size={19}/> Danh sách nhà cung cấp</h3>
            <p className="muted">Quản lý thông tin liên hệ, hồ sơ pháp lý và lịch sử cung ứng trong phạm vi bếp.</p>
          </div>
          <div className="supply-supplier-actions">
            {canEdit&&<button type="button" className="primary" onClick={()=>{setVendor(emptySupplier());setEditingVendor(null);setVendorDialogOpen(true)}}><Plus size={16}/> Thêm nhà cung cấp</button>}
            {finance.data&&<button type="button" className="outline" onClick={()=>setFinanceDialogOpen(true)}><ClipboardList size={16}/> Công nợ & thanh toán</button>}
            {canEdit&&<><input type="file" hidden ref={importRef} accept=".json,application/json" onChange={event=>{void importSupplierFile(event.target.files?.[0]);event.target.value=''}}/><button className="outline" type="button" onClick={()=>importRef.current?.click()}>Import JSON</button></>}
            <button className="outline" type="button" onClick={exportSupplierList}>Xuất CSV</button>
          </div>
        </div>
        <div className="management-toolbar supply-filterbar">
          <label>Tìm nhà cung cấp<input placeholder="Tên, mã, điện thoại" value={supplierSearch} onChange={e=>{setSupplierSearch(e.target.value);setSupplierPage(1)}}/></label>
          {canEdit&&<label className="management-check"><input type="checkbox" checked={supplierDebtOnly} onChange={e=>{setSupplierDebtOnly(e.target.checked);setSupplierPage(1)}}/> Còn công nợ</label>}
          <span className="muted">{filteredSuppliers.length} nhà cung cấp</span>
        </div>
        {suppliers.data?.length===0&&<p className="muted">Chưa có nhà cung cấp. Chọn “Thêm nhà cung cấp” để bắt đầu.</p>}
        <div className="supply-table-scroll"><table className="supply-table supply-table--suppliers">
          <thead><tr><th>Mã</th><th>Tên nhà cung cấp</th><th>Liên hệ</th><th>Trạng thái</th><th>Còn phải trả</th><th>Chức năng</th></tr></thead>
          <tbody>{visibleSuppliers.map(item=><tr key={item.id}>
            <td><strong>{item.code}</strong></td>
            <td>{item.name}</td>
            <td>{item.contactName??'—'}<small style={{display:'block'}}>{item.phone??''}</small></td>
            <td>{item.status==='ACTIVE'?'Đang hoạt động':'Ngừng hoạt động'}</td>
            <td>{canEdit?(finance.data?.suppliers.find(row=>row.id===item.id)?.debt??0).toLocaleString('vi-VN')+' đ':'Chỉ bếp được xem'}</td>
            <td><div className="supply-supplier-row-actions">
              <button type="button" className="outline" onClick={()=>setViewingSupplier(item.id)}>Hồ sơ</button>
              {canEdit&&<>
                <button className="outline" type="button" onClick={()=>editVendor(item)}>Sửa</button>
                <button className="outline" type="button" disabled={busy} onClick={()=>setStatusTarget(item)}>{item.status==='ACTIVE'?'Ngừng dùng':'Kích hoạt'}</button>
              </>}
            </div></td>
          </tr>)}</tbody>
        </table></div>
        <div className="management-pagination supply-supplier-pagination">
          <span>Hiển thị {visibleSuppliers.length}/{filteredSuppliers.length} · Trang {Math.min(supplierPage,supplierPages)}/{supplierPages}</span>
          <button type="button" className="outline" disabled={supplierPage<=1} onClick={()=>setSupplierPage(page=>Math.max(1,page-1))}>Trước</button>
          <button type="button" className="outline" disabled={supplierPage>=supplierPages} onClick={()=>setSupplierPage(page=>Math.min(supplierPages,page+1))}>Sau</button>
        </div>
      </div>
      {vendorDialogOpen&&canEdit&&<SupplyDialog title={editingVendor?'Sửa thông tin nhà cung cấp':'Thêm nhà cung cấp'} eyebrow="DANH MỤC NHÀ CUNG CẤP"
        description="Thông tin được lưu cho bếp đang quản lý. Giấy tờ pháp lý được đính kèm trong Hồ sơ nhà cung cấp."
        busy={busy} onClose={()=>{setVendorDialogOpen(false);setEditingVendor(null);setVendor(emptySupplier())}}>
        <form className="supply-panel supply-vendor-form" onSubmit={submitVendor}>
          <div className="supply-form-grid">
            <label>Mã nhà cung cấp *<input required maxLength={50} value={vendor.code} onChange={e=>setVendor(v=>({...v,code:e.target.value}))}/></label>
            <label>Tên nhà cung cấp *<input required maxLength={200} value={vendor.name} onChange={e=>setVendor(v=>({...v,name:e.target.value}))}/></label>
            <label>Người liên hệ<input maxLength={150} value={vendor.contactName} onChange={e=>setVendor(v=>({...v,contactName:e.target.value}))}/></label>
            <label>Số điện thoại<input maxLength={40} value={vendor.phone} onChange={e=>setVendor(v=>({...v,phone:e.target.value}))}/></label>
            <label>Email<input type="email" value={vendor.email} onChange={e=>setVendor(v=>({...v,email:e.target.value}))}/></label>
            <label>Mã số thuế<input maxLength={30} value={vendor.taxCode} onChange={e=>setVendor(v=>({...v,taxCode:e.target.value}))}/></label>
            <label>Địa chỉ<input maxLength={300} value={vendor.address} onChange={e=>setVendor(v=>({...v,address:e.target.value}))}/></label>
            <label>Ghi chú<textarea rows={3} maxLength={500} value={vendor.note} onChange={e=>setVendor(v=>({...v,note:e.target.value}))}/></label>
          </div>
          <div className="supply-form-actions">
            <button className="primary" type="submit" disabled={busy}><Plus size={16}/>{editingVendor?'Lưu thay đổi':'Thêm nhà cung cấp'}</button>
            <button className="outline" type="button" disabled={busy} onClick={()=>{setVendorDialogOpen(false);setEditingVendor(null);setVendor(emptySupplier())}}>Hủy</button>
          </div>
        </form>
      </SupplyDialog>}
      {viewingSupplier&&suppliers.data?.some(item=>item.id===viewingSupplier)&&<SupplyDialog
        title={'Hồ sơ · '+(suppliers.data.find(item=>item.id===viewingSupplier)?.name??'Nhà cung cấp')}
        eyebrow="HỒ SƠ PHÁP LÝ & CHỨNG TỪ" description="Xem giấy tờ đã lưu, thời hạn và chứng từ liên quan. Việc lưu trữ chứng từ không xóa hồ sơ gốc."
        busy={busy} onClose={()=>setViewingSupplier(null)}>
        <RealSupplierDocuments key={viewingSupplier} kitchenId={activeId} supplierId={viewingSupplier}
          supplierName={suppliers.data.find(item=>item.id===viewingSupplier)?.name??''}
          receipts={(finance.data?.receipts??[]).map(item=>({id:item.id,number:item.number,supplierId:item.supplier.id}))}
          canEdit={canEdit} busy={busy} execute={execute}/>
      </SupplyDialog>}
      {financeDialogOpen&&finance.data&&<SupplyDialog title="Công nợ & thanh toán" eyebrow="ĐỐI SOÁT NHÀ CUNG CẤP"
        description="Xem phiếu nhập, số dư và các chứng từ thanh toán đã ghi nhận của bếp."
        busy={busy} onClose={()=>setFinanceDialogOpen(false)}>
        <RealSupplierFinance key={activeId} kitchenId={activeId} finance={finance.data} canEdit={canEdit} busy={busy} execute={execute}/>
      </SupplyDialog>}
      {statusTarget&&canEdit&&<SupplyDialog title={statusTarget.status==='ACTIVE'?'Ngừng sử dụng nhà cung cấp':'Kích hoạt nhà cung cấp'}
        eyebrow="QUẢN LÝ TRẠNG THÁI" description="Xác nhận thay đổi trạng thái nhà cung cấp trong danh mục bếp."
        busy={busy} onClose={()=>setStatusTarget(null)}>
        <div className="supply-supplier-status-dialog">
          <p><strong>{statusTarget.name}</strong> · {statusTarget.code}</p>
          <p>{statusTarget.status==='ACTIVE'?'Ngừng cho phép chọn nhà cung cấp này trong các giao dịch mới. Chứng từ và lịch sử đã lưu được giữ nguyên.':'Cho phép tiếp tục sử dụng nhà cung cấp này trong các giao dịch mới.'}</p>
          <div className="supply-form-actions">
            <button type="button" className="primary" disabled={busy} onClick={()=>void execute(async()=>{
              await updateSupplySupplierStatus(activeId,statusTarget.id,statusTarget.status==='ACTIVE'?'INACTIVE':'ACTIVE')
              setStatusTarget(null)
            },statusTarget.status==='ACTIVE'?'Đã ngừng sử dụng nhà cung cấp.':'Đã kích hoạt nhà cung cấp.')}>Xác nhận</button>
            <button type="button" className="outline" disabled={busy} onClick={()=>setStatusTarget(null)}>Hủy</button>
          </div>
        </div>
      </SupplyDialog>}
    </>}
    {activeId&&mode==='warehouse'&&<>
      <nav className="supply-tabs" aria-label="Quản lý kho">
        {([['overview','Tổng quan'],['stock','Tồn kho'],['receipts','Nhập kho'],['issues','Xuất kho'],['transfers','Chuyển vị trí'],['lots','Lô hàng'],['trace','Truy xuất nguồn gốc']] as const).map(([id,label])=><button type="button" key={id} className={section===id?'primary':'outline'} onClick={()=>setSection(id)}>{label}</button>)}
      </nav>
      {section==='overview'&&<RealWarehouseOverview lots={lots.data??[]} movements={movements.data??[]} finance={finance.data} minimums={minimums.data??[]} onOpen={setSection}/>}
      {section==='stock'&&canEdit&&<form className="card supply-panel supply-minimum-form" onSubmit={e=>{e.preventDefault();if(!thresholdIngredient)return;void execute(async()=>{await setSupplyMinimum(activeId,thresholdIngredient,Number(thresholdQty),thresholdUnit||ingredients.data?.find(row=>row.id===thresholdIngredient)?.unit||'');setThresholdIngredient('');setThresholdQty('');setThresholdUnit('')},'Đã cập nhật định mức tồn kho của bếp.')}} style={{padding:14,display:'flex',flexWrap:'wrap',gap:10,alignItems:'end'}}>
        <label>Nguyên liệu cần đặt định mức<select required value={thresholdIngredient} onChange={e=>{setThresholdIngredient(e.target.value);const base=ingredients.data?.find(item=>item.id===e.target.value)?.unit??''
          const preferred=preferredReceiptUnit(base)
          const stored=minimums.data?.find(item=>item.ingredientId===e.target.value)?.minimumQty
          setThresholdQty(stored===undefined?'':String(convertReceiptQuantity(Number(stored),base,preferred)??stored))
          setThresholdUnit(preferred)}}><option value="">Chọn nguyên liệu</option>{ingredients.data?.map(item=><option key={item.id} value={item.id}>{item.name} · {item.unit}</option>)}</select></label>
        <label>Tồn tối thiểu (0 = tắt cảnh báo)<input required type="number" min="0" step="any" value={thresholdQty} onChange={e=>setThresholdQty(e.target.value)}/></label>
        <label>Đơn vị định mức<select value={thresholdUnit} onChange={e=>{
          const base=ingredients.data?.find(item=>item.id===thresholdIngredient)?.unit??''
          const previous=thresholdUnit||base
          const value=convertReceiptQuantity(Number(thresholdQty),previous,e.target.value)
          setThresholdUnit(e.target.value)
          if(thresholdQty&&value!==null)setThresholdQty(String(value))
        }}>{receiptUnitOptions(ingredients.data?.find(item=>item.id===thresholdIngredient)?.unit??'').map(unit=><option key={unit} value={unit}>{unit}</option>)}</select></label>
        <button className="primary" type="submit" disabled={busy}>Lưu định mức</button>
      </form>}
      {(section==='stock'||section==='lots'||section==='issues')&&<>
        <h3><Boxes size={19}/>{section==='issues'?'Chọn lô để xuất kho':'Tồn kho theo lô'} ({matchedLots.length})</h3>
        <label>Tìm mã lô / nguyên liệu / nhà cung cấp <input value={lotSearch} onChange={e=>setLotSearch(e.target.value)} placeholder="Nhập từ khóa để lọc…"/></label>
        {lots.data?.length===0&&<p className="muted">Bếp chưa có lô nguyên liệu thật. Hãy tạo nhà cung cấp và nhập kho.</p>}
        <div className="supply-table-scroll"><table className="supply-table supply-table--lots"><thead><tr><th>Lô</th><th>Nguyên liệu</th><th>Nhà cung cấp</th><th>Tồn</th><th>Hạn dùng</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        {matchedLots.map(lot=><tr key={lot.id}><td><strong>{lot.lotCode}</strong><small style={{display:'block'}}>{lot.storageLocation||'Chưa cập nhật vị trí'}</small></td><td>{lot.ingredient.name}</td><td>{lot.supplier.name}</td><td><strong>{readableStockQuantity(lot.remainingQty,lot.unit)}</strong>{readableStockQuantity(lot.remainingQty,lot.unit)!==fmt(lot.remainingQty)+' '+lot.unit&&<small style={{display:'block'}}>Số liệu kho: {fmt(lot.remainingQty)} {lot.unit}</small>}</td><td>{date(lot.expiryDate)}</td><td>{expired(lot.expiryDate)?'Hết hạn':lot.status==='AVAILABLE'?'Có thể xuất':lot.status==='DEPLETED'?'Đã hết':'Cách ly / tạm ngưng'}</td><td><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {canEdit&&lot.status==='AVAILABLE'&&!expired(lot.expiryDate)&&lot.remainingQty>0&&<button type="button" className="outline" onClick={()=>{setIssueLot(lot);setIssue({...emptyIssue(),unit:preferredReceiptUnit(lot.unit,lot.remainingQty)})}}>Xuất lô</button>}
          {canEdit&&lot.status!=='DEPLETED'&&<button type="button" className="outline" onClick={()=>{setMoveLot(lot);setNewLocation(lot.storageLocation??'');setMoveReason('');setSection('transfers')}}>Chuyển vị trí</button>}
          {canEdit&&(lot.status==='AVAILABLE'||lot.status==='QUARANTINED')&&<button type="button" className="outline" onClick={()=>{setStatusLot(lot);setStatusReason('')}}>{lot.status==='QUARANTINED'?'Mở cách ly':'Cách ly'}</button>}
        </div></td></tr>)}
        </tbody></table></div>
        {issueLot&&canEdit&&<form className="supply-panel supply-issue-form" onSubmit={submitIssue}>
          <h3><ClipboardList size={18}/>Xuất kho · {issueLot.lotCode} ({readableStockQuantity(issueLot.remainingQty,issueLot.unit)} còn lại)</h3>
          <p className="muted">Chỉ ghi trừ tồn khi có đủ chứng từ và kiểm xuất đạt. Mã phiếu không được trùng trong kho.</p>
          <label>Mã phiếu xuất *<input required maxLength={60} value={issue.voucherNumber} onChange={e=>setIssue(v=>({...v,voucherNumber:e.target.value}))} placeholder="XK-2026-001"/></label>
          <div style={{display:'grid',gridTemplateColumns:'minmax(160px,1fr) minmax(95px,140px)',gap:10}}>
            <label>Số lượng xuất *<input type="number" required min="0.000001" step="any" max={convertReceiptQuantity(issueLot.remainingQty,issueLot.unit,issue.unit||issueLot.unit)??undefined} value={issue.quantity} onChange={e=>setIssue(v=>({...v,quantity:e.target.value}))}/></label>
            <label>Đơn vị<select value={issue.unit||issueLot.unit} onChange={e=>setIssue(v=>{
              const converted=convertReceiptQuantity(Number(v.quantity),v.unit||issueLot.unit,e.target.value)
              return {...v,unit:e.target.value,quantity:v.quantity&&converted!==null?String(converted):v.quantity}
            })}>{receiptUnitOptions(issueLot.unit).map(unit=><option key={unit} value={unit}>{unit}</option>)}</select></label>
          </div>
          <small className="muted">Tồn có thể xuất: {formatReceiptQuantity(issueLot.remainingQty)} {issueLot.unit}. Hệ thống quy đổi trước khi trừ tồn.</small>
          <label>Trường được cấp nguyên liệu *<select required value={issue.schoolId} onChange={e=>setIssue(v=>({...v,schoolId:e.target.value}))}><option value="">Chọn trường nhận</option>{schoolQuery.data?.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Ngày sử dụng *<input type="date" required value={issue.serviceDate} onChange={e=>setIssue(v=>({...v,serviceDate:e.target.value}))}/></label>
          <label>Bữa sử dụng *<select value={issue.mealType} onChange={e=>setIssue(v=>({...v,mealType:e.target.value as typeof issue.mealType}))}><option value="BREAKFAST">Bữa sáng</option><option value="LUNCH">Bữa trưa</option><option value="SNACK">Bữa xế</option></select></label>
          <label>Lý do / chứng từ xuất *<input required maxLength={500} value={issue.note} onChange={e=>setIssue(v=>({...v,note:e.target.value}))}/></label>
          <StockInspectionFields kind="ISSUE" value={issueInspection} onChange={setIssueInspection}/>
          <StockEvidenceFields kind="ISSUE" value={issueEvidences} onChange={setIssueEvidences}/>
          <div className="supply-form-actions"><button className="primary" type="submit" disabled={busy||!issueEvidences.some(x=>x.category==='ISSUE_PHOTO')||!issueEvidences.some(x=>x.category==='SCALE_PHOTO')}>Xác nhận xuất kho</button><button className="outline" type="button" onClick={()=>setIssueLot(null)}>Hủy</button></div>
        </form>}
      </>}
      {section==='receipts'&&<section className="supply-receipts-workspace">
        <div className="supply-section-heading supply-receipts-heading">
          <div>
            <h3><PackagePlus size={19}/> Quản lý phiếu nhập kho</h3>
            <p className="muted">Xem phiếu đã ghi nhận và kiểm tra chứng từ theo từng lô. Tạo phiếu mới bằng chức năng riêng, không chỉnh sửa số liệu đã ghi sổ.</p>
          </div>
          {canEdit&&<button type="button" className="primary" onClick={()=>{setReceiptFormOpen(true);setReceiptViewId(null)}}>
            <Plus size={16}/> Tạo phiếu nhập
          </button>}
        </div>
        {receiptFormOpen&&canEdit&&<SupplyDialog busy={busy} onClose={()=>setReceiptFormOpen(false)}>
          <RealPurchaseReceipt key={activeId} kitchenId={activeId} suppliers={suppliers.data??[]} ingredients={ingredients.data??[]} canEdit={canEdit} busy={busy} execute={execute} onSaved={()=>{setReceiptFormOpen(false);setReceiptViewId(null);setReceiptPage(1)}}/>
        </SupplyDialog>}
        <>
          <div className="management-toolbar supply-filterbar supply-receipt-filterbar">
            <label>Tìm kiếm phiếu nhập
              <input value={receiptSearch} onChange={e=>{setReceiptSearch(e.target.value);setReceiptPage(1)}} placeholder="Mã phiếu, nhà cung cấp, ngày nhập…"/>
            </label>
            <span className="muted">{filteredReceipts.length} phiếu nhập</span>
          </div>
          {vouchers.isLoading||(canEdit&&finance.isLoading)?<p role="status" className="muted">Đang tải danh sách phiếu nhập…</p>:
          <div className="supply-table-scroll">
            <table className="supply-table supply-receipt-list">
              <thead><tr><th>Mã phiếu</th><th>Thời gian</th><th>Nhà cung cấp</th><th>Số dòng</th><th>Giá trị</th><th>Hồ sơ</th><th>Thao tác</th></tr></thead>
              <tbody>
                {visibleReceipts.map(row=><tr key={row.id}>
                  <td><strong>{row.number}</strong></td>
                  <td>{new Date(row.postedAt).toLocaleString('vi-VN')}</td>
                  <td>{row.supplier}</td>
                  <td>{row.lineCount}</td>
                  <td>{row.amount===null?'—':row.amount.toLocaleString('vi-VN')+' đ'}</td>
                  <td>{row.voucher?<span className="supply-receipt-status">Đã lưu {row.voucher.evidences.length} minh chứng</span>:<span className="muted">Phiếu cũ · chưa có hồ sơ số hóa</span>}</td>
                  <td><button type="button" className="outline" aria-label={'Xem phiếu '+row.number} onClick={()=>setReceiptViewId(current=>current===row.id?null:row.id)}>{receiptViewId===row.id?'Đóng':'Xem chi tiết'}</button></td>
                </tr>)}
                {!visibleReceipts.length&&<tr><td colSpan={7} className="supply-empty-receipts">Không tìm thấy phiếu nhập. {canEdit?'Chọn “Tạo phiếu nhập” để lập phiếu mới.':'Chưa có phiếu trong phạm vi được xem.'}</td></tr>}
              </tbody>
            </table>
          </div>}
          <div className="management-pagination supply-receipt-pagination">
            <span>Trang {shownReceiptPage}/{receiptPageCount} · Hiển thị {visibleReceipts.length}/{filteredReceipts.length} phiếu</span>
            <button type="button" className="outline" disabled={shownReceiptPage===1} onClick={()=>setReceiptPage(page=>Math.max(1,page-1))}>Trước</button>
            <button type="button" className="outline" disabled={shownReceiptPage>=receiptPageCount} onClick={()=>setReceiptPage(page=>Math.min(receiptPageCount,page+1))}>Sau</button>
          </div>
          {viewedReceipt&&<section className="supply-panel supply-receipt-detail" aria-label={'Chi tiết phiếu '+viewedReceipt.number}>
            <div className="supply-section-heading">
              <h3><ClipboardList size={17}/> Chi tiết phiếu {viewedReceipt.number}</h3>
              <button type="button" className="outline" onClick={()=>setReceiptViewId(null)}>Đóng</button>
            </div>
            <div className="supply-receipt-detail__facts">
              <div><small>Thời điểm ghi nhận</small><strong>{new Date(viewedReceipt.postedAt).toLocaleString('vi-VN')}</strong></div>
              <div><small>Nhà cung cấp</small><strong>{viewedReceipt.supplier}</strong></div>
              <div><small>Giá trị phiếu</small><strong>{viewedReceipt.amount===null?'Không có dữ liệu':viewedReceipt.amount.toLocaleString('vi-VN')+' đ'}</strong></div>
              <div><small>Số dòng nguyên liệu</small><strong>{viewedReceipt.lineCount}</strong></div>
            </div>
            {viewedReceipt.voucher?<>
              <p><strong>Người ghi sổ:</strong> {viewedReceipt.voucher.postedByName} · <strong>Người kiểm nhận:</strong> {viewedReceipt.voucher.inspection.inspector}</p>
              <p><strong>Người giao:</strong> {viewedReceipt.voucher.inspection.counterparty} · <strong>Địa điểm:</strong> {viewedReceipt.voucher.inspection.location} · <strong>Giờ kiểm:</strong> {viewedReceipt.voucher.inspection.actualTime}</p>
              <p><strong>Số chứng từ:</strong> {viewedReceipt.voucher.inspection.documentNumber} · <strong>Ghi chú:</strong> {viewedReceipt.voucher.inspection.remarks||'Không có'}</p>
              {!!viewedReceipt.voucher.receipt?.lines.length&&<div className="supply-table-scroll"><table className="supply-table">
                <thead><tr><th>Lô hàng</th><th>Nguyên liệu</th><th>Lượng thực nhập</th></tr></thead>
                <tbody>{viewedReceipt.voucher.receipt.lines.map((line,i)=><tr key={i}>
                  <td>{line.lot.lotCode}</td><td>{line.lot.ingredient.name}</td><td>{Number(line.quantity).toLocaleString('vi-VN')} {line.lot.ingredient.unit}</td>
                </tr>)}</tbody>
              </table></div>}
              <div className="supply-receipt-detail__proof">
                <strong>Ảnh và giấy tờ minh chứng ({viewedReceipt.voucher.evidences.length})</strong>
                <div className="stock-voucher-evidences">{viewedReceipt.voucher.evidences.map(file=><button type="button" className="outline" key={file.id} onClick={()=>void(async()=>{
                  try{
                    const content=await downloadStockVoucherEvidence(activeId,viewedReceipt.voucher!.id,file.id)
                    const bytes=Uint8Array.from(atob(content.base64),c=>c.charCodeAt(0))
                    const url=URL.createObjectURL(new Blob([bytes],{type:content.mimeType}))
                    const link=document.createElement('a');link.href=url;link.download=content.filename;link.click()
                    setTimeout(()=>URL.revokeObjectURL(url),3000)
                  }catch(e){setError(e instanceof Error?e.message:'Không tải được chứng từ.')}
                })()}>{file.filename} · {file.category}</button>)}</div>
              </div>
            </>:<p className="muted">Phiếu được lập trước khi triển khai bộ chứng từ điện tử. Hệ thống không tự tạo hoặc giả lập ảnh, biên bản cho dữ liệu cũ.</p>}
          </section>}
        </>
      </section>}
      {section==='trace'&&<>
        <h3>Phiếu kho đã ghi sổ · Truy xuất biên bản và tệp minh chứng</h3>
        <div className="supply-table-scroll"><table className="supply-table"><thead><tr><th>Mã phiếu</th><th>Nghiệp vụ</th><th>Thời điểm</th><th>Minh chứng</th><th>Thao tác</th></tr></thead><tbody>
          {(vouchers.data??[]).map(v=><tr key={v.id}>
            <td><strong>{v.number}</strong></td><td>{v.kind==='RECEIPT'?'Nhập kho':v.kind==='RETURN'?'Nhập hoàn':'Xuất kho'}</td>
            <td>{new Date(v.postedAt).toLocaleString('vi-VN')}</td><td>{v.evidences.length} tệp</td>
            <td><button type="button" className="outline" onClick={()=>setSelectedVoucher(v)}>Xem phiếu</button></td>
          </tr>)}
          {!vouchers.data?.length&&<tr><td colSpan={5}>Chưa có phiếu theo quy trình chứng từ mới.</td></tr>}
        </tbody></table></div>
        {selectedVoucher&&<section className="supply-panel stock-voucher-view" aria-label="Chi tiết phiếu kho">
          <div className="supply-section-heading"><h3>{selectedVoucher.number} · {selectedVoucher.kind==='RECEIPT'?'Nhập kho':selectedVoucher.kind==='RETURN'?'Nhập hoàn':'Xuất kho'}</h3><button type="button" className="outline" onClick={()=>setSelectedVoucher(null)}>Đóng</button></div>
          <p>Đã ghi sổ: {new Date(selectedVoucher.postedAt).toLocaleString('vi-VN')} · Người ghi sổ: {selectedVoucher.postedByName}</p>
          <p>Người kiểm tra: <strong>{selectedVoucher.inspection.inspector}</strong> · Người giao/nhận: {selectedVoucher.inspection.counterparty}</p>
          <p>Vị trí: {selectedVoucher.inspection.location} · Thời điểm: {selectedVoucher.inspection.actualTime} · Chứng từ: {selectedVoucher.inspection.documentNumber}</p>
          {selectedVoucher.receipt&&<p>Nhà cung cấp: {selectedVoucher.receipt.supplier.name} · {selectedVoucher.receipt.lines.map(line=>line.lot.lotCode+' / '+line.lot.ingredient.name).join(', ')}</p>}
          {(selectedVoucher.kind==='ISSUE'||selectedVoucher.kind==='RETURN')&&<p>Lô: {selectedVoucher.lotId} · Số lượng: {selectedVoucher.quantity} {selectedVoucher.unit}</p>}
          {selectedVoucher.kind==='ISSUE'&&canEdit&&<button type="button" className="outline" onClick={()=>{setReturnOpen(true);setReturnVoucherNumber('');setReturnQuantity('');setReturnReason('');setReturnSafe(false);setReturnInspection(emptyInspection());setReturnEvidences([])}}>Lập phiếu nhập hoàn nguyên liệu dư</button>}
          {returnOpen&&selectedVoucher.kind==='ISSUE'&&<form className="stock-audit-return-form" onSubmit={submitReturn}>
            <h3>Nhập hoàn từ phiếu {selectedVoucher.number}</h3>
            <p className="muted">Chỉ hoàn nguyên liệu chưa sơ chế/chế biến, còn đủ điều kiện an toàn. Mỗi phiếu hoàn có chứng từ riêng; không sửa phiếu xuất gốc.</p>
            <div className="supply-form-grid">
              <label>Số phiếu nhập hoàn *<input required maxLength={60} value={returnVoucherNumber} onChange={e=>setReturnVoucherNumber(e.target.value)} placeholder="NH-2026-001"/></label>
              <label>Khối lượng nhập hoàn ({selectedVoucher.unit}) *<input type="number" required min="0.001" step="any" max={selectedVoucher.quantity??undefined} value={returnQuantity} onChange={e=>setReturnQuantity(e.target.value)}/></label>
            </div>
            <label>Lý do nhập hoàn *<textarea required minLength={10} maxLength={500} value={returnReason} onChange={e=>setReturnReason(e.target.value)}/></label>
            <label className="stock-return-confirm"><input type="checkbox" required checked={returnSafe} onChange={e=>setReturnSafe(e.target.checked)}/> Tôi xác nhận hàng chưa sử dụng, đủ điều kiện bảo quản và có thể nhập hoàn.</label>
            <StockInspectionFields kind="RETURN" value={returnInspection} onChange={setReturnInspection}/>
            <StockEvidenceFields kind="RETURN" value={returnEvidences} onChange={setReturnEvidences}/>
            <div className="supply-form-actions"><button type="submit" className="primary" disabled={busy||!returnEvidences.some(x=>x.category==='RETURN_PHOTO')||!returnEvidences.some(x=>x.category==='SCALE_PHOTO')}>Ghi sổ nhập hoàn</button><button type="button" className="outline" onClick={()=>setReturnOpen(false)}>Hủy</button></div>
          </form>}
          <p>Ghi chú: {selectedVoucher.inspection.remarks||'Không có'}</p>
          <div className="stock-voucher-evidences">{selectedVoucher.evidences.map(file=><button type="button" className="outline" key={file.id} onClick={()=>void (async()=>{
            try{
              const content=await downloadStockVoucherEvidence(activeId,selectedVoucher.id,file.id)
              const bytes=Uint8Array.from(atob(content.base64),c=>c.charCodeAt(0))
              const url=URL.createObjectURL(new Blob([bytes],{type:content.mimeType}))
              const link=document.createElement('a');link.href=url;link.download=content.filename;link.click()
              setTimeout(()=>URL.revokeObjectURL(url),3000)
            }catch(e){setError(e instanceof Error?e.message:'Không thể xem minh chứng.')}
          })()}>{file.category}: {file.filename} · SHA-256 {file.sha256.slice(0,12)}…</button>)}</div>
        </section>}

        <h3>Truy xuất nguồn gốc và nhật ký nhập / xuất</h3>
        <label>Tìm mã lô hoặc nguyên liệu <input value={movementSearch} onChange={e=>setMovementSearch(e.target.value)} placeholder="Mã lô / nguyên liệu / diễn giải"/></label>
        {movements.data?.length===0&&<p className="muted">Chưa có nhật ký.</p>}
        <div className="supply-table-scroll"><table className="supply-table supply-table--events"><thead><tr><th>Thời điểm</th><th>Nguyên liệu</th><th>Mã lô</th><th>Loại</th><th>Nội dung</th></tr></thead><tbody>
        {matchedMovements.map(item=><tr key={item.id}><td>{date(item.occurredAt)}</td><td>{item.lot.ingredient.name}</td><td>{item.lot.lotCode}</td><td>{item.eventType==='RECEIVED'?'Nhập kho':item.eventType==='ISSUED'?'Xuất kho':item.eventType}</td><td>{item.description}</td></tr>)}
        </tbody></table></div>
      </>}
      {section==='transfers'&&<div className="supply-panel supply-transfer-section">
        <h3>Chuyển vị trí bảo quản nội bộ</h3>
        <p className="muted">Chỉ thay đổi vị trí bảo quản của nguyên lô trong cùng bếp và lưu nhật ký; không phải chuyển hàng giữa hai bếp.</p>
        {canEdit&&<label>Chọn lô hàng <select value={moveLot?.id??''} onChange={e=>{const lot=lots.data?.find(row=>row.id===e.target.value)??null;setMoveLot(lot);setNewLocation(lot?.storageLocation??'')}}><option value="">Chọn lô cần chuyển</option>{lots.data?.filter(row=>row.status!=='DEPLETED').map(row=><option key={row.id} value={row.id}>{row.lotCode} · {row.ingredient.name}</option>)}</select></label>}
        {moveLot&&canEdit&&<form className="supply-form-grid" onSubmit={confirmMove}>
          <label>Vị trí mới *<input required maxLength={120} value={newLocation} onChange={e=>setNewLocation(e.target.value)}/></label>
          <label>Lý do / chứng từ *<input required maxLength={500} value={moveReason} onChange={e=>setMoveReason(e.target.value)}/></label>
          <button className="primary" type="submit" disabled={busy}>Xác nhận chuyển vị trí</button>
        </form>}
      </div>}
      {statusLot&&canEdit&&<form onSubmit={confirmStatus} className="card supply-panel supply-status-form">
        <h3>{statusLot.status==='QUARANTINED'?'Mở cách ly':'Cách ly'} · {statusLot.lotCode}</h3>
        <label>Lý do và căn cứ *<input required maxLength={500} value={statusReason} onChange={e=>setStatusReason(e.target.value)}/></label>
        <div style={{display:'flex',gap:10}}><button type="submit" className="primary" disabled={busy}>Lưu trạng thái</button><button type="button" className="outline" onClick={()=>setStatusLot(null)}>Hủy</button></div>
      </form>}
    </>}
  </section>
}
