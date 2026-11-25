import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, ClipboardCheck, Clock3, FileClock, Pencil, Plus, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isServerSupervisionScope, readServerSupervision, readSupervisionContext, writeServerSupervision } from './lib/supervisionApi'
import type { School } from './lib/data'
import type { ViewRole } from './lib/store'
import {
  CHECK_DEFINITIONS,
  SUPERVISION_STATUS_EVENT,
  SUPERVISION_STATUS_STORAGE_KEY,
  canConfirmSupervision,
  canReportSupervision,
  readSupervisionStatuses,
  supervisionEvidenceCatalog,
  updateSupervisionStatus,
} from './lib/supervisionStatus'
import type { CheckAction, CheckId, CheckStatus, SupervisionMealType, SupervisionScope } from './lib/supervisionStatus'
import type { IngredientReceiptLine } from './lib/supervisionStatus'
import { supervisionIngredientCatalog } from './lib/inventory'
import Select from './components/ui/Select'
import { convertReceiptQuantity, formatReceiptQuantity, receiptUnitOptions, preferredReceiptUnit } from './lib/supervisionUnits'
import { InspectionEditor, InspectionReadout, newInspectionDraft } from './SupervisionInspectionForm'
import SupervisionSampleLifecycle from './SupervisionSampleLifecycle'
import type { InspectionDraft, InspectionKind } from './SupervisionInspectionForm'
import { supervisionDateKind } from './SupervisionDateNotice'
import { getStoredUser } from './lib/authApi'

const labels: Record<CheckStatus, string> = {
  not_reported: 'Chưa cập nhật', reported: 'Chờ BGH xác nhận',
  revision_requested: 'Cần bổ sung', confirmed: 'Đã xác nhận (DEMO)',
}
const formatTimestamp = (value: string) => new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
const actionLabels: Record<CheckAction | 'reopen', string> = {
  report: 'Bếp ghi nhận', confirm: 'BGH xác nhận (quy trình cũ)', request_revision: 'Yêu cầu bổ sung (quy trình cũ)', reopen:'Mở điều chỉnh',
}

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN')

function IngredientReceiptDetails({ lines, serviceDate }: { lines: readonly IngredientReceiptLine[]; serviceDate: string }) {
  return <div className="supervision-ingredient-snapshots" aria-label="Nguyên liệu đã ghi nhận">
    {lines.map(line => {
      const expiredAtService = line.expiresAt < serviceDate
      return <article key={line.itemId}>
        <div className="supervision-ingredient-title">
          <span><strong>{line.ingredientName}</strong><small>Lô {line.lotCode}</small></span>
          <b>{(line.displayQuantity ?? line.quantity).toLocaleString('vi-VN')} {line.displayUnit ?? line.unit}{line.displayUnit && line.displayUnit !== line.unit ? ` (quy đổi: ${formatReceiptQuantity(line.quantity)} ${line.unit})` : ''}</b>
        </div>
        <dl>
          <div><dt>Nhà cung cấp</dt><dd>{line.supplierName}</dd></div>
          <div><dt>Người cấp / liên hệ</dt><dd>{line.supplierContact}</dd></div>
          <div><dt>Hạn sử dụng</dt><dd>{formatDate(line.expiresAt)} <em className={expiredAtService ? 'expired' : ''}>{expiredAtService ? 'Quá hạn tại ngày bữa ăn' : 'Còn hạn tại ngày bữa ăn'}</em></dd></div>
          {line.documentsStatus&&<div><dt>Chứng từ</dt><dd>{line.documentsStatus==='pass'?'Đạt':'Không đạt'}</dd></div>}
          {line.sensoryStatus&&<div><dt>Cảm quan</dt><dd>{line.sensoryStatus==='pass'?'Đạt':'Không đạt'}</dd></div>}
          {line.storageCondition&&<div><dt>Bảo quản</dt><dd>{line.storageCondition}</dd></div>}
          {line.handling&&<div><dt>Xử lý / ghi chú</dt><dd>{line.handling}</dd></div>}
        </dl>
      </article>
    })}
  </div>
}

