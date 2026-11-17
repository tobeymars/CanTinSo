import Select from './components/ui/Select'
import SpotlightCard from './components/react-bits/SpotlightCard'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { AlertCircle, ArrowDownToLine, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, Download, Eye, FileCheck2, FileText, Paperclip, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, Upload, WalletCards, X } from 'lucide-react'
import type { ViewRole } from './lib/store'
import { canManageSupplyChain, canViewSupplyChain } from './lib/managementPermissions'
import { defaultCoreRecords, emptySupplierLegal, normalizeSupplier, readSuppliers, saveSuppliers, supplierDocumentTypes, supplierSeeds } from './lib/suppliers'
import type { Supplier, SupplierAttachment, SupplierDocumentType, SupplierLegal } from './lib/suppliers'
import './WarehouseManagement.css'
import './SupplierManagement.css'

const money = new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND',maximumFractionDigits:0})
const pageSize=5
const MAX_FILE_BYTES=800*1024
const MAX_TOTAL_BYTES=2.5*1024*1024
const MAX_FILES=8
const acceptedTypes=new Set(['application/pdf','image/jpeg','image/png','image/webp'])
const dateVN=(value?:string) => value ? new Date(value+'T12:00:00').toLocaleDateString('vi-VN') : 'Chưa ghi nhận'
const valueOr=(value?:string, fallback='Chưa cập nhật') => value?.trim() || fallback
const docName=(type:SupplierDocumentType) => supplierDocumentTypes.find(item=>item.id===type)?.label??'Giấy tờ khác'

function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()}
    window.addEventListener('keydown',handler)
    return ()=>window.removeEventListener('keydown',handler)
  },[onClose])
  return <div className="management-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className={`management-modal supplier-modal ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog-head"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Đóng" onClick={onClose}><X/></button></div>
      {children}
    </section>
  </div>
}

function AttachmentList({files,canRemove=false,onRemove}:{files:SupplierAttachment[];canRemove?:boolean;onRemove?:(id:string)=>void}) {
  const download=(file:SupplierAttachment)=>{
    // Không chèn data URL từ JSON nhập vào iframe; chỉ xuất thành Blob đúng loại đã whitelist.
    if(!acceptedTypes.has(file.mimeType)||!file.dataUrl.startsWith(`data:${file.mimeType};base64,`))return
    try {
      const binary=atob(file.dataUrl.split(',')[1]??'')
      const bytes=Uint8Array.from(binary,character=>character.charCodeAt(0))
      const url=URL.createObjectURL(new Blob([bytes],{type:file.mimeType}))
      const link=document.createElement('a')
      link.href=url
      link.download=file.filename
      link.click()
      setTimeout(()=>URL.revokeObjectURL(url),1500)
    } catch { /* Dữ liệu import không hợp lệ: không mở hay chạy nội dung. */ }
  }
  if(!files.length)return <div className="supplier-files-empty"><FileText size={22}/><div><strong>Chưa có giấy phép hoặc chứng từ được đính kèm</strong><p>Cần bổ sung tệp PDF/ảnh và đối chiếu bản gốc trước khi xác minh.</p></div></div>
  return <div className="supplier-files-list">{files.map(file=><div className="supplier-file" key={file.id}>
    <span className="supplier-file-icon"><FileText size={20}/></span><div className="supplier-file-info"><strong>{file.filename}</strong><small>{docName(file.type)} · {(file.size/1024).toFixed(0)} KB · Thêm {dateVN(file.addedAt)}</small><span className="supplier-status missing">Chưa xác minh</span></div>
    <button type="button" className="outline supplier-file-action" title={`Tải ${file.filename}`} onClick={()=>download(file)}><Download size={15}/><span>Tải file</span></button>
    {canRemove&&<button type="button" className="supplier-file-remove" aria-label={`Bỏ file ${file.filename}`} title="Bỏ tệp đính kèm" onClick={()=>onRemove?.(file.id)}><Trash2 size={16}/></button>}
  </div>)}</div>
}

