import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, ClipboardList, PackagePlus, Plus, RefreshCw, Truck } from 'lucide-react'
import type { ViewRole } from './lib/store'
import {
  getSupplyKitchens,getSupplySuppliers,getSupplyIngredients,getSupplyLots,getSupplyMovements,
  issueSupplyLot,receiveSupplyLot,saveSupplySupplier,
} from './lib/supplyApi'
import type { SupplySupplier,SupplyLot } from './lib/supplyApi'
import './WarehouseManagement.css'

const emptySupplier=()=>({code:'',name:'',taxCode:'',contactName:'',phone:'',email:'',address:''})
const emptyReceipt=()=>({lotCode:'',ingredientId:'',supplierId:'',quantity:'',expiryDate:'',storageLocation:'',note:''})
const emptyIssue=()=>({quantity:'',note:''})
const fmt=(value:number)=>value.toLocaleString('vi-VN',{maximumFractionDigits:3})
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString('vi-VN'):'Chưa có'
export default function RealSupplyWorkspace({mode,role}:{mode:'suppliers'|'warehouse';role:ViewRole}){
  const qc=useQueryClient()
  const canEdit=role==='central_kitchen'||role==='school_kitchen'
  const kitchenQuery=useQuery({queryKey:['real-supply-kitchens'],queryFn:getSupplyKitchens})
  const [kitchenId,setKitchenId]=useState('')
  const kitchens=kitchenQuery.data??[]
  const activeId=kitchens.some(item=>item.id===kitchenId)?kitchenId:kitchens[0]?.id??''
  const suppliers=useQuery({queryKey:['supply-suppliers',activeId],queryFn:()=>getSupplySuppliers(activeId),enabled:!!activeId})
  const ingredients=useQuery({queryKey:['supply-ingredients',activeId],queryFn:()=>getSupplyIngredients(activeId),enabled:!!activeId&&mode==='warehouse'})
  const lots=useQuery({queryKey:['supply-lots',activeId],queryFn:()=>getSupplyLots(activeId),enabled:!!activeId&&mode==='warehouse'})
  const movements=useQuery({queryKey:['supply-movements',activeId],queryFn:()=>getSupplyMovements(activeId),enabled:!!activeId&&mode==='warehouse'})
  const [vendor,setVendor]=useState(emptySupplier)
  const [editingVendor,setEditingVendor]=useState<string|null>(null)
  const [receipt,setReceipt]=useState(emptyReceipt)
  const [issue,setIssue]=useState(emptyIssue)
  const [issueLot,setIssueLot]=useState<SupplyLot|null>(null)
  const [section,setSection]=useState<'stock'|'receipts'|'movements'>('stock')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{setEditingVendor(null);setVendor(emptySupplier());setIssueLot(null);setReceipt(emptyReceipt());setError('');setNotice('')},[activeId])
  async function refresh(){
    await Promise.all([
      qc.invalidateQueries({queryKey:['supply-suppliers',activeId]}),
      qc.invalidateQueries({queryKey:['supply-lots',activeId]}),
      qc.invalidateQueries({queryKey:['supply-movements',activeId]}),
      qc.invalidateQueries({queryKey:['supervision-context']}),
    ])
  }
  async function execute(work:()=>Promise<unknown>,success:string){
    setBusy(true);setError('');setNotice('')
    try{await work();await refresh();setNotice(success)}
    catch(e){setError(e instanceof Error?e.message:'Không thể lưu dữ liệu.')}
    finally{setBusy(false)}
  }
  function editVendor(item:SupplySupplier){
    setEditingVendor(item.id);setVendor({code:item.code,name:item.name,taxCode:item.taxCode??'',contactName:item.contactName??'',phone:item.phone??'',email:item.email??'',address:item.address??''})
    window.scrollTo({top:0,behavior:'smooth'})
  }
  function submitVendor(e:FormEvent){
    e.preventDefault()
    void execute(async()=>{await saveSupplySupplier(activeId,vendor,editingVendor??undefined);setEditingVendor(null);setVendor(emptySupplier())},'Đã lưu nhà cung cấp vào dữ liệu bếp.')
  }
  function submitReceipt(e:FormEvent){
    e.preventDefault()
    void execute(async()=>{await receiveSupplyLot(activeId,{...receipt,quantity:Number(receipt.quantity)});setReceipt(emptyReceipt());setSection('stock')},'Đã ghi nhận lô nhập kho và nhật ký.')
  }
  function submitIssue(e:FormEvent){
    e.preventDefault()
    if(!issueLot)return
    void execute(async()=>{await issueSupplyLot(activeId,issueLot.id,{quantity:Number(issue.quantity),note:issue.note});setIssueLot(null);setIssue(emptyIssue())},'Đã xuất kho và cập nhật tồn lô.')
  }
  const isLoading=kitchenQuery.isLoading||(!!activeId&&(suppliers.isLoading|| (mode==='warehouse'&&lots.isLoading)))
  const failure=kitchenQuery.error||suppliers.error||lots.error||ingredients.error||movements.error
  return <section className="card" style={{padding:24,display:'grid',gap:18}}>
    <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div><span className="section-kicker">DỮ LIỆU POSTGRESQL · THEO BẾP</span>
        <h2>{mode==='suppliers'?'Nhà cung cấp của bếp':'Quản lý kho bếp'}</h2>
        <p className="muted">Một bếp trung tâm sử dụng chung kho cho các trường được phân công. Hồ sơ giám sát đọc trực tiếp nguồn dữ liệu này.</p></div>
      <button type="button" className="outline" onClick={()=>void refresh()} disabled={!activeId}><RefreshCw size={16}/>Làm mới</button>
    </div>
    {kitchens.length>1&&<label>Chọn bếp cần xem <select value={activeId} onChange={e=>setKitchenId(e.target.value)}>{kitchens.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select></label>}
    {activeId&&<p className="muted"><strong>Kho: {kitchens.find(k=>k.id===activeId)?.name}</strong> · {canEdit?'Có quyền cập nhật':'Chỉ xem'} · Không sử dụng dữ liệu DEMO</p>}
    {isLoading&&<p role="status">Đang tải dữ liệu kho từ máy chủ…</p>}
    {failure&&<p className="error" role="alert">{failure instanceof Error?failure.message:'Không tải được dữ liệu kho.'}</p>}
    {!isLoading&&!failure&&!activeId&&<div className="empty-state">Tài khoản chưa được phân quyền xem bếp nào.</div>}
    {error&&<p className="error" role="alert">{error}</p>}
    {notice&&<p role="status" className="supervision-status-message">{notice}</p>}
    {activeId&&mode==='suppliers'&&<>
      {canEdit&&<form onSubmit={submitVendor} style={{display:'grid',gap:10}}>
        <h3><Truck size={18}/>{editingVendor?'Sửa nhà cung cấp':'Thêm nhà cung cấp'}</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
          <label>Mã nhà cung cấp *<input required maxLength={50} value={vendor.code} onChange={e=>setVendor(v=>({...v,code:e.target.value}))}/></label>
          <label>Tên nhà cung cấp *<input required maxLength={200} value={vendor.name} onChange={e=>setVendor(v=>({...v,name:e.target.value}))}/></label>
          <label>Người liên hệ<input maxLength={150} value={vendor.contactName} onChange={e=>setVendor(v=>({...v,contactName:e.target.value}))}/></label>
          <label>Số điện thoại<input maxLength={40} value={vendor.phone} onChange={e=>setVendor(v=>({...v,phone:e.target.value}))}/></label>
          <label>Email<input type="email" value={vendor.email} onChange={e=>setVendor(v=>({...v,email:e.target.value}))}/></label>
          <label>Mã số thuế<input value={vendor.taxCode} onChange={e=>setVendor(v=>({...v,taxCode:e.target.value}))}/></label>
          <label>Địa chỉ<input value={vendor.address} onChange={e=>setVendor(v=>({...v,address:e.target.value}))}/></label>
        </div>
        <div style={{display:'flex',gap:10}}><button className="primary" type="submit" disabled={busy}><Plus size={16}/>{editingVendor?'Lưu thay đổi':'Thêm nhà cung cấp'}</button>{editingVendor&&<button className="outline" type="button" onClick={()=>{setEditingVendor(null);setVendor(emptySupplier())}}>Hủy sửa</button>}</div>
      </form>}
      <h3>Danh sách nhà cung cấp ({suppliers.data?.length??0})</h3>
      {suppliers.data?.length===0&&<p className="muted">Chưa có nhà cung cấp. Bếp cần tạo trước khi nhập lô nguyên liệu.</p>}
      <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Mã</th><th>Tên</th><th>Liên hệ</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        {suppliers.data?.map(item=><tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.contactName??''}<small style={{display:'block'}}>{item.phone??''}</small></td><td>{item.status==='ACTIVE'?'Đang hoạt động':'Ngừng hoạt động'}</td><td>{canEdit&&<button className="outline" type="button" onClick={()=>editVendor(item)}>Sửa</button>}</td></tr>)}
      </tbody></table></div>
    </>}
    {activeId&&mode==='warehouse'&&<>
      <nav style={{display:'flex',gap:8,flexWrap:'wrap'}} aria-label="Quản lý kho">
        {([['stock','Tồn & lô hàng'],['receipts','Nhập kho'],['movements','Nhật ký nhập / xuất']] as const).map(([id,label])=><button type="button" key={id} className={section===id?'primary':'outline'} onClick={()=>setSection(id)}>{label}</button>)}
      </nav>
      {section==='stock'&&<>
        <h3><Boxes size={19}/>Tồn kho theo lô ({lots.data?.length??0})</h3>
        {lots.data?.length===0&&<p className="muted">Bếp chưa có lô nguyên liệu thật. Hãy tạo nhà cung cấp và nhập kho.</p>}
        <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Lô</th><th>Nguyên liệu</th><th>Nhà cung cấp</th><th>Tồn</th><th>Hạn dùng</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        {lots.data?.map(lot=><tr key={lot.id}><td>{lot.lotCode}</td><td>{lot.ingredient.name}</td><td>{lot.supplier.name}</td><td>{fmt(lot.remainingQty)} {lot.unit}</td><td>{date(lot.expiryDate)}</td><td>{lot.status}</td><td>{canEdit&&lot.status==='AVAILABLE'&&lot.remainingQty>0&&<button type="button" className="outline" onClick={()=>{setIssueLot(lot);setIssue(emptyIssue())}}>Xuất lô</button>}</td></tr>)}
        </tbody></table></div>
        {issueLot&&canEdit&&<form onSubmit={submitIssue} style={{display:'grid',gap:10}}>
          <h3><ClipboardList size={18}/>Xuất kho · {issueLot.lotCode} ({fmt(issueLot.remainingQty)} {issueLot.unit} còn lại)</h3>
          <label>Số lượng xuất *<input type="number" required min="0.001" step="0.001" max={issueLot.remainingQty} value={issue.quantity} onChange={e=>setIssue(v=>({...v,quantity:e.target.value}))}/></label>
          <label>Lý do / bữa sử dụng *<input required maxLength={500} value={issue.note} onChange={e=>setIssue(v=>({...v,note:e.target.value}))}/></label>
          <div style={{display:'flex',gap:10}}><button className="primary" type="submit" disabled={busy}>Xác nhận xuất kho</button><button className="outline" type="button" onClick={()=>setIssueLot(null)}>Hủy</button></div>
        </form>}
      </>}
      {section==='receipts'&&<>
        <h3><PackagePlus size={18}/>Tiếp nhận lô nguyên liệu mới</h3>
        {!canEdit?<p className="muted">Tài khoản chỉ có quyền xem.</p>:<form onSubmit={submitReceipt} style={{display:'grid',gap:12}}>
          <label>Nguyên liệu từ danh mục chung *<select required value={receipt.ingredientId} onChange={e=>setReceipt(v=>({...v,ingredientId:e.target.value}))}><option value="">Chọn nguyên liệu</option>{ingredients.data?.map(x=><option key={x.id} value={x.id}>{x.name} · {x.unit}</option>)}</select></label>
          <label>Nhà cung cấp của bếp *<select required value={receipt.supplierId} onChange={e=>setReceipt(v=>({...v,supplierId:e.target.value}))}><option value="">Chọn nhà cung cấp</option>{suppliers.data?.filter(x=>x.status==='ACTIVE').map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
            <label>Mã lô *<input required maxLength={100} value={receipt.lotCode} onChange={e=>setReceipt(v=>({...v,lotCode:e.target.value}))}/></label>
            <label>Số lượng *<input required type="number" min="0.001" step="0.001" value={receipt.quantity} onChange={e=>setReceipt(v=>({...v,quantity:e.target.value}))}/></label>
            <label>Ngày hết hạn<input type="date" value={receipt.expiryDate} onChange={e=>setReceipt(v=>({...v,expiryDate:e.target.value}))}/></label>
            <label>Vị trí lưu kho<input maxLength={120} value={receipt.storageLocation} onChange={e=>setReceipt(v=>({...v,storageLocation:e.target.value}))}/></label>
          </div>
          <label>Ghi chú nhập kho<input maxLength={500} value={receipt.note} onChange={e=>setReceipt(v=>({...v,note:e.target.value}))}/></label>
          <button className="primary" type="submit" disabled={busy||!suppliers.data?.some(x=>x.status==='ACTIVE')||!ingredients.data?.length}>Lưu phiếu nhập kho</button>
          {!suppliers.data?.length&&<p className="muted">Cần tạo nhà cung cấp của bếp trước khi nhập kho.</p>}
        </form>}
      </>}
      {section==='movements'&&<>
        <h3>Nhật ký nhập / xuất theo lô</h3>
        {movements.data?.length===0&&<p className="muted">Chưa có nhật ký.</p>}
        <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Thời điểm</th><th>Nguyên liệu</th><th>Mã lô</th><th>Loại</th><th>Nội dung</th></tr></thead><tbody>
        {movements.data?.map(item=><tr key={item.id}><td>{date(item.occurredAt)}</td><td>{item.lot.ingredient.name}</td><td>{item.lot.lotCode}</td><td>{item.eventType==='RECEIVED'?'Nhập kho':item.eventType==='PREPARED'?'Xuất kho':item.eventType}</td><td>{item.description}</td></tr>)}
        </tbody></table></div>
      </>}
    </>}
  </section>
}
