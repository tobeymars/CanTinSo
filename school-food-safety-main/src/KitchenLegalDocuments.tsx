import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowDownToLine, CheckCircle2, ChevronRight, CircleHelp, FileCheck2, FilePlus2, FileText, Paperclip, Pencil, Plus, Search, ShieldCheck, Trash2, UploadCloud, X, Users, CookingPot, ClipboardCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { demoData } from './lib/data'
import type { School, KitchenDocumentCategory, KitchenDocumentStatus, KitchenDocument } from './lib/data'
import type { ViewRole } from './lib/store'
import { deleteLegalFile, downloadLegalFile, persistLegalDocument, readLegalDocuments, removeLegalDocument, saveLegalFile, validateLegalFiles } from './lib/kitchenLegalStorage'
import type { LegalDocument, LegalAttachment } from './lib/kitchenLegalStorage'
import SpotlightCard from './components/react-bits/SpotlightCard'
import './KitchenLegalDocuments.css'

const nowIso = () => new Date().toISOString()

const categories: {id:KitchenDocumentCategory;label:string;icon:LucideIcon;description:string}[] = [
 {id:'legal',label:'Pháp lý & trách nhiệm',icon:FileText,description:'Giấy phép và văn bản xác định trách nhiệm'},
 {id:'people',label:'Nhân sự trực tiếp',icon:Users,description:'Thông tin tuân thủ liên quan đến nhân sự'},
 {id:'facility',label:'Điều kiện cơ sở',icon:CookingPot,description:'Cơ sở vật chất, vệ sinh và thiết bị'},
 {id:'operations',label:'Nhật ký vận hành',icon:ClipboardCheck,description:'Kiểm thực, lưu mẫu, kiểm tra, khắc phục'},
]
const statusLabels:Record<KitchenDocumentStatus,string>={valid:'Còn hiệu lực (tự khai)',expiring:'Đến kỳ rà soát',missing:'Cần bổ sung',not_applicable:'Chưa xác định áp dụng'}
const applicabilityLabels={required:'Hồ sơ cốt lõi',conditional:'Theo trường hợp',recurring:'Cập nhật định kỳ'}
const canManage=(role:ViewRole)=>['school_board','central_kitchen','school_kitchen'].includes(role)
const shortDate=(value?:string)=>value?new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN'):'Chưa ghi nhận'
// crypto.randomUUID() chỉ có trên secure context (HTTPS/localhost) ở một số trình duyệt.
// Dự án DEMO có thể chạy trên HTTP/IP, nên tạo mã dự phòng để nút "Thêm hồ sơ" luôn mở form.
const createLocalId=():string=>{
 if(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function') return crypto.randomUUID()
 if(typeof crypto!=='undefined' && typeof crypto.getRandomValues==='function'){
   const bytes=new Uint8Array(16)
   crypto.getRandomValues(bytes)
   bytes[6]=(bytes[6]&0x0f)|0x40
   bytes[8]=(bytes[8]&0x3f)|0x80
   const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')
   return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
 }
 return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`
}
const makeDraft=(category:KitchenDocumentCategory='legal'):LegalDocument=>({id:createLocalId(),title:'',category,status:'missing',applicability:'conditional',note:'',publicSummary:'Chưa có thông tin được công khai.',attachments:[],custom:true})

function LegalDialog({title,close,children}:{title:string;close:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{
   const dialog=ref.current
   if(!dialog)return
   // Một số webview chưa hỗ trợ dialog.showModal; vẫn cho phép mở form.
   if(typeof dialog.showModal==='function'){
     try{if(!dialog.open)dialog.showModal()}catch{dialog.setAttribute('open','');dialog.classList.add('legal-modal-fallback')}
   }else{dialog.setAttribute('open','');dialog.classList.add('legal-modal-fallback')}
   return ()=>{if(typeof dialog.close==='function'&&dialog.open)dialog.close()}
 },[])
 return <dialog ref={ref} aria-label={title} className="legal-modal" onCancel={event=>{event.preventDefault();close()}} onClick={event=>{if(event.target===event.currentTarget)close()}}><div className="legal-modal-heading"><div><small>HỒ SƠ BẾP ĂN · DEMO</small><h2>{title}</h2></div><button type="button" aria-label="Đóng" onClick={close}><X size={20}/></button></div>{children}</dialog>
}
export default function KitchenLegalDocuments({school,role}:{school:School;role:ViewRole}){
 const [version,setVersion]=useState(0)
 const [search,setSearch]=useState('')
 const [filter,setFilter]=useState<'all'|KitchenDocumentCategory>('all')
 const [selected,setSelected]=useState<string|null>(null)
 const [editing,setEditing]=useState<LegalDocument|null>(null)
 const [files,setFiles]=useState<File[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const rights=canManage(role)
 const query=useQuery({queryKey:['legal-baseline',school.id],queryFn:()=>demoData.kitchenDocuments(school)})
 useEffect(()=>{
   const refresh=(event:Event)=>{if(event instanceof StorageEvent && event.key&&!event.key.includes('demo-kitchen-legal-v1'))return;setVersion(v=>v+1)}
   window.addEventListener('demo-kitchen-legal-updated',refresh)
   window.addEventListener('storage',refresh)
   return()=>{window.removeEventListener('demo-kitchen-legal-updated',refresh);window.removeEventListener('storage',refresh)}
 },[])
 void version
 const records=readLegalDocuments(school.id,query.data??[])
 const visible=records.filter(item=>(filter==='all'||item.category===filter)&&`${item.title} ${item.documentNumber??''} ${item.issuer??''}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))
 const current=records.find(item=>item.id===selected)
 const cardCount=(key:KitchenDocumentStatus)=>records.filter(item=>item.status===key).length
 function openEditor(item:LegalDocument){setSelected(null);setEditing({...item,attachments:[...item.attachments]});setFiles([]);setError('')}
 function update<K extends keyof LegalDocument>(key:K,value:LegalDocument[K]){setEditing(prev=>prev?{...prev,[key]:value}:null)}
 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault();if(!rights||!editing)return
   setError('')
   const validation=validateLegalFiles(files,editing.attachments.length)
   if(validation){setError(validation);return}
   if(!editing.title.trim()){setError('Vui lòng nhập tên hồ sơ.');return}
   if(editing.issuedAt&&editing.expiresAt&&editing.expiresAt<editing.issuedAt){setError('Ngày hết hiệu lực không được trước ngày cấp.');return}
   setBusy(true)
   const uploaded:LegalAttachment[]=[]
   try {
     for(const file of files){
       const attachment={id:`legal-${createLocalId()}`,name:file.name,type:file.type,size:file.size,addedAt:nowIso()}
       await saveLegalFile(attachment.id,file)
       uploaded.push(attachment)
     }
     const clean:LegalDocument={...editing,title:editing.title.trim(),issuer:editing.issuer?.trim()||undefined,documentNumber:editing.documentNumber?.trim()||undefined,
       publicSummary:editing.publicSummary.trim()||'Chưa có nội dung được công khai.',updatedAt:nowIso().slice(0,10),attachments:[...editing.attachments,...uploaded]}
     persistLegalDocument(school.id,clean)
     const removed=records.find(item=>item.id===clean.id)?.attachments.filter(old=>!clean.attachments.some(item=>item.id===old.id))??[]
     for(const attachment of removed) await deleteLegalFile(attachment.id).catch(()=>{})
     setEditing(null);setFiles([]);setMessage('Đã lưu hồ sơ DEMO trên trình duyệt hiện tại. Chưa xác minh giấy tờ.')
   }catch(cause){
     for(const item of uploaded)await deleteLegalFile(item.id).catch(()=>{})
     setError(cause instanceof Error?cause.message:'Không thể lưu hồ sơ hoặc tệp đính kèm.')
   }finally{setBusy(false)}
 }
 async function removeAttachment(attachment:LegalAttachment){
   if(!editing||!rights)return
   setEditing({...editing,attachments:editing.attachments.filter(item=>item.id!==attachment.id)})
   setMessage(`Tệp ${attachment.name} sẽ được xóa khỏi hồ sơ khi bạn bấm Lưu.`)
 }
 async function deleteCustom(item:LegalDocument){
   if(!rights||!item.custom||!window.confirm(`Xóa hồ sơ DEMO “${item.title}”?`))return
   removeLegalDocument(school.id,item.id)
   for(const attachment of item.attachments)await deleteLegalFile(attachment.id).catch(()=>{})
   setSelected(null);setMessage('Đã xóa hồ sơ tự tạo trong DEMO.')
 }
 const docStatus=(value:KitchenDocumentStatus)=> <span className={`legal-status legal-status-${value}`}><span/> {statusLabels[value]}</span>
 return <section className="legal-page" aria-label="Hồ sơ pháp lý và điều kiện bếp">
  <SpotlightCard className="legal-overview" spotlightColor="#dce8ff" intensity={0.3} proximity={0} flare={false}>
    <div><span className="section-kicker">QUẢN LÝ HỒ SƠ BẾP ĂN</span><h2>Hồ sơ pháp lý & điều kiện bếp</h2><p>Danh mục hồ sơ theo trường được dùng chung cho 5 vai trò. Thông tin thay đổi ở đây không tạo ra xác nhận pháp lý.</p></div>
    {rights&&<button type="button" className="legal-primary" onClick={()=>openEditor(makeDraft())}><Plus size={17}/> Thêm hồ sơ</button>}
  </SpotlightCard>
  <div className="legal-summary"><div><FileCheck2 size={20}/><span><strong>{records.length}</strong><small>Hạng mục</small></span></div><div><CheckCircle2 size={20}/><span><strong>{cardCount('valid')}</strong><small>Khai báo còn hiệu lực</small></span></div><div><AlertCircle size={20}/><span><strong>{cardCount('missing')+cardCount('expiring')}</strong><small>Cần bổ sung / rà soát</small></span></div></div>
  <div className="legal-filter"><label><Search size={17}/><input aria-label="Tìm hồ sơ pháp lý" placeholder="Tìm theo tên, số hồ sơ, đơn vị cấp..." value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Lọc nhóm hồ sơ" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="all">Tất cả nhóm hồ sơ</option>{categories.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select></div>
  {message&&<div className="legal-notice" role="status"><CheckCircle2 size={16}/>{message}<button aria-label="Đóng thông báo" onClick={()=>setMessage('')}><X size={14}/></button></div>}
  {query.isLoading?<div className="legal-loading">Đang tải danh mục hồ sơ...</div>:query.isError?<div className="legal-loading">Không tải được danh mục hồ sơ DEMO.</div>:<div className="legal-groups">{categories.filter(category=>filter==='all'||filter===category.id).map(category=>{
    const filtered=visible.filter(item=>item.category===category.id)
    const Icon=category.icon
    return <section key={category.id} className="legal-group"><header><span className="legal-group-icon"><Icon size={19}/></span><div><h3>{category.label}</h3><p>{category.description}</p></div><small>{filtered.length} hồ sơ</small></header><div className="legal-cards">{filtered.map(item=><button className="legal-record" key={item.id} onClick={()=>{setSelected(item.id);setError('')}} aria-label={`Xem hồ sơ ${item.title}`}><div className="legal-record-top"><span className="legal-record-icon"><FileText size={19}/></span>{docStatus(item.status)}</div><strong>{item.title}</strong><p>{item.publicSummary}</p><footer><small>{applicabilityLabels[item.applicability]}</small><span>Xem hồ sơ <ChevronRight size={15}/></span></footer></button>)}</div>{!filtered.length&&<p className="legal-empty">Chưa có hồ sơ phù hợp bộ lọc.</p>}</section>
  })}</div>}
  <p className="legal-disclaimer"><ShieldCheck size={17}/> Dữ liệu DEMO chỉ là thông tin khai báo. Hồ sơ, file giấy phép và chứng từ chưa qua xác minh; file chỉ lưu cục bộ, không tự động công khai.</p>
  {current&&!editing&&<LegalDialog title={current.title} close={()=>setSelected(null)}><div className="legal-detail-head">{docStatus(current.status)} <span>DEMO · Chưa kiểm chứng</span></div><div className="legal-detail-grid"><div><small>Phạm vi áp dụng</small><strong>{applicabilityLabels[current.applicability]}</strong></div><div><small>Số hồ sơ</small><strong>{current.documentNumber||'Chưa ghi nhận'}</strong></div><div><small>Đơn vị cấp / xác nhận</small><strong>{current.issuer||'Chưa công khai'}</strong></div><div><small>Ngày cấp</small><strong>{shortDate(current.issuedAt)}</strong></div><div><small>Ngày hết hiệu lực</small><strong>{current.expiresAt?shortDate(current.expiresAt):'Theo kỳ rà soát'}</strong></div><div><small>Cập nhật gần nhất</small><strong>{shortDate(current.updatedAt)}</strong></div></div><div className="legal-detail-note"><h3>Thông tin được phép công khai</h3><p>{current.publicSummary}</p><h3>Lưu ý áp dụng</h3><p>{current.note||'Chưa cập nhật'}</p></div><div className="legal-attachments"><h3><Paperclip size={17}/> Giấy phép và chứng từ liên quan ({current.attachments.length})</h3>{rights?current.attachments.length?current.attachments.map(attachment=><button className="legal-attachment-row" key={attachment.id} onClick={async()=>{try{await downloadLegalFile(attachment)}catch(cause){setError(cause instanceof Error?cause.message:'Không tìm thấy tệp')}}}><FileText size={19}/><span><strong>{attachment.name}</strong><small>{Math.ceil(attachment.size/1024)} KB · Lưu cục bộ</small></span><ArrowDownToLine size={16}/></button>):<p>Chưa có tệp pháp lý được đính kèm.</p>:<p>Tệp gốc chỉ hiển thị trong không gian nội bộ được phân quyền. Thông tin công khai không bao gồm bản scan giấy tờ.</p>}</div>{error&&<p className="legal-error" role="alert">{error}</p>}{rights&&<div className="legal-actions"><button className="legal-primary" onClick={()=>openEditor(current)}><Pencil size={16}/> Sửa hồ sơ / đính kèm tệp</button>{current.custom&&<button className="legal-danger" onClick={()=>{void deleteCustom(current)}}><Trash2 size={16}/> Xóa hồ sơ</button>}</div>}</LegalDialog>}
  {editing&&rights&&<LegalDialog title={editing.custom&&editing.title===''?'Thêm hồ sơ pháp lý':'Cập nhật hồ sơ pháp lý'} close={()=>{if(!busy){setEditing(null);setFiles([]);setError('')}}}><form className="legal-form" onSubmit={event=>{void submit(event)}}><div className="legal-form-grid"><label className="legal-full">Tên hồ sơ / giấy tờ <span>*</span><input required maxLength={180} value={editing.title} onChange={e=>update('title',e.target.value)} placeholder="Ví dụ: Giấy chứng nhận cơ sở đủ điều kiện ATTP"/></label><label>Nhóm hồ sơ <select value={editing.category} onChange={e=>update('category',e.target.value as KitchenDocumentCategory)}>{categories.map(category=><option key={category.id} value={category.id}>{category.label}</option>)}</select></label><label>Phạm vi áp dụng<select value={editing.applicability} onChange={e=>update('applicability',e.target.value as KitchenDocument['applicability'])}><option value="required">Hồ sơ cốt lõi</option><option value="conditional">Theo trường hợp</option><option value="recurring">Cập nhật định kỳ</option></select></label><label>Trạng thái khai báo<select value={editing.status} onChange={e=>update('status',e.target.value as KitchenDocumentStatus)}><option value="missing">Cần bổ sung</option><option value="valid">Còn hiệu lực (tự khai)</option><option value="expiring">Sắp đến kỳ rà soát</option><option value="not_applicable">Chưa xác định áp dụng</option></select></label><label>Số hồ sơ<input maxLength={100} value={editing.documentNumber??''} onChange={e=>update('documentNumber',e.target.value)} placeholder="Chưa ghi nhận"/></label><label className="legal-full">Đơn vị cấp / xác nhận<input maxLength={180} value={editing.issuer??''} onChange={e=>update('issuer',e.target.value)} placeholder="Tên cơ quan hoặc đơn vị cấp"/></label><label>Ngày cấp<input type="date" value={editing.issuedAt??''} onChange={e=>update('issuedAt',e.target.value||undefined)}/></label><label>Ngày hết hiệu lực<input type="date" value={editing.expiresAt??''} onChange={e=>update('expiresAt',e.target.value||undefined)}/></label><label className="legal-full">Thông tin công khai (không chứa dữ liệu nhạy cảm)<textarea rows={3} maxLength={650} value={editing.publicSummary} onChange={e=>update('publicSummary',e.target.value)}/></label><label className="legal-full">Ghi chú áp dụng (không ghi thông tin cá nhân nhạy cảm)<textarea rows={3} maxLength={1200} value={editing.note} onChange={e=>update('note',e.target.value)}/></label></div><section className="legal-upload"><h3><UploadCloud size={20}/> Tệp giấy phép, chứng từ liên quan</h3><p>Chọn tối đa 8 tệp mỗi hồ sơ · PDF/JPG/PNG/WebP · 8 MB/tệp. Chỉ lưu trên trình duyệt hiện tại (IndexedDB).</p><label className="legal-file-drop"><FilePlus2 size={21}/><span>Chọn thêm tệp pháp lý</span><input aria-label="Chọn tệp pháp lý" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={event=>{const next=Array.from(event.target.files??[]);const failure=validateLegalFiles(next,editing.attachments.length);setFiles(failure?[]:next);setError(failure??'')}}/></label>{editing.attachments.map(file=><div className="legal-attachment-row" key={file.id}><FileText size={19}/><span><strong>{file.name}</strong><small>{Math.ceil(file.size/1024)} KB · Đã lưu cục bộ</small></span><button type="button" title="Loại tệp khỏi hồ sơ" aria-label={`Loại ${file.name}`} onClick={()=>{void removeAttachment(file)}}><Trash2 size={17}/></button></div>)}{files.map((file,index)=><div className="legal-attachment-row" key={`${file.name}-${index}`}><FileText size={19}/><span><strong>{file.name}</strong><small>{Math.ceil(file.size/1024)} KB · Chờ lưu</small></span></div>)}</section>{error&&<p className="legal-error" role="alert">{error}</p>}<div className="legal-actions"><button className="legal-primary" disabled={busy} type="submit">{busy?'Đang lưu...':'Lưu hồ sơ DEMO'}</button><button className="legal-secondary" type="button" disabled={busy} onClick={()=>{setEditing(null);setFiles([])}}>Hủy</button></div><p className="legal-disclaimer"><CircleHelp size={17}/> Lưu ý: việc tải tệp lên bản DEMO không xác minh giá trị pháp lý hay đồng bộ qua máy chủ.</p></form></LegalDialog>}
 </section>
}
