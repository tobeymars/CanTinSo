import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardCheck, FileCheck2, ShieldCheck, CircleHelp, Plus, X } from 'lucide-react'
import { getStoredUser } from './lib/authApi'
import { getPublicInspections,createPublicInspection,publishPublicInspection } from './lib/publicInspectionApi'
import type { InspectionDraft, InspectionRecord } from './lib/publicInspectionApi'
import type { SupervisionScope } from './lib/supervisionStatus'
import './PublicInspectionWorkspace.css'

const mealNames:Record<string,string>={BREAKFAST:'bữa sáng',LUNCH:'bữa trưa',SNACK:'bữa xế'}
const formatDate=(value:string)=>new Date(value.slice(0,10)+'T12:00:00').toLocaleDateString('vi-VN')
const initial=(date:string):InspectionDraft=>({recordNumber:'',title:'',authority:'',inspectedAt:date,scope:'',summary:'',findingCount:0,outcome:'no_follow_up',evidenceReference:''})
function InspectionItem({item,canPublish,onPublish,busy}:{item:InspectionRecord;canPublish:boolean;onPublish:(id:string)=>void;busy:boolean}){
 return <article className="inspection-record inspection-real-record">
  <div className="inspection-record-top"><span className={item.status==='PUBLISHED'?'inspection-published':'inspection-draft-mark'}>{item.status==='PUBLISHED'?<CheckCircle2 size={14}/>:<ClipboardCheck size={14}/>} {item.status==='PUBLISHED'?'Đã công khai':'Bản nháp · Chưa công khai'}</span></div>
  <h3>{item.title}</h3>
  <span className={`inspection-outcome ${item.outcome}`}>{item.outcome==='follow_up_required'?<AlertCircle size={13}/>:<CheckCircle2 size={13}/>} {item.outcome==='follow_up_required'?'Có nội dung cần theo dõi':'Không có nội dung cần theo dõi thêm'}</span>
  <p className="inspection-summary">{item.summary}</p>
  <div className="inspection-facts">
   <div><CalendarDays size={17}/><span><small>Ngày kiểm tra</small><strong>{formatDate(item.inspectedAt)}</strong></span></div>
   <div><ClipboardCheck size={17}/><span><small>Nội dung cần theo dõi</small><strong>{item.findingCount} nội dung</strong></span></div>
  </div>
  <div className="inspection-authority"><ShieldCheck size={19}/><span><small>Đơn vị thực hiện theo biên bản</small><strong>{item.authority}</strong></span></div>
  <div className="inspection-scope"><small>Phạm vi kiểm tra</small><p>{item.scope}</p>{item.evidenceReference && <><small>Tham chiếu minh chứng nội bộ</small><p>{item.evidenceReference}</p></>}</div>
  <footer className="inspection-record-footer"><span>{item.recordNumber}</span><span>{item.publishedAt?`Công khai ${new Date(item.publishedAt).toLocaleString('vi-VN')}`:'Chưa công khai'}</span></footer>
  {canPublish&&item.status==='DRAFT'&&<button type="button" className="primary inspection-publish-button" disabled={busy} onClick={()=>onPublish(item.id)}><ShieldCheck size={16}/> Công khai hồ sơ này</button>}
 </article>
}
export default function PublicInspectionWorkspace({scope}:{scope:SupervisionScope}){
 const role=getStoredUser()?.role
 const canManage=role==='UBND_ADMIN'
 const qc=useQueryClient()
 const query=useQuery({queryKey:['public-inspections',scope.schoolId,scope.serviceDate,scope.mealType],queryFn:()=>getPublicInspections(scope)})
 const [editing,setEditing]=useState(false)
 const [form,setForm]=useState<InspectionDraft>(()=>initial(scope.serviceDate))
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const mealLabel=mealNames[scope.mealType]??scope.mealType
 const update=<K extends keyof InspectionDraft>(field:K,value:InspectionDraft[K])=>setForm(current=>({...current,[field]:value}))
 const submit=async(event:FormEvent)=>{
  event.preventDefault();setBusy(true);setError('');setNotice('')
  try{await createPublicInspection(scope,form);setEditing(false);setForm(initial(scope.serviceDate));setNotice('Đã lưu bản nháp. Hồ sơ chưa được công khai.');await qc.invalidateQueries({queryKey:['public-inspections',scope.schoolId,scope.serviceDate,scope.mealType]})}
  catch(e){setError(e instanceof Error?e.message:'Không lưu được hồ sơ.')}finally{setBusy(false)}
 }
 const publish=async(id:string)=>{
  if(!window.confirm('Xác nhận công khai nội dung của biên bản đã được đối chiếu với hồ sơ gốc? Sau khi công khai, bản ghi không thể sửa trong phiên bản này.'))return
  setBusy(true);setError('');setNotice('')
  try{await publishPublicInspection(scope,id);setNotice('Đã công khai kết quả cho đúng trường, ngày và bữa ăn.');await qc.invalidateQueries({queryKey:['public-inspections',scope.schoolId,scope.serviceDate,scope.mealType]})}
  catch(e){setError(e instanceof Error?e.message:'Không công khai được hồ sơ.')}finally{setBusy(false)}
 }
 return <section className="card detail-section public-inspection-card public-inspection-workspace">
  <div className="card-header"><div><div className="section-kicker">KẾT QUẢ CÓ THẨM QUYỀN</div><h2>Kiểm tra công khai · {mealLabel}</h2></div><ShieldCheck/></div>
  {canManage&&<div className="inspection-action-row"><p>Chỉ nhập kết quả dựa trên biên bản kiểm tra của cơ quan có thẩm quyền.</p><button type="button" className="outline" onClick={()=>{setForm(initial(scope.serviceDate));setError('');setEditing(!editing)}}><Plus size={16}/> {editing?'Đóng biểu mẫu':'Lập hồ sơ kiểm tra'}</button></div>}
  {notice&&<p className="inspection-notice" role="status">{notice}</p>}
  {error&&<p className="inspection-error" role="alert">{error}</p>}
  {editing&&canManage&&<form className="inspection-editor" onSubmit={submit}>
   <div className="inspection-editor-title"><strong>Lập hồ sơ theo biên bản gốc</strong><button type="button" aria-label="Đóng" onClick={()=>setEditing(false)}><X size={17}/></button></div>
   <label>Số biên bản<input required maxLength={100} minLength={3} value={form.recordNumber} onChange={e=>update('recordNumber',e.target.value)} placeholder="Số/ký hiệu trên biên bản gốc"/></label>
   <label>Tiêu đề kết quả kiểm tra<input required maxLength={200} minLength={2} value={form.title} onChange={e=>update('title',e.target.value)}/></label>
   <label>Cơ quan, đơn vị thực hiện<input required maxLength={200} minLength={5} value={form.authority} onChange={e=>update('authority',e.target.value)}/></label>
   <label>Ngày kiểm tra<input type="date" required max={new Date().toLocaleDateString('en-CA')} value={form.inspectedAt} onChange={e=>update('inspectedAt',e.target.value)}/></label>
   <label>Phạm vi kiểm tra<textarea required minLength={10} maxLength={1000} rows={2} value={form.scope} onChange={e=>update('scope',e.target.value)}/></label>
   <label>Tóm tắt kết quả<textarea required minLength={10} maxLength={4000} rows={3} value={form.summary} onChange={e=>update('summary',e.target.value)}/></label>
   <label>Số nội dung cần theo dõi<input type="number" required min={0} max={10000} value={form.findingCount} onChange={e=>update('findingCount',Number(e.target.value))}/></label>
   <label>Kết quả<select value={form.outcome} onChange={e=>update('outcome',e.target.value as InspectionDraft['outcome'])}><option value="no_follow_up">Không có nội dung cần theo dõi</option><option value="follow_up_required">Có nội dung cần theo dõi, khắc phục</option></select></label>
   <label>Tham chiếu tài liệu chứng minh<input required minLength={3} maxLength={300} value={form.evidenceReference} onChange={e=>update('evidenceReference',e.target.value)} placeholder="Mã hồ sơ, số văn bản hoặc đường dẫn tài liệu nội bộ"/></label>
   <p className="inspection-editor-help">Lưu nháp không đồng nghĩa với xác nhận của cơ quan có thẩm quyền. Chỉ công khai khi nội dung đã được đối chiếu với biên bản gốc.</p>
   <button type="submit" className="primary" disabled={busy}>{busy?'Đang lưu…':'Lưu bản nháp'}</button>
  </form>}
  {query.isLoading&&<p className="inspection-loading" role="status">Đang tải kết quả kiểm tra…</p>}
  {query.isError&&<div className="inspection-error" role="alert">Không tải được hồ sơ kiểm tra. <button className="outline" type="button" onClick={()=>void query.refetch()}>Thử lại</button></div>}
  {query.data?.length? <div className="inspection-record-list">{query.data.map(item=><InspectionItem key={item.id} item={item} canPublish={canManage} onPublish={publish} busy={busy}/>)}</div>
    : !query.isLoading&&!query.isError&&<div className="empty-state"><FileCheck2 size={38}/><h3>Chưa có kết quả kiểm tra công khai riêng cho {mealLabel}</h3><p>{canManage?'Có thể lập hồ sơ nháp từ biên bản kiểm tra thực tế, sau đó công khai khi đã đối chiếu.':'Nhật ký vận hành do đơn vị báo cáo không thay thế kết quả của cơ quan có thẩm quyền.'}</p></div>}
  <div className="privacy"><CircleHelp size={20}/><p>Hồ sơ kiểm tra được gắn với đúng trường, ngày và {mealLabel}. Kết quả không tự động chứng minh an toàn cho các bữa ăn khác.</p></div>
 </section>
}
