import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, CheckCircle2, Clock3, Pencil, ShieldCheck, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isServerSupervisionScope, readServerSupervision, readSupervisionContext, writeServerSupervision } from './lib/supervisionApi'
import type { DayData, School } from './lib/data'
import type { ViewRole } from './lib/store'
import type { JourneyStatus } from './lib/supervisionJourney'
import { getNextReportableStage, getSavedJourney, stageNames, stagesForSchool, SUPERVISION_JOURNEY_EVENT, updateJourney } from './lib/supervisionJourney'
import type { SupervisionMealType, SupervisionScope } from './lib/supervisionStatus'
import { supervisionDateKind } from './SupervisionDateNotice'
import './SchoolArrivalReceipt.css'

type Editing = { action: 'report' | 'confirm' | 'reopen' | 'arrival_confirm' | 'arrival_resolve'; stage: JourneyStatus }
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
  const contextQuery = useQuery({queryKey:['supervision-context',scope.schoolId,scope.serviceDate,scope.mealType],queryFn:()=>readSupervisionContext(scope),enabled:serverMode})
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [viewReceipt,setViewReceipt] = useState(false)
  const [viewServingStage,setViewServingStage] = useState<'PLATED'|'READY'|null>(null)
  const [note, setNote] = useState('')
  const [receivedServings,setReceivedServings] = useState('')
  const [receiptChecked,setReceiptChecked] = useState(false)
  const [actualServings,setActualServings]=useState('')
  const [portionStartAt,setPortionStartAt]=useState('')
  const [distributionArea,setDistributionArea]=useState('')
  const [handHygieneChecked,setHandHygieneChecked]=useState(false)
  const [foodCondition,setFoodCondition]=useState<'PASS'|'ISSUE'>('PASS')
  const [dishPortions,setDishPortions]=useState<Record<string,string>>({})
  const [occurredAt,setOccurredAt]=useState('')
  const [handlerName,setHandlerName]=useState('')
  const [sanitaryCondition,setSanitaryCondition]=useState<'PASS'|'ISSUE'>('PASS')
  const [servingAreaChecked,setServingAreaChecked]=useState(false)
  const [servingDishChecks,setServingDishChecks]=useState<Record<string,'PASS'|'ISSUE'>>({})
  const [discrepancyNote,setDiscrepancyNote]=useState('')
  const [arrivalTime,setArrivalTime] = useState('')
  const [deliveryPerson,setDeliveryPerson] = useState('')
  const [transportUnit,setTransportUnit] = useState('')
  const [dispatchTime,setDispatchTime] = useState('')
  const [dispatchHandler,setDispatchHandler] = useState('')
  const [dispatchRecipient,setDispatchRecipient] = useState('')
  const [dispatchTransport,setDispatchTransport] = useState('')
  const [dispatchServings,setDispatchServings] = useState('')
  const [dispatchPackaging,setDispatchPackaging] = useState<'PASS'|'ISSUE'>('PASS')
  const [dispatchSensory,setDispatchSensory] = useState<'PASS'|'ISSUE'>('PASS')
  const [dispatchDishChecks,setDispatchDishChecks] = useState<Record<string,{status:'PASS'|'ISSUE';servings:string}>>({})
  const [dispatchDiscrepancy,setDispatchDiscrepancy] = useState('')
  const [viewDispatch,setViewDispatch] = useState(false)
  const [packaging,setPackaging] = useState<'OK'|'ISSUE'>('OK')
  const [sensory,setSensory] = useState<'OK'|'ISSUE'>('OK')
  const [arrivalResult,setArrivalResult] = useState<'ACCEPTED'|'CONDITIONAL'|'REJECTED'>('ACCEPTED')
  const [dishChecks,setDishChecks] = useState<Record<string,{status:'MATCH'|'SHORT'|'MISSING';temperatureC:string}>>({})
  const [lateReason,setLateReason]=useState('')
  const [photo, setPhoto] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
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
  const saved = serverMode ? {events: Object.entries(serverQuery.data?.stages ?? {}).map(([status,item])=>({...item,status:status as JourneyStatus,actorLabel:serverQuery.data?.actors?.[item.actorId??'']??(item.actorRole==='SCHOOL_ADMIN'?'BGH':'Bếp'),photos:item.photos??[],time:item.time??'',note:item.note??''}))} : getSavedJourney(scope)
  const centralDelivery = serverMode && contextQuery.data?.kitchen?.type === 'CENTRAL'
  const stages = serverMode && contextQuery.data?.kitchen ? (centralDelivery ? ['DISPATCHED','ARRIVED','PLATED','READY'] : ['PLATED','READY']) as JourneyStatus[] : stagesForSchool(school.mode, role)
  const dateKind=serverMode?supervisionDateKind(date):'today'
  const locked=dateKind==='future'
  const mealApproved=false // Trạng thái cũ không khóa sổ tác nghiệp của bếp.
  const next = locked || mealApproved ? null : serverMode ? (()=>{
    // Không vượt qua mốc có sự cố hoặc đang chờ bếp điều chỉnh.
    const candidate=stages.find(stage=>!serverQuery.data?.stages[stage]?.confirmed);
    const row=candidate?serverQuery.data?.stages[candidate]:undefined;
    if(row && !row.revisionRequested)return null;
    return candidate && (candidate==='ARRIVED' ? false : centralDelivery ? role==='central_kitchen' : role==='school_kitchen') ? candidate : null;
  })() : getNextReportableStage(scope, school.mode, role)
  const pending = serverMode || locked || mealApproved ? [] : saved?.events.filter(event => !event.confirmed && !('revisionRequested' in event && event.revisionRequested) && stages.includes(event.status)) ?? []
  const hasProcessing = ['reported','confirmed'].includes(serverQuery.data?.checks.processing?.status ?? '') && (serverQuery.data?.checks.processing?.inspection as {isPass?:boolean}|undefined)?.isPass === true
  const sampleRecord = serverQuery.data?.checks.food_sample
  const sampleDetails = sampleRecord?.inspection as {notApplicable?:boolean;isPass?:boolean;dishes?:unknown[]}|undefined
  const hasSample = ['reported','confirmed'].includes(sampleRecord?.status ?? '') && sampleDetails?.isPass===true &&
    (sampleDetails.notApplicable===true || (Array.isArray(sampleDetails.dishes) && sampleDetails.dishes.length>0))
  const dispatchReady = hasProcessing && hasSample
  const shouldExplainDispatch=serverMode && role==='central_kitchen' && !saved?.events.some(event=>event.status==='DISPATCHED')
  const isBoard = role === 'school_board'
  const canConfirmArrival = serverMode && isBoard && centralDelivery && !locked && !mealApproved && !!serverQuery.data?.stages.DISPATCHED?.confirmed && !serverQuery.data?.stages.DISPATCHED?.revisionRequested && !serverQuery.data?.stages.ARRIVED
  const arrivalRecord=serverQuery.data?.stages.ARRIVED
  const canResolveArrival=serverMode && isBoard && centralDelivery && !locked && !mealApproved &&
    !!arrivalRecord?.confirmed && !!arrivalRecord.arrival?.result && arrivalRecord.arrival.result !== 'ACCEPTED'
  const canReopen = (status: JourneyStatus): boolean => serverMode && !locked &&
    status !== 'ARRIVED' && !!serverQuery.data?.stages[status] &&
    !serverQuery.data.stages[status].revisionRequested &&
    (centralDelivery ? role==='central_kitchen' : role==='school_kitchen');
  const canUpdate = !!next || (isBoard && pending.length > 0) || canConfirmArrival || canResolveArrival ||
    stages.some(canReopen)
  const mealLabel = mealType === 'BREAKFAST' ? 'bữa sáng' : mealType === 'LUNCH' ? 'bữa trưa' : 'bữa xế'
  const isArrivalReceipt = (value: Editing) => serverMode && value.stage === 'ARRIVED' &&
    (value.action === 'confirm' || value.action === 'arrival_confirm' || value.action === 'arrival_resolve')
  const plannedDishes=contextQuery.data?.menu?.dishes??[]
  const hasArrivalIssues = packaging==='ISSUE' || sensory==='ISSUE' ||
    (contextQuery.data?.menu ? receivedServings!=='' && Number(receivedServings)!==contextQuery.data.menu.servings : false) ||
    plannedDishes.some(dish=>dishChecks[dish.id]?.status!=='MATCH')
  const isServingReport=(value:Editing)=>serverMode && value.action==='report' && (value.stage==='PLATED'||value.stage==='READY')
  const isDispatchReport=(value:Editing)=>serverMode && value.action==='report' && value.stage==='DISPATCHED'
  const dispatchHasIssues=dispatchPackaging==='ISSUE'||dispatchSensory==='ISSUE'||
    (contextQuery.data?.menu && dispatchServings!==''&&Number(dispatchServings)!==contextQuery.data.menu.servings)||
    plannedDishes.some(dish=>dispatchDishChecks[dish.id]?.status==='ISSUE'||
      (dispatchServings!=='' && dispatchDishChecks[dish.id]?.servings!==''&&Number(dispatchDishChecks[dish.id]?.servings)!==Number(dispatchServings)))
  const hasServingIssues=sanitaryCondition==='ISSUE' || (editing?.stage==='PLATED' && foodCondition==='ISSUE') ||
    (contextQuery.data?.menu ? actualServings!=='' && Number(actualServings)!==contextQuery.data.menu.servings : false) ||
    plannedDishes.some(dish=>servingDishChecks[dish.id]==='ISSUE' || (editing?.stage==='PLATED' && dishPortions[dish.id]!=='' && Number(dishPortions[dish.id])!==Number(actualServings)))
  const edit = (value: Editing) => {
    setEditing(value);setNote('');setLateReason('');setPhoto('');setPhotoName('');setReceivedServings('');
    setReceiptChecked(false);setError('');
    setActualServings('');setOccurredAt(new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}));
    setHandlerName('');setSanitaryCondition('PASS');setServingAreaChecked(false);setDiscrepancyNote('');
    setPortionStartAt(new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}));
    setDistributionArea('');setHandHygieneChecked(false);setFoodCondition('PASS');
    setDishPortions(Object.fromEntries((contextQuery.data?.menu?.dishes??[]).map(dish=>[dish.id,''])));
    setServingDishChecks(Object.fromEntries((contextQuery.data?.menu?.dishes??[]).map(dish=>[dish.id,'PASS' as const])));
    setArrivalTime(new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}));
    setDeliveryPerson('');setTransportUnit('');setPackaging('OK');setSensory('OK');setArrivalResult('ACCEPTED');
    setDispatchTime(new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}));
    setDispatchHandler('');setDispatchRecipient('');setDispatchTransport('');
    setDispatchServings('');setDispatchPackaging('PASS');setDispatchSensory('PASS');
    setDispatchDishChecks(Object.fromEntries((contextQuery.data?.menu?.dishes??[]).map(dish=>[dish.id,{status:'PASS' as const,servings:''}])));
    setDispatchDiscrepancy('');
    setDishChecks(Object.fromEntries((contextQuery.data?.menu?.dishes??[]).map(dish=>[dish.id,{status:'MATCH' as const,temperatureC:''}])))
  }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing || saving) return
    setSaving(true)
    setError('')
    try {
      if(serverMode){
        await writeServerSupervision(scope,{action:editing.action==='report'?'stage_report':editing.action==='reopen'?'stage_reopen':editing.action==='arrival_confirm'?'stage_arrival_confirm':editing.action==='arrival_resolve'?'stage_arrival_resolve':'stage_confirm',itemId:editing.stage,note,lateReason,photo,...(isArrivalReceipt(editing)?{
          receivedServings:Number(receivedServings),arrivalTime,deliveryPerson,transportUnit,packaging,sensory,
          result:arrivalResult,receiptChecked,photo,
          dishChecks:plannedDishes.map(dish=>({dishId:dish.id,status:dishChecks[dish.id]?.status??'MATCH',
            temperatureC:dishChecks[dish.id]?.temperatureC === '' ? null : Number(dishChecks[dish.id]?.temperatureC)})),
        }:{}),...(isDispatchReport(editing)?{
          dispatchTime,handlerName:dispatchHandler,deliveryPerson:dispatchRecipient,transportUnit:dispatchTransport,
          actualServings:Number(dispatchServings),packaging:dispatchPackaging,sensory:dispatchSensory,
          discrepancyNote:dispatchDiscrepancy,photo,
          dishChecks:plannedDishes.map(dish=>({dishId:dish.id,status:dispatchDishChecks[dish.id]?.status??'PASS',
            servings:Number(dispatchDishChecks[dish.id]?.servings??'')})),
        }:{}),...(isServingReport(editing)?{
          actualServings:Number(actualServings),occurredAt,handlerName,sanitaryCondition,servingAreaChecked,discrepancyNote,
          ...(editing.stage==='PLATED'?{portionStartAt,distributionArea,handHygieneChecked,foodCondition}:{}),
          dishChecks:plannedDishes.map(dish=>({dishId:dish.id,status:servingDishChecks[dish.id]??'PASS',
            ...(editing.stage==='PLATED'?{portions:Number(dishPortions[dish.id]??'')}:{}),
          })),
        }:{})})
        await queryClient.invalidateQueries({queryKey:['supervision-server',scope.schoolId,scope.serviceDate,scope.mealType]})
      }else updateJourney({ scope, school, data, role, status: editing.stage, action: editing.action as 'report' | 'confirm', note, photo })
      setEditing(null)
      setNotice(serverMode ? 'Đã lưu mốc vận hành ' + mealLabel + '.' : 'Đã ghi nhận trạng thái mốc vận hành ' + mealLabel + ' trong DEMO.')
      for (const key of [['day'], ['week'], ['parent-meal-day'], ['supervision-meal-day']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật trạng thái.')
    } finally { setSaving(false) }
  }
  return <section className="card supervision-journey-actions" aria-label={`Cập nhật mốc vận hành ${mealLabel}`}>
    <div className="card-header supervision-checklist-header">
      <div>
        <div className="section-kicker">CẬP NHẬT CÁC MỐC VẬN HÀNH</div>
        <h2>{serverMode && isBoard && centralDelivery ? 'Xác nhận tiếp nhận món ăn thành phẩm' : 'Trạng thái từ bếp đến phục vụ'} · {mealLabel}</h2>
        <p className="muted">{serverMode && isBoard && centralDelivery ? 'Bếp trung tâm ghi nhận Xuất bếp trước; BGH trường xác nhận Đến trường; sau đó bếp trung tâm ghi nhận Ra món và Sẵn sàng phục vụ. Nhà trường chỉ tiếp nhận thành phẩm, không tiếp nhận nguyên liệu.' : 'Trình tự bếp trung tâm: Xuất bếp → Đến trường (BGH xác nhận) → Ra món → Sẵn sàng phục vụ (bếp ghi nhận). Trường chỉ xác nhận giao nhận thành phẩm; hồ sơ được lưu theo trường.'}</p>
      </div>
      {canUpdate && <div className="supervision-checklist-actions">
        {next && <button type="button" className="primary" onClick={() => edit({ action: 'report', stage: next })}><Pencil size={16}/>Cập nhật: {stageNames[next]}</button>}
        {isBoard && pending.length > 0 && <button type="button" className="primary" onClick={() => edit({ action: 'confirm', stage: pending[0]!.status })}><ShieldCheck size={16}/>Xác nhận mốc ({pending.length})</button>}
        {canConfirmArrival && <button type="button" className="primary" onClick={() => edit({action:'arrival_confirm',stage:'ARRIVED'})}><ShieldCheck size={16}/>Xác nhận nhận món ăn</button>}
        {canResolveArrival && <button type="button" className="primary" onClick={() => edit({action:'arrival_resolve',stage:'ARRIVED'})}>Kiểm tra lại phiếu giao nhận</button>}
      </div>}
    </div>
    {shouldExplainDispatch && <div className="sif-guidance" role="status">
      <strong>Trước khi xuất bếp</strong>
      <p>Bếp phải hoàn thành báo cáo kiểm thực bước 2 và ghi nhận đã lấy mẫu theo từng món (hoặc có hồ sơ không bắt buộc lưu mẫu hợp lệ). {dispatchReady ? 'Đã có hồ sơ để đối chiếu thời điểm lấy mẫu trước khi xuất.' : 'Hiện chưa đủ hồ sơ để báo cáo Xuất bếp.'} <strong>Không phải chờ mẫu lưu đủ 24 giờ</strong>; 24 giờ chỉ là thời gian tối thiểu trước khi xem xét hủy mẫu.</p>
      <small>Thời điểm lấy mẫu phải sau khi chế biến xong và không muộn hơn thời điểm Xuất bếp. Hệ thống kiểm tra lại khi lưu mốc.</small>
    </div>}
    {notice && <div className="supervision-status-message" role="status"><CheckCircle2 size={16}/>{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={15}/></button></div>}
    <div className="supervision-stage-rows">
      {stages.map(status => {
        const event = saved?.events.find(entry => entry.status === status)
        const needsRevision=serverMode && !!serverQuery.data?.stages[status]?.revisionRequested
        return <div className="supervision-stage-row" key={status}>
          <span className="supervision-check-icon">{event?.confirmed ? <CheckCircle2 size={18}/> : event ? <Clock3 size={18}/> : <Activity size={18}/>}</span>
          <div className="supervision-stage-info"><strong>{stageNames[status]}</strong><small>{event ? `${event.actorLabel} · ${event.time}${event.confirmedAt ? (status==='ARRIVED' ? ' · BGH xác nhận tiếp nhận' : ' · Bếp đã ghi nhận') : ''}` : 'Chưa ghi nhận mới'}</small>{event?.confirmationNote && (role === 'school_board' || role === 'school_kitchen' || role === 'central_kitchen') && <small>Ghi chú xác nhận: {event.confirmationNote}</small>}
            {serverMode && status === 'ARRIVED' && serverQuery.data?.stages.ARRIVED?.arrival && <small>Thực nhận: {serverQuery.data.stages.ARRIVED.arrival.receivedServings.toLocaleString('vi-VN')} suất · {serverQuery.data.stages.ARRIVED.arrival.result === 'ACCEPTED' ? 'Đã chấp nhận' : serverQuery.data.stages.ARRIVED.arrival.result === 'REJECTED' ? 'Từ chối tiếp nhận' : serverQuery.data.stages.ARRIVED.arrival.result === 'CONDITIONAL' ? 'Tạm giữ chờ xử lý' : serverQuery.data.stages.ARRIVED.arrival.condition === 'GOOD' ? 'Tình trạng tốt' : 'Có lưu ý khi tiếp nhận'}</small>}
            {serverMode && status==='DISPATCHED' && serverQuery.data?.stages.DISPATCHED && <button type="button" className="arrival-open-receipt" onClick={()=>setViewDispatch(true)}><ShieldCheck size={15}/> Xem phiếu xuất bếp đã lưu</button>}
            {serverMode && status==='ARRIVED' && serverQuery.data?.stages.ARRIVED?.arrival && <button type="button" className="arrival-open-receipt" onClick={()=>setViewReceipt(true)}><ShieldCheck size={15}/> Xem phiếu giao nhận đã lưu</button>}
            {serverMode && (status==='PLATED'||status==='READY') && serverQuery.data?.stages[status]?.serving && <button type="button" className="arrival-open-receipt" onClick={()=>setViewServingStage(status)}><ShieldCheck size={15}/> Xem phiếu {status==='PLATED'?'ra món':'sẵn sàng phục vụ'}</button>}
            {serverMode && serverQuery.data?.stages[status]?.lateReason && <small>Lý do ghi nhận muộn: {serverQuery.data.stages[status].lateReason}</small>}
            {serverMode && serverQuery.data?.stages[status]?.reopenReason && <small>Lý do điều chỉnh: {serverQuery.data.stages[status].reopenReason}</small>}
            {serverMode && (serverQuery.data?.stages[status]?.history?.length??0)>0 && <details className="supervision-stage-revisions">
              <summary>Xem lịch sử điều chỉnh ({serverQuery.data?.stages[status]?.history?.length})</summary>
              <ol>{serverQuery.data?.stages[status]?.history?.map((entry,i)=><li key={i}>
                <strong>{entry.action==='reopen'?'Mở điều chỉnh':'Phiên bản ghi nhận trước đó'}</strong> ·
                {entry.actorId ? ' '+(serverQuery.data?.actors?.[entry.actorId]??'Tài khoản thực hiện')+' ·' : ''}
                {entry.at?new Date(entry.at).toLocaleString('vi-VN'):''} · {entry.note}
                {entry.lateReason?' · Lý do ghi muộn: '+entry.lateReason:''}
                {entry.serving&&<details className="sif-report-details"><summary>Chi tiết phiên bản ra món / phục vụ</summary>
                  <p>Người thực hiện: {entry.serving.handlerName} · {entry.serving.occurredAt} · {entry.serving.actualServings.toLocaleString('vi-VN')} suất</p>
                  <ul>{entry.serving.dishChecks.map(d=><li key={d.dishId}>{d.name}: {d.portions??'—'} suất · {d.status==='PASS'?'Không bất thường':'Có bất thường'}</li>)}</ul>
                </details>}
                {entry.arrival&&<p>Tiếp nhận: {entry.arrival.receivedServings} suất · Kết quả: {entry.arrival.result??'Theo hồ sơ cũ'}</p>}
              </li>)}</ol>
            </details>}</div>
          <div className="supervision-check-controls"><span className={`supervision-check-pill ${event?.confirmed ? 'confirmed' : event ? 'reported' : 'not_reported'}`}>{status==='ARRIVED' && serverMode && event?.confirmed && serverQuery.data?.stages.ARRIVED?.arrival?.result !== undefined && serverQuery.data?.stages.ARRIVED?.arrival?.result !== 'ACCEPTED' ? 'Tạm dừng phục vụ' : event?.confirmed ? (status==='ARRIVED'?'Đã xác nhận tiếp nhận':'Bếp đã ghi nhận') : needsRevision ? 'Đang điều chỉnh' : event ? (serverMode?'Cần bếp xử lý':'Chờ xác nhận') : 'Chưa cập nhật'}</span>{next === status && <button className="outline" type="button" onClick={() => edit({action:'report',stage:status})}>Cập nhật</button>}{status === 'ARRIVED' && canConfirmArrival && <button className="primary" type="button" onClick={() => edit({action:'arrival_confirm',stage:'ARRIVED'})}>Xác nhận món đã giao đến</button>}{status === 'ARRIVED' && canResolveArrival && <button className="primary" type="button" onClick={()=>edit({action:'arrival_resolve',stage:'ARRIVED'})}>Kiểm tra lại</button>}{isBoard && !serverMode && event && !event.confirmed && !needsRevision && !locked && !mealApproved && <button className="primary" type="button" onClick={() => edit({action:'confirm',stage:status})}>Xác nhận</button>}{canReopen(status) && <button type="button" className="outline" onClick={()=>edit({action:'reopen',stage:status})}>Mở điều chỉnh</button>}</div>
        </div>
      })}
    </div>
    <p className="supervision-stage-footnote">{saved?.events.length ? (serverMode ? 'Bếp lưu hồ sơ các mốc theo từng bữa, tự chịu trách nhiệm dữ liệu. BGH có quyền xem trong phạm vi trường; thay đổi được ghi lịch sử.' : 'Các mốc đã ghi nhận trong DEMO được lưu riêng theo bữa. BGH phải xác nhận để ảnh phục vụ được công khai.') : 'Đang hiển thị lịch trình minh họa ở nhật ký bên dưới. Khi bếp bắt đầu báo cáo, lịch trình sẽ chuyển sang các mốc ghi nhận mới của bữa này.'} Không phải chứng nhận an toàn thực phẩm.</p>
    {viewReceipt && serverQuery.data?.stages.ARRIVED?.arrival && (() => {
      const arrival = serverQuery.data.stages.ARRIVED.arrival
      const stage = serverQuery.data.stages.ARRIVED
      const resultLabel = arrival.result==='ACCEPTED'?'Đã chấp nhận':arrival.result==='REJECTED'?'Từ chối tiếp nhận':arrival.result==='CONDITIONAL'?'Tạm giữ, chờ xử lý':arrival.condition==='GOOD'?'Đã xác nhận':'Có lưu ý'
      return <div className="supervision-edit-backdrop arrival-receipt-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setViewReceipt(false)}}>
        <section className="arrival-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="arrival-receipt-title" onKeyDown={event=>{if(event.key==='Escape')setViewReceipt(false)}}>
          <header className="arrival-receipt-header">
            <div><span className="section-kicker">HỒ SƠ GIAO NHẬN · CHỈ XEM</span><h2 id="arrival-receipt-title">Phiếu giao nhận món ăn thành phẩm</h2><p>{school.name} · {new Date(date+'T12:00:00').toLocaleDateString('vi-VN')} · {mealLabel}</p></div>
            <button type="button" className="icon-button" onClick={()=>setViewReceipt(false)} aria-label="Đóng phiếu giao nhận"><X size={20}/></button>
          </header>
          <div className="arrival-receipt-body">
            <div className="arrival-receipt-summary">
              <div><small>KẾT LUẬN GIAO NHẬN</small><strong className={arrival.result==='REJECTED'?'arrival-result-rejected':arrival.result==='CONDITIONAL'?'arrival-result-pending':'arrival-result-accepted'}>{resultLabel}</strong></div>
              <div><small>SỐ SUẤT THỰC NHẬN</small><strong>{arrival.receivedServings.toLocaleString('vi-VN')}</strong></div>
              <div><small>SỐ SUẤT DỰ KIẾN</small><strong>{contextQuery.data?.menu?.servings.toLocaleString('vi-VN')??'—'}</strong></div>
            </div>
            <section className="arrival-receipt-section"><h3>01. Thông tin bàn giao</h3><div className="arrival-receipt-facts">
              <div><span>Trường tiếp nhận</span><strong>{school.name}</strong></div>
              <div><span>Bếp cung cấp</span><strong>{contextQuery.data?.kitchen?.name??'—'}</strong></div>
              <div><span>Giờ xuất bếp</span><strong>{serverQuery.data?.stages.DISPATCHED?.time??'—'}</strong></div>
              <div><span>Giờ đến trường</span><strong>{arrival.arrivalTime??'—'}</strong></div>
              <div><span>Người giao</span><strong>{arrival.deliveryPerson??'Chưa ghi'}</strong></div>
              <div><span>Đơn vị vận chuyển</span><strong>{arrival.transportUnit||'Không ghi nhận'}</strong></div>
              <div><span>Người xác nhận</span><strong>Ban Giám hiệu</strong></div>
              <div><span>Thời gian xác nhận</span><strong>{stage.confirmedAt?new Date(stage.confirmedAt).toLocaleString('vi-VN'):'—'}</strong></div>
            </div></section>
            <section className="arrival-receipt-section"><h3>02. Đối chiếu món ăn</h3>
              <div className="arrival-receipt-table-wrap"><table className="arrival-receipt-table"><thead><tr><th>Món ăn</th><th>Đối chiếu</th><th>Nhiệt độ đo</th></tr></thead><tbody>
                {(arrival.dishChecks??[]).map(item=><tr key={item.dishId}><td>{item.name}</td><td>{item.status==='MATCH'?'Đủ, đúng món':item.status==='SHORT'?'Thiếu / sai lệch':'Không nhận được'}</td><td>{item.temperatureC==null?'Không ghi nhận':item.temperatureC+' °C'}</td></tr>)}
                {!arrival.dishChecks?.length && <tr><td colSpan={3}>Phiếu cũ chưa có đối chiếu từng món.</td></tr>}
              </tbody></table></div>
            </section>
            <section className="arrival-receipt-section"><h3>03. Kiểm tra tình trạng</h3><div className="arrival-receipt-facts">
              <div><span>Bao gói / niêm phong</span><strong>{arrival.packaging==='OK'?'Không phát hiện bất thường':arrival.packaging==='ISSUE'?'Có bất thường':'Chưa ghi nhận'}</strong></div>
              <div><span>Kiểm tra cảm quan</span><strong>{arrival.sensory==='OK'?'Không phát hiện bất thường':arrival.sensory==='ISSUE'?'Có bất thường':'Chưa ghi nhận'}</strong></div>
            </div></section>
            <section className="arrival-receipt-section"><h3>04. Ghi chú và minh chứng</h3><p className="arrival-receipt-note">{stage.confirmationNote||stage.note||'Không có ghi chú.'}</p>
              {arrival.photo && <div className="arrival-receipt-evidence"><img src={arrival.photo} alt="Ảnh thực tế tại thời điểm giao nhận"/><small>Ảnh giao nhận đã lưu</small></div>}
            </section>
          </div>
          <footer className="arrival-receipt-footer"><span><ShieldCheck size={15}/> Hồ sơ được lưu trên hệ thống · Không thay thế kết luận an toàn thực phẩm</span><button type="button" className="primary" onClick={()=>setViewReceipt(false)}>Đóng phiếu</button></footer>
        </section>
      </div>
    })()}
    {viewDispatch && serverQuery.data?.stages.DISPATCHED && (() => {
      const stage=serverQuery.data.stages.DISPATCHED
      const dispatch=stage.dispatch
      return <div className="supervision-edit-backdrop arrival-receipt-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setViewDispatch(false)}}>
        <section className="arrival-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="dispatch-receipt-title" onKeyDown={event=>{if(event.key==='Escape')setViewDispatch(false)}}>
          <header className="arrival-receipt-header"><div><span className="section-kicker">BẾP TRUNG TÂM · HỒ SƠ ĐÃ LƯU</span><h2 id="dispatch-receipt-title">Phiếu xuất món thành phẩm</h2><p>{school.name} · {date} · {mealLabel}</p></div>
            <button type="button" className="icon-button" aria-label="Đóng phiếu xuất bếp" onClick={()=>setViewDispatch(false)}><X size={20}/></button></header>
          <div className="arrival-receipt-body">
            {!dispatch?<p className="arrival-help">Phiếu được tạo trước khi bổ sung biểu mẫu chi tiết. Lịch sử gốc được giữ nguyên.</p>:<>
              <div className="arrival-receipt-summary"><div><small>SUẤT THỰC XUẤT</small><strong>{dispatch.actualServings.toLocaleString('vi-VN')}</strong></div><div><small>GIỜ XUẤT BẾP</small><strong>{dispatch.dispatchTime}</strong></div><div><small>TRẠNG THÁI</small><strong>{stage.confirmed?'Đã ghi nhận':'Cần xử lý'}</strong></div></div>
              <section className="arrival-receipt-section"><h3>01. Người và phương tiện bàn giao</h3><div className="arrival-receipt-facts"><div><span>Nhân viên bếp phụ trách</span><strong>{dispatch.handlerName}</strong></div><div><span>Người nhận vận chuyển</span><strong>{dispatch.deliveryPerson}</strong></div><div><span>Phương tiện / đơn vị vận chuyển</span><strong>{dispatch.transportUnit}</strong></div></div></section>
              <section className="arrival-receipt-section"><h3>02. Đối chiếu món đã xuất</h3><div className="arrival-receipt-table-wrap"><table className="arrival-receipt-table"><thead><tr><th>Tên món</th><th>Số suất</th><th>Kiểm tra</th></tr></thead><tbody>{dispatch.dishChecks.map(dish=><tr key={dish.dishId}><td>{dish.name}</td><td>{dish.servings}</td><td>{dish.status==='PASS'?'Đạt':'Bất thường'}</td></tr>)}</tbody></table></div></section>
              <section className="arrival-receipt-section"><h3>03. Tình trạng và minh chứng</h3><div className="arrival-receipt-facts"><div><span>Bao gói, dụng cụ chứa</span><strong>{dispatch.packaging==='PASS'?'Đạt':'Bất thường'}</strong></div><div><span>Cảm quan món ăn</span><strong>{dispatch.sensory==='PASS'?'Đạt':'Bất thường'}</strong></div></div><p>{dispatch.discrepancyNote||stage.note}</p>
              {dispatch.photo&&<div className="arrival-receipt-evidence"><img src={dispatch.photo} alt="Ảnh thực tế món ăn lúc xuất bếp"/><small>Ảnh đã lưu cùng phiếu</small></div>}</section>
            </>}
            {!dispatch&&<p className="arrival-receipt-note">{stage.note||'Không có ghi chú'}</p>}
          </div>
          <footer className="arrival-receipt-footer"><span><ShieldCheck size={15}/> Hồ sơ do bếp ghi nhận, có lịch sử điều chỉnh</span><button type="button" className="primary" onClick={()=>setViewDispatch(false)}>Đóng phiếu</button></footer>
        </section>
      </div>
    })()}
    {viewServingStage && serverQuery.data?.stages[viewServingStage]?.serving && (() => {
      const stage=serverQuery.data.stages[viewServingStage]
      const form=stage.serving!
      return <div className="supervision-edit-backdrop arrival-receipt-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setViewServingStage(null)}}>
        <section className="arrival-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="serving-receipt-title" onKeyDown={event=>{if(event.key==='Escape')setViewServingStage(null)}}>
          <header className="arrival-receipt-header"><div><span className="section-kicker">NHẬT KÝ PHỤC VỤ · CHỈ XEM</span><h2 id="serving-receipt-title">Phiếu {viewServingStage==='PLATED'?'ra món':'sẵn sàng phục vụ'}</h2><p>{school.name} · {date} · {mealLabel}</p></div><button type="button" className="icon-button" aria-label="Đóng phiếu" onClick={()=>setViewServingStage(null)}><X size={20}/></button></header>
          <div className="arrival-receipt-body">
            <div className="arrival-receipt-summary"><div><small>TRẠNG THÁI</small><strong className={stage.confirmed?'arrival-result-accepted':''}>{stage.confirmed?'Đơn vị đã ghi nhận':'Cần xử lý/bổ sung'}</strong></div><div><small>SỐ SUẤT GHI NHẬN</small><strong>{form.actualServings.toLocaleString('vi-VN')}</strong></div><div><small>SỐ SUẤT DỰ KIẾN</small><strong>{contextQuery.data?.menu?.servings.toLocaleString('vi-VN')??'—'}</strong></div></div>
            <section className="arrival-receipt-section"><h3>01. Thông tin thực hiện</h3><div className="arrival-receipt-facts"><div><span>Giờ bắt đầu / hoàn tất</span><strong>{form.portionStartAt?form.portionStartAt+' – ':''}{form.occurredAt}</strong></div><div><span>Người thực hiện</span><strong>{form.handlerName}</strong></div>{form.distributionArea&&<div><span>Khu vực chia suất</span><strong>{form.distributionArea}</strong></div>}<div><span>Khu vực và dụng cụ</span><strong>{form.sanitaryCondition==='PASS'?'Không phát hiện bất thường':'Có bất thường'}</strong></div>{form.foodCondition&&<div><span>Tình trạng món ăn</span><strong>{form.foodCondition==='PASS'?'Không phát hiện bất thường':'Có bất thường'}</strong></div>}<div><span>Thời điểm ghi nhận</span><strong>{stage.confirmedAt?new Date(stage.confirmedAt).toLocaleString('vi-VN'):'Chưa ghi nhận'}</strong></div></div></section>
            <section className="arrival-receipt-section"><h3>02. Kiểm tra từng món</h3><div className="arrival-receipt-table-wrap"><table className="arrival-receipt-table"><thead><tr><th>Tên món</th>{viewServingStage==='PLATED'&&<th>Suất đã chia</th>}<th>Kết quả</th></tr></thead><tbody>{form.dishChecks.map(dish=><tr key={dish.dishId}><td>{dish.name}</td>{viewServingStage==='PLATED'&&<td>{dish.portions??'Chưa có'}</td>}<td>{dish.status==='PASS'?'Đạt':'Có bất thường'}</td></tr>)}</tbody></table></div></section>
            <section className="arrival-receipt-section"><h3>03. Ghi chú và hình ảnh</h3><p className="arrival-receipt-note">{form.discrepancyNote||stage.note||'Không có ghi chú bổ sung.'}</p>{viewServingStage==='READY' && stage.photos?.[0] && <div className="arrival-receipt-evidence"><img src={stage.photos[0]} alt="Ảnh thực tế khi sẵn sàng phục vụ"/><small>Ảnh phục vụ thực tế</small></div>}</section>
          </div>
          <footer className="arrival-receipt-footer"><span><ShieldCheck size={15}/> Hồ sơ theo từng bữa · Lưu lịch sử xác nhận</span><button type="button" className="primary" onClick={()=>setViewServingStage(null)}>Đóng phiếu</button></footer>
        </section>
      </div>
    })()}
    {editing && <div className="supervision-edit-backdrop" role="presentation" onMouseDown={event => {if(event.target===event.currentTarget)setEditing(null)}}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-stage-title" className={`supervision-edit-dialog${isDispatchReport(editing) ? " supervision-dispatch-dialog" : ""}` }>
        <div className="dialog-head"><h2 id="edit-stage-title">{isArrivalReceipt(editing) ? (editing.action==='arrival_resolve'?'Phiếu kiểm tra lại giao nhận':'Phiếu xác nhận món đã giao đến') : editing.action === 'report' ? 'Cập nhật mốc vận hành' : editing.action === 'reopen' ? 'Mở điều chỉnh mốc vận hành' : 'Xác nhận mốc vận hành'}</h2><button className="icon-button" type="button" aria-label="Đóng" onClick={() => setEditing(null)}><X size={20}/></button></div>
        <p className="supervision-edit-context">{school.name} · {date} · {mealLabel} · <strong>{stageNames[editing.stage]}</strong></p>
        <form className="supervision-edit-form" onSubmit={save}>
          {isArrivalReceipt(editing) && <>
            <p className="supervision-edit-guidance">Nhà trường chỉ kiểm tra món ăn thành phẩm do Bếp trung tâm giao đến, không nhận nguyên liệu sống. Đối chiếu món, số suất, tình trạng và giờ giao thực tế; kết quả có vấn đề sẽ tạm dừng phục vụ cho tới khi kiểm tra lại và chấp nhận.</p>
            {contextQuery.isLoading && <p className="supervision-edit-guidance">Đang tải thực đơn và thông tin bếp để đối chiếu…</p>}
            {contextQuery.isError && <p className="error" role="alert">Không tải được thực đơn để đối chiếu. Không thể xác nhận.</p>}
            <fieldset className="arrival-section">
              <legend>A. Thông tin giao nhận</legend>
              <div className="arrival-grid">
                <div><small>Bếp giao</small><strong>{contextQuery.data?.kitchen?.name??'Đang tải…'}</strong></div>
                <div><small>Giờ xuất bếp đã ghi nhận</small><strong>{serverQuery.data?.stages.DISPATCHED?.time??'Chưa có'}</strong></div>
              </div>
              <div className="arrival-grid">
                <label>Giờ thực tế đến trường *<input type="time" required value={arrivalTime} onChange={event=>setArrivalTime(event.target.value)}/></label>
                <label>Người giao hàng *<input required minLength={2} maxLength={120} value={deliveryPerson} onChange={event=>setDeliveryPerson(event.target.value)} placeholder="Họ tên người bàn giao"/></label>
              </div>
              <label>Đơn vị / phương tiện vận chuyển (nếu có)<input maxLength={150} value={transportUnit} onChange={event=>setTransportUnit(event.target.value)} placeholder="Tên đơn vị hoặc phương tiện vận chuyển"/></label>
            </fieldset>
            <fieldset className="arrival-section">
              <legend>B. Số lượng và món ăn</legend>
              <div className="arrival-grid">
                <div><small>Số suất dự kiến theo thực đơn</small><strong>{contextQuery.data?.menu?.servings.toLocaleString('vi-VN')??'Chưa có'}</strong></div>
                <label>Số suất thực nhận *<input type="number" min="0" max="1000000" step="1" required value={receivedServings} onChange={event=>setReceivedServings(event.target.value)} placeholder="Nhập số suất đã nhận"/></label>
              </div>
              <p className="arrival-help">Đối chiếu từng món theo thực đơn đã được BGH duyệt. Nhiệt độ là số đo thực tế (°C), không được tự điền theo ngưỡng mặc định.</p>
              {plannedDishes.map(dish=><div className="arrival-dish" key={dish.id}>
                <strong>{dish.name}</strong>
                <label>Đối chiếu món<select value={dishChecks[dish.id]?.status??'MATCH'} onChange={event=>setDishChecks(old=>({...old,[dish.id]:{status:event.target.value as 'MATCH'|'SHORT'|'MISSING',temperatureC:old[dish.id]?.temperatureC??''}}))}>
                  <option value="MATCH">Đủ, đúng món</option><option value="SHORT">Thiếu / sai lệch</option><option value="MISSING">Không nhận được món</option>
                </select></label>
                <label>Nhiệt độ đo (°C) nếu có<input type="number" step="0.1" min="-40" max="150" value={dishChecks[dish.id]?.temperatureC??''} onChange={event=>setDishChecks(old=>({...old,[dish.id]:{status:old[dish.id]?.status??'MATCH',temperatureC:event.target.value}}))} placeholder="Chưa đo"/></label>
              </div>)}
              {!plannedDishes.length && <p className="error">Chưa có thực đơn được duyệt, không thể xác nhận giao nhận.</p>}
            </fieldset>
            <fieldset className="arrival-section">
              <legend>C. Kiểm tra chất lượng</legend>
              <label>Tình trạng bao gói / niêm phong *<select value={packaging} onChange={event=>setPackaging(event.target.value as 'OK'|'ISSUE')}>
                <option value="OK">Nguyên vẹn, không phát hiện bất thường</option><option value="ISSUE">Rách, hở hoặc có bất thường</option>
              </select></label>
              <label>Kiểm tra cảm quan *<select value={sensory} onChange={event=>setSensory(event.target.value as 'OK'|'ISSUE')}>
                <option value="OK">Không phát hiện bất thường</option><option value="ISSUE">Có dấu hiệu bất thường</option>
              </select></label>
              <label>Ảnh giao nhận (không bắt buộc, JPG/PNG/WebP ≤ 750 KB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{
                setPhoto('');setPhotoName('');setError('')
                const file=event.target.files?.[0];if(!file)return
                setLoadingPhoto(true)
                void readPhoto(file).then(value=>{setPhoto(value);setPhotoName(file.name)})
                  .catch(caught=>setError(caught instanceof Error?caught.message:'Không đọc được ảnh giao nhận.'))
                  .finally(()=>setLoadingPhoto(false))
              }}/>{photoName&&<small>Đã chọn: {photoName}</small>}</label>
            </fieldset>
            <fieldset className="arrival-section">
              <legend>D. Kết luận tiếp nhận</legend>
              {hasArrivalIssues && <p className="arrival-warning" role="status">Đã phát hiện chênh lệch hoặc bất thường. Không thể chọn chấp nhận tiếp nhận. Cần ghi rõ hướng xử lý.</p>}
              <label>Kết quả kiểm tra *<select value={arrivalResult} onChange={event=>setArrivalResult(event.target.value as 'ACCEPTED'|'CONDITIONAL'|'REJECTED')}>
                <option value="ACCEPTED" disabled={hasArrivalIssues}>Chấp nhận tiếp nhận</option>
                <option value="CONDITIONAL">Có sai lệch – tạm giữ chờ xử lý, chưa phục vụ</option>
                <option value="REJECTED">Từ chối tiếp nhận</option>
              </select></label>
              <label className="arrival-attestation"><input type="checkbox" required checked={receiptChecked} onChange={event=>setReceiptChecked(event.target.checked)}/><span>Tôi xác nhận đã trực tiếp kiểm tra số lượng, món ăn và tình trạng bàn giao thực tế tại trường.</span></label>
            </fieldset>
          </>}
          {serverMode && editing.action==='confirm' && (editing.stage==='PLATED'||editing.stage==='READY') && serverQuery.data?.stages[editing.stage]?.serving && (() => {
            const report=serverQuery.data.stages[editing.stage].serving!
            return <div className="arrival-confirm-review">
              <strong>Đối chiếu phiếu {editing.stage==='PLATED'?'ra món':'sẵn sàng phục vụ'} trước khi xác nhận</strong>
              <div className="arrival-receipt-facts"><div><span>Số suất thực tế</span><strong>{report.actualServings.toLocaleString('vi-VN')}</strong></div><div><span>Giờ / người thực hiện</span><strong>{report.occurredAt} · {report.handlerName}</strong></div></div>
              <p>Khu vực và dụng cụ: {report.sanitaryCondition==='PASS'?'Không phát hiện bất thường':'Có bất thường'}</p>
              {editing.stage==='PLATED' && <p>Chia suất: {report.portionStartAt??'—'} – {report.occurredAt} · {report.distributionArea??'Chưa ghi'} · Vệ sinh cá nhân: {report.handHygieneChecked?'Đã kiểm tra':'Chưa ghi'} · Món ăn: {report.foodCondition==='ISSUE'?'Có bất thường':'Không phát hiện bất thường'}</p>}
              <ul>{report.dishChecks.map(dish=><li key={dish.dishId}>{dish.name}: {dish.status==='PASS'?'Đạt':'Có bất thường'}{editing.stage==='PLATED'?' · '+(dish.portions??'Chưa ghi')+' suất':''}</li>)}</ul>
              {report.discrepancyNote && <p>Ghi chú: {report.discrepancyNote}</p>}
              {editing.stage==='READY' && serverQuery.data.stages.READY?.photos?.[0] && <img className="arrival-review-photo" src={serverQuery.data.stages.READY.photos[0]} alt="Ảnh thực tế sẵn sàng phục vụ"/>}
              <p className="arrival-help">BGH chỉ xác nhận sau khi kiểm tra hồ sơ và thực tế phù hợp. Nếu cần sửa, dùng “Mở điều chỉnh” theo quy trình hiện có.</p>
            </div>
          })()}
          {isServingReport(editing) && <>
            <p className="supervision-edit-guidance">{editing.stage==='PLATED'?'Bếp ghi nhận Ra món sau khi BGH trường đã xác nhận nhận món thành phẩm. Đối chiếu số suất đã giao nhận với thực đơn được duyệt, ghi giờ và tình trạng thực tế.':'Chỉ ghi Sẵn sàng phục vụ sau khi bếp đã hoàn tất Ra món đạt; cần kiểm tra khu vực phục vụ, số suất và lưu ảnh thực tế.'}</p>
            <fieldset className="arrival-section"><legend>A. Thông tin bữa ăn và người thực hiện</legend>
              <div className="arrival-grid"><div><small>Trường</small><strong>{school.name}</strong></div><div><small>Thực đơn đã duyệt</small><strong>{contextQuery.data?.menu?.servings.toLocaleString('vi-VN')??'Đang tải…'} suất</strong></div></div>
              {editing.stage==='PLATED' && contextQuery.data?.kitchen?.type==='CENTRAL' && <div className="arrival-grid">
                <div><small>Bếp cung cấp</small><strong>{contextQuery.data.kitchen.name}</strong></div>
                <div><small>Trình tự</small><strong>Xuất bếp → Đến trường → Ra món → Sẵn sàng phục vụ</strong></div>
              </div>}
              <div className="arrival-grid">
                {editing.stage==='PLATED' && <label>Bắt đầu chia suất *<input type="time" required value={portionStartAt} onChange={event=>setPortionStartAt(event.target.value)}/></label>}
                <label>{editing.stage==='PLATED'?'Hoàn tất chia suất *':'Giờ thực tế *'}<input type="time" required value={occurredAt} onChange={event=>setOccurredAt(event.target.value)}/></label>
              </div>
              <div className="arrival-grid">
                <label>Người trực tiếp thực hiện *<input required minLength={2} maxLength={120} value={handlerName} onChange={event=>setHandlerName(event.target.value)} placeholder="Họ và tên"/></label>
                {editing.stage==='PLATED' && <label>Khu vực chia suất *<input required minLength={2} maxLength={160} value={distributionArea} onChange={event=>setDistributionArea(event.target.value)} placeholder="VD: Khu chia suất tầng trệt"/></label>}
              </div>
              <div className="arrival-grid">
                <label>{editing.stage==='PLATED'?'Tổng số suất đã chia *':'Số suất sẵn sàng phục vụ *'}<input type="number" required min="0" step="1" max="1000000" value={actualServings} onChange={event=>setActualServings(event.target.value)} placeholder="Nhập số suất thực tế"/></label>
                {editing.stage==='PLATED' && <div><small>Đối chiếu số lượng</small><strong>{actualServings===''?'Chưa nhập':Number(actualServings)===(contextQuery.data?.menu?.servings??-1)?'Khớp với thực đơn':Number(actualServings)>(contextQuery.data?.menu?.servings??0)?'Vượt số suất dự kiến':'Ít hơn số suất dự kiến'}</strong></div>}
              </div>
            </fieldset>
            <fieldset className="arrival-section"><legend>B. Chia suất và kiểm tra từng món</legend>
              <p className="arrival-help">Nhập số suất đã chia của mỗi món. Nếu thiếu, nhầm món hoặc phát hiện dấu hiệu bất thường, đánh dấu và ghi rõ cách xử lý.</p>
              {plannedDishes.map(dish=><div className="arrival-dish arrival-portion-dish" key={dish.id}>
                <strong>{dish.name}</strong>
                {editing.stage==='PLATED' && <label>Số suất của món *<input type="number" min="0" max="1000000" step="1" required value={dishPortions[dish.id]??''} onChange={event=>setDishPortions(old=>({...old,[dish.id]:event.target.value}))} placeholder="Số suất"/></label>}
                <label>Kiểm tra món<select value={servingDishChecks[dish.id]??'PASS'} onChange={event=>setServingDishChecks(old=>({...old,[dish.id]:event.target.value as 'PASS'|'ISSUE'}))}><option value="PASS">Đúng món, không bất thường</option><option value="ISSUE">Có bất thường / thiếu món</option></select></label>
              </div>)}
              {!plannedDishes.length && <p className="error">Chưa có thực đơn được duyệt.</p>}
            </fieldset>
            <fieldset className="arrival-section"><legend>C. Kiểm tra điều kiện chia suất</legend>
              <label>Tình trạng khu vực và dụng cụ chia suất *<select value={sanitaryCondition} onChange={event=>setSanitaryCondition(event.target.value as 'PASS'|'ISSUE')}><option value="PASS">Sạch, phù hợp</option><option value="ISSUE">Có bất thường cần xử lý</option></select></label>
              {editing.stage==='PLATED' && <>
                <label>Tình trạng món ăn khi chia suất *<select value={foodCondition} onChange={event=>setFoodCondition(event.target.value as 'PASS'|'ISSUE')}><option value="PASS">Không phát hiện bất thường</option><option value="ISSUE">Có dấu hiệu bất thường</option></select></label>
                <label className="arrival-attestation"><input type="checkbox" required checked={handHygieneChecked} onChange={event=>setHandHygieneChecked(event.target.checked)}/><span>Tôi xác nhận nhân viên đã vệ sinh tay, sử dụng bảo hộ và dụng cụ chia suất sạch trước khi thao tác.</span></label>
              </>}
              {editing.stage==='READY' && <label className="arrival-attestation"><input type="checkbox" required checked={servingAreaChecked} onChange={event=>setServingAreaChecked(event.target.checked)}/><span>Tôi đã kiểm tra khu vực, dụng cụ, suất thành phẩm trước khi giao đi hoặc phục vụ.</span></label>}
            </fieldset>
            <fieldset className="arrival-section"><legend>D. Sai lệch và xử lý</legend>
              {hasServingIssues && <p className="arrival-warning" role="status">{editing.stage==='PLATED'?'Phiếu có sai lệch hoặc bất thường; bếp phải xử lý, mở điều chỉnh và ghi nhận lại trước khi chuyển mốc tiếp theo.':'Có chênh lệch hoặc bất thường; không thể chuyển Sẵn sàng phục vụ.'}</p>}
              <label>{hasServingIssues?'Lý do và biện pháp xử lý *':'Ghi chú bổ sung (nếu có)'}<textarea rows={3} minLength={hasServingIssues?10:0} maxLength={1000} required={hasServingIssues} value={discrepancyNote} onChange={event=>setDiscrepancyNote(event.target.value)} placeholder="Ghi rõ thiếu hoặc thừa suất, món không đạt, biện pháp cách ly/bổ sung, người xử lý…"/></label>
            </fieldset>
          </>}
          {editing.action === 'report' && editing.stage === 'READY' && <label>Ảnh thực tế khi sẵn sàng phục vụ <span aria-hidden="true">*</span><input type="file" accept="image/jpeg,image/png,image/webp" required={!photo} onChange={event => {
            setPhoto('');setPhotoName('');setError('')
            const file = event.target.files?.[0]
            if (!file) return
            setLoadingPhoto(true)
            void readPhoto(file).then(result => {setPhoto(result);setPhotoName(file.name)}).catch(caught => setError(caught instanceof Error ? caught.message : 'Không đọc được ảnh.')).finally(() => setLoadingPhoto(false))
          }}/>{photoName && <small>Đã chọn: {photoName}</small>}</label>}
          {isDispatchReport(editing) && <>
            <p className="supervision-edit-guidance">Bếp kiểm thực và lưu mẫu trước khi xuất bếp. Phiếu chỉ ghi nhận khi số suất, món ăn, bao gói và cảm quan đã đối chiếu đạt; người giao nhận và ảnh hiện trường được lưu trong lịch sử.</p>
            <fieldset className="arrival-section"><legend>A. Thông tin xuất bếp và bàn giao</legend>
              <div className="arrival-grid"><div><small>Trường nhận</small><strong>{school.name}</strong></div><div><small>Suất theo thực đơn đã duyệt</small><strong>{contextQuery.data?.menu?.servings.toLocaleString('vi-VN')??'Đang tải…'}</strong></div></div>
              <div className="arrival-grid"><label>Giờ xuất bếp thực tế *<input type="time" required value={dispatchTime} onChange={e=>setDispatchTime(e.target.value)}/></label>
                <label>Tổng số suất thực xuất *<input type="number" required min="1" max="1000000" step="1" value={dispatchServings} onChange={e=>setDispatchServings(e.target.value)} placeholder="Nhập số suất đã xuất"/></label></div>
              <div className="arrival-grid"><label>Nhân viên bếp phụ trách *<input required minLength={2} maxLength={120} value={dispatchHandler} onChange={e=>setDispatchHandler(e.target.value)} placeholder="Họ và tên"/></label>
                <label>Người nhận bàn giao vận chuyển *<input required minLength={2} maxLength={120} value={dispatchRecipient} onChange={e=>setDispatchRecipient(e.target.value)} placeholder="Họ và tên người nhận"/></label></div>
              <label>Đơn vị / phương tiện vận chuyển *<input required minLength={2} maxLength={160} value={dispatchTransport} onChange={e=>setDispatchTransport(e.target.value)} placeholder="VD: Xe vận chuyển suất ăn chuyên dụng"/></label>
            </fieldset>
            <fieldset className="arrival-section"><legend>B. Đối chiếu từng món thành phẩm</legend><p className="arrival-help">Kiểm đếm số suất cho từng món theo thực đơn đã duyệt. Nếu có bất thường, phải xử lý trước khi hoàn thành xuất bếp.</p>
              {plannedDishes.map(dish=><div className="arrival-dish arrival-portion-dish" key={dish.id}><strong>{dish.name}</strong>
                <label>Số suất xuất của món *<input type="number" required min="0" max="1000000" step="1" value={dispatchDishChecks[dish.id]?.servings??''} onChange={e=>setDispatchDishChecks(old=>({...old,[dish.id]:{status:old[dish.id]?.status??'PASS',servings:e.target.value}}))}/></label>
                <label>Kết quả kiểm tra<select value={dispatchDishChecks[dish.id]?.status??'PASS'} onChange={e=>setDispatchDishChecks(old=>({...old,[dish.id]:{status:e.target.value as 'PASS'|'ISSUE',servings:old[dish.id]?.servings??''}}))}><option value="PASS">Đạt, đúng món</option><option value="ISSUE">Thiếu / có bất thường</option></select></label>
              </div>)}
              {!plannedDishes.length&&<p className="error">Chưa có món thuộc thực đơn đã duyệt.</p>}
            </fieldset>
            <fieldset className="arrival-section"><legend>C. Điều kiện xuất bếp và minh chứng</legend>
              <div className="arrival-grid"><label>Kiểm tra bao gói / dụng cụ chứa *<select value={dispatchPackaging} onChange={e=>setDispatchPackaging(e.target.value as 'PASS'|'ISSUE')}><option value="PASS">Đạt, nguyên vẹn và phù hợp</option><option value="ISSUE">Không đạt / bất thường</option></select></label>
                <label>Kiểm tra cảm quan món ăn *<select value={dispatchSensory} onChange={e=>setDispatchSensory(e.target.value as 'PASS'|'ISSUE')}><option value="PASS">Không phát hiện bất thường</option><option value="ISSUE">Có dấu hiệu bất thường</option></select></label></div>
              {dispatchHasIssues&&<p className="arrival-warning" role="status">Có chênh lệch hoặc kiểm tra không đạt. Không thể xuất bếp cho đến khi xử lý và ghi nhận lại kết quả đạt.</p>}
              <label>{dispatchHasIssues?'Sai lệch và biện pháp xử lý *':'Ghi chú bổ sung (nếu có)'}<textarea rows={3} required={dispatchHasIssues} minLength={dispatchHasIssues?10:0} maxLength={1000} value={dispatchDiscrepancy} onChange={e=>setDispatchDiscrepancy(e.target.value)} placeholder="Ghi tình trạng bàn giao, biện pháp xử lý và người phụ trách…"/></label>
              <label>Ảnh thực tế lúc xuất bếp * (JPEG, PNG hoặc WebP, tối đa 750 KB)<input type="file" accept="image/jpeg,image/png,image/webp" required={!photo} onChange={event=>{
                setPhoto('');setPhotoName('');setError('');const file=event.target.files?.[0];if(!file)return;
                setLoadingPhoto(true);void readPhoto(file).then(result=>{setPhoto(result);setPhotoName(file.name)}).catch(caught=>setError(caught instanceof Error?caught.message:'Không đọc được ảnh.')).finally(()=>setLoadingPhoto(false))
              }}/>{photoName&&<small>Đã chọn: {photoName}</small>}</label>
              {photo&&<img className="arrival-review-photo" src={photo} alt="Ảnh chuẩn bị xuất bếp"/>}
            </fieldset>
          </>}
    {serverMode && dateKind==='past' && <label>Lý do bổ sung hồ sơ ngày đã qua *<textarea required minLength={10} maxLength={1000} rows={3} value={lateReason} onChange={event=>setLateReason(event.target.value)} placeholder="Nêu rõ vì sao cập nhật hoặc xác nhận muộn…"/></label>}
          {editing.action==='reopen' && <p className="supervision-edit-guidance">Mốc chuyển sang cần cập nhật. Bản ghi cũ, lý do, người thao tác và thời gian đều được lưu trong lịch sử; không sửa đè.</p>}
          <label>{isArrivalReceipt(editing)?'Ghi chú tiếp nhận / hướng xử lý':'Ghi chú / nội dung đối chiếu'} <span aria-hidden="true">*</span><textarea required minLength={editing.action==='reopen' || (isArrivalReceipt(editing) && (hasArrivalIssues || arrivalResult!=='ACCEPTED')) ? 10 : 5} maxLength={1000} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder={isArrivalReceipt(editing) ? 'Ghi rõ sai lệch, thời điểm kiểm tra, kết quả xử lý hoặc việc cần bổ sung…' : 'Ghi rõ hoạt động đã thực hiện…'} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="supervision-edit-buttons"><button className="outline" type="button" onClick={() => setEditing(null)}>Hủy</button><button className="primary" disabled={saving || loadingPhoto || (isServingReport(editing) && (!plannedDishes.length || !occurredAt || !handlerName.trim() || actualServings==='' || !Number.isSafeInteger(Number(actualServings)) || (editing.stage==='READY' && (hasServingIssues || !servingAreaChecked)) ||
            (editing.stage==='PLATED' && (!portionStartAt || portionStartAt>occurredAt || !distributionArea.trim() || !handHygieneChecked ||
              plannedDishes.some(dish=>dishPortions[dish.id]==='' || !Number.isSafeInteger(Number(dishPortions[dish.id]))))))) || (editing.action === 'report' && editing.stage === 'READY' && !photo) ||
            (isDispatchReport(editing) && (dispatchHasIssues || !plannedDishes.length || !dispatchTime ||
              !dispatchHandler.trim() || !dispatchRecipient.trim() || !dispatchTransport.trim() ||
              !photo || !Number.isSafeInteger(Number(dispatchServings)) || Number(dispatchServings)<1 ||
              plannedDishes.some(d=>!Number.isSafeInteger(Number(dispatchDishChecks[d.id]?.servings)) ||
                dispatchDishChecks[d.id]?.servings==='' || Number(dispatchDishChecks[d.id]?.servings)!==Number(dispatchServings)))) || (isArrivalReceipt(editing) && (!receiptChecked || !plannedDishes.length || !arrivalTime || !deliveryPerson.trim() || !Number.isSafeInteger(Number(receivedServings)) || Number(receivedServings) < 0 || (Number(receivedServings) === 0 && arrivalResult === 'ACCEPTED') || (hasArrivalIssues && arrivalResult==='ACCEPTED')))} type="submit">{saving ? 'Đang lưu phiếu…' : editing.action === 'report' ? (isServingReport(editing)?'Bếp lưu phiếu vận hành':isDispatchReport(editing)?'Bếp lưu phiếu xuất bếp':'Bếp lưu mốc') : editing.action==='reopen'?'Mở điều chỉnh và lưu lịch sử':isArrivalReceipt(editing)?(arrivalResult==='ACCEPTED'?'Lưu phiếu và xác nhận Đến trường':'Lưu phiếu và tạm dừng phục vụ'):serverMode ? 'Xác nhận' : 'Xác nhận DEMO'}</button></div>
        </form>
      </section>
    </div>}
  </section>
}
