import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, ClipboardCheck, RefreshCw, ShieldCheck, Truck, Utensils } from 'lucide-react'
import { getMyKitchen } from './lib/usersApi'
import { readSupervisionContext, readServerSupervision, writeServerSupervision } from './lib/supervisionApi'
import type { SupervisionMealType, SupervisionScope } from './lib/supervisionStatus'
import { supervisionDateKind } from './SupervisionDateNotice'
import './SchoolReceiverWorkspace.css'

type Props = { schoolId: string; schoolName: string; date: string; view: 'overview' | 'menu' | 'supervision' }
const mealTypes: SupervisionMealType[] = ['BREAKFAST', 'LUNCH', 'SNACK']
const mealNames: Record<SupervisionMealType,string> = {BREAKFAST:'Bữa sáng',LUNCH:'Bữa trưa',SNACK:'Bữa xế'}
const stages = ['DISPATCHED','ARRIVED','PLATED','READY'] as const
type Stage = typeof stages[number]
const stageNames: Record<Stage,string> = {DISPATCHED:'Xuất bếp',ARRIVED:'Đến trường',PLATED:'Ra món',READY:'Sẵn sàng phục vụ'}
const stageHints: Record<Stage,string> = {
  DISPATCHED:'Bếp trung tâm báo cáo khi thức ăn rời bếp',
  ARRIVED:'Ghi nhận giao và kiểm tra tình trạng thức ăn tại trường',
  PLATED:'Ghi nhận khi chia món tại trường',
  READY:'Ghi nhận khi hoàn tất chuẩn bị, kèm ảnh thực tế'
}
const labelDate=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('vi-VN')
const displayTime=(value:string)=>value?new Date(value).toLocaleString('vi-VN'):'Chưa ghi nhận'