function SupplierLegalDetail({supplier}:{supplier:Supplier}) {
  const legal=supplier.legal??emptySupplierLegal()
  const list:[string,string][]=[
    ['Phạm vi áp dụng',valueOr(legal.applicability,'Chưa khai báo')],
    ['Số hồ sơ',valueOr(legal.documentNumber,'Chưa ghi nhận')],
    ['Đơn vị cấp / xác nhận',valueOr(legal.issuer,'Chưa công khai')],
    ['Ngày cấp',dateVN(legal.issuedAt)],
    ['Ngày hết hiệu lực',legal.expiresAt?dateVN(legal.expiresAt):valueOr(legal.reviewCycle,'Theo kỳ rà soát')],
    ['Cập nhật gần nhất',dateVN(legal.updatedAt)],
  ]
  return <div className="supplier-legal-detail">
    <div className="supplier-identity"><span className="supplier-avatar"><Building2 size={23}/></span><div><span className="section-kicker">HỒ SƠ NHÀ CUNG CẤP · DEMO</span><h3>{supplier.name}</h3><p>{supplier.code} · {supplier.address||'Chưa có địa chỉ'}</p></div><span className="supplier-status missing">Chưa xác minh</span></div>
    <div className="supplier-summary-grid">
      <SpotlightCard theme="light" spotlightColor="#6b97e1" className="supplier-summary-item"><ShieldCheck size={20}/><span>Trạng thái hồ sơ</span><strong>Chưa xác minh</strong><small>Không tự kết luận đủ điều kiện ATTP</small></SpotlightCard>
      <SpotlightCard theme="light" spotlightColor="#6b97e1" className="supplier-summary-item"><Paperclip size={20}/><span>Tệp chứng từ</span><strong>{legal.attachments.length} tệp</strong><small>Chưa đối chiếu bản gốc</small></SpotlightCard>
      <SpotlightCard theme="light" spotlightColor="#6b97e1" className="supplier-summary-item"><CalendarDays size={20}/><span>Lần cập nhật</span><strong>{dateVN(legal.updatedAt)}</strong><small>Ngày khai báo trong bản DEMO</small></SpotlightCard>
    </div>
    <h4 className="supplier-subtitle"><ClipboardCheck size={18}/>Thông tin pháp lý và phạm vi áp dụng</h4>
    <div className="supplier-document-grid">{list.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <h4 className="supplier-subtitle"><FileCheck2 size={18}/>Hồ sơ cốt lõi</h4>
    <div className="supplier-core-list">{(legal.coreRecords.length?legal.coreRecords:defaultCoreRecords).map((label,index)=>{
      const matching=legal.attachments.some(file=>index===0?file.type==='registration':index===1?file.type==='food_safety':file.type==='contract'||file.type==='origin')
      return <div key={index}><FileText size={17}/><strong>{label}</strong><span className={`supplier-status ${matching?'declared':'missing'}`}>{matching?'Đã đính kèm · Chưa xác minh':'Chưa có file'}</span></div>
    })}</div>
    <h4 className="supplier-subtitle"><Paperclip size={18}/>Các file giấy phép, chứng từ liên quan</h4>
    <AttachmentList files={legal.attachments}/>
    <p className="demo-note supplier-demo-disclaimer">DEMO · Hồ sơ, số giấy phép, ngày cấp và các tệp là thông tin do người sử dụng nhập. Không tự đánh dấu đã đạt chuẩn hay đã được cơ quan có thẩm quyền xác nhận. Tệp được lưu cục bộ trên trình duyệt, không phải kho chứng từ chính thức.</p>
  </div>
}

function fileToDataUrl(file:File):Promise<string> {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Không đọc được tệp'))
    reader.onerror=()=>reject(new Error('Không đọc được tệp'))
    reader.readAsDataURL(file)
  })
}

