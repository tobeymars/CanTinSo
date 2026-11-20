import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isServerSupervisionScope, readServerSupervision, writeServerSupervision } from './lib/supervisionApi'
import type { FormEvent } from 'react'
import { AlertCircle, CheckCircle2, ClipboardCheck, Clock3, ShieldCheck, X } from 'lucide-react'
import type { School } from './lib/data'
import type { ViewRole } from './lib/store'
import {
  SUPERVISION_APPROVAL_EVENT, SUPERVISION_APPROVAL_KEY,
  confirmMealSupervision, mealApprovalStatus, readMealApprovalHistory,
} from './lib/supervisionApproval'
import { SUPERVISION_STATUS_EVENT, SUPERVISION_STATUS_STORAGE_KEY } from './lib/supervisionStatus'
import type { SupervisionMealType, SupervisionScope } from './lib/supervisionStatus'
import { CHECK_DEFINITIONS } from './lib/supervisionStatus'
import { SUPERVISION_JOURNEY_EVENT, stageNames } from './lib/supervisionJourney'

export default function SupervisionMealApproval({ school, date, mealType, role }: {
  school: School
  date: string
  mealType: SupervisionMealType
  role: ViewRole
}) {
  const scope: SupervisionScope = { schoolId: school.id, serviceDate: date, mealType }
  const serverMode = isServerSupervisionScope(scope)
  const queryClient = useQueryClient()
  const serverQuery = useQuery({queryKey:['supervision-server',scope.schoolId,scope.serviceDate,scope.mealType],queryFn:()=>readServerSupervision(scope),enabled:serverMode})
  const [revision, setRevision] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    const onStorage = (event: StorageEvent) => {
      if (!event.key || [SUPERVISION_APPROVAL_KEY, SUPERVISION_STATUS_STORAGE_KEY, 'demo-admin-meals'].includes(event.key)) refresh()
    }
    window.addEventListener(SUPERVISION_APPROVAL_EVENT, refresh)
    window.addEventListener(SUPERVISION_STATUS_EVENT, refresh)
    window.addEventListener(SUPERVISION_JOURNEY_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SUPERVISION_APPROVAL_EVENT, refresh)
      window.removeEventListener(SUPERVISION_STATUS_EVENT, refresh)
      window.removeEventListener(SUPERVISION_JOURNEY_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  void revision
  const localStatus = serverMode ? null : mealApprovalStatus(scope, school)
  const checks = serverQuery.data?.checks ?? {}
  const stages = serverQuery.data?.stages ?? {}
  const requiredStages = school.mode === 'CENTRAL_KITCHEN' ? ['DISPATCHED','ARRIVED','PLATED','READY'] : ['PLATED','READY']
  const confirmedChecks = ['ingredient_receipt','processing','before_serving','food_sample'].filter(id=>checks[id]?.status==='confirmed').length
  const confirmedStages = requiredStages.filter(id=>stages[id]?.confirmed).length
  const pendingDetails = [...['ingredient_receipt','processing','before_serving','food_sample'].filter(id=>checks[id]?.status!=='confirmed'),...requiredStages.filter(id=>!stages[id]?.confirmed)]
  const approvals = serverQuery.data?.approvals ?? []
  const latestApproval = approvals.at(-1)
  const status = serverMode ? {confirmedChecks,requiredChecks:4,confirmedStages,requiredStages:requiredStages.length,pendingDetails,ready:pendingDetails.length===0,approved:!!latestApproval && serverQuery.data?.approvalCurrent === true && pendingDetails.length===0,stale:!!latestApproval && (serverQuery.data?.approvalCurrent !== true || pendingDetails.length>0),latest:latestApproval ? {actorLabel:'Ban Giám hiệu',confirmedAt:latestApproval.at,note:latestApproval.note}:undefined} : localStatus!
  const history = serverMode ? approvals.map((a,i)=>({id:String(i),actorLabel:'Ban Giám hiệu',confirmedAt:a.at,note:a.note})) : readMealApprovalHistory(scope)
  const labelPending = (id:string) => CHECK_DEFINITIONS.find(check=>check.id===id)?.label ?? stageNames[id as keyof typeof stageNames] ?? id
  const isBoard = role === 'school_board'
  const label = mealType === 'BREAKFAST' ? 'bữa sáng' : mealType === 'LUNCH' ? 'bữa trưa' : 'bữa xế'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      if(serverMode){
        await writeServerSupervision(scope,{action:'meal_confirm',note})
        await queryClient.invalidateQueries({queryKey:['supervision-server',scope.schoolId,scope.serviceDate,scope.mealType]})
      }else confirmMealSupervision({ scope, school, role, note })
      setConfirming(false)
      setNote('')
      setError('')
      setNotice(serverMode ? `Ban Giám hiệu đã xác nhận tổng thể Giám sát & an toàn ${label}.` : `Ban Giám hiệu đã xác nhận tổng thể Giám sát & an toàn ${label} (DEMO).`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể xác nhận tổng thể.')
    }
  }
  return <section className="card supervision-meal-approval" aria-label={`Xác nhận tổng thể Giám sát và an toàn ${label}`}>
    <div className="card-header supervision-checklist-header">
      <div>
        <div className="section-kicker">XÁC NHẬN CUỐI CÙNG THEO BỮA</div>
        <h2><ShieldCheck size={20}/> Ban Giám hiệu xác nhận Giám sát & an toàn · {label}</h2>
        <p className="muted">Sau khi đối chiếu đủ hồ sơ kiểm thực, lưu mẫu và các mốc vận hành, Ban Giám hiệu thực hiện một xác nhận tổng thể riêng cho từng trường, ngày và bữa.</p>
      </div>
      {isBoard && !status.approved && <button type="button" className="primary" disabled={!status.ready} onClick={() => {setNote('');setError('');setConfirming(true)}}><ClipboardCheck size={17}/>Xác nhận tổng thể</button>}
    </div>
    <div className="supervision-approval-summary">
      <span className={`supervision-check-pill ${status.approved ? 'confirmed' : status.stale ? 'revision_requested' : 'reported'}`}>
        {status.approved ? <CheckCircle2 size={15}/> : status.stale ? <AlertCircle size={15}/> : <Clock3 size={15}/>}
        {status.approved ? 'BGH đã xác nhận tổng thể' : status.stale ? 'Cần BGH xác nhận lại' : status.ready ? 'Chờ BGH xác nhận tổng thể' : 'Chưa đủ điều kiện xác nhận'}
      </span>
      <span>Kiểm thực và lưu mẫu: <strong>{status.confirmedChecks}/{status.requiredChecks}</strong></span>
      <span>Mốc vận hành: <strong>{status.confirmedStages}/{status.requiredStages}</strong></span>
    </div>
    {!status.ready && <div className="supervision-approval-pending"><strong>Những nội dung cần hoàn thành:</strong><ul>{status.pendingDetails.map(detail => <li key={detail}>{labelPending(detail)}</li>)}</ul></div>}
    {status.approved && status.latest && <p className="supervision-approval-confirmation"><CheckCircle2 size={17}/> {status.latest.actorLabel} đã xác nhận lúc {new Date(status.latest.confirmedAt).toLocaleString('vi-VN')}. Nội dung: {status.latest.note}</p>}
    {status.stale && <p className="supervision-approval-warning">Dữ liệu giám sát đã thay đổi hoặc chưa hoàn chỉnh so với lần xác nhận trước. Lần xác nhận cũ được lưu trong lịch sử nhưng không còn là trạng thái phê duyệt hiện tại.</p>}
    {role === 'culture_social_office' && <p className="supervision-approval-readonly">Phòng Văn hóa – Xã hội chỉ giám sát và xem xác nhận của Ban Giám hiệu; không có quyền xác nhận hoặc cập nhật.</p>}
    {notice && <p className="supervision-approval-confirmation" role="status">{notice}</p>}
    {history.length > 0 && <div className="supervision-approval-history">
      <button type="button" className="text-button" aria-expanded={showHistory} onClick={() => setShowHistory(value => !value)}>{showHistory ? 'Ẩn lịch sử xác nhận' : `Xem lịch sử xác nhận (${history.length})`}</button>
      {showHistory && <ol>{[...history].reverse().map(item => <li key={item.id}><strong>{item.actorLabel}</strong> · {new Date(item.confirmedAt).toLocaleString('vi-VN')} · {item.note}</li>)}</ol>}
    </div>}
    <p className="supervision-approval-disclaimer">{serverMode ? 'Xác nhận nội bộ của Ban Giám hiệu, không thay thế kết luận kiểm tra an toàn thực phẩm của cơ quan có thẩm quyền.' : 'DEMO · Xác nhận nội bộ của Ban Giám hiệu, không thay thế kết luận kiểm tra an toàn thực phẩm của cơ quan có thẩm quyền. Dữ liệu chỉ lưu trên trình duyệt.'}</p>
    {isBoard && confirming && <div className="supervision-edit-backdrop" role="presentation" onMouseDown={event => {if(event.target===event.currentTarget)setConfirming(false)}}>
      <section className="supervision-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="supervision-final-approval-title">
        <div className="dialog-head"><h2 id="supervision-final-approval-title">Xác nhận Giám sát & an toàn · {label}</h2><button type="button" className="icon-button" aria-label="Đóng" onClick={() => setConfirming(false)}><X size={20}/></button></div>
        <p className="supervision-edit-context">{school.name} · {date} · <strong>{label}</strong></p>
        <form className="supervision-edit-form" onSubmit={submit}>
          <p className="supervision-edit-guidance">Tôi đã đối chiếu {status.requiredChecks} nội dung kiểm thực/lưu mẫu và {status.requiredStages} mốc vận hành được báo cáo cho bữa này. Đây là xác nhận tổng thể, độc lập với việc xác nhận từng mục.</p>
          <label>Ghi chú đối chiếu của Ban Giám hiệu <span aria-hidden="true">*</span><textarea required minLength={5} maxLength={1000} rows={4} value={note} onChange={event => setNote(event.target.value)} placeholder="Ghi rõ nội dung đã rà soát và kết quả đối chiếu…"/></label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="supervision-edit-buttons"><button type="button" className="outline" onClick={() => setConfirming(false)}>Hủy</button><button type="submit" className="primary" disabled={!status.ready}>{serverMode ? 'Xác nhận tổng thể' : 'Xác nhận tổng thể (DEMO)'}</button></div>
        </form>
      </section>
    </div>}
  </section>
}