export default function SchoolReceiverWorkspace({schoolId,schoolName,date,view}:Props) {
  const [mealType,setMealType] = useState<SupervisionMealType>('BREAKFAST')
  const [editing,setEditing] = useState<'ARRIVED'|'PLATED'|'READY'|null>(null)
  const [note,setNote] = useState('')
  const [lateReason,setLateReason] = useState('')
  const [photo,setPhoto] = useState('')
  const [photoName,setPhotoName] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const queryClient=useQueryClient()
  const scope: SupervisionScope=useMemo(()=>({schoolId,serviceDate:date,mealType}),[schoolId,date,mealType])
  const kitchen=useQuery({queryKey:['receiver-provider',schoolId],queryFn:getMyKitchen,enabled:!!schoolId})
  const breakfast=useQuery({queryKey:['receiver-context',schoolId,date,'BREAKFAST'],queryFn:()=>readSupervisionContext({schoolId,serviceDate:date,mealType:'BREAKFAST'}),enabled:!!schoolId})
  const lunch=useQuery({queryKey:['receiver-context',schoolId,date,'LUNCH'],queryFn:()=>readSupervisionContext({schoolId,serviceDate:date,mealType:'LUNCH'}),enabled:!!schoolId})
  const snack=useQuery({queryKey:['receiver-context',schoolId,date,'SNACK'],queryFn:()=>readSupervisionContext({schoolId,serviceDate:date,mealType:'SNACK'}),enabled:!!schoolId})
  const contexts={BREAKFAST:breakfast,LUNCH:lunch,SNACK:snack}
  const selected=contexts[mealType]
  const record=useQuery({queryKey:['supervision-server',schoolId,date,mealType],queryFn:()=>readServerSupervision(scope),enabled:!!schoolId})
  const current=record.data?.stages??{}
  const central=kitchen.data?.providerType==='CENTRAL'
  const order:Stage[]=central?[...stages]:['PLATED','READY']
  const next=order.find(stage=>!current[stage] || current[stage]?.revisionRequested)
  const canReport=next==='ARRIVED'||next==='PLATED'||next==='READY'
  const dateKind=supervisionDateKind(date)
  const canAct=dateKind!=='future'&&!record.data?.approvalCurrent
  const reset=()=>{setEditing(null);setNote('');setLateReason('');setPhoto('');setPhotoName('');setError('')}
  const refresh=()=>{void queryClient.invalidateQueries({queryKey:['receiver-context',schoolId,date]});void queryClient.invalidateQueries({queryKey:['supervision-server',schoolId,date]});void kitchen.refetch()}
  const onPhoto=async(file?:File)=>{
    setPhoto('');setPhotoName('')
    if(!file)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>750*1024){setError('Ảnh phải là JPG, PNG hoặc WebP và không vượt quá 750 KB.');return}
    try {const url=await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader()
      reader.onerror=()=>reject(Error('Không thể đọc ảnh.'))
      reader.onload=()=>resolve(String(reader.result??''))
      reader.readAsDataURL(file)
    });setPhoto(url);setPhotoName(file.name);setError('')}
    catch(e){setError(e instanceof Error?e.message:'Không đọc được ảnh.')}
  }
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault()
    if(!editing)return
    setBusy(true);setError('');setNotice('')
    try{
      if(editing==='READY'&&!photo)throw Error('Cần chọn ảnh thực tế của bữa ăn.')
      await writeServerSupervision(scope,{action:'stage_report',itemId:editing,note,lateReason,photo})
      await queryClient.invalidateQueries({queryKey:['supervision-server',schoolId,date,mealType]})
      setNotice('Đã ghi nhận mốc '+stageNames[editing]+'. Chờ BGH xác nhận.')
      reset()
    }catch(e){setError(e instanceof Error?e.message:'Không cập nhật được mốc vận hành.')}
    finally{setBusy(false)}
  }

  if(!schoolId)return <section className="card" role="alert">Tài khoản chưa được gán trường. Vui lòng liên hệ Ban Giám hiệu.</section>
  return <section className="receiver-workspace">
    <header className="receiver-header card">
      <div><span className="section-kicker">DỮ LIỆU THỰC TẾ · BẾP TẠI TRƯỜNG</span>
        <h2>{view==='overview'?'Tổng quan tiếp nhận bữa ăn':view==='menu'?'Thực đơn đã duyệt':'Tiếp nhận và phục vụ bữa ăn'}</h2>
        <p>{schoolName} · {labelDate(date)} · {kitchen.data?.kitchen.name??'Đang xác định bếp cung cấp'}</p></div>
      <button type="button" className="outline" onClick={refresh}><RefreshCw size={16}/> Làm mới</button>
    </header>
    {kitchen.isError&&<p className="error" role="alert">{kitchen.error instanceof Error?kitchen.error.message:'Không tải được bếp cung cấp.'}</p>}
    {view==='overview'&&<div className="receiver-summary">
      {mealTypes.map(type=>{
        const query=contexts[type]
        const menu=query.data?.menu
        return <article className="card" key={type}>
          <div className="receiver-title"><Utensils size={18}/><strong>{mealNames[type]}</strong></div>
          {query.isLoading?<p>Đang tải thực đơn…</p>:query.isError?<p className="error">Không tải được dữ liệu: {query.error instanceof Error?query.error.message:'Lỗi kết nối'}</p>
            :menu?<><p><strong>{menu.servings.toLocaleString('vi-VN')}</strong> suất dự kiến · {menu.status==='APPROVED'?'Đã duyệt':menu.status}</p><p>{menu.dishes.map(d=>d.name).join(' · ')||'Chưa có món'}</p></>
            :<p>Chưa có thực đơn được duyệt cho bữa này.</p>}
        </article>
      })}
      <div className="receiver-next card"><Truck size={20}/><div><strong>Quy trình tiếp nhận</strong>
        <p>Bếp trung tâm báo cáo Xuất bếp; nhân viên tại trường ghi Đến trường → Ra món → Sẵn sàng phục vụ. BGH xác nhận từng mốc.</p>
        <Link to="/giam-sat">Mở nhật ký tiếp nhận</Link></div></div>
    </div>}
    {view!=='overview'&&<>
      <div className="receiver-meal-picker" aria-label="Chọn bữa ăn">
        {mealTypes.map(type=><button key={type} type="button" className={type===mealType?'selected':''} onClick={()=>{setMealType(type);reset()}}>{mealNames[type]}</button>)}
      </div>
      {selected.isLoading?<section className="card">Đang tải thực đơn của trường…</section>
        :selected.isError?<section className="card error" role="alert">Không tải được thực đơn: {selected.error instanceof Error?selected.error.message:'Lỗi hệ thống'}</section>
        :!selected.data?.menu?<section className="card"><strong>Chưa có thực đơn được duyệt</strong><p>Không sử dụng dữ liệu demo để thay thế. BGH và bếp cung cấp cần hoàn thiện thực đơn của bữa này.</p></section>
        :<section className="card receiver-menu">
          <div className="receiver-title"><Utensils size={18}/><h3>{mealNames[mealType]} · {selected.data.menu.servings} suất</h3></div>
          <p>Trạng thái thực đơn: <strong>{selected.data.menu.status==='APPROVED'?'Đã được BGH duyệt':selected.data.menu.status}</strong></p>
          <ol>{selected.data.menu.dishes.map(dish=><li key={dish.id}>{dish.name}</li>)}</ol>
        </section>}
      {view==='supervision'&&<>
        <section className="card receiver-journey">
          <div className="receiver-title"><ClipboardCheck size={20}/><h3>Các mốc vận hành</h3></div>
          <p>Chỉ ghi nhận sự kiện đã diễn ra thực tế. Xuất bếp do Bếp Long Hoa báo cáo; BGH xác nhận từng mốc.</p>
          {record.isLoading?<p>Đang tải trạng thái vận hành…</p>:record.isError?<p className="error" role="alert">Không tải được trạng thái: {record.error instanceof Error?record.error.message:'Lỗi kết nối'}</p>:
            <div className="receiver-stage-list">
              {order.map(stage=>{
                const event=current[stage]
                const confirmed=!!event?.confirmed
                const canStart=canAct&&stage===next&&canReport
                return <article key={stage} className="receiver-stage">
                  {confirmed?<CheckCircle2 color="#148063" size={21}/>:<Clock3 size={21}/>}
                  <div><strong>{stageNames[stage]}</strong><small>{stageHints[stage]}</small>
                    {event&&<small>{event.time??''} · {confirmed?'Đã được BGH xác nhận':event.revisionRequested?'BGH yêu cầu bổ sung':'Đang chờ BGH xác nhận'}</small>}
                    {event?.note&&<p>{event.note}</p>}
                  </div>
                  <div><span>{confirmed?'Đã xác nhận':event?'Chờ xác nhận':'Chưa cập nhật'}</span>
                    {canStart&&<button className="outline" type="button" onClick={()=>{reset();setEditing(stage as 'ARRIVED'|'PLATED'|'READY')}}>Cập nhật</button>}
                  </div>
                </article>
              })}
            </div>}
          {record.data?.approvalCurrent&&<p className="receiver-notice"><ShieldCheck size={17}/> BGH đã xác nhận tổng thể hồ sơ bữa ăn.</p>}
          {dateKind==='future'&&<p className="receiver-notice">Ngày tương lai chỉ được xem, không được báo cáo.</p>}
          {!central&&!kitchen.isLoading&&<p className="receiver-notice">Trường dùng bếp tại chỗ: chỉ cần mốc Ra món và Sẵn sàng phục vụ.</p>}
          {notice&&<p role="status" className="receiver-notice">{notice}</p>}
        </section>
        {editing&&<section className="card receiver-report">
          <h3>Cập nhật: {stageNames[editing]}</h3>
          <form onSubmit={submit}>
            <label>Ghi chú tiếp nhận / thực hiện thực tế *<textarea rows={3} required minLength={5} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ghi tình trạng thức ăn, thời điểm và việc đã thực hiện…"/></label>
            {editing==='READY'&&<label>Ảnh thực tế khi sẵn sàng phục vụ *<input type="file" required={!photo} accept="image/jpeg,image/png,image/webp" onChange={e=>void onPhoto(e.target.files?.[0])}/>{photoName&&<small>Ảnh đã chọn: {photoName}</small>}</label>}
            {dateKind==='past'&&<label>Lý do cập nhật hồ sơ ngày đã qua *<textarea required minLength={10} maxLength={1000} rows={2} value={lateReason} onChange={e=>setLateReason(e.target.value)}/></label>}
            {error&&<p className="error" role="alert">{error}</p>}
            <div><button type="button" className="outline" onClick={reset}>Hủy</button><button className="primary" type="submit" disabled={busy||editing==='READY'&&!photo}>{busy?'Đang lưu…':'Lưu · Chờ BGH xác nhận'}</button></div>
          </form>
        </section>}
      </>}
    </>}
  </section>
}