export default function SupplierManagement({role}:{role:ViewRole}) {
  const [suppliers,setSuppliers]=useState(readSuppliers)
  const [code,setCode]=useState('')
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [debtOnly,setDebtOnly]=useState(false)
  const [page,setPage]=useState(1)
  const [editing,setEditing]=useState<Supplier|null|undefined>(undefined)
  const [viewingId,setViewingId]=useState<string|null>(null)
  const [deleting,setDeleting]=useState<Supplier|null>(null)
  const [attachments,setAttachments]=useState<SupplierAttachment[]>([])
  const [docType,setDocType]=useState<SupplierDocumentType>('registration')
  const [uploading,setUploading]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const importRef=useRef<HTMLInputElement>(null)
  const canRead=canViewSupplyChain(role)
  const canEdit=canManageSupplyChain(role)
  const filtered=useMemo(()=>suppliers.filter(item=>item.code.toLocaleLowerCase('vi').includes(code.toLocaleLowerCase('vi'))&&item.name.toLocaleLowerCase('vi').includes(name.toLocaleLowerCase('vi'))&&item.phone.replaceAll(' ','').includes(phone.replaceAll(' ',''))&&(!debtOnly||item.debt>0)),[suppliers,code,name,phone,debtOnly])
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize))
  const visible=filtered.slice((Math.min(page,pages)-1)*pageSize,Math.min(page,pages)*pageSize)
  const viewing=suppliers.find(item=>item.id===viewingId)
  useEffect(()=>{
    const update=(event:StorageEvent)=>{if(event.key==='demo-suppliers-v1')setSuppliers(readSuppliers())}
    window.addEventListener('storage',update)
    return()=>window.removeEventListener('storage',update)
  },[])
  const persist=(items:Supplier[])=>{
    if(!canEdit){setError('Vai trò giám sát không được phép thay đổi nhà cung cấp.');return false}
    try{saveSuppliers(items);setSuppliers(items);return true}
    catch{setError('Không lưu được trên trình duyệt: bộ nhớ DEMO có thể đã đầy. Hãy giảm dung lượng tệp hoặc sao lưu và xóa dữ liệu không cần thiết.');return false}
  }
  const reset=()=>{setCode('');setName('');setPhone('');setDebtOnly(false);setPage(1)}
  const openEditor=(supplier:Supplier|null)=>{if(!canEdit)return;setEditing(supplier);setAttachments(supplier?.legal?.attachments??[]);setDocType('registration');setError('')}
  const exportCsv=()=>{
    const rows=[['Mã nhà cung cấp','Tên','Điện thoại','Email','Phạm vi áp dụng','Số hồ sơ','Đơn vị cấp / xác nhận','Ngày cấp','Ngày hết hiệu lực','Cập nhật gần nhất','Số file','Nợ cần trả','Tổng mua'],...filtered.map(item=>[item.code,item.name,item.phone,item.email,item.legal?.applicability??'',item.legal?.documentNumber??'',item.legal?.issuer??'',item.legal?.issuedAt??'',item.legal?.expiresAt??'',item.legal?.updatedAt??'',String(item.legal?.attachments.length??0),String(item.debt),String(item.totalPurchase)])]
    const csv='\uFEFF'+rows.map(row=>row.map(value=>`"${value.replaceAll('"','""')}"`).join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a');link.href=url;link.download='nha-cung-cap-DEMO.csv';link.click();URL.revokeObjectURL(url)
    setNotice('Đã xuất danh sách và thông tin khai báo DEMO (không xuất nội dung tệp đính kèm).')
  }
  const importJson=async(event:ChangeEvent<HTMLInputElement>)=>{
    if(!canEdit)return
    const file=event.target.files?.[0];event.target.value='';if(!file)return
    try {
      const value:unknown=JSON.parse(await file.text())
      if(!Array.isArray(value))throw new Error()
      const imported=value.filter((item):item is Supplier=>typeof item==='object'&&item!==null&&typeof (item as Supplier).code==='string'&&typeof (item as Supplier).name==='string').map(item=>normalizeSupplier({...item,id:item.id||crypto.randomUUID(),phone:typeof item.phone==='string'?item.phone:'',email:typeof item.email==='string'?item.email:'',contact:typeof item.contact==='string'?item.contact:'',address:typeof item.address==='string'?item.address:'',taxCode:typeof item.taxCode==='string'?item.taxCode:'',note:typeof item.note==='string'?item.note:'',debt:Number(item.debt)||0,totalPurchase:Number(item.totalPurchase)||0,status:item.status==='inactive'?'inactive':'active'}))
      if(!imported.length)throw new Error()
      if(persist(imported))setNotice(`Đã nhập ${imported.length} nhà cung cấp DEMO.`)
    }catch{setError('Tệp import phải là JSON danh sách nhà cung cấp hợp lệ.')}
  }
  const attachFiles=async(event:ChangeEvent<HTMLInputElement>)=>{
    const files=Array.from(event.target.files??[]);event.target.value='';if(!files.length)return
    const total=attachments.reduce((sum,file)=>sum+file.size,0)+files.reduce((sum,file)=>sum+file.size,0)
    if(attachments.length+files.length>MAX_FILES){setError(`Mỗi nhà cung cấp được tối đa ${MAX_FILES} tệp DEMO.`);return}
    if(files.some(file=>!acceptedTypes.has(file.type)||file.size>MAX_FILE_BYTES||file.size===0)){setError('Chỉ nhận PDF/JPG/PNG/WebP, mỗi tệp tối đa 800 KB.');return}
    if(total>MAX_TOTAL_BYTES){setError('Tổng dung lượng tệp DEMO tối đa 2,5 MB / nhà cung cấp.');return}
    setUploading(true);setError('')
    try {
      const next:SupplierAttachment[]=await Promise.all(files.map(async file=>({id:crypto.randomUUID(),type:docType,filename:file.name,mimeType:file.type,size:file.size,addedAt:new Date().toISOString().slice(0,10),dataUrl:await fileToDataUrl(file),status:'unverified' as const})))
      setAttachments(current=>[...current,...next])
    }catch{setError('Không đọc được file. Vui lòng chọn lại.')}
    finally{setUploading(false)}
  }
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    if(!canEdit){event.preventDefault();return}
    event.preventDefault();setError('')
    const form=new FormData(event.currentTarget)
    const str=(key:string)=>String(form.get(key)??'').trim()
    const existingLegal=editing?.legal??emptySupplierLegal()
    const legal:SupplierLegal={...existingLegal,applicability:str('applicability'),coreRecords:str('coreRecords').split('\n').map(item=>item.trim()).filter(Boolean).slice(0,10),documentNumber:str('documentNumber'),issuer:str('issuer'),issuedAt:str('issuedAt'),expiresAt:str('expiresAt'),reviewCycle:str('reviewCycle')||'Theo kỳ rà soát',updatedAt:new Date().toLocaleDateString('sv-SE'),attachments}
    if(legal.issuedAt&&legal.expiresAt&&legal.expiresAt<legal.issuedAt){setError('Ngày hết hiệu lực phải sau hoặc bằng ngày cấp.');return}
    const supplier:Supplier={id:editing?.id??crypto.randomUUID(),code:str('code'),name:str('name'),contact:str('contact'),phone:str('phone'),email:str('email'),address:str('address'),taxCode:str('taxCode'),note:str('note'),debt:editing?.debt??0,totalPurchase:editing?.totalPurchase??0,status:str('status')==='inactive'?'inactive':'active',legal}
    if(suppliers.some(item=>item.code.toLocaleLowerCase('vi')===supplier.code.toLocaleLowerCase('vi')&&item.id!==supplier.id)){setError('Mã nhà cung cấp đã tồn tại.');return}
    const items=editing?suppliers.map(item=>item.id===supplier.id?supplier:item):[supplier,...suppliers]
    if(persist(items)){setEditing(undefined);setNotice(editing?'Đã cập nhật hồ sơ nhà cung cấp DEMO.':'Đã thêm nhà cung cấp DEMO.')}
  }
  if(!canRead)return <div className="management-page"><section className="card management-access-denied"><AlertCircle/><h2>Không có quyền truy cập</h2><p>Vai trò hiện tại không được phân công quản lý nhà cung cấp.</p></section></div>
  return <div className="management-page supplier-management">
    <header className="management-page-header"><div><div className="section-kicker">DỮ LIỆU MINH HỌA · QUẢN LÝ MUA HÀNG</div><h2>{canEdit?'Quản lý nhà cung cấp':'Giám sát nhà cung cấp'}</h2><p>Theo dõi nhà cung cấp, phạm vi áp dụng, hồ sơ pháp lý và các giấy phép, chứng từ liên quan tại bếp trung tâm và bếp tại trường.</p></div>{canEdit&&<div className="management-header-actions"><button className="primary" onClick={()=>openEditor(null)}><Plus size={17}/>Thêm nhà cung cấp</button></div>}</header>
    {!canEdit&&<div className="management-readonly"><AlertCircle size={17}/><span>Chế độ chỉ xem hồ sơ và tra cứu chứng từ nhà cung cấp; không được thêm, sửa, xóa, nhập hoặc xuất danh sách.</span></div>}
    {notice&&<div className="local-toast" role="status"><Check size={16}/>{notice}<button aria-label="Đóng thông báo" onClick={()=>setNotice('')}><X size={15}/></button></div>}{error&&editing===undefined&&<p className="error" role="alert">{error}</p>}
    <div className="management-kpis two"><article className="card"><Building2/><span>Tổng số nhà cung cấp</span><strong>{suppliers.length}</strong><small>{suppliers.filter(item=>item.status==='active').length} đang hoạt động</small></article><article className="card warning"><WalletCards/><span>Tổng nợ cần trả</span><strong>{money.format(suppliers.reduce((sum,item)=>sum+item.debt,0))}</strong><small>Dữ liệu DEMO · Không phải chứng từ kế toán</small></article></div>
    <section className="card management-table-card"><div className="management-toolbar supplier-toolbar"><label><span>Mã nhà cung cấp</span><div><Search size={15}/><input value={code} onChange={event=>{setCode(event.target.value);setPage(1)}} placeholder="Tìm theo mã…"/></div></label><label><span>Tên nhà cung cấp</span><div><Search size={15}/><input value={name} onChange={event=>{setName(event.target.value);setPage(1)}} placeholder="Tìm theo tên…"/></div></label><label><span>Số điện thoại</span><div><Search size={15}/><input value={phone} onChange={event=>{setPhone(event.target.value);setPage(1)}} placeholder="Tìm số điện thoại…"/></div></label><label className="management-check"><input type="checkbox" checked={debtOnly} onChange={event=>{setDebtOnly(event.target.checked);setPage(1)}}/>Còn công nợ</label><div className="management-toolbar-actions"><button className="icon-button" aria-label="Làm mới bộ lọc" onClick={reset}><RefreshCw size={17}/></button>{canEdit&&<><input ref={importRef} hidden type="file" accept="application/json" onChange={event=>{void importJson(event)}}/><button className="outline" onClick={()=>importRef.current?.click()}><Upload size={16}/>Import</button></>}{canEdit&&<button className="outline" onClick={exportCsv}><ArrowDownToLine size={16}/>Export</button>}</div></div>
      <div className="table-scroll"><table className="management-table supplier-table"><thead><tr><th>Mã nhà cung cấp</th><th>Tên nhà cung cấp</th><th>Phạm vi áp dụng</th><th>Hồ sơ pháp lý</th><th>Điện thoại</th><th>Nợ cần trả</th><th>Thao tác</th></tr></thead><tbody>{visible.map(item=><tr key={item.id}><td><strong>{item.code}</strong><small>{item.status==='active'?'Đang hoạt động':'Tạm ngưng'}</small></td><td><strong>{item.name}</strong><small>{item.contact||'Chưa có người liên hệ'}</small></td><td>{valueOr(item.legal?.applicability,'Chưa khai báo')}</td><td><button className="supplier-file-count" type="button" onClick={()=>setViewingId(item.id)}><FileText size={15}/>{item.legal?.attachments.length??0} tệp <span>· Chưa xác minh</span></button><small>{item.legal?.documentNumber||'Số hồ sơ: Chưa ghi nhận'}</small></td><td>{item.phone||'—'}</td><td className={item.debt?'management-debt':''}>{money.format(item.debt)}</td><td><div className="row-actions"><button aria-label={`Xem hồ sơ ${item.name}`} title="Xem hồ sơ" onClick={()=>setViewingId(item.id)}><Eye size={16}/></button>{canEdit&&<><button aria-label={`Sửa ${item.name}`} title="Sửa" onClick={()=>openEditor(item)}><Pencil size={15}/></button><button aria-label={`Xóa ${item.name}`} title="Xóa" onClick={()=>setDeleting(item)}><Trash2 size={15}/></button></>}</div></td></tr>)}</tbody></table></div>
      {!visible.length&&<div className="empty-state"><Search size={36}/><h3>Không tìm thấy nhà cung cấp</h3><p>Thử thay đổi bộ lọc hoặc thêm nhà cung cấp mới.</p></div>}
      <footer className="management-pagination"><span>Hiển thị {visible.length} / {filtered.length} nhà cung cấp</span><div><button aria-label="Trang trước" disabled={page<=1} onClick={()=>setPage(value=>value-1)}><ChevronLeft/></button><strong>{Math.min(page,pages)} / {pages}</strong><button aria-label="Trang sau" disabled={page>=pages} onClick={()=>setPage(value=>value+1)}><ChevronRight/></button></div></footer>
    </section>
    {viewing&&<Modal title="Hồ sơ nhà cung cấp" wide onClose={()=>setViewingId(null)}><SupplierLegalDetail supplier={viewing}/>{canEdit&&<div className="supplier-detail-actions"><button type="button" className="primary" onClick={()=>{setViewingId(null);openEditor(viewing)}}><Pencil size={16}/>Chỉnh sửa hồ sơ</button></div>}</Modal>}
    {canEdit&&editing!==undefined&&<Modal title={editing?'Chỉnh sửa nhà cung cấp':'Thêm nhà cung cấp'} wide onClose={()=>setEditing(undefined)}><form className="management-form supplier-edit-form" onSubmit={submit}>
      <h3 className="supplier-form-section-title">Thông tin chung</h3>
      <div className="management-form-grid"><label>Mã nhà cung cấp<input name="code" defaultValue={editing?.code??''} minLength={3} maxLength={60} required/></label><label>Tên nhà cung cấp<input name="name" defaultValue={editing?.name??''} minLength={2} maxLength={160} required/></label><label>Người liên hệ<input name="contact" defaultValue={editing?.contact??''} maxLength={120}/></label><label>Điện thoại<input name="phone" defaultValue={editing?.phone??''} inputMode="tel" pattern="[0-9 +.-]{8,20}" required/></label><label>Email<input name="email" defaultValue={editing?.email??''} type="email"/></label><label>Mã số thuế<input name="taxCode" defaultValue={editing?.taxCode??''} maxLength={30}/></label><label className="wide">Địa chỉ<input name="address" defaultValue={editing?.address??''} maxLength={250}/></label><label>Trạng thái<Select label="Trạng thái" name="status" defaultValue={editing?.status??'active'}><option value="active">Đang hoạt động</option><option value="inactive">Tạm ngưng</option></Select></label><label className="wide">Ghi chú<textarea name="note" defaultValue={editing?.note??''} maxLength={500}/></label></div>
      <h3 className="supplier-form-section-title"><ShieldCheck size={18}/>Phạm vi áp dụng và hồ sơ pháp lý</h3>
      <div className="management-form-grid"><label className="wide">Phạm vi áp dụng<textarea name="applicability" defaultValue={editing?.legal?.applicability??''} maxLength={500} placeholder="Ví dụ: Cung cấp rau củ, thực phẩm tươi sống cho bếp trung tâm và bếp tại trường"/></label><label>Số hồ sơ<input name="documentNumber" defaultValue={editing?.legal?.documentNumber??''} maxLength={100} placeholder="Chưa ghi nhận"/></label><label>Đơn vị cấp / xác nhận<input name="issuer" defaultValue={editing?.legal?.issuer??''} maxLength={200} placeholder="Chưa công khai"/></label><label>Ngày cấp<input type="date" name="issuedAt" defaultValue={editing?.legal?.issuedAt??''}/></label><label>Ngày hết hiệu lực<input type="date" name="expiresAt" defaultValue={editing?.legal?.expiresAt??''}/></label><label className="wide">Trường hợp không có ngày hết hạn cố định<input name="reviewCycle" defaultValue={editing?.legal?.reviewCycle??'Theo kỳ rà soát'} maxLength={150} placeholder="Theo kỳ rà soát"/></label><label className="wide">Hồ sơ cốt lõi (mỗi dòng một loại)<textarea rows={4} name="coreRecords" defaultValue={(editing?.legal?.coreRecords??defaultCoreRecords).join('\n')} maxLength={1500}/></label></div>
      <h3 className="supplier-form-section-title"><Paperclip size={18}/>Các file giấy phép, chứng từ liên quan</h3>
      <div className="supplier-upload-grid"><label>Nhóm chứng từ<Select label="Nhóm chứng từ" value={docType} onValueChange={value=>setDocType(value as SupplierDocumentType)}>{supplierDocumentTypes.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</Select></label><label className="supplier-file-picker"><Upload size={19}/><span>{uploading?'Đang đọc file…':'Chọn tệp PDF / ảnh'}</span><small>Tối đa 800 KB/file · 8 tệp · tổng 2,5 MB</small><input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" disabled={uploading} onChange={event=>{void attachFiles(event)}}/></label></div>
      <AttachmentList files={attachments} canRemove onRemove={id=>setAttachments(files=>files.filter(file=>file.id!==id))}/>
      {error&&<p className="error" role="alert">{error}</p>}
      <p className="demo-note">DEMO · Tệp PDF/ảnh được lưu trực tiếp trong localStorage của trình duyệt với giới hạn dung lượng; chưa đưa lên máy chủ, chưa kiểm tra hiệu lực và chưa có chữ ký số. Không sử dụng làm kho hồ sơ pháp lý thực tế.</p>
      <div className="management-form-actions"><button type="button" className="outline" onClick={()=>setEditing(undefined)}>Hủy</button><button className="primary" disabled={uploading}>Lưu nhà cung cấp</button></div>
    </form></Modal>}
    {canEdit&&deleting&&<Modal title="Xác nhận xóa nhà cung cấp" onClose={()=>setDeleting(null)}><div className="management-confirm"><Trash2 size={34}/><p>Bạn có chắc muốn xóa <strong>{deleting.name}</strong> và các tệp DEMO đính kèm? Dữ liệu chỉ được xóa khỏi trình duyệt hiện tại.</p><div><button className="outline" onClick={()=>setDeleting(null)}>Hủy</button><button className="danger-button" onClick={()=>{if(persist(suppliers.filter(item=>item.id!==deleting.id))){setDeleting(null);setNotice('Đã xóa nhà cung cấp DEMO.')}}}>Xóa nhà cung cấp</button></div></div></Modal>}
    {canEdit&&<p className="management-reset"><button onClick={()=>{if(window.confirm('Khôi phục toàn bộ nhà cung cấp DEMO? Thao tác này thay thế cả hồ sơ và tệp đã nhập.')){if(persist(supplierSeeds.map(normalizeSupplier)))setNotice('Đã khôi phục dữ liệu mẫu.')}}}><RefreshCw size={14}/>Khôi phục dữ liệu mẫu</button></p>}
  </div>
}
