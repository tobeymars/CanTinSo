import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SupervisionScope } from './lib/supervisionStatus'
import type { ServerSupervision } from './lib/supervisionApi'
import { writeServerSupervision } from './lib/supervisionApi'
import { isDetailedInspection } from './SupervisionInspectionForm'
import type { ViewRole } from './lib/store'

export default function SupervisionSampleLifecycle({scope,data,role}:{
  scope:SupervisionScope;data:ServerSupervision;role:ViewRole
}){
  const client=useQueryClient()
  const [active,setActive]=useState('')
  const [fullName,setFullName]=useState('')
  const [note,setNote]=useState('')
  const [safe,setSafe]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const sample=data.checks.food_sample?.inspection
  if(!isDetailedInspection(sample))return null
  const holds=data.events.filter(event=>event.action==='sample_hold')
  const disposed=data.events.filter(event=>event.action==='sample_dispose')
  const canHold=['central_kitchen','school_kitchen','school_board'].includes(role)
  const canDispose=['central_kitchen','school_kitchen'].includes(role)
  const done=(dishId:string)=>disposed.find(event=>event.payload?.dishId===dishId)
  const send=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    if(!active)return
    setBusy(true);setError('')
    try{
      if(active==='hold')await writeServerSupervision(scope,{action:'sample_hold',itemId:'food_sample',note})
      else await writeServerSupervision(scope,{action:'sample_dispose',itemId:'food_sample',dishId:active,
        disposedBy:fullName,note,noHoldConfirmed:safe})
      await client.invalidateQueries({queryKey:['supervision-server',scope.schoolId,scope.serviceDate,scope.mealType]})
      setActive('');setFullName('');setNote('');setSafe(false)
    }catch(e){setError(e instanceof Error?e.message:'Không thể ghi nhận thao tác với mẫu thức ăn.')}
    finally{setBusy(false)}
  }
  const label=active==='hold'?'Ghi nhận yêu cầu giữ mẫu':'Ghi nhận hủy mẫu'
  return <section className="sif-lifecycle">
    <header><div><strong>Theo dõi lưu và hủy mẫu thức ăn</strong><p>Thời gian giữ mẫu tính từ lúc lấy mẫu thực tế. Hủy mẫu là sự kiện riêng, không thay đổi kết quả kiểm thực đã xác nhận.</p></div></header>
    {holds.length>0&&<p role="alert" className="sif-warning">Đang có yêu cầu giữ mẫu. Không được hủy mẫu khi chưa có thông báo xử lý của cơ quan có thẩm quyền. Yêu cầu đã lưu trong nhật ký.</p>}
    <div className="sif-lifecycle-items">
      {sample.dishes.map(line=>{
        const previous=done(line.dishId)
        const takenAt=String(line.takenAt??'')
        const date=new Date(takenAt+':00+07:00')
        const eligible=Number.isFinite(date.getTime())&&Date.now()-date.getTime()>=24*60*60*1000
        return <article key={line.dishId}>
          <div><strong>{line.dishName}</strong><small>Lấy mẫu: {takenAt.replace('T',' ')} · Lượng mẫu: {line.amount} {line.unit} · Mã niêm phong: {String(line.sealCode??'')}</small></div>
          {previous?<span className="sif-complete">Đã hủy: {new Date(previous.payload.disposedAt??previous.createdAt).toLocaleString('vi-VN')} · {previous.payload.disposedBy}</span>:
            <div><small>{eligible?'Đã đủ 24 giờ':'Chưa đủ 24 giờ lưu mẫu'}</small>
              {canDispose&&holds.length===0&&<button type="button" className="outline" disabled={!eligible} onClick={()=>{setActive(line.dishId);setError('');setNote('')}}>Ghi nhận hủy</button>}
            </div>}
        </article>
      })}
    </div>
    {canHold&&holds.length===0&&disposed.length===0&&<button type="button" className="outline" onClick={()=>{setActive('hold');setError('')}}>Ghi nhận yêu cầu giữ mẫu (nghi ngờ ngộ độc / cơ quan yêu cầu)</button>}
    {active&&<form onSubmit={send} className="sif-lifecycle-form">
      <strong>{label}</strong>
      {active!=='hold'&&<><label>Người trực tiếp hủy mẫu *<input required minLength={2} maxLength={200} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Họ tên người thực hiện"/></label>
        <label className="sif-checkbox"><input type="checkbox" required checked={safe} onChange={e=>setSafe(e.target.checked)}/> Tôi xác nhận hiện không có nghi ngờ ngộ độc thực phẩm hoặc yêu cầu giữ mẫu của cơ quan có thẩm quyền.</label></>}
      <label>{active==='hold'?'Lý do và căn cứ yêu cầu giữ mẫu':'Ghi chú hủy / tình trạng mẫu'} *
        <textarea required minLength={5} maxLength={1000} rows={3} value={note} onChange={e=>setNote(e.target.value)}/>
      </label>
      {active==='hold'&&<p className="sif-warning">Sau khi ghi nhận giữ mẫu, tính năng hủy sẽ bị khóa. Việc giải tỏa giữ mẫu cần quy trình đối chiếu văn bản riêng.</p>}
      {error&&<p role="alert" className="error">{error}</p>}
      <div><button type="button" className="outline" onClick={()=>setActive('')}>Hủy</button><button className="primary" type="submit" disabled={busy}>{busy?'Đang lưu…':label}</button></div>
    </form>}
    {disposed.length>0&&<details className="sif-report-details"><summary>Xem lịch sử hủy mẫu ({disposed.length})</summary><ol>{disposed.map(row=><li key={row.id}>{row.payload.dishName} · {new Date(row.payload.disposedAt??row.createdAt).toLocaleString('vi-VN')} · {row.payload.disposedBy} · {row.payload.note}</li>)}</ol></details>}
  </section>
}