type Editing = { id: CheckId; action: CheckAction | 'reopen' }
type IngredientDraftRow = { id: string; itemId: string; quantity: string; unit: string; documentsStatus: string; sensoryStatus: string; storageCondition: string; handling: string }
const createIngredientRow = (itemId = '', quantity = '', unit = '', documentsStatus = '', sensoryStatus = '', storageCondition = '', handling = ''): IngredientDraftRow => ({ id: crypto.randomUUID(), itemId, quantity, unit, documentsStatus, sensoryStatus, storageCondition, handling })
export default function SupervisionStatusPanel({ school, date, mealType, role }: {
  school: School
  date: string
  mealType: SupervisionMealType
  role: ViewRole
}) {
  const scope: SupervisionScope = { schoolId: school.id, serviceDate: date, mealType }
  const serverMode = isServerSupervisionScope(scope)
  const serverQuery = useQuery({queryKey:['supervision-server',scope.schoolId,scope.serviceDate,scope.mealType],queryFn:()=>readServerSupervision(scope),enabled:serverMode})
  const contextQuery = useQuery({queryKey:['supervision-context',scope.schoolId,scope.serviceDate,scope.mealType],queryFn:()=>readSupervisionContext(scope),enabled:serverMode})
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [note, setNote] = useState('')
  const [lateReason,setLateReason] = useState('')
  const [evidenceRef, setEvidenceRef] = useState('')
  const [ingredientRows, setIngredientRows] = useState<IngredientDraftRow[]>([])
  const [inspectionDraft,setInspectionDraft] = useState<InspectionDraft | null>(null)
  const [skipSample,setSkipSample] = useState(false)
  const [skipReason,setSkipReason] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const queryClient = useQueryClient()
  useEffect(() => {
    const update = () => setRevision(value => value + 1)
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === SUPERVISION_STATUS_STORAGE_KEY) update()
    }
    window.addEventListener(SUPERVISION_STATUS_EVENT, update)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SUPERVISION_STATUS_EVENT, update)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  // Recalculate after writes in this tab and cross-tab storage changes.
  void revision
  const statusLabel = (status: CheckStatus) => serverMode ? status === 'confirmed' ? 'Bếp đã ghi nhận' : status === 'reported' ? 'Có vấn đề cần xử lý' : status === 'revision_requested' ? 'Đang điều chỉnh' : 'Chưa cập nhật' : labels[status]
  const checks = serverMode ? CHECK_DEFINITIONS.map(def => {const record=serverQuery.data?.checks[def.id];return {id:def.id,status:(record?.status ?? 'not_reported') as CheckStatus,history:(record?.history ?? []).map((event: any) => ({ id: String(event.id), action: event.action === 'request_revision' ? 'request_revision' : event.action, actorLabel: serverQuery.data?.actors?.[event.actorId] ?? (event.actorRole === 'SCHOOL_ADMIN' ? 'Ban Giám hiệu' : 'Bếp'), recordedAt: event.at, note: [event.note, event.lateReason ? 'Lý do ghi muộn: '+event.lateReason : ''].filter(Boolean).join(' · '), evidenceRef: event.evidenceRef ?? '', ingredientReceipts: Array.isArray(event.ingredientReceipts) ? event.ingredientReceipts : [], inspection:event.inspection })) as ReturnType<typeof readSupervisionStatuses>[number]['history']}}) : readSupervisionStatuses(scope)
  const demoIngredientCatalog = useMemo(() => supervisionIngredientCatalog(school.id), [school.id])
  const ingredientCatalog = serverMode ? (contextQuery.data?.lots ?? []).map(lot=>({
    itemId:lot.itemId, ingredientName:lot.ingredientName,lotCode:lot.lotCode,
    supplierName:lot.supplierName,supplierContact:lot.supplierContact,supplierId:'',
    expiresAt:lot.expiresAt ?? '9999-12-31',unit:lot.unit,quantityAvailable:lot.quantityAvailable,
  })) : demoIngredientCatalog
  const evidenceOptions = editing && !serverMode ? supervisionEvidenceCatalog(scope, editing.id) : []
  const dateKind=serverMode?supervisionDateKind(date):'today'
  const dateLocked=dateKind==='future'
  const approvedMeal=false // Phiên bản cũ có BGH duyệt; dữ liệu bếp không còn bị khóa bởi phê duyệt này.
  const isSchoolReceiver = serverMode && role === 'school_kitchen' && !getStoredUser()?.kitchenId
  const canReport = (serverMode ? (role === 'central_kitchen' || role === 'school_kitchen') && !isSchoolReceiver : canReportSupervision(role, school.mode)) && !dateLocked && !approvedMeal
  const canConfirm = !serverMode && canConfirmSupervision(role) && !dateLocked
  const confirmedCount = checks.filter(item => item.status === 'confirmed').length
  const pendingCount = checks.filter(item => item.status === 'reported').length
  const mealLabel = mealType === 'BREAKFAST' ? 'bữa sáng' : mealType === 'LUNCH' ? 'bữa trưa' : 'bữa xế'
  const selected = editing && CHECK_DEFINITIONS.find(item => item.id === editing.id)
  const start = (id: CheckId, action: CheckAction | 'reopen') => {
    setEditing({ id, action })
    setError('')
    setNote('')
    setLateReason('')
    setEvidenceRef('')
    const previousIngredients = checks.find(item => item.id === id)?.history.filter(item => item.action === 'report').at(-1)?.ingredientReceipts
    const inspectionKind=['processing','before_serving','food_sample'].includes(id) ? id as InspectionKind : null
    const previousInspection=serverQuery.data?.checks[id]?.inspection
    setSkipSample(!!(action==='report' && id==='food_sample' && (previousInspection as {notApplicable?:boolean}|undefined)?.notApplicable))
    setSkipReason(typeof (previousInspection as {reason?:string}|undefined)?.reason==='string'?(previousInspection as {reason:string}).reason:'')
    setInspectionDraft(inspectionKind && action==='report' && contextQuery.data?.menu
      ? newInspectionDraft(contextQuery.data.menu,previousInspection) : null)
    setIngredientRows(id === 'ingredient_receipt' && action === 'report'
      ? Array.isArray(previousIngredients) && previousIngredients.length > 0
        ? previousIngredients.map(item => createIngredientRow(item.itemId, String(item.displayQuantity ?? item.quantity), item.displayUnit ?? item.unit, item.documentsStatus ?? '', item.sensoryStatus ?? '', item.storageCondition ?? '', item.handling ?? ''))
        : [createIngredientRow()]
      : [])
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    try {
      if (serverMode && (serverQuery.isLoading || contextQuery.isLoading)) throw Error('Dữ liệu giám sát chưa tải xong.')
      if (serverMode && (serverQuery.isError || contextQuery.isError)) throw Error('Không tải được dữ liệu trường và kho thực tế.')
      const ingredientReceipts = editing.id === 'ingredient_receipt' && editing.action === 'report'
        ? ingredientRows.filter(row => row.itemId).map(row => {
            const ingredient = ingredientCatalog.find(item => item.itemId === row.itemId)
            const unit = row.unit || ingredient?.unit || ''
            const quantity = Number(row.quantity)
            if (!ingredient || !receiptUnitOptions(ingredient.unit).includes(unit)) throw Error('Đơn vị nhận nguyên liệu không phù hợp với lô đã chọn.')
            const baseQuantity = convertReceiptQuantity(quantity, unit, ingredient.unit)
            if (baseQuantity === null || baseQuantity <= 0 || (serverMode && baseQuantity > (contextQuery.data?.lots.find(lot => lot.itemId === ingredient.itemId)?.quantityAvailable ?? 0) + 0.000000001)) throw Error('Số lượng thực nhận vượt số đã xuất hoặc không hợp lệ.')
            return serverMode ? { itemId: row.itemId, quantity, unit, documentsStatus:row.documentsStatus, sensoryStatus:row.sensoryStatus, storageCondition:row.storageCondition, handling:row.handling } : { itemId: row.itemId, quantity: baseQuantity }
          })
        : undefined
      if (serverMode) {
        const hasStructuredInspection=editing.action==='report' && ['processing','before_serving','food_sample'].includes(editing.id)
        if(hasStructuredInspection && (!inspectionDraft || !contextQuery.data?.menu?.dishes.length))throw Error('Chưa có thực đơn được duyệt và biểu mẫu chi tiết để kiểm thực.')
        const inspection=hasStructuredInspection?(editing.id==='food_sample' && skipSample
          ? {kind:'food_sample',notApplicable:true,reason:skipReason}
          : {...inspectionDraft!,dishes:inspectionDraft!.dishes.map(line=>({...line,servings:Number(line.servings),amount:Number(line.amount),temperature:Number(line.temperature)}))}):undefined
        await writeServerSupervision(scope,{action:editing.action==='report'?'check_report':editing.action==='confirm'?'check_confirm':editing.action==='reopen'?'check_reopen':'check_revision',itemId:editing.id,note,lateReason,evidenceRef,ingredientReceipts,inspection})
        await queryClient.invalidateQueries({queryKey:['supervision-server',scope.schoolId,scope.serviceDate,scope.mealType]})
      } else updateSupervisionStatus({ scope, id: editing.id, action: editing.action as CheckAction, role, schoolMode: school.mode, note, evidenceRef, ingredientReceipts })
      setEditing(null)
      setError('')
      setMessage(serverMode ? 'Đã lưu trạng thái giám sát cho ' + mealLabel + '.' : 'Đã cập nhật trạng thái DEMO cho ' + mealLabel + '. Chưa phải kết quả kiểm tra ATTP chính thức.')
      void queryClient.invalidateQueries({ queryKey: ['supervision-meal-day', school.id, date, mealType] })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu trạng thái. Vui lòng thử lại.')
    }
  }
  return (
    <section className="card supervision-checklist" aria-label={`Cập nhật trạng thái giám sát ${mealLabel}`}>
      <div className="card-header supervision-checklist-header">
        <div>
          <div className="section-kicker">KIỂM THỰC VÀ LƯU MẪU THEO BỮA</div>
          <h2>{serverMode && !canReport ? 'Hồ sơ kiểm thực của bếp cung cấp' : 'Trạng thái giám sát'} · {mealLabel}</h2>
          <p className="muted">{serverMode && !canReport ? 'Nhà trường chỉ xem các hồ sơ nguyên liệu, chế biến và lưu mẫu do bếp sản xuất thực hiện; không tiếp nhận nguyên liệu sống. Việc nhận món ăn thành phẩm được xác nhận tại mốc Đến trường bên dưới.' : 'Bếp tự ghi nhận kiểm thực nguyên liệu, chế biến và lưu mẫu. Nhà trường tiếp nhận món ăn thành phẩm và xem được lịch sử hồ sơ liên quan.'}</p>
        </div>
        <div className="supervision-checklist-actions">
          <span className="supervision-check-count"><ShieldCheck size={16}/>{confirmedCount}/{checks.length} đã ghi nhận</span>
          {canReport && <button type="button" className="primary" disabled={(serverMode && (serverQuery.isLoading || contextQuery.isLoading || serverQuery.isError || contextQuery.isError)) || !checks.some(item => item.status === 'not_reported' || item.status === 'revision_requested')} onClick={() => {
            const first = checks.find(item => item.status === 'not_reported' || item.status === 'revision_requested')
            if (first) start(first.id, 'report')
          }}><Pencil size={16}/>Cập nhật trạng thái</button>}
          {canConfirm && pendingCount > 0 && <button type="button" className="primary" onClick={() => {
            const first = checks.find(item => item.status === 'reported')
            if (first) start(first.id, 'confirm')
          }}><ClipboardCheck size={16}/>Xác nhận trạng thái ({pendingCount})</button>}
        </div>
      </div>
      {serverMode && contextQuery.isError && <p className="error" role="alert">Không lấy được dữ liệu kho, thực đơn theo trường và bữa từ hệ thống.</p>}
      {serverMode && contextQuery.data?.menu && <p className="muted">Thực đơn: {contextQuery.data.menu.dishes.map(dish=>dish.name).join(', ') || 'Chưa có món được duyệt'} · {contextQuery.data.menu.servings} suất dự kiến</p>}
      {serverMode && contextQuery.data && <p className="muted">Hồ sơ pháp lý bếp: {contextQuery.data.legalDocuments.length} hồ sơ · {contextQuery.data.legalDocuments.filter(doc=>doc.status==='valid').length} hồ sơ đánh dấu còn hiệu lực. Xem chi tiết tại Hồ sơ pháp lý & điều kiện bếp.</p>}
      {message && <div className="supervision-status-message" role="status"><CheckCircle2 size={16}/><span>{message}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setMessage('')}><X size={15}/></button></div>}
      <div className="supervision-check-rows">
        {CHECK_DEFINITIONS.map(def => {
          const item = checks.find(check => check.id === def.id)!
          const latest = item.history.at(-1)
          const reportedIngredients = item.history.filter(entry => entry.action === 'report').at(-1)?.ingredientReceipts
          return <article key={def.id} className="supervision-check-row">
            <div className="supervision-check-icon">{item.status === 'confirmed' ? <CheckCircle2 size={21}/> : item.status === 'revision_requested' ? <ShieldAlert size={21}/> : <FileClock size={21}/>}</div>
            <div className="supervision-check-main">
              <strong>{def.label}</strong>
              <p>{def.description}</p>
              {def.id === 'ingredient_receipt' && Array.isArray(reportedIngredients) && reportedIngredients.length > 0 && (canReport || canConfirm || serverMode) && <div className="supervision-ingredient-summary"><strong>{reportedIngredients.length} nguyên liệu đã ghi nhận</strong><span>{reportedIngredients.map(line => `${line.ingredientName}: ${(line.displayQuantity ?? line.quantity).toLocaleString('vi-VN')} ${line.displayUnit ?? line.unit}`).join(' · ')}</span></div>}
              {serverMode && ['processing','before_serving','food_sample'].includes(def.id) && Boolean(serverQuery.data?.checks[def.id]?.inspection) && <details className="sif-report-details"><summary>Xem nội dung kiểm thực đã báo cáo</summary><InspectionReadout inspection={serverQuery.data?.checks[def.id]?.inspection}/></details>}
              {latest && (canReport || canConfirm || serverMode) && <small>{latest.actorLabel} · {formatTimestamp(latest.recordedAt)} · {latest.evidenceRef ? `Tham chiếu: ${latest.evidenceRef}` : 'Không có tham chiếu'}</small>}
              {showHistory && (canReport || canConfirm || serverMode) && item.history.length > 0 && <ol className="supervision-status-history">{item.history.map(entry => <li key={entry.id}>
                  <strong>{actionLabels[entry.action]}</strong> · {entry.actorLabel} · {formatTimestamp(entry.recordedAt)} · {entry.note}
                  {serverMode && entry.action==='report' && (Boolean(entry.inspection) || !!entry.ingredientReceipts?.length) && <details className="sif-report-details">
                    <summary>Xem dữ liệu của phiên bản này</summary>
                    {Boolean(entry.inspection) && <InspectionReadout inspection={entry.inspection}/> }
                    {!!entry.ingredientReceipts?.length && <IngredientReceiptDetails lines={entry.ingredientReceipts} serviceDate={date}/>}
                    {entry.evidenceRef && <small>Tham chiếu hồ sơ: {entry.evidenceRef}</small>}
                  </details>}
                </li>)}</ol>}
            </div>
            <div className="supervision-check-controls">
              <span className={`supervision-check-pill ${item.status}`}>{item.status === 'confirmed' ? <CheckCircle2 size={13}/> : <Clock3 size={13}/>} {statusLabel(item.status)}</span>
              {canReport && (item.status === 'not_reported' || item.status === 'revision_requested') && <button className="outline" type="button" onClick={() => start(def.id, 'report')}>Cập nhật</button>}
              {serverMode && canReport && (item.status === 'confirmed' || item.status === 'reported') && <button className="outline" type="button" onClick={() => start(def.id, 'reopen')}>Mở điều chỉnh</button>}
              {canConfirm && item.status === 'reported' && <><button className="primary" type="button" onClick={() => start(def.id, 'confirm')}>Xác nhận</button><button className="outline" type="button" onClick={() => start(def.id, 'request_revision')}>Yêu cầu bổ sung</button></>}
            </div>
          </article>
        })}
      </div>
      {serverMode && serverQuery.data && <SupervisionSampleLifecycle key={scope.schoolId+'-'+date+'-'+mealType} scope={scope} data={serverQuery.data} role={role}/>}
      <div className="supervision-check-footer">
        <p><ShieldAlert size={16}/> Nhật ký tự báo cáo không thay thế hồ sơ, biên bản hoặc kết luận của cơ quan có thẩm quyền. {serverMode ? 'Dữ liệu được ghi nhận trên hệ thống.' : 'Dữ liệu DEMO chỉ lưu trên trình duyệt này.'}</p>
        {(canReport || canConfirm || serverMode) && <button type="button" className="text-button" aria-expanded={showHistory} onClick={() => setShowHistory(value => !value)}>{showHistory ? 'Ẩn lịch sử cập nhật' : 'Xem lịch sử cập nhật'}</button>}
      </div>
      {editing && selected && <div className="supervision-edit-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="supervision-edit-title" className={editing.id==='ingredient_receipt'&&editing.action==='report'?'supervision-edit-dialog supervision-intake-modal':'supervision-edit-dialog'}>
          <div className="dialog-head"><div className="supervision-edit-heading">{editing.id==='ingredient_receipt'&&editing.action==='report'&&<small>KIỂM THỰC BA BƯỚC · BƯỚC 1</small>}<h2 id="supervision-edit-title">{editing.action === 'report' ? (editing.id==='ingredient_receipt'?'Tiếp nhận nguyên liệu':'Bếp ghi nhận kiểm thực') : editing.action === 'confirm' ? 'Xác nhận trạng thái' : editing.action === 'reopen' ? 'Bếp mở điều chỉnh kiểm thực' : 'Yêu cầu bổ sung'}</h2>{editing.id==='ingredient_receipt'&&editing.action==='report'&&<p>Đối chiếu lô nguyên liệu, số lượng thực nhận, chứng từ và cảm quan.</p>}</div><button type="button" className="icon-button" aria-label="Đóng" onClick={() => setEditing(null)}><X size={20}/></button></div>
          <p className="supervision-edit-context">{school.name} · {date} · {mealLabel} · <strong>{selected.label}</strong></p>
          <form onSubmit={submit} className="supervision-edit-form">
            {editing.action === 'report' && <label className="supervision-reference-field">Mã sổ / mã mẫu / tham chiếu hồ sơ <span aria-hidden="true">*</span>
              {serverMode ? <input required maxLength={180} value={evidenceRef} onChange={event => setEvidenceRef(event.target.value)} placeholder="Nhập mã hồ sơ thực tế đã đối chiếu" /> : <Select label="Tham chiếu hồ sơ" required searchable value={evidenceRef} options={evidenceOptions} placeholder={evidenceOptions.length ? 'Tìm và chọn hồ sơ' : 'Chưa có hồ sơ phù hợp'} searchPlaceholder="Tìm theo mã, loại hồ sơ hoặc nguyên liệu…" onValueChange={setEvidenceRef}/>}
              {!serverMode && evidenceOptions.length === 0 && <small className="supervision-reference-empty">Chưa có hồ sơ thuộc đúng trường, ngày và bữa để liên kết.</small>}
            </label>}
            {editing.action !== 'report' && <p className="supervision-edit-guidance">{editing.action === 'confirm' ? 'BGH xác nhận đã đối chiếu nội dung báo cáo.' : 'Mục này chuyển sang trạng thái đang điều chỉnh. Bản cũ, lý do, người thực hiện và thời điểm vẫn được giữ trong lịch sử.'}</p>}
            {editing.id === 'ingredient_receipt' && editing.action === 'report' && <fieldset className="supervision-ingredient-fieldset">
              <legend>Nguyên liệu đã tiếp nhận <span aria-hidden="true">*</span></legend>
              <p>{serverMode ? "Chọn lô đã xuất từ kho bếp cho đúng trường, ngày và bữa. Mỗi lô chỉ được chọn một lần." : "Thêm từng dòng, tìm và chọn trong toàn bộ danh mục kho của trường. Mỗi nguyên liệu chỉ được chọn một lần."}</p>
              <div className="supervision-intake-overview"><span><strong>{ingredientRows.filter(row=>row.itemId).length}</strong> nguyên liệu đã chọn</span><span><strong>{ingredientCatalog.length}</strong> lô để đối chiếu</span></div>
               {ingredientCatalog.length === 0 ? <div className="supervision-ingredient-empty">{serverMode ? 'Chưa có lô được xuất từ kho bếp cho đúng trường, ngày và bữa này. Hãy vào Quản lý kho → Xuất kho trước.' : 'Chưa có nguyên liệu trong danh mục kho của trường. Cần cập nhật kho trước khi lập bước kiểm thực này.'}</div> : <div className="supervision-ingredient-options">
                {ingredientRows.map((row, index) => {
                  const usedIds = new Set(ingredientRows.filter(item => item.id !== row.id).map(item => item.itemId).filter(Boolean))
                  const options = ingredientCatalog.map(item => ({ value: item.itemId, label: item.ingredientName, description: `${item.lotCode} · ${item.supplierName} · ${item.supplierContact}`, tag: item.unit, disabled: usedIds.has(item.itemId) }))
                  const selectedIngredient = ingredientCatalog.find(item => item.itemId === row.itemId)
                  const expiredAtService = selectedIngredient ? selectedIngredient.expiresAt < date : false
                  return <article key={row.id} className={selectedIngredient ? 'selected' : ''}>
                    <div className="supervision-ingredient-row-head">
                      <strong>Nguyên liệu {index + 1}</strong>
                      <button type="button" aria-label={`Xóa dòng nguyên liệu ${index + 1}`} disabled={ingredientRows.length === 1} onClick={() => setIngredientRows(current => current.filter(item => item.id !== row.id))}><X size={16}/>Xóa</button>
                    </div>
                    <div className="supervision-ingredient-picker">
                       <div className="supervision-intake-subtitle"><strong>A. Chọn nguyên liệu và lô</strong><small>Thông tin lô và nhà cung cấp sẽ hiển thị tự động sau khi chọn.</small></div>
                      <label>Nguyên liệu <span aria-hidden="true">*</span>
                        <Select label={`Nguyên liệu dòng ${index + 1}`} required searchable value={row.itemId} placeholder="Tìm và chọn từ kho" searchPlaceholder="Tên, mã lô, nhà cung cấp…" options={options} onValueChange={itemId => setIngredientRows(current => current.map(item => {
                          if(item.id!==row.id)return item
                          const base=ingredientCatalog.find(ingredient=>ingredient.itemId===itemId)?.unit ?? ''
                          const issued=contextQuery.data?.lots.find(lot=>lot.itemId===itemId)?.quantityAvailable
                          return {...item,itemId,unit:serverMode?preferredReceiptUnit(base,issued):base,quantity:''}
                        }))}/>
                      </label>
                    </div>
                    {selectedIngredient && <div className="supervision-ingredient-selected">
                      <dl>
                        <div><dt>Mã lô</dt><dd>{selectedIngredient.lotCode}</dd></div>
                        <div><dt>Nhà cung cấp</dt><dd>{selectedIngredient.supplierName}</dd></div>
                        <div><dt>Người cấp / liên hệ</dt><dd>{selectedIngredient.supplierContact}</dd></div>
                        <div><dt>Hạn sử dụng</dt><dd>{formatDate(selectedIngredient.expiresAt)} <em className={expiredAtService ? 'expired' : ''}>{expiredAtService ? 'Quá hạn tại ngày bữa ăn' : 'Còn hạn tại ngày bữa ăn'}</em></dd></div>
                      </dl>
                      <div className="supervision-intake-subtitle"><strong>B. Số lượng thực nhận</strong><small>Cân hoặc kiểm đếm thực tế, không trừ kho lần hai.</small></div>
                       <div className="supervision-ingredient-quantity">
                        <label>Số lượng thực nhận <input required type="number" inputMode="decimal" min="0.000001" step="any" max={serverMode ? (convertReceiptQuantity(contextQuery.data?.lots.find(lot => lot.itemId === selectedIngredient.itemId)?.quantityAvailable ?? 0, selectedIngredient.unit, row.unit || selectedIngredient.unit) ?? undefined) : undefined} aria-label={`Số lượng ${selectedIngredient.ingredientName}`} value={row.quantity} onChange={event => setIngredientRows(current => current.map(item => item.id === row.id ? { ...item, quantity: event.target.value } : item))}/></label>
                        <label>Đơn vị
                          <select aria-label={`Đơn vị thực nhận ${selectedIngredient.ingredientName}`} value={row.unit || selectedIngredient.unit} onChange={event=>{
                            const targetUnit=event.target.value
                            setIngredientRows(current => current.map(item=>{
                              if(item.id!==row.id) return item
                              const previousUnit=item.unit || selectedIngredient.unit
                              const converted=convertReceiptQuantity(Number(item.quantity),previousUnit,targetUnit)
                              return {...item,unit:targetUnit,quantity:item.quantity&&converted!==null?String(converted):item.quantity}
                            }))
                          }}>
                            {receiptUnitOptions(selectedIngredient.unit).map(unit=><option key={unit} value={unit}>{unit}</option>)}
                          </select>
                        </label>
                      </div>
                      {serverMode && <div className="sif-intake-checks">
                         <div className="supervision-intake-subtitle sif-intake-checks__wide"><strong>C. Đánh giá chất lượng & an toàn</strong><small>Đánh giá độc lập từng lô trước khi đưa vào chế biến.</small></div>
                        <label>Điều kiện bảo quản / nhãn lô *<input required maxLength={500} value={row.storageCondition} onChange={e=>setIngredientRows(current=>current.map(item=>item.id===row.id?{...item,storageCondition:e.target.value}:item))} placeholder="Nhiệt độ / bao bì / bảo quản thực tế…"/></label>
                        {(['documentsStatus','sensoryStatus'] as const).map(key=><fieldset key={key} className="sif-choice"><legend>{key==='documentsStatus'?'Chứng từ, nguồn gốc':'Cảm quan nguyên liệu'} *</legend><div>
                          {([{value:'pass',label:'Đạt'},{value:'fail',label:'Không đạt'}] as const).map(option=><label key={option.value}><input required type="radio" name={row.id+'-'+key} value={option.value} checked={row[key]===option.value} onChange={()=>setIngredientRows(current=>current.map(item=>item.id===row.id?{...item,[key]:option.value}:item))}/>{option.label}</label>)}
                        </div></fieldset>)}
                        <label className="sif-intake-checks__wide">Xử lý / ghi chú (ghi “Không có” nếu đạt) *<textarea required rows={2} maxLength={1000} value={row.handling} onChange={e=>setIngredientRows(current=>current.map(item=>item.id===row.id?{...item,handling:e.target.value}:item))}/></label>
                        {(row.documentsStatus==='fail'||row.sensoryStatus==='fail')&&<p role="status" className="sif-warning sif-intake-checks__wide">Có chỉ tiêu Không đạt: bếp phải xử lý và ghi nhận lại, không thể coi hồ sơ là hoàn tất đạt.</p>}
                      </div>}
                      {serverMode && <small className="muted">Đã cấp cho bữa này: {(()=>{
                          const base=contextQuery.data?.lots.find(lot=>lot.itemId===selectedIngredient.itemId)?.quantityAvailable??0
                          const shown=convertReceiptQuantity(base,selectedIngredient.unit,row.unit||selectedIngredient.unit)
                          return formatReceiptQuantity(shown??base)+' '+(row.unit||selectedIngredient.unit)
                        })()}. Số liệu kho gốc: {formatReceiptQuantity(contextQuery.data?.lots.find(lot=>lot.itemId===selectedIngredient.itemId)?.quantityAvailable??0)} {selectedIngredient.unit}. Hệ thống tự quy đổi khi lưu, không trừ kho lần thứ hai.</small>}
                    </div>}
                  </article>
                })}
                <button type="button" className="supervision-add-ingredient" disabled={ingredientRows.length >= ingredientCatalog.length} onClick={() => setIngredientRows(current => [...current, createIngredientRow()])}><Plus size={16}/>Thêm dòng</button>
              </div>}
            </fieldset>}
            {editing.id === 'ingredient_receipt' && editing.action !== 'report' && (() => {
              const lines = checks.find(item => item.id === editing.id)?.history.filter(item => item.action === 'report').at(-1)?.ingredientReceipts
              return Array.isArray(lines) && lines.length > 0 ? <IngredientReceiptDetails lines={lines} serviceDate={date}/> : <p className="error" role="alert">Bản báo cáo chưa có danh sách nguyên liệu để đối chiếu.</p>
            })()}
            {serverMode && editing.action==='report' && ['processing','before_serving','food_sample'].includes(editing.id) && <>
              {editing.id==='food_sample' && contextQuery.data?.menu && contextQuery.data.menu.servings>0 && contextQuery.data.menu.servings<30 && <label className="sif-skip"> <input type="checkbox" checked={skipSample} onChange={event=>setSkipSample(event.target.checked)}/>
                Bữa ăn dưới 30 suất ({contextQuery.data.menu.servings} suất): ghi nhận không bắt buộc lưu mẫu theo Quyết định 1246/QĐ-BYT
              </label>}
              {skipSample && editing.id==='food_sample'?<label>Lý do không áp dụng lưu mẫu (1–29 suất) *
                <textarea required minLength={1} maxLength={1000} rows={3} value={skipReason} onChange={event=>setSkipReason(event.target.value)} placeholder="Ghi rõ số suất thực tế, căn cứ và người chịu trách nhiệm..."/></label>
              :contextQuery.data?.menu && inspectionDraft ? <InspectionEditor kind={editing.id as InspectionKind} menu={contextQuery.data.menu} value={inspectionDraft} onChange={setInspectionDraft}/>
              :<p role="alert" className="error">Chưa có thực đơn được duyệt cho trường, ngày và bữa này. Cần duyệt thực đơn trước khi ghi kiểm thực.</p>}
            </>}
            {serverMode && editing.action!=='report' && ['processing','before_serving','food_sample'].includes(editing.id) && <InspectionReadout inspection={serverQuery.data?.checks[editing.id]?.inspection}/>}
            {serverMode && dateKind==='past' && <label>Lý do thực hiện bổ sung cho ngày đã qua *<textarea required minLength={10} maxLength={1000} rows={3} value={lateReason} onChange={event=>setLateReason(event.target.value)} placeholder="Nêu nguyên nhân ghi nhận muộn hoặc điều chỉnh sau ngày phục vụ…"/></label>}
            <label>Ghi chú / nội dung ghi nhận <span aria-hidden="true">*</span><textarea required minLength={serverMode && editing.action==='reopen'?10:5} maxLength={1000} rows={4} value={note} onChange={event => setNote(event.target.value)} placeholder="Nhập thông tin đối chiếu hoặc nội dung cần bổ sung…" /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="supervision-edit-buttons"><button type="button" className="outline" onClick={() => setEditing(null)}>Hủy</button><button type="submit" className="primary" disabled={serverMode && editing.action==='report' && ['processing','before_serving','food_sample'].includes(editing.id) && !inspectionDraft}>{editing.action === 'report' ? 'Lưu phiếu kiểm thực' : editing.action === 'confirm' ? (serverMode ? 'Xác nhận' : 'Xác nhận DEMO') : editing.action === 'reopen' ? 'Mở điều chỉnh và lưu lịch sử' : 'Gửi yêu cầu bổ sung'}</button></div>
          </form>
        </section>
      </div>}
    </section>
  )
}
