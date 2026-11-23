import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, CheckCircle2, Clock3, Pencil, ShieldCheck, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isServerSupervisionScope, readServerSupervision, writeServerSupervision } from './lib/supervisionApi'
import type { DayData, School } from './lib/data'
import type { ViewRole } from './lib/store'
import type { JourneyStatus } from './lib/supervisionJourney'
import { getNextReportableStage, getSavedJourney, stageNames, stagesForSchool, SUPERVISION_JOURNEY_EVENT, updateJourney } from './lib/supervisionJourney'
import type { SupervisionMealType, SupervisionScope } from './lib/supervisionStatus'
import SupervisionDateNotice, { supervisionDateKind } from './SupervisionDateNotice'

type Editing = { action: 'report' | 'confirm' | 'reopen'; stage: JourneyStatus }
function readPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return Promise.reject(Error('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'))
  if (file.size > 750 * 1024) return Promise.reject(Error('Ảnh tối đa 750 KB.'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(Error('Không thể đọc ảnh đã chọn.'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })
}
export default function SupervisionJourneyActions({ school, date, mealType, data, role }: {
  school: School
  date: string
  mealType: SupervisionMealType
  data: DayData
  role: ViewRole
}) {
  const scope: SupervisionScope = { schoolId: school.id, serviceDate: date, mealType }
  const serverMode = isServerSupervisionScope(scope)
  const serverQuery = useQuery({queryKey:['supervision-server',scope.schoolId,scope.serviceDate,scope.mealType],queryFn:()=>readServerSupervision(scope),enabled:serverMode})
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [note, setNote] = useState('')
  const [lateReason,setLateReason]=useState('')
  const [photo, setPhoto] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const queryClient = useQueryClient()
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'demo-admin-meals') refresh()
    }
    window.addEventListener(SUPERVISION_JOURNEY_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SUPERVISION_JOURNEY_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  void revision
  const saved = serverMode ? {events: Object.entries(serverQuery.data?.stages ?? {}).map(([status,item])=>({...item,status:status as JourneyStatus,actorLabel:'Bếp',photos:item.photos??[],time:item.time??'',note:item.note??''}))} : getSavedJourney(scope)
  const stages = stagesForSchool(school.mode, role)
  const dateKind=serverMode?supervisionDateKind(date):'today'
  const locked=dateKind==='future'
  const mealApproved=serverMode && !!serverQuery.data?.approvalCurrent
  const next = locked || mealApproved ? null : serverMode ? (()=>{const candidate=stages.find(stage=>!saved?.events.some(event=>event.status===stage) || serverQuery.data?.stages[stage]?.revisionRequested);return candidate && (candidate==='DISPATCHED' ? role==='central_kitchen' : role==='school_kitchen') ? candidate : null})() : getNextReportableStage(scope, school.mode, role)
  const pending = locked || mealApproved ? [] : saved?.events.filter(event => !event.confirmed && !('revisionRequested' in event && event.revisionRequested) && stages.includes(event.status)) ?? []
  const isBoard = role === 'school_board'
  const canUpdate = !!next || (isBoard && pending.length > 0)
  const mealLabel = mealType === 'BREAKFAST' ? 'bữa sáng' : mealType === 'LUNCH' ? 'bữa trưa' : 'bữa xế'
  const edit = (value: Editing) => { setEditing(value); setNote('');setLateReason(''); setPhoto(''); setPhotoName(''); setError('') }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    try {
      if(serverMode){
        await writeServerSupervision(scope,{action:editing.action==='report'?'stage_report':editing.action==='reopen'?'stage_reopen':'stage_confirm',itemId:editing.stage,note,lateReason,photo})
        await queryClient.invalidateQueries({queryKey:['supervision-server',scope.schoolId,scope.serviceDate,scope.mealType]})
      }else updateJourney({ scope, school, data, role, status: editing.stage, action: editing.action as 'report' | 'confirm', note, photo })
      setEditing(null)
      setNotice(serverMode ? 'Đã lưu mốc vận hành ' + mealLabel + '.' : 'Đã ghi nhận trạng thái mốc vận hành ' + mealLabel + ' trong DEMO.')
      for (const key of [['day'], ['week'], ['parent-meal-day'], ['supervision-meal-day']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật trạng thái.')
    }
  }
  return <section className="card supervision-journey-actions" aria-label={`Cập nhật mốc vận hành ${mealLabel}`}>
    <div className="card-header supervision-checklist-header">
      <div>
        <div className="section-kicker">CẬP NHẬT CÁC MỐC VẬN HÀNH</div>
        <h2>Trạng thái từ bếp đến phục vụ · {mealLabel}</h2>
        <p className="muted">Bếp cập nhật đúng mốc phụ trách, Ban Giám hiệu xác nhận; nhật ký đồng bộ với khu vực bên dưới.</p>
      </div>
      {canUpdate && <div className="supervision-checklist-actions">
        {next && <button type="button" className="primary" onClick={() => edit({ action: 'report', stage: next })}><Pencil size={16}/>Cập nhật: {stageNames[next]}</button>}
        {isBoard && pending.length > 0 && <button type="button" className="primary" onClick={() => edit({ action: 'confirm', stage: pending[0]!.status })}><ShieldCheck size={16}/>Xác nhận mốc ({pending.length})</button>}
      </div>}
    </div>
    <SupervisionDateNotice date={date} serverMode={serverMode}/>
    {notice && <div className="supervision-status-message" role="status"><CheckCircle2 size={16}/>{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={15}/></button></div>}
    <div className="supervision-stage-rows">
      {stages.map(status => {
        const event = saved?.events.find(entry => entry.status === status)
        const needsRevision=serverMode && !!serverQuery.data?.stages[status]?.revisionRequested
        return <div className="supervision-stage-row" key={status}>
          <span className="supervision-check-icon">{event?.confirmed ? <CheckCircle2 size={18}/> : event ? <Clock3 size={18}/> : <Activity size={18}/>}</span>
          <div className="supervision-stage-info"><strong>{stageNames[status]}</strong><small>{event ? `${event.actorLabel} · ${event.time}${event.confirmedAt ? ' · BGH xác nhận' : ''}` : 'Chưa ghi nhận mới'}</small>{event?.confirmationNote && (role === 'school_board' || role === 'school_kitchen' || role === 'central_kitchen') && <small>Ghi chú xác nhận: {event.confirmationNote}</small>}</div>
          <div className="supervision-check-controls"><span className={`supervision-check-pill ${event?.confirmed ? 'confirmed' : event ? 'reported' : 'not_reported'}`}>{event?.confirmed ? 'Đã xác nhận' : needsRevision ? 'Cần báo cáo bổ sung' : event ? 'Chờ xác nhận' : 'Chưa cập nhật'}</span>{next === status && <button className="outline" type="button" onClick={() => edit({action:'report',stage:status})}>Cập nhật</button>}{isBoard && event && !event.confirmed && !needsRevision && !locked && !mealApproved && <button className="primary" type="button" onClick={() => edit({action:'confirm',stage:status})}>Xác nhận</button>}{isBoard && serverMode && event?.confirmed && !locked && <button type="button" className="outline" onClick={()=>edit({action:'reopen',stage:status})}>Mở điều chỉnh</button>}</div>
        </div>
      })}
    </div>
    <p className="supervision-stage-footnote">{saved?.events.length ? (serverMode ? 'Các mốc được lưu theo đúng bữa trên hệ thống. BGH phải xác nhận để ảnh phục vụ được công khai.' : 'Các mốc đã ghi nhận trong DEMO được lưu riêng theo bữa. BGH phải xác nhận để ảnh phục vụ được công khai.') : 'Đang hiển thị lịch trình minh họa ở nhật ký bên dưới. Khi bếp bắt đầu báo cáo, lịch trình sẽ chuyển sang các mốc ghi nhận mới của bữa này.'} Không phải chứng nhận an toàn thực phẩm.</p>
    {editing && <div className="supervision-edit-backdrop" role="presentation" onMouseDown={event => {if(event.target===event.currentTarget)setEditing(null)}}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-stage-title" className="supervision-edit-dialog">
        <div className="dialog-head"><h2 id="edit-stage-title">{editing.action === 'report' ? 'Cập nhật mốc vận hành' : editing.action === 'reopen' ? 'Mở điều chỉnh mốc vận hành' : 'Xác nhận mốc vận hành'}</h2><button className="icon-button" type="button" aria-label="Đóng" onClick={() => setEditing(null)}><X size={20}/></button></div>
        <p className="supervision-edit-context">{school.name} · {date} · {mealLabel} · <strong>{stageNames[editing.stage]}</strong></p>
        <form className="supervision-edit-form" onSubmit={save}>
          {editing.action === 'report' && editing.stage === 'READY' && <label>Ảnh thực tế khi sẵn sàng phục vụ <span aria-hidden="true">*</span><input type="file" accept="image/jpeg,image/png,image/webp" required={!photo} onChange={event => {
            setPhoto('');setPhotoName('');setError('')
            const file = event.target.files?.[0]
            if (!file) return
            setLoadingPhoto(true)
            void readPhoto(file).then(result => {setPhoto(result);setPhotoName(file.name)}).catch(caught => setError(caught instanceof Error ? caught.message : 'Không đọc được ảnh.')).finally(() => setLoadingPhoto(false))
          }}/>{photoName && <small>Đã chọn: {photoName}</small>}</label>}
          {serverMode && dateKind==='past' && <label>Lý do bổ sung hồ sơ ngày đã qua *<textarea required minLength={10} maxLength={1000} rows={3} value={lateReason} onChange={event=>setLateReason(event.target.value)} placeholder="Nêu rõ vì sao cập nhật hoặc xác nhận muộn…"/></label>}
          {editing.action==='reopen' && <p className="supervision-edit-guidance">Mốc đã xác nhận sẽ chuyển về cần báo cáo bổ sung. Bản cũ và người mở điều chỉnh vẫn được giữ trong lịch sử.</p>}
          <label>Ghi chú / nội dung đối chiếu <span aria-hidden="true">*</span><textarea required minLength={5} maxLength={1000} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Ghi rõ hoạt động đã thực hiện…" /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="supervision-edit-buttons"><button className="outline" type="button" onClick={() => setEditing(null)}>Hủy</button><button className="primary" disabled={loadingPhoto || (editing.action === 'report' && editing.stage === 'READY' && !photo)} type="submit">{editing.action === 'report' ? 'Lưu mốc · Chờ BGH xác nhận' : editing.action==='reopen'?'Mở điều chỉnh và lưu lịch sử':serverMode ? 'Xác nhận' : 'Xác nhận DEMO'}</button></div>
        </form>
      </section>
    </div>}
  </section>
}
