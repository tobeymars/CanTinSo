import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, ClipboardCheck, Clock3, FileClock, Pencil, Plus, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
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

const labels: Record<CheckStatus, string> = {
  not_reported: 'Chưa cập nhật', reported: 'Chờ BGH xác nhận',
  revision_requested: 'Cần bổ sung', confirmed: 'Đã xác nhận (DEMO)',
}
const formatTimestamp = (value: string) => new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
const actionLabels: Record<CheckAction, string> = {
  report: 'Bếp báo cáo', confirm: 'BGH xác nhận', request_revision: 'BGH yêu cầu bổ sung',
}

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN')

function IngredientReceiptDetails({ lines, serviceDate }: { lines: readonly IngredientReceiptLine[]; serviceDate: string }) {
  return <div className="supervision-ingredient-snapshots" aria-label="Nguyên liệu đã ghi nhận">
    {lines.map(line => {
      const expiredAtService = line.expiresAt < serviceDate
      return <article key={line.itemId}>
        <div className="supervision-ingredient-title">
          <span><strong>{line.ingredientName}</strong><small>Lô {line.lotCode}</small></span>
          <b>{line.quantity.toLocaleString('vi-VN')} {line.unit}</b>
        </div>
        <dl>
          <div><dt>Nhà cung cấp</dt><dd>{line.supplierName}</dd></div>
          <div><dt>Người cấp / liên hệ</dt><dd>{line.supplierContact}</dd></div>
          <div><dt>Hạn sử dụng</dt><dd>{formatDate(line.expiresAt)} <em className={expiredAtService ? 'expired' : ''}>{expiredAtService ? 'Quá hạn tại ngày bữa ăn' : 'Còn hạn tại ngày bữa ăn'}</em></dd></div>
        </dl>
      </article>
    })}
  </div>
}

