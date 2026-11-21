import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, ClipboardList, PackagePlus, Plus, RefreshCw, Truck } from 'lucide-react'
import type { ViewRole } from './lib/store'
import {
  getSupplyKitchens,getSupplySuppliers,getSupplyIngredients,getSupplyLots,getSupplyMovements,getSupplySchools,getSupplyFinance,getSupplyMinimums,
  issueSupplyLot,saveSupplySupplier,updateSupplySupplierStatus,changeSupplyLotStatus,moveSupplyLot,importSupplySuppliers,setSupplyMinimum,
} from './lib/supplyApi'
import type { SupplySupplier,SupplyLot } from './lib/supplyApi'
import './WarehouseManagement.css'
import './RealSupplyWorkspace.css'
import RealSupplierFinance from './RealSupplierFinance'
import RealPurchaseReceipt from './RealPurchaseReceipt'
import RealSupplierDocuments from './RealSupplierDocuments'
import RealWarehouseOverview from './RealWarehouseOverview'
import { convertReceiptQuantity, formatReceiptQuantity, receiptUnitOptions, preferredReceiptUnit, readableStockQuantity } from './lib/supervisionUnits'

const emptySupplier=()=>({code:'',name:'',taxCode:'',contactName:'',phone:'',email:'',address:'',note:''})
const emptyIssue=()=>({quantity:'',unit:'',note:'',schoolId:'',serviceDate:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),mealType:'LUNCH' as 'BREAKFAST'|'LUNCH'|'SNACK'})
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
  const [vendor,setVendor]=useState(emptySupplier)
  const [editingVendor,setEditingVendor]=useState<string|null>(null)
  const [viewingSupplier,setViewingSupplier]=useState<string|null>(null)
  const [supplierSearch,setSupplierSearch]=useState('')
  const [supplierDebtOnly,setSupplierDebtOnly]=useState(false)
  const [supplierPage,setSupplierPage]=useState(1)
  const [issue,setIssue]=useState(emptyIssue)
  const [issueLot,setIssueLot]=useState<SupplyLot|null>(null)
  const [section,setSection]=useState<'overview'|'stock'|'receipts'|'issues'|'transfers'|'lots'|'trace'>('overview')
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
  useEffect(()=>{setEditingVendor(null);setVendor(emptySupplier());setIssueLot(null);setViewingSupplier(null);setSupplierPage(1);setMoveLot(null);setStatusLot(null);setSection('overview');setError('');setNotice('')},[activeId])
  async function refresh(){
    await Promise.all([
      qc.invalidateQueries({queryKey:['supply-suppliers',activeId]}),
      qc.invalidateQueries({queryKey:['supply-finance',activeId]}),
      qc.invalidateQueries({queryKey:['supply-lots',activeId]}),
      qc.invalidateQueries({queryKey:['supply-minimums',activeId]}),
      qc.invalidateQueries({queryKey:['supply-movements',activeId]}),
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
    window.scrollTo({top:0,behavior:'smooth'})
  }
  function submitVendor(e:FormEvent){
    e.preventDefault()
    void execute(async()=>{await saveSupplySupplier(activeId,vendor,editingVendor??undefined);setEditingVendor(null);setVendor(emptySupplier())},'Đã lưu nhà cung cấp vào dữ liệu bếp.')
  }
  function submitIssue(e:FormEvent){
    e.preventDefault()
    if(!issueLot)return
    void execute(async()=>{await issueSupplyLot(activeId,issueLot.id,{quantity:Number(issue.quantity),unit:issue.unit||issueLot.unit,note:issue.note,schoolId:issue.schoolId,serviceDate:issue.serviceDate,mealType:issue.mealType});setIssueLot(null);setIssue(emptyIssue())},'Đã xuất kho và cập nhật tồn lô.')
  }
  const filteredSuppliers=(suppliers.data??[]).filter(item=>{const query=supplierSearch.toLocaleLowerCase('vi');return (item.code+' '+item.name+' '+(item.phone??'')).toLocaleLowerCase('vi').includes(query)&&(!supplierDebtOnly||(finance.data?.suppliers.find(row=>row.id===item.id)?.debt??0)>0)})
  const supplierPages=Math.max(1,Math.ceil(filteredSuppliers.length/10))
  const visibleSuppliers=filteredSuppliers.slice((Math.min(supplierPage,supplierPages)-1)*10,Math.min(supplierPage,supplierPages)*10)
  const matchedLots=(lots.data??[]).filter(lot=>(lot.lotCode+' '+lot.ingredient.name+' '+lot.supplier.name).toLocaleLowerCase('vi').includes(lotSearch.toLocaleLowerCase('vi')))
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
      <div><span className="section-kicker">DỮ LIỆU POSTGRESQL · THEO BẾP</span>
        <h2>{mode==='suppliers'?'Nhà cung cấp của bếp':'Quản lý kho bếp'}</h2>
        <p className="muted">Một bếp trung tâm sử dụng chung kho cho các trường được phân công. Hồ sơ giám sát đọc trực tiếp nguồn dữ liệu này.</p></div>
      <div className="supply-header-actions">
        {activeId&&mode==='warehouse'&&<button type="button" className="outline" onClick={exportWarehouseCsv}>Xuất báo cáo CSV</button>}
        <button type="button" className="outline" onClick={()=>void refresh()} disabled={!activeId}><RefreshCw size={16}/>Làm mới</button>
      </div>
    </div>
    {kitchens.length>1&&<label>Chọn bếp cần xem <select value={activeId} onChange={e=>setKitchenId(e.target.value)}>{kitchens.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select></label>}
    {activeId&&<p className="muted"><strong>Kho: {kitchens.find(k=>k.id===activeId)?.name}</strong> · {canEdit?'Có quyền cập nhật':'Chỉ xem'} · Không sử dụng dữ liệu DEMO</p>}
    {isLoading&&<p role="status">Đang tải dữ liệu kho từ máy chủ…</p>}
    {failure&&<p className="error" role="alert">{failure instanceof Error?failure.message:'Không tải được dữ liệu kho.'}</p>}
    {!isLoading&&!failure&&!activeId&&<div className="empty-state">Tài khoản chưa được phân quyền xem bếp nào.</div>}
    {error&&<p className="error" role="alert">{error}</p>}
    {notice&&<p role="status" className="supervision-status-message">{notice}</p>}
    {activeId&&mode==='suppliers'&&<>
      {finance.data&&<RealSupplierFinance key={activeId} kitchenId={activeId} finance={finance.data} canEdit={canEdit} busy={busy} execute={execute}/>}
      {canEdit&&<form className="supply-panel supply-vendor-form" onSubmit={submitVendor}>
        <h3><Truck size={18}/>{editingVendor?'Sửa nhà cung cấp':'Thêm nhà cung cấp'}</h3>
        <div className="supply-form-grid">
          <label>Mã nhà cung cấp *<input required maxLength={50} value={vendor.code} onChange={e=>setVendor(v=>({...v,code:e.target.value}))}/></label>
          <label>Tên nhà cung cấp *<input required maxLength={200} value={vendor.name} onChange={e=>setVendor(v=>({...v,name:e.target.value}))}/></label>
          <label>Người liên hệ<input maxLength={150} value={vendor.contactName} onChange={e=>setVendor(v=>({...v,contactName:e.target.value}))}/></label>
          <label>Số điện thoại<input maxLength={40} value={vendor.phone} onChange={e=>setVendor(v=>({...v,phone:e.target.value}))}/></label>
          <label>Email<input type="email" value={vendor.email} onChange={e=>setVendor(v=>({...v,email:e.target.value}))}/></label>
          <label>Mã số thuế<input value={vendor.taxCode} onChange={e=>setVendor(v=>({...v,taxCode:e.target.value}))}/></label>
          <label>Địa chỉ<input value={vendor.address} onChange={e=>setVendor(v=>({...v,address:e.target.value}))}/></label>
          <label>Ghi chú<input maxLength={500} value={vendor.note} onChange={e=>setVendor(v=>({...v,note:e.target.value}))}/></label>
        </div>
        <div className="supply-form-actions"><button className="primary" type="submit" disabled={busy}><Plus size={16}/>{editingVendor?'Lưu thay đổi':'Thêm nhà cung cấp'}</button>{editingVendor&&<button className="outline" type="button" onClick={()=>{setEditingVendor(null);setVendor(emptySupplier())}}>Hủy sửa</button>}</div>
      </form>}
      <div className="supply-section-heading">
        <h3>Danh sách nhà cung cấp ({suppliers.data?.length??0})</h3>
        <div style={{display:'flex',gap:8}}>
          {canEdit&&<><input type="file" hidden ref={importRef} accept=".json,application/json" onChange={event=>{void importSupplierFile(event.target.files?.[0]);event.target.value=''}}/><button className="outline" type="button" onClick={()=>importRef.current?.click()}>Import JSON</button></>}
          <button className="outline" type="button" onClick={exportSupplierList}>Xuất CSV</button>
        </div>
      </div>
      <div className="management-toolbar supply-filterbar"><label>Tìm nhà cung cấp<input placeholder="Tên, mã, điện thoại" value={supplierSearch} onChange={e=>{setSupplierSearch(e.target.value);setSupplierPage(1)}}/></label>{canEdit&&<label className="management-check"><input type="checkbox" checked={supplierDebtOnly} onChange={e=>{setSupplierDebtOnly(e.target.checked);setSupplierPage(1)}}/>Còn công nợ</label>}</div>
      {suppliers.data?.length===0&&<p className="muted">Chưa có nhà cung cấp. Bếp cần tạo trước khi nhập lô nguyên liệu.</p>}
      <div className="supply-table-scroll"><table className="supply-table supply-table--suppliers"><thead><tr><th>Mã</th><th>Tên</th><th>Liên hệ</th><th>Trạng thái</th><th>Còn phải trả</th><th>Chức năng</th></tr></thead><tbody>
        {visibleSuppliers.map(item=><tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.contactName??''}<small style={{display:'block'}}>{item.phone??''}</small></td><td>{item.status==='ACTIVE'?'Đang hoạt động':'Ngừng hoạt động'}</td><td>{canEdit?(finance.data?.suppliers.find(row=>row.id===item.id)?.debt??0).toLocaleString('vi-VN')+' đ':'Chỉ bếp được xem'}</td><td><div style={{display:'flex',gap:6}}><button type="button" className="outline" onClick={()=>setViewingSupplier(current=>current===item.id?null:item.id)}>Hồ sơ</button>{canEdit&&<div style={{display:'flex',gap:6}}>
          <button className="outline" type="button" onClick={()=>editVendor(item)}>Sửa</button>
          <button className="outline" type="button" disabled={busy} onClick={()=>void execute(()=>updateSupplySupplierStatus(activeId,item.id,item.status==='ACTIVE'?'INACTIVE':'ACTIVE'),item.status==='ACTIVE'?'Đã ngừng sử dụng nhà cung cấp.':'Đã kích hoạt nhà cung cấp.')}>{item.status==='ACTIVE'?'Ngừng dùng':'Kích hoạt'}</button>
        </div>}</div></td></tr>)}
      </tbody></table></div>
      <div className="management-pagination" style={{display:'flex',gap:10,justifyContent:'flex-end',alignItems:'center'}}>
        <span>Hiển thị {visibleSuppliers.length} / {filteredSuppliers.length} nhà cung cấp · Trang {Math.min(supplierPage,supplierPages)}/{supplierPages}</span>
        <button type="button" className="outline" disabled={supplierPage<=1} onClick={()=>setSupplierPage(page=>Math.max(1,page-1))}>Trước</button>
        <button type="button" className="outline" disabled={supplierPage>=supplierPages} onClick={()=>setSupplierPage(page=>Math.min(supplierPages,page+1))}>Sau</button>
      </div>
      {viewingSupplier&&suppliers.data?.some(item=>item.id===viewingSupplier)&&<RealSupplierDocuments key={viewingSupplier} kitchenId={activeId} supplierId={viewingSupplier} supplierName={suppliers.data.find(item=>item.id===viewingSupplier)?.name??''} receipts={(finance.data?.receipts??[]).map(item=>({id:item.id,number:item.number,supplierId:item.supplier.id}))} canEdit={canEdit} busy={busy} execute={execute}/>}
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
          <div className="supply-form-actions"><button className="primary" type="submit" disabled={busy}>Xác nhận xuất kho</button><button className="outline" type="button" onClick={()=>setIssueLot(null)}>Hủy</button></div>
        </form>}
      </>}
      {section==='receipts'&&<>
        <h3><PackagePlus size={18}/>Tiếp nhận lô nguyên liệu mới</h3>
        <RealPurchaseReceipt key={activeId} kitchenId={activeId} suppliers={suppliers.data??[]} ingredients={ingredients.data??[]} canEdit={canEdit} busy={busy} execute={execute} onSaved={()=>setSection('stock')}/>
      </>}
      {section==='trace'&&<>
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