type Editing = { id: CheckId; action: CheckAction }
type IngredientDraftRow = { id: string; itemId: string; quantity: string }
const createIngredientRow = (itemId = '', quantity = ''): IngredientDraftRow => ({ id: crypto.randomUUID(), itemId, quantity })
export default function SupervisionStatusPanel({ school, date, mealType, role }: {
  school: School
  date: string
  mealType: SupervisionMealType
  role: ViewRole
}) {
  const scope: SupervisionScope = { schoolId: school.id, serviceDate: date, mealType }
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [note, setNote] = useState('')
  const [evidenceRef, setEvidenceRef] = useState('')
  const [ingredientRows, setIngredientRows] = useState<IngredientDraftRow[]>([])
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
  const checks = readSupervisionStatuses(scope)
  const ingredientCatalog = useMemo(() => supervisionIngredientCatalog(school.id), [school.id])
  const evidenceOptions = editing ? supervisionEvidenceCatalog(scope, editing.id) : []
  const canReport = canReportSupervision(role, school.mode)
  const canConfirm = canConfirmSupervision(role)
  const confirmedCount = checks.filter(item => item.status === 'confirmed').length
  const pendingCount = checks.filter(item => item.status === 'reported').length
  const mealLabel = mealType === 'BREAKFAST' ? 'bữa sáng' : mealType === 'LUNCH' ? 'bữa trưa' : 'bữa xế'
  const selected = editing && CHECK_DEFINITIONS.find(item => item.id === editing.id)
  const start = (id: CheckId, action: CheckAction) => {
    setEditing({ id, action })
    setError('')
    setNote('')
    setEvidenceRef('')
    const previousIngredients = checks.find(item => item.id === id)?.history.filter(item => item.action === 'report').at(-1)?.ingredientReceipts
    setIngredientRows(id === 'ingredient_receipt' && action === 'report'
      ? Array.isArray(previousIngredients) && previousIngredients.length > 0
        ? previousIngredients.map(item => createIngredientRow(item.itemId, String(item.quantity)))
        : [createIngredientRow()]
      : [])
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    try {
      const ingredientReceipts = editing.id === 'ingredient_receipt' && editing.action === 'report'
        ? ingredientRows.filter(row => row.itemId).map(row => ({ itemId: row.itemId, quantity: Number(row.quantity) }))
        : undefined
      updateSupervisionStatus({ scope, id: editing.id, action: editing.action, role, schoolMode: school.mode, note, evidenceRef, ingredientReceipts })
      setEditing(null)
      setError('')
      setMessage('Đã cập nhật trạng thái DEMO cho ' + mealLabel + '. Chưa phải kết quả kiểm tra ATTP chính thức.')
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
          <h2>Trạng thái giám sát · {mealLabel}</h2>
          <p className="muted">Cập nhật riêng theo trường, ngày và bữa. Hồ sơ bếp báo cáo chỉ chuyển sang đã xác nhận khi Ban Giám hiệu đối chiếu.</p>
        </div>
        <div className="supervision-checklist-actions">
          <span className="supervision-check-count"><ShieldCheck size={16}/>{confirmedCount}/{checks.length} đã xác nhận</span>
          {canReport && <button type="button" className="primary" disabled={!checks.some(item => item.status === 'not_reported' || item.status === 'revision_requested')} onClick={() => {
            const first = checks.find(item => item.status === 'not_reported' || item.status === 'revision_requested')
            if (first) start(first.id, 'report')
          }}><Pencil size={16}/>Cập nhật trạng thái</button>}
          {canConfirm && pendingCount > 0 && <button type="button" className="primary" onClick={() => {
            const first = checks.find(item => item.status === 'reported')
            if (first) start(first.id, 'confirm')
          }}><ClipboardCheck size={16}/>Xác nhận trạng thái ({pendingCount})</button>}
        </div>
      </div>
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
              {def.id === 'ingredient_receipt' && Array.isArray(reportedIngredients) && reportedIngredients.length > 0 && (canReport || canConfirm) && <div className="supervision-ingredient-summary"><strong>{reportedIngredients.length} nguyên liệu đã ghi nhận</strong><span>{reportedIngredients.map(line => `${line.ingredientName}: ${line.quantity.toLocaleString('vi-VN')} ${line.unit}`).join(' · ')}</span></div>}
              {latest && (canReport || canConfirm) && <small>{latest.actorLabel} · {formatTimestamp(latest.recordedAt)} · {latest.evidenceRef ? `Tham chiếu: ${latest.evidenceRef}` : 'Không có tham chiếu'}</small>}
              {showHistory && (canReport || canConfirm) && item.history.length > 0 && <ol className="supervision-status-history">{item.history.map(entry => <li key={entry.id}><strong>{actionLabels[entry.action]}</strong> · {formatTimestamp(entry.recordedAt)} · {entry.note}</li>)}</ol>}
            </div>
            <div className="supervision-check-controls">
              <span className={`supervision-check-pill ${item.status}`}>{item.status === 'confirmed' ? <CheckCircle2 size={13}/> : <Clock3 size={13}/>} {labels[item.status]}</span>
              {canReport && (item.status === 'not_reported' || item.status === 'revision_requested') && <button className="outline" type="button" onClick={() => start(def.id, 'report')}>Cập nhật</button>}
              {canConfirm && item.status === 'reported' && <><button className="primary" type="button" onClick={() => start(def.id, 'confirm')}>Xác nhận</button><button className="outline" type="button" onClick={() => start(def.id, 'request_revision')}>Yêu cầu bổ sung</button></>}
            </div>
          </article>
        })}
      </div>
      <div className="supervision-check-footer">
        <p><ShieldAlert size={16}/> Nhật ký tự báo cáo không thay thế hồ sơ, biên bản hoặc kết luận của cơ quan có thẩm quyền. Dữ liệu DEMO chỉ lưu trên trình duyệt này.</p>
        {(canReport || canConfirm) && <button type="button" className="text-button" aria-expanded={showHistory} onClick={() => setShowHistory(value => !value)}>{showHistory ? 'Ẩn lịch sử cập nhật' : 'Xem lịch sử cập nhật'}</button>}
      </div>
      {editing && selected && <div className="supervision-edit-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="supervision-edit-title" className="supervision-edit-dialog">
          <div className="dialog-head"><h2 id="supervision-edit-title">{editing.action === 'report' ? 'Cập nhật trạng thái' : editing.action === 'confirm' ? 'Xác nhận trạng thái' : 'Yêu cầu bổ sung'}</h2><button type="button" className="icon-button" aria-label="Đóng" onClick={() => setEditing(null)}><X size={20}/></button></div>
          <p className="supervision-edit-context">{school.name} · {date} · {mealLabel} · <strong>{selected.label}</strong></p>
          <form onSubmit={submit} className="supervision-edit-form">
            {editing.action === 'report' && <label>Mã sổ / mã mẫu / tham chiếu hồ sơ <span aria-hidden="true">*</span>
              <Select label="Tham chiếu hồ sơ" required searchable value={evidenceRef} options={evidenceOptions} placeholder={evidenceOptions.length ? 'Tìm và chọn hồ sơ' : 'Chưa có hồ sơ phù hợp'} searchPlaceholder="Tìm theo mã, loại hồ sơ hoặc nguyên liệu…" onValueChange={setEvidenceRef}/>
              {evidenceOptions.length === 0 && <small className="supervision-reference-empty">Chưa có hồ sơ thuộc đúng trường, ngày và bữa để liên kết.</small>}
            </label>}
            {editing.action !== 'report' && <p className="supervision-edit-guidance">{editing.action === 'confirm' ? 'BGH xác nhận đã đối chiếu bản báo cáo và hồ sơ tương ứng trong DEMO. Không phải xác nhận kiểm tra ATTP chính thức.' : 'Hồ sơ sẽ chuyển sang Cần bổ sung để bếp cập nhật lại, không xóa lịch sử cũ.'}</p>}
            {editing.id === 'ingredient_receipt' && editing.action === 'report' && <fieldset className="supervision-ingredient-fieldset">
              <legend>Nguyên liệu đã tiếp nhận <span aria-hidden="true">*</span></legend>
              <p>Thêm từng dòng, tìm và chọn trong toàn bộ danh mục kho của trường. Mỗi nguyên liệu chỉ được chọn một lần.</p>
              {ingredientCatalog.length === 0 ? <div className="supervision-ingredient-empty">Chưa có nguyên liệu trong danh mục kho của trường. Cần cập nhật kho trước khi lập bước kiểm thực này.</div> : <div className="supervision-ingredient-options">
                {ingredientRows.map((row, index) => {
                  const usedIds = new Set(ingredientRows.filter(item => item.id !== row.id).map(item => item.itemId).filter(Boolean))
                  const options = ingredientCatalog.map(item => ({ value: item.itemId, label: item.ingredientName, description: `${item.lotCode} · ${item.supplierName} · ${item.supplierContact}`, tag: item.unit, disabled: usedIds.has(item.itemId) }))
                  const selectedIngredient = ingredientCatalog.find(item => item.itemId === row.itemId)
                  const expiredAtService = selectedIngredient ? selectedIngredient.expiresAt < date : false
                  return <article key={row.id} className={selectedIngredient ? 'selected' : ''}>
                    <div className="supervision-ingredient-row-head">
                      <strong>Dòng {index + 1}</strong>
                      <button type="button" aria-label={`Xóa dòng nguyên liệu ${index + 1}`} disabled={ingredientRows.length === 1} onClick={() => setIngredientRows(current => current.filter(item => item.id !== row.id))}><X size={16}/>Xóa</button>
                    </div>
                    <div className="supervision-ingredient-picker">
                      <label>Nguyên liệu <span aria-hidden="true">*</span>
                        <Select label={`Nguyên liệu dòng ${index + 1}`} required searchable value={row.itemId} placeholder="Tìm và chọn từ kho" searchPlaceholder="Tên, mã lô, nhà cung cấp…" options={options} onValueChange={itemId => setIngredientRows(current => current.map(item => item.id === row.id ? { ...item, itemId, quantity: item.quantity || '1' } : item))}/>
                      </label>
                    </div>
                    {selectedIngredient && <div className="supervision-ingredient-selected">
                      <dl>
                        <div><dt>Mã lô</dt><dd>{selectedIngredient.lotCode}</dd></div>
                        <div><dt>Nhà cung cấp</dt><dd>{selectedIngredient.supplierName}</dd></div>
                        <div><dt>Người cấp / liên hệ</dt><dd>{selectedIngredient.supplierContact}</dd></div>
                        <div><dt>Hạn sử dụng</dt><dd>{formatDate(selectedIngredient.expiresAt)} <em className={expiredAtService ? 'expired' : ''}>{expiredAtService ? 'Quá hạn tại ngày bữa ăn' : 'Còn hạn tại ngày bữa ăn'}</em></dd></div>
                      </dl>
                      <label>Số lượng thực nhận ({selectedIngredient.unit}) <input required type="number" inputMode="decimal" min="0.001" max="5000" step="0.001" aria-label={`Số lượng ${selectedIngredient.ingredientName}`} value={row.quantity} onChange={event => setIngredientRows(current => current.map(item => item.id === row.id ? { ...item, quantity: event.target.value } : item))}/></label>
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
            <label>Ghi chú / nội dung ghi nhận <span aria-hidden="true">*</span><textarea required minLength={5} maxLength={1000} rows={4} value={note} onChange={event => setNote(event.target.value)} placeholder="Nhập thông tin đối chiếu hoặc nội dung cần bổ sung…" /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="supervision-edit-buttons"><button type="button" className="outline" onClick={() => setEditing(null)}>Hủy</button><button type="submit" className="primary">{editing.action === 'report' ? 'Lưu và gửi BGH xác nhận' : editing.action === 'confirm' ? 'Xác nhận DEMO' : 'Gửi yêu cầu bổ sung'}</button></div>
          </form>
        </section>
      </div>}
    </section>
  )
}
