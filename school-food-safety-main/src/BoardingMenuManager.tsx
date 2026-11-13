import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Apple, Building2, CalendarDays, Check, CheckCircle2, ChefHat, ChevronLeft, ChevronRight, CircleHelp, Coffee, Eye, RefreshCw, Plus, Trash2, Utensils, X, Sparkles, Send, ShieldCheck, RotateCcw }  from 'lucide-react'
import ClickSpark from './components/react-bits/ClickSpark'
import CountUp from './components/react-bits/CountUp'
import SpotlightCard from './components/react-bits/SpotlightCard'
import Select from './components/ui/Select'
import type { DayData, School } from './lib/data'
import { useUI } from './lib/store'
import { compressDishPhoto, dishImage } from './lib/dishImages'
import { addDays, approvedDishHighlights, boardingMenuRepository, BOARDING_MENU_STORAGE_KEY, defaultMealDish, maxDishesPerMeal, parentMealChoiceRepository, PARENT_MEAL_CHOICES_KEY, PARENT_MEAL_CHOICES_EVENT, dishTemplates, gradeOptions, kitchenDirectoryRepository, mealTypeOptions, gradeForSchool, mondayOfWeek, parseIsoDate, serviceModeOptions, weekFromMonday } from './lib/boardingMenu'
import type { BoardingDish, BoardingMealType, DishIngredientRecord, GradeLevel, KitchenProfile, MealServiceMode } from './lib/boardingMenu'
import DishDetailDialog from './DishDetailDialog'
import DishMealCard from './DishMealCard'
import { kitchenDishProposalsRepository } from './lib/boardingMenu'
import type { KitchenDishProposal } from './lib/boardingMenu'
import { publicTraceLots } from './lib/data'
import { AGE_BANDS, AGE_BAND_LABEL, ageBandsForGrade, defaultAgeBandForGrade } from './lib/schoolNutrition'
import type { SchoolAgeBand } from './lib/schoolNutrition'
import NutritionAIReview from './NutritionAIReview'
import './DishMealCard.css'
import './BoardingMenuManager.css'

export type BoardingMenuManagementScope = MealServiceMode | 'ALL'
export type PublicBoardingMenuEntry = { date: string; data: Pick<DayData, 'dishes' | 'servings'> & Partial<Pick<DayData, 'dishDetails' | 'events' | 'publicInspection'>> }

type EditorDraft = {
  mealType: BoardingMealType
  ageBand: SchoolAgeBand
  scope: 'DAY' | 'WEEK' | 'SELECTED'
  selectedDates: string[]
  serviceMode: MealServiceMode
  preparationKitchenId: string
  templateId: string
  name: string
  imageUrl: string
  ingredients: string
  portionWeightGrams: string
  ingredientRecords: Array<Omit<DishIngredientRecord, 'amountPerServing'> & { amountPerServing: string }>
  safetyThreeStep: 'NOT_RECORDED' | 'REPORTED'
  safetyRetainedSample: 'NOT_RECORDED' | 'REPORTED'
  safetySupervisor: string
  safetyRecordedAt: string
  safetyNote: string
  description: string
  priority: string
  expectedQuantity: string
}
type EditorErrors = Partial<Record<'name' | 'priority' | 'expectedQuantity' | 'portionWeightGrams' | 'ingredientRecords' | 'scope' | 'kitchen' | 'form', string>>
type EditorTarget = { date: string; mealType: BoardingMealType; initialScope?: EditorDraft['scope']; item?: BoardingDish }
type KitchenDraft = Pick<KitchenProfile, 'code' | 'name' | 'type' | 'managerName' | 'capacity' | 'active'>
type ParentChoiceTarget = { date: string; mealType: BoardingMealType }
type BoardOptionsTarget = ParentChoiceTarget | 'ALL'
type ReviewAction = 'APPROVED' | 'REJECTED'
type ReviewTarget =
  | { scope: 'DISH'; dishId: string; action: ReviewAction }
  | { scope: 'MEAL'; date: string; mealType: BoardingMealType; action: ReviewAction }
  | { scope: 'WEEK'; action: 'APPROVED' }

const mealIcons: Record<BoardingMealType, typeof Utensils> = { BREAKFAST: Coffee, LUNCH: Utensils, SNACK: Apple }
const weekdayShort = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const todayIso = () => new Date().toLocaleDateString('sv-SE')
const relativeDayClass = (day: string, today: string) => day === today ? 'day-current' : day < today ? 'day-past' : 'day-future'
const relativeDayLabel = (day: string, today: string) => day === today ? 'Hôm nay' : day < today ? 'Đã qua' : 'Sắp tới'
const dateLabel = (value: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) => parseIsoDate(value).toLocaleDateString('vi-VN', options)
const mealLabel = (value: BoardingMealType) => mealTypeOptions.find(option => option.value === value)?.label ?? value
const serviceModeLabel = (value: MealServiceMode) => serviceModeOptions.find(option => option.value === value)?.label ?? value
const blankIngredient = (name: string): EditorDraft['ingredientRecords'][number] => ({ name, amountPerServing: '', unit: 'g', supplier: '', lotCode: '', origin: '' })
const syncIngredients = (raw: string, current: EditorDraft['ingredientRecords']) => raw.split(',').map(name => name.trim()).filter(Boolean).map(name => current.find(item => item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')) ?? blankIngredient(name))
const toIngredientDraft = (records: DishIngredientRecord[]): EditorDraft['ingredientRecords'] => records.map(item => ({ ...item, amountPerServing: item.amountPerServing == null ? '' : String(item.amountPerServing) }))

function Modal({ label, children, requestClose, wide = false }: { label: string; children: ReactNode; requestClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} className={`boarding-dialog ${wide ? 'wide' : ''}`} aria-label={label} onCancel={event => { event.preventDefault(); requestClose() }} onClick={event => { if (event.target === event.currentTarget) requestClose() }}>{children}</dialog>
}

function KitchenEditor({ item, lockedType, school, onClose, onSave }: { item?: KitchenProfile; lockedType?: MealServiceMode; school: School; onClose: () => void; onSave: (draft: KitchenDraft) => boolean }) {
  const [draft, setDraft] = useState<KitchenDraft>({ code: item?.code ?? '', name: item?.name ?? '', type: item?.type ?? lockedType ?? 'ON_SITE', managerName: item?.managerName ?? '', capacity: item?.capacity ?? 500, active: item?.active ?? true })
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.code.trim() || !draft.name.trim() || !draft.managerName.trim()) { setError('Vui lòng nhập đủ mã bếp, tên bếp và người phụ trách.'); return }
    if (!Number.isInteger(Number(draft.capacity)) || Number(draft.capacity) < 1) { setError('Công suất phải là số nguyên lớn hơn 0.'); return }
    if (onSave({ ...draft, capacity: Number(draft.capacity), code: draft.code.trim().toLocaleUpperCase('vi'), name: draft.name.trim(), managerName: draft.managerName.trim() })) onClose()
  }
  return <Modal label={item ? 'Chỉnh sửa thông tin bếp' : 'Thêm đơn vị bếp'} requestClose={onClose}>
    <form className="kitchen-editor" onSubmit={submit}>
      <header className="meal-editor-head"><div><span className="meal-editor-context">{school.name} · DỮ LIỆU MINH HỌA</span><h2>{item ? 'Chỉnh sửa thông tin bếp' : 'Thêm đơn vị bếp'}</h2></div><button type="button" className="icon-button" aria-label="Đóng" onClick={onClose}><X /></button></header>
      <div className="kitchen-editor-body">
        <label className="meal-field">Mô hình bếp<Select label="Mô hình bếp" disabled={!!item || !!lockedType} value={draft.type} onValueChange={value => setDraft(current => ({ ...current, type: value as MealServiceMode }))} options={serviceModeOptions.map(({ value, label }) => ({ value, label }))} /></label>
        <div className="meal-form-grid"><label className="meal-field">Mã bếp <span aria-hidden="true">*</span><input autoFocus maxLength={30} value={draft.code} onChange={event => setDraft(current => ({ ...current, code: event.target.value }))} placeholder="Ví dụ: BTT-002" /></label><label className="meal-field">Công suất/ngày <span aria-hidden="true">*</span><div className="number-suffix"><input type="number" min="1" max="100000" step="1" value={draft.capacity} onChange={event => setDraft(current => ({ ...current, capacity: Number(event.target.value) }))} /><span>suất</span></div></label></div>
        <label className="meal-field">Tên bếp <span aria-hidden="true">*</span><input maxLength={120} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Nhập tên đơn vị chuẩn bị" /></label>
        <label className="meal-field">Người phụ trách <span aria-hidden="true">*</span><input maxLength={100} value={draft.managerName} onChange={event => setDraft(current => ({ ...current, managerName: event.target.value }))} placeholder="Nhập họ tên người phụ trách" /></label>
        <label className="kitchen-active-toggle"><input type="checkbox" checked={draft.active} onChange={event => setDraft(current => ({ ...current, active: event.target.checked }))} /><span><strong>Đang hoạt động</strong><small>Bếp đang hoạt động mới được chọn khi lập thực đơn.</small></span></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="demo-note">Bếp mới được gắn với {school.name}. Thay đổi chỉ lưu trên trình duyệt DEMO và chưa thay thế hồ sơ pháp lý của đơn vị.</p>
      </div>
      <footer className="meal-editor-footer"><span>Thông tin bếp không phải kết quả xác minh điều kiện an toàn thực phẩm.</span><div><button type="button" className="outline" onClick={onClose}>Hủy</button><button className="primary">{item ? 'Lưu thay đổi' : 'Thêm bếp'}</button></div></footer>
    </form>
  </Modal>
}

function MealEditor({ target, week, items, kitchens, managementScope, kitchenProposals, ageBand, gradeLevel, onClose, onSave }: { target: EditorTarget; week: string[]; items: BoardingDish[]; kitchens: KitchenProfile[]; managementScope: BoardingMenuManagementScope; kitchenProposals: KitchenDishProposal[]; ageBand: SchoolAgeBand; gradeLevel: GradeLevel; onClose: () => void; onSave: (draft: EditorDraft) => Promise<boolean> }) {
  const initialMode = target.item?.serviceMode ?? (managementScope === 'ALL' ? kitchens[0]?.type ?? 'CENTRAL_KITCHEN' : managementScope)
  const kitchenChoices = (mode: MealServiceMode) => kitchens.filter(kitchen => kitchen.active && kitchen.type === mode)
  const isInlineAdd = false // Mở đầy đủ form định lượng khi bếp thêm món (không ép chọn mẫu).
  const [draft, setDraft] = useState<EditorDraft>(() => ({
    mealType: target.mealType, ageBand: target.item?.ageBand ?? ageBand, scope: target.initialScope ?? 'DAY', selectedDates: [target.date], serviceMode: initialMode,
    preparationKitchenId: target.item?.preparationKitchenId ?? kitchenChoices(initialMode)[0]?.id ?? '', templateId: '', name: target.item?.name ?? '', imageUrl: target.item?.imageUrl ?? '', ingredients: target.item?.ingredients.join(', ') ?? '',
    ingredientRecords: toIngredientDraft(target.item?.ingredientRecords ?? target.item?.ingredients.map(blankIngredient).map(row => ({ ...row, amountPerServing: null })) ?? []),
    portionWeightGrams: target.item?.portionWeightGrams == null ? '' : String(target.item.portionWeightGrams),
    safetyThreeStep: target.item?.safetyMonitoring?.threeStep ?? 'NOT_RECORDED',
    safetyRetainedSample: target.item?.safetyMonitoring?.retainedSample ?? 'NOT_RECORDED',
    safetySupervisor: target.item?.safetyMonitoring?.supervisor ?? '',
    safetyRecordedAt: target.item?.safetyMonitoring?.recordedAt ? target.item.safetyMonitoring.recordedAt.slice(0, 16) : '',
    safetyNote: target.item?.safetyMonitoring?.note ?? '',
    description: target.item?.description ?? '', priority: String(target.item?.priority ?? 1), expectedQuantity: String(target.item?.expectedQuantity ?? 485),
  }))
  const [errors, setErrors] = useState<EditorErrors>({})
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [initial] = useState(() => JSON.stringify(draft))
  const dirty = JSON.stringify(draft) !== initial
  const update = <K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) => setDraft(current => ({ ...current, [key]: value }))
  const requestClose = () => { if (!dirty || window.confirm('Bạn có thay đổi chưa lưu. Đóng mà không lưu?')) onClose() }
  const applyTemplate = (templateId: string) => {
    const proposal = kitchenProposals.find(item => `kitchen:${item.id}` === templateId)
    if (proposal) { setDraft(current => ({ ...current, templateId, name: proposal.name, description: proposal.description, ingredients: proposal.ingredientRecords.map(r => r.name).join(', '), ingredientRecords: toIngredientDraft(proposal.ingredientRecords), portionWeightGrams: String(proposal.portionWeightGrams), imageUrl: proposal.imageUrl ?? '', mealType: target.mealType, preparationKitchenId: proposal.kitchenId, serviceMode: kitchens.find(k => k.id === proposal.kitchenId)?.type ?? current.serviceMode, expectedQuantity: String(proposal.expectedQuantity), safetyThreeStep: proposal.safetyMonitoring.threeStep, safetyRetainedSample: proposal.safetyMonitoring.retainedSample, safetySupervisor: proposal.safetyMonitoring.supervisor, safetyRecordedAt: proposal.safetyMonitoring.recordedAt ? proposal.safetyMonitoring.recordedAt.slice(0,16) : '', safetyNote: proposal.safetyMonitoring.note })) ; return }
    const template = dishTemplates.find(item => item.id === templateId)
    setDraft(current => ({ ...current, templateId, ...(template ? { name: template.name, ingredients: template.ingredients.join(', '), ingredientRecords: syncIngredients(template.ingredients.join(', '), current.ingredientRecords), description: template.description, imageUrl: '' } : {}) }))
  }
  const changeIngredients = (value: string) => setDraft(current => ({ ...current, ingredients: value, ingredientRecords: syncIngredients(value, current.ingredientRecords) }))
  const updateIngredient = (index: number, field: keyof EditorDraft['ingredientRecords'][number], value: string) => setDraft(current => ({ ...current, ingredientRecords: current.ingredientRecords.map((item, row) => row === index ? { ...item, [field]: value } : item) }))
  const uploadPhoto = async (file: File) => {
    setPhotoError('')
    setPhotoBusy(true)
    try { update('imageUrl', await compressDishPhoto(file)) }
    catch (error) { setPhotoError(error instanceof Error ? error.message : 'Không thể tải ảnh minh họa.') }
    finally { setPhotoBusy(false) }
  }
  const changeServiceMode = (serviceMode: MealServiceMode) => setDraft(current => ({ ...current, serviceMode, preparationKitchenId: kitchenChoices(serviceMode)[0]?.id ?? '' }))
  const toggleDate = (value: string) => update('selectedDates', draft.selectedDates.includes(value) ? draft.selectedDates.filter(date => date !== value) : [...draft.selectedDates, value])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (photoBusy) return
    const nextErrors: EditorErrors = {}
    if (!draft.name.trim()) nextErrors.name = isInlineAdd ? 'Vui lòng chọn món.' : 'Vui lòng nhập tên món.'
    if (!draft.preparationKitchenId || !kitchenChoices(draft.serviceMode).some(kitchen => kitchen.id === draft.preparationKitchenId)) nextErrors.kitchen = 'Chọn một bếp đang hoạt động và được gắn với trường.'
    if (!draft.priority.trim() || Number(draft.priority) < 0 || !Number.isInteger(Number(draft.priority))) nextErrors.priority = 'Thứ tự phải là số nguyên không âm.'
    if (!draft.expectedQuantity.trim() || Number(draft.expectedQuantity) < 0 || !Number.isInteger(Number(draft.expectedQuantity))) nextErrors.expectedQuantity = 'Số lượng phải là số nguyên không âm.'
    if (draft.portionWeightGrams.trim() && (!Number.isFinite(Number(draft.portionWeightGrams)) || Number(draft.portionWeightGrams) <= 0)) nextErrors.portionWeightGrams = 'Định lượng mỗi suất phải là số dương.'
    if (draft.ingredientRecords.some(item => item.amountPerServing.trim() && (!Number.isFinite(Number(item.amountPerServing)) || Number(item.amountPerServing) <= 0))) nextErrors.ingredientRecords = 'Định lượng từng nguyên liệu phải là số dương hoặc để trống.'
    if (draft.scope === 'SELECTED' && !draft.selectedDates.length) nextErrors.scope = 'Chọn ít nhất một ngày áp dụng.'
    const targetDates = draft.scope === 'DAY' ? [target.date] : draft.scope === 'WEEK' ? week : draft.selectedDates
    for (const date of targetDates) {
      const existing = items.filter(item => item.serviceDate === date && item.mealType === draft.mealType && item.ageBand === draft.ageBand && item.id !== target.item?.id)
      if (existing.length >= maxDishesPerMeal(draft.mealType)) nextErrors.form = `${mealLabel(draft.mealType)} ngày ${dateLabel(date)} đã đủ ${maxDishesPerMeal(draft.mealType)} món.`
      if (existing.some(item => item.name.trim().toLocaleLowerCase('vi') === draft.name.trim().toLocaleLowerCase('vi'))) nextErrors.form = `Món “${draft.name.trim()}” đã có trong ${mealLabel(draft.mealType).toLocaleLowerCase('vi')} ngày ${dateLabel(date)}.`
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    const saved = await onSave(draft)
    setSaving(false)
    if (!saved) setErrors({ form: 'Không thể lưu trên trình duyệt. Vui lòng thử lại.' })
  }
  const availableKitchens = kitchenChoices(draft.serviceMode)
  const dialogTitle = target.item ? 'Chỉnh sửa món bán trú' : target.initialScope === 'WEEK' ? 'Lên thực đơn tuần' : target.initialScope === 'DAY' ? 'Lên thực đơn ngày' : 'Thêm món bán trú'
  return <Modal wide label={target.item ? 'Chỉnh sửa món bán trú' : dialogTitle} requestClose={requestClose}>
    <form className="meal-editor" onSubmit={submit}>
      <header className="meal-editor-head"><div><span className="meal-editor-context">{dateLabel(target.date, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} · {mealLabel(target.mealType)}</span><h2>{dialogTitle}</h2></div><button type="button" className="icon-button" aria-label="Đóng" onClick={requestClose}><X /></button></header>
      <div className="meal-editor-body">
        <div className="meal-form-column">
          <div className="meal-form-grid"><label className="meal-field">Nhóm tuổi<Select label="Nhóm tuổi" value={draft.ageBand} disabled={!!target.item} onValueChange={value => update('ageBand', value as SchoolAgeBand)} options={AGE_BANDS.filter(item => ageBandsForGrade(gradeLevel).includes(item.id) || item.id === ageBand).map(item=>({value:item.id,label:item.label}))} /></label></div><div className="meal-form-grid"><label className="meal-field">Bữa ăn<Select label="Bữa ăn" value={draft.mealType} disabled={!!target.item} onValueChange={value => update('mealType', value as BoardingMealType)} options={mealTypeOptions} /></label><label className="meal-field">Phạm vi áp dụng<Select label="Phạm vi áp dụng" value={draft.scope} disabled={!!target.item} onValueChange={value => update('scope', value as EditorDraft['scope'])} options={[{ value: 'DAY', label: 'Chỉ ngày đang chọn' }, { value: 'WEEK', label: 'Cả tuần đang chọn' }, { value: 'SELECTED', label: 'Các ngày được chọn' }]} /></label></div>
          {!target.item && draft.scope === 'SELECTED' && <fieldset className="meal-day-choices"><legend>Ngày áp dụng</legend>{week.map((date, index) => <label key={date}><input type="checkbox" checked={draft.selectedDates.includes(date)} onChange={() => toggleDate(date)} /><span>{weekdayShort[index]}<small>{dateLabel(date, { day: '2-digit', month: '2-digit' })}</small></span></label>)}</fieldset>}
          {errors.scope && <p className="field-error">{errors.scope}</p>}
          {!isInlineAdd && <fieldset className="kitchen-assignment"><legend>Đơn vị chuẩn bị cho bữa ăn</legend><div className="meal-form-grid"><label className="meal-field">Mô hình phục vụ<Select label="Mô hình phục vụ" disabled={managementScope !== 'ALL' || !!target.item} value={draft.serviceMode} onValueChange={value => changeServiceMode(value as MealServiceMode)} options={serviceModeOptions.filter(option => managementScope === 'ALL' || option.value === managementScope).map(({ value, label }) => ({ value, label }))} /></label><label className="meal-field">Bếp chuẩn bị <span aria-hidden="true">*</span><Select label="Bếp chuẩn bị" value={draft.preparationKitchenId} onValueChange={value => update('preparationKitchenId', value)} options={availableKitchens.map(kitchen => ({ value: kitchen.id, label: `${kitchen.code} · ${kitchen.name}` }))} /></label></div>{!availableKitchens.length && <p className="field-error">Chưa có bếp {serviceModeLabel(draft.serviceMode).toLocaleLowerCase('vi')} đang hoạt động cho trường này. Hãy thêm bếp trước khi lập thực đơn.</p>}{errors.kitchen && <p className="field-error">{errors.kitchen}</p>}</fieldset>}
          <label className="meal-field">Chọn nhanh món ăn mẫu<Select label="Chọn nhanh món ăn mẫu" value={draft.templateId} onValueChange={applyTemplate} options={[{ value: '', label: isInlineAdd ? 'Chọn món ăn' : 'Tự nhập món mới' }, ...dishTemplates.map(item => ({ value: item.id, label: item.name })), ...kitchenProposals.filter(item=>item.mealType===target.mealType && item.gradeLevel===gradeLevel && (item.ageBand ?? ageBand)===draft.ageBand).map(item=>({ value: `kitchen:${item.id}`, label: `Bếp đề xuất: ${item.name}${item.ingredientRecords.some(row=>!row.inventoryItemId)?' · Chưa đối chiếu đủ lô':''}` }))]} />{isInlineAdd && errors.name && <small className="field-error">{errors.name}</small>}</label>
          {!isInlineAdd && <><label className="meal-field">Tên món <span aria-hidden="true">*</span><input autoFocus value={draft.name} onChange={event => update('name', event.target.value)} maxLength={120} placeholder="Nhập tên món ăn" aria-invalid={!!errors.name} />{errors.name && <small className="field-error">{errors.name}</small>}</label>
          <label className="meal-field">Thành phần<textarea value={draft.ingredients} onChange={event => changeIngredients(event.target.value)} maxLength={500} placeholder="Ví dụ: Cơm trắng, thịt heo, rau luộc" /></label>
          <label className="meal-field">Mô tả<textarea value={draft.description} onChange={event => update('description', event.target.value)} maxLength={500} placeholder="Mô tả ngắn để phụ huynh xem chi tiết món" /></label>
          <fieldset className="dish-extra-editor"><legend>Định lượng & truy xuất nguồn gốc</legend>
            <p>Bếp nhập định lượng <strong>dự kiến</strong> và thông tin nguyên liệu <strong>đã đối chiếu hồ sơ</strong>. Không dùng thông tin mẫu để xác nhận nguồn gốc thật.</p>
            <label className="meal-field">Tổng khối lượng một khẩu phần (g)
              <input type="number" min="0.01" step="any" placeholder="Chưa cập nhật" value={draft.portionWeightGrams} onChange={event => update('portionWeightGrams', event.target.value)} />
            </label>
            {errors.portionWeightGrams && <small className="field-error">{errors.portionWeightGrams}</small>}
            {draft.ingredientRecords.length ? draft.ingredientRecords.map((item, index) => <div className="ingredient-editor-row" key={`${item.name}-${index}`}><strong>{item.name}</strong>
              <div className="meal-form-grid"><label className="meal-field">Định lượng / suất
                <input type="number" min="0.01" step="any" placeholder="Chưa có" value={item.amountPerServing} onChange={event => updateIngredient(index, 'amountPerServing', event.target.value)} />
              </label><label className="meal-field">Đơn vị
                <Select label={`Đơn vị ${item.name}`} value={item.unit} onValueChange={value => updateIngredient(index, 'unit', value)} options={[{ value: 'g', label: 'g (gam)' }, { value: 'ml', label: 'ml (mililit)' }]} />
              </label></div>
              <label className="meal-field">Nhà cung cấp<input maxLength={120} value={item.supplier} onChange={event => updateIngredient(index, 'supplier', event.target.value)} placeholder="Theo phiếu nhập nguyên liệu" /></label>
              <div className="meal-form-grid"><label className="meal-field">Mã lô / phiếu nhập<input maxLength={100} value={item.lotCode} onChange={event => updateIngredient(index, 'lotCode', event.target.value)} placeholder="Chưa có mã lô" /></label>
                <label className="meal-field">Nơi sản xuất / xuất xứ<input maxLength={160} value={item.origin} onChange={event => updateIngredient(index, 'origin', event.target.value)} placeholder="Theo hồ sơ nguồn gốc" /></label></div>
            </div>) : <p className="dish-editor-empty">Nhập thành phần (phân cách bằng dấu phẩy) để bổ sung định lượng và thông tin lô.</p>}
            {errors.ingredientRecords && <small className="field-error">{errors.ingredientRecords}</small>}
          </fieldset>
          <fieldset className="dish-extra-editor"><legend>Nhật ký giám sát an toàn</legend><p>Thông tin chỉ là <strong>khai báo nội bộ</strong>, không đồng nghĩa kết luận món ăn đạt ATTP. Để trống nếu chưa ghi nhận.</p>
            <div className="meal-form-grid"><label className="meal-field">Kiểm thực ba bước
              <Select label="Kiểm thực ba bước" value={draft.safetyThreeStep} onValueChange={value => update('safetyThreeStep', value as EditorDraft['safetyThreeStep'])} options={[{ value: 'NOT_RECORDED', label: 'Chưa ghi nhận' }, { value: 'REPORTED', label: 'Đã ghi nhận nội bộ' }]} />
            </label><label className="meal-field">Lưu mẫu thức ăn
              <Select label="Lưu mẫu thức ăn" value={draft.safetyRetainedSample} onValueChange={value => update('safetyRetainedSample', value as EditorDraft['safetyRetainedSample'])} options={[{ value: 'NOT_RECORDED', label: 'Chưa ghi nhận' }, { value: 'REPORTED', label: 'Đã ghi nhận nội bộ' }]} />
            </label></div>
            <div className="meal-form-grid"><label className="meal-field">Người ghi nhận<input value={draft.safetySupervisor} maxLength={100} onChange={event => update('safetySupervisor', event.target.value)} placeholder="Họ tên nhân sự" /></label>
              <label className="meal-field">Thời điểm ghi nhận<input type="datetime-local" value={draft.safetyRecordedAt} onChange={event => update('safetyRecordedAt', event.target.value)} /></label></div>
            <label className="meal-field">Ghi chú nhật ký<textarea maxLength={500} value={draft.safetyNote} onChange={event => update('safetyNote', event.target.value)} placeholder="Thông tin giám sát đã được ghi nhận; chưa thay thế biên bản chính thức" /></label>
          </fieldset>
          </>}
          <div className="meal-photo-field"><div className="meal-photo-field-head"><div><strong>Ảnh minh họa món ăn</strong><small>Hiển thị tại lịch tuần và chế độ xem của mọi vai trò</small></div><label className="outline meal-upload-button">{photoBusy ? 'Đang xử lý…' : 'Tải ảnh món ăn'}<input aria-label="Tải ảnh minh họa món ăn" type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void uploadPhoto(file); event.currentTarget.value = '' }} /></label></div><img src={dishImage(draft.name, draft.mealType, draft.imageUrl)} alt={`Ảnh minh họa ${draft.name || 'món ăn'}`} /><div className="meal-photo-field-bottom"><span>{draft.imageUrl ? 'Ảnh do bếp cung cấp (DEMO)' : 'Ảnh minh họa mặc định'}</span>{!!draft.imageUrl && <button type="button" className="text-button" onClick={() => update('imageUrl', '')}>Dùng ảnh mặc định</button>}</div>{photoError && <p className="field-error" role="alert">{photoError}</p>}<small>Ảnh JPG/PNG/WebP tối đa 5 MB; tự nén và lưu cục bộ. Ảnh minh họa không phải bằng chứng bữa ăn thực tế.</small></div>
          {!isInlineAdd && <div className="meal-form-grid"><label className="meal-field">Thứ tự ưu tiên<input type="number" min="0" step="1" value={draft.priority} onChange={event => update('priority', event.target.value)} aria-invalid={!!errors.priority} />{errors.priority && <small className="field-error">{errors.priority}</small>}</label><label className="meal-field">Số lượng dự kiến<div className="number-suffix"><input type="number" min="0" step="1" value={draft.expectedQuantity} onChange={event => update('expectedQuantity', event.target.value)} aria-invalid={!!errors.expectedQuantity} /><span>suất</span></div>{errors.expectedQuantity && <small className="field-error">{errors.expectedQuantity}</small>}</label></div>}
          {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
        </div>
        <aside className="parent-preview" aria-live="polite"><span className="preview-label"><Eye size={15} /> Xem trước bên phụ huynh</span><div className="preview-phone"><div className="preview-phone-top"><span>{mealLabel(draft.mealType)}</span><small>{dateLabel(target.date)}</small></div><article><img className="preview-dish-photo" src={dishImage(draft.name, draft.mealType, draft.imageUrl)} alt={`Ảnh minh họa ${draft.name || 'món ăn'}`} /><span className="preview-order">{serviceModeLabel(draft.serviceMode)} · Bản nháp</span><h3>{draft.name.trim() || 'Tên món ăn sẽ hiển thị tại đây'}</h3><p>{draft.description.trim() || 'Mô tả ngắn dành cho phụ huynh sẽ xuất hiện ở khu vực này.'}</p><div className="preview-ingredients">{draft.ingredients.split(',').map(value => value.trim()).filter(Boolean).map(value => <span key={value}>{value}</span>)}{!draft.ingredients.trim() && <span>Thành phần đang cập nhật</span>}</div><footer><Utensils size={15} /> {Number(draft.expectedQuantity || 0).toLocaleString('vi-VN')} suất dự kiến · DEMO</footer></article></div><p>Bản nháp chưa được hiển thị như nội dung đã xác nhận hoặc công khai chính thức.</p></aside>
      </div>
      <footer className="meal-editor-footer"><span>{target.item ? 'Chỉnh sửa tạo phiên bản mới cho món trong dữ liệu DEMO.' : draft.scope === 'WEEK' ? 'Mẫu món được thêm vào 7 ngày; có thể chỉnh riêng từng ngày sau khi lưu.' : draft.scope === 'SELECTED' ? `Món sẽ được thêm vào ${draft.selectedDates.length} ngày đã chọn.` : 'Món chỉ được thêm vào ngày đang chọn.'}</span><div><button type="button" className="outline" onClick={requestClose}>Hủy</button><button className="primary" disabled={saving || photoBusy || !availableKitchens.length}>{saving ? 'Đang lưu…' : target.initialScope ? 'Lưu bản nháp' : 'Lưu món'}</button></div></footer>
    </form>
  </Modal>
}

export default function BoardingMenuManager({ school, selectedDate, managementScope = 'ALL', readOnly = false, publicView = false, publicEntries = [], onSelectDate }: { school: School; selectedDate: string; managementScope?: BoardingMenuManagementScope; readOnly?: boolean; publicView?: boolean; publicEntries?: PublicBoardingMenuEntry[]; onSelectDate?: (date: string) => void }) {
  const role = useUI(state => state.role)
  // Quyền lập lịch thuộc bếp; BGH chỉ duyệt. Đây là guard DEMO ở UI.
  const isKitchen = role === 'central_kitchen' || role === 'school_kitchen'
  const canApprove = role === 'school_board' && !publicView
  const locked = readOnly || publicView || !isKitchen
  // Mọi vai trò đọc đúng một repository, không ghép lại thực đơn từ fixture khác.
  const initialLoad = useMemo(() => {
    try { return { items: boardingMenuRepository.load(), kitchens: kitchenDirectoryRepository.load(), error: '' } }
    catch (caught) { return { items: [] as BoardingDish[], kitchens: [] as KitchenProfile[], error: caught instanceof Error ? caught.message : 'Không đọc được dữ liệu DEMO.' } }
  }, [])
  const [items, setItems] = useState(initialLoad.items)
  const [kitchens, setKitchens] = useState(initialLoad.kitchens)
  const [loadError, setLoadError] = useState(initialLoad.error)
  const [grade, setGrade] = useState<GradeLevel>(() => gradeForSchool(school.id))
  const [ageBand, setAgeBand] = useState<SchoolAgeBand>(() => defaultAgeBandForGrade(gradeForSchool(school.id)))
  const [aiDish, setAiDish] = useState<BoardingDish | null>(null)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false)
  const [monday, setMonday] = useState(mondayOfWeek(selectedDate))
  const [year, setYear] = useState(String(parseIsoDate(selectedDate).getFullYear()))
  const [month, setMonth] = useState(String(parseIsoDate(selectedDate).getMonth() + 1))
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const [kitchenEditor, setKitchenEditor] = useState<KitchenProfile | 'new' | null>(null)
  const [previewDate, setPreviewDate] = useState<string | null>(null)
  const [deleteItem, setDeleteItem] = useState<BoardingDish | null>(null)
  const [selectedDish, setSelectedDish] = useState<BoardingDish | null>(null)
  const [parentChoiceTarget, setParentChoiceTarget] = useState<ParentChoiceTarget | null>(null)
  // Bản công khai liệt kê đủ các món được duyệt, có thể mở rộng thành từng card.
  const [expandedPublicMenu, setExpandedPublicMenu] = useState(false)
  // BGH chỉ xem món mặc định trên lịch; toàn bộ món khác xuất hiện trong hộp thoại.
  // Không lọc nhóm món dùng cho quyết định duyệt.
  const [boardOptionsTarget, setBoardOptionsTarget] = useState<BoardOptionsTarget | null>(null)
  const [kitchenProposals, setKitchenProposals] = useState<KitchenDishProposal[]>(() => { try { return kitchenDishProposalsRepository.load() } catch { return [] } })
  useEffect(() => { const refresh = () => { try { setKitchenProposals(kitchenDishProposalsRepository.load()) } catch { /* giữ dữ liệu */ } }; const onStorage = (event: StorageEvent) => { if (!event.key || event.key === 'demo-kitchen-dish-proposals-v1') refresh() }; window.addEventListener('storage', onStorage); window.addEventListener('demo-kitchen-dishes-updated', refresh); return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('demo-kitchen-dishes-updated', refresh) } }, [])
  const [notice, setNotice] = useState('')
  // Chọn món chỉ được thực hiện trực tiếp trên lịch tuần công khai của Phụ huynh.
  const parentCanChoose = publicView && role === 'parent'
  const [studentCode, setStudentCode] = useState(() => {
    try { return localStorage.getItem(`demo-student-code-${school.id}`) || 'HS-DEMO-01' }
    catch { return 'HS-DEMO-01' }
  })
  const [choiceError, setChoiceError] = useState('')
  const [choiceVersion, setChoiceVersion] = useState(0)
  useEffect(() => {
    const refresh = () => setChoiceVersion(value => value + 1)
    const storage = (event: StorageEvent) => { if (!event.key || event.key === PARENT_MEAL_CHOICES_KEY) refresh() }
    window.addEventListener('storage', storage)
    window.addEventListener(PARENT_MEAL_CHOICES_EVENT, refresh)
    return () => { window.removeEventListener('storage', storage); window.removeEventListener(PARENT_MEAL_CHOICES_EVENT, refresh) }
  }, [])
  void choiceVersion
  const explicitChoiceCounts = (() => {
    const counts = new Map<string, number>()
    for (const choice of parentMealChoiceRepository.load()) {
      // Chỉ đếm các món còn trong lịch hiện tại, không tính lựa chọn cũ đã bị gỡ.
      const menuDish = items.find(item => item.id === choice.dishId && item.schoolId === choice.schoolId
        && item.gradeLevel === choice.gradeLevel && item.serviceDate === choice.serviceDate && item.mealType === choice.mealType)
      if (menuDish?.status === 'APPROVED') counts.set(choice.dishId, (counts.get(choice.dishId) ?? 0) + 1)
    }
    return counts
  })()
  const week = useMemo(() => weekFromMonday(monday), [monday])
  const currentDay = todayIso()
  const currentMonday = mondayOfWeek(currentDay)
  const displayedItems = publicView || role === 'culture_social_office' ? items.filter(item => item.status === 'APPROVED') : items
  // Đồng bộ dữ liệu giữa các tab trình duyệt và sau mỗi lần BGH lưu trong cùng tab.
  useEffect(() => {
    const refresh = () => {
      try { setItems(boardingMenuRepository.load()); setKitchens(kitchenDirectoryRepository.load()); setLoadError('') }
      catch { setLoadError('Không đọc được dữ liệu thực đơn đã lưu.') }
    }
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === BOARDING_MENU_STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('demo-boarding-menu-updated', refresh)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('demo-boarding-menu-updated', refresh) }
  }, [])
  const schoolKitchens = useMemo(() => kitchens.filter(kitchen => kitchen.assignedSchoolIds.includes(school.id) && (managementScope === 'ALL' || kitchen.type === managementScope)), [kitchens, managementScope, school.id])
  const visibleItems = useMemo(() => displayedItems.filter(item => item.schoolId === school.id && item.gradeLevel === grade && (item.ageBand ?? defaultAgeBandForGrade(item.gradeLevel)) === ageBand && week.includes(item.serviceDate) && (managementScope === 'ALL' || item.serviceMode === managementScope)), [displayedItems, grade, ageBand, managementScope, school.id, week])
  // Dùng cùng một bộ lọc trường/khối/nhóm tuổi/trạng thái cho cả phụ huynh
  // và bếp trung tâm/bếp tại trường; bản nháp/chờ duyệt không lọt vào danh sách.
  // Danh sách món duyệt riêng chỉ dành cho bếp. Phụ huynh xem món trực tiếp ở lịch tuần.
  const showApprovedHighlights = isKitchen && !publicView
  const approvedHighlights = useMemo(() => showApprovedHighlights
    ? approvedDishHighlights(items, {
      schoolId: school.id, gradeLevel: grade, ageBand,
      serviceMode: managementScope, week, selectedDate,
    }) : [], [showApprovedHighlights, items, school.id, grade, ageBand, managementScope, week, selectedDate])
  const highlightsHistorical = approvedHighlights.length > 0 && !week.includes(approvedHighlights[0]!.serviceDate)
  const filledCells = new Set(visibleItems.map(item => `${item.serviceDate}:${item.mealType}`)).size
  const pendingWeekItems = canApprove ? visibleItems.filter(item => item.status === 'SUBMITTED') : []
  const approvedWeekCount = canApprove ? visibleItems.filter(item => item.status === 'APPROVED').length : 0
  const unsubmittedWeekCount = canApprove ? visibleItems.filter(item => item.status === 'DRAFT' || item.status === 'REJECTED').length : 0
  const boardOptionsCount = canApprove ? visibleItems.reduce((count, item, _, all) => {
    const group = all.filter(candidate => candidate.serviceDate === item.serviceDate && candidate.mealType === item.mealType)
    return count + Number((defaultMealDish(group) ?? group[0])?.id !== item.id)
  }, 0) : 0
  const weeksForMonth = useMemo(() => {
    const first = `${year}-${String(month).padStart(2, '0')}-01`
    const start = mondayOfWeek(first)
    return Array.from({ length: 6 }, (_, index) => addDays(start, index * 7)).filter(value => weekFromMonday(value).some(date => String(parseIsoDate(date).getFullYear()) === year && String(parseIsoDate(date).getMonth() + 1) === month))
  }, [month, year])
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 4000) }
  const changeYear = (value: string) => { const nextMonday = mondayOfWeek(`${value}-${String(month).padStart(2, '0')}-01`); setYear(value); setMonday(nextMonday) }
  const changeMonth = (value: string) => { const nextMonday = mondayOfWeek(`${year}-${String(value).padStart(2, '0')}-01`); setMonth(value); setMonday(nextMonday) }
  const shiftWeek = (amount: number) => { const nextMonday = addDays(monday, amount); const nextDate = parseIsoDate(nextMonday); setMonday(nextMonday); setYear(String(nextDate.getFullYear())); setMonth(String(nextDate.getMonth() + 1)); if (publicView) onSelectDate?.(nextMonday) }
  const goToCurrentWeek = () => { setMonday(currentMonday); setYear(String(parseIsoDate(currentDay).getFullYear())); setMonth(String(parseIsoDate(currentDay).getMonth() + 1)); onSelectDate?.(currentDay) }
  const persist = (next: BoardingDish[], message: string) => { if (locked || !isKitchen) return false; try { boardingMenuRepository.save(next); setItems(next); showNotice(message); return true } catch (error) { showNotice(error instanceof Error ? error.message : 'Không thể lưu thực đơn trên trình duyệt.'); return false } }
  const saveKitchen = (draft: KitchenDraft) => {
    if (locked || !isKitchen) return false
    const current = kitchenEditor === 'new' ? undefined : kitchenEditor ?? undefined
    const duplicate = kitchens.some(kitchen => kitchen.code.toLocaleLowerCase('vi') === draft.code.toLocaleLowerCase('vi') && kitchen.id !== current?.id)
    if (duplicate) { showNotice('Mã bếp đã tồn tại trong danh mục DEMO.'); return false }
    const saved: KitchenProfile = { id: current?.id ?? crypto.randomUUID(), assignedSchoolIds: current?.assignedSchoolIds ?? [school.id], updatedAt: new Date().toISOString(), demo: true, ...draft }
    const next = [...kitchens.filter(kitchen => kitchen.id !== saved.id), saved]
    try { kitchenDirectoryRepository.save(next); setKitchens(next); showNotice(current ? 'Đã cập nhật thông tin bếp DEMO.' : 'Đã thêm bếp và gắn với trường đang chọn.'); return true } catch { showNotice('Không thể lưu danh mục bếp trên trình duyệt.'); return false }
  }
  const save = async (draft: EditorDraft) => {
    if (locked || !isKitchen || !editor) return false
    if (editor.item?.status === 'SUBMITTED' || editor.item?.status === 'APPROVED') {showNotice('Món đang chờ duyệt hoặc đã duyệt; bếp không được chỉnh sửa.');return false}
    const dates = editor.item ? [editor.date] : draft.scope === 'DAY' ? [editor.date] : draft.scope === 'WEEK' ? week : draft.selectedDates
    if (dates.some(date=>items.some(item=>item.schoolId===school.id && item.gradeLevel===grade && (item.ageBand??defaultAgeBandForGrade(item.gradeLevel))===draft.ageBand && item.serviceDate===date && item.mealType===draft.mealType && (item.status==='SUBMITTED'||item.status==='APPROVED')))) {showNotice('Bữa ăn này đang chờ duyệt hoặc đã duyệt. Bếp chỉ được bổ sung sau khi BGH yêu cầu điều chỉnh.'); return false}
    const now = new Date().toISOString()
    const ingredients = draft.ingredients.split(',').map(value => value.trim()).filter(Boolean)
    let next = items.filter(item => item.id !== editor.item?.id)
    const additions = dates.map((serviceDate, index): BoardingDish => ({ isDefault: editor.item?.isDefault ?? !next.some(item => item.schoolId === school.id && item.gradeLevel === grade && (item.ageBand ?? defaultAgeBandForGrade(item.gradeLevel)) === draft.ageBand && item.serviceDate === serviceDate && item.mealType === draft.mealType), id: editor.item?.id ?? `${crypto.randomUUID()}-${index}`, schoolId: school.id, gradeLevel: grade, ageBand: draft.ageBand, serviceDate, mealType: draft.mealType, name: draft.name.trim(), imageUrl: draft.imageUrl || undefined, ingredients,
      portionWeightGrams: draft.portionWeightGrams.trim() ? Number(draft.portionWeightGrams) : null,
      // Món đã nhận mẫu DEMO: BGH có thể sửa/xóa định lượng mà không bị tự điền lại.
      demoPortionSampleVersion: 1,
      ingredientRecords: draft.ingredientRecords.map(item => ({ ...item, amountPerServing: item.amountPerServing.trim() ? Number(item.amountPerServing) : null, supplier: item.supplier.trim(), lotCode: item.lotCode.trim(), origin: item.origin.trim() })),
      safetyMonitoring: { threeStep: draft.safetyThreeStep, retainedSample: draft.safetyRetainedSample, supervisor: draft.safetySupervisor.trim(), recordedAt: draft.safetyRecordedAt ? new Date(draft.safetyRecordedAt).toISOString() : '', note: draft.safetyNote.trim() },
      description: draft.description.trim(), priority: Number(draft.priority), expectedQuantity: Number(draft.expectedQuantity), serviceMode: draft.serviceMode, preparationKitchenId: draft.preparationKitchenId, status: 'DRAFT', reviewedAt: undefined, reviewedBy: undefined, reviewNote: undefined, submittedAt: undefined, version: (editor.item?.version ?? 0) + 1, createdAt: editor.item?.createdAt ?? now, updatedAt: now, demo: true }))
    next = [...next, ...additions]
    await new Promise(resolve => window.setTimeout(resolve, 260))
    const success = persist(next, editor.item ? 'Đã lưu phiên bản mới của món trong dữ liệu DEMO.' : draft.scope === 'WEEK' ? 'Đã lên thực đơn mẫu cho 7 ngày trong tuần.' : `Đã thêm món vào ${dates.length} ngày áp dụng.`)
    if (success) setEditor(null)
    return success
  }
  const remove = () => {
    if (locked || !isKitchen || !deleteItem || deleteItem.status==='SUBMITTED' || deleteItem.status==='APPROVED') return
    const remaining = items.filter(item => item.id !== deleteItem.id)
    const group = remaining.filter(item => item.schoolId === deleteItem.schoolId && item.gradeLevel === deleteItem.gradeLevel
      && item.serviceDate === deleteItem.serviceDate && item.mealType === deleteItem.mealType && item.ageBand === deleteItem.ageBand)
    const fallback = group.length && !group.some(item => item.isDefault) ? defaultMealDish(group) : undefined
    const next = fallback ? remaining.map(item => item.id === fallback.id ? { ...item, isDefault: true } : item) : remaining
    if (persist(next, 'Đã xóa món. Học sinh chọn món này sẽ dùng món mặc định.')) setDeleteItem(null)
  }
  const setDefault = (dish: BoardingDish) => {
    if (locked || !isKitchen) return
    if (dish.status === 'SUBMITTED' || dish.status === 'APPROVED') {showNotice('Món đã gửi hoặc được duyệt không thể thay đổi mặc định.');return}
    const next = items.map(item => item.schoolId === dish.schoolId && item.gradeLevel === dish.gradeLevel
      && item.status !== 'APPROVED' && item.status !== 'SUBMITTED' && item.serviceDate === dish.serviceDate && item.mealType === dish.mealType && item.ageBand === dish.ageBand
      ? { ...item, isDefault: item.id === dish.id, updatedAt: new Date().toISOString() } : item)
    persist(next, `Đã đặt “${dish.name}” làm món mặc định cho ${dateLabel(dish.serviceDate)}.`)
  }
  const mealGroup = (date: string, mealType: BoardingMealType) => items.filter(item => item.schoolId === school.id && item.gradeLevel === grade && (item.ageBand ?? defaultAgeBandForGrade(item.gradeLevel)) === ageBand && item.serviceDate === date && item.mealType === mealType && (managementScope === 'ALL' || item.serviceMode === managementScope))
  const openReview = (target: ReviewTarget) => {
    if (!canApprove) return
    setReviewTarget(target)
    setReviewAcknowledged(false)
    setReviewNote('')
  }
  const submitForApproval = (date: string, mealType: BoardingMealType) => {
    if (!isKitchen || locked) return
    const group = mealGroup(date,mealType)
    // Mỗi món có vòng đời duyệt riêng: đã duyệt/chờ duyệt không bị gửi lại.
    const toSubmit = group.filter(item => item.status === 'DRAFT' || item.status === 'REJECTED')
    if (!toSubmit.length) { showNotice('Không có món bản nháp hoặc món cần điều chỉnh để gửi duyệt.'); return }
    if (!group.some(item => item.isDefault)) { showNotice('Cần chọn một món mặc định trước khi gửi duyệt.'); return }
    if (toSubmit.some(item => !item.ingredientRecords?.length || item.ingredientRecords.some(record => record.amountPerServing == null || record.amountPerServing <= 0))) { showNotice('Cần nhập đủ định lượng nguyên liệu của từng món trước khi gửi duyệt.'); return }
    const pendingIds = new Set(toSubmit.map(item => item.id))
    const now = new Date().toISOString()
    persist(items.map(item => pendingIds.has(item.id) ? {...item,status:'SUBMITTED' as const,submittedAt:now,reviewedAt:undefined,reviewedBy:undefined,reviewNote:undefined,updatedAt:now}:item), `Đã gửi ${toSubmit.length} món đến Ban Giám hiệu duyệt.`)
  }
  // Duyệt đơn lẻ / theo bữa / theo tuần cùng một cơ chế, chỉ nhận món SUBMITTED.
  // Tập món được tính lại ở mỗi lần render để tránh duyệt trùng sau khi dữ liệu thay đổi.
  const reviewCandidates = reviewTarget ? (
    reviewTarget.scope === 'DISH'
      ? visibleItems.filter(item => item.id === reviewTarget.dishId)
      : reviewTarget.scope === 'WEEK'
        ? visibleItems
        : mealGroup(reviewTarget.date, reviewTarget.mealType)
  ).filter(item => item.status === 'SUBMITTED') : []
  const reviewSummary = reviewTarget?.scope === 'WEEK'
    ? `Tuần ${dateLabel(week[0]!)} – ${dateLabel(week[6]!)} · ${AGE_BAND_LABEL(ageBand)}`
    : reviewTarget?.scope === 'MEAL'
      ? `${dateLabel(reviewTarget.date)} · ${mealLabel(reviewTarget.mealType)} · ${AGE_BAND_LABEL(ageBand)}`
      : reviewTarget?.scope === 'DISH'
        ? (items.find(item => item.id === reviewTarget.dishId)?.name ?? 'Món ăn không còn tồn tại')
        : ''
  const reviewMeal = () => {
    if (!reviewTarget || !canApprove) return
    if (!reviewCandidates.length) { showNotice('Không còn món đang chờ duyệt trong phạm vi này.'); setReviewTarget(null); return }
    if (reviewTarget.action === 'APPROVED' && !reviewAcknowledged) { showNotice('Cần xác nhận đã kiểm tra cảnh báo AI và hồ sơ định lượng.'); return }
    if (reviewTarget.action === 'REJECTED' && !reviewNote.trim()) { showNotice('Vui lòng nhập lý do yêu cầu bếp điều chỉnh.'); return }
    const ids = new Set(reviewCandidates.map(item => item.id))
    const now = new Date().toISOString()
    const next = items.map(item => ids.has(item.id)
      ? { ...item, status: reviewTarget.action, reviewedAt: now, reviewedBy: 'Ban Giám hiệu (DEMO)', reviewNote: reviewNote.trim(), updatedAt: now }
      : item)
    try {
      boardingMenuRepository.save(next)
      setItems(next)
      showNotice(reviewTarget.action === 'APPROVED'
        ? `Đã duyệt ${ids.size} món; Phụ huynh và Phòng VH–XH sẽ thấy các món vừa được duyệt.`
        : `Đã trả lại ${ids.size} món để bếp điều chỉnh.`)
      setReviewTarget(null)
      setReviewNote('')
      setReviewAcknowledged(false)
    } catch (error) { showNotice(error instanceof Error ? error.message : 'Không thể lưu kết quả duyệt.') }
  }
  const cellItems = (date: string, mealType: BoardingMealType) => visibleItems.filter(item => item.serviceDate === date && item.mealType === mealType).sort((a, b) => a.priority - b.priority)
  const choiceScope = (date: string, mealType: BoardingMealType) => ({ studentCode: studentCode.trim(), schoolId: school.id, gradeLevel: grade, ageBand, serviceDate: date, mealType })
  const resolveParentChoice = (date: string, mealType: BoardingMealType, dishes: BoardingDish[]) =>
    parentMealChoiceRepository.resolve(dishes, choiceScope(date, mealType))
  const chooseFromCalendar = (dish: BoardingDish): boolean => {
    if (!parentCanChoose || useUI.getState().role !== 'parent') return false
    try {
      parentMealChoiceRepository.select(choiceScope(dish.serviceDate, dish.mealType), dish.id)
      localStorage.setItem(`demo-student-code-${school.id}`, studentCode.trim())
      setChoiceError('')
      showNotice(`Đã chọn “${dish.name}” cho ${mealLabel(dish.mealType).toLocaleLowerCase('vi')} của ${studentCode.trim()} ngày ${dateLabel(dish.serviceDate)} (DEMO).`)
      return true
    } catch (caught) {
      setChoiceError(caught instanceof Error ? caught.message : 'Không thể lưu lựa chọn món.')
      return false
    }
  }
  // Giữ danh sách popup lấy trực tiếp từ cùng nguồn dữ liệu của lịch BGH.
  const boardPopupGroups = boardOptionsTarget ? week.flatMap(date => mealTypeOptions.flatMap(meal => {
    if (boardOptionsTarget !== 'ALL' && (boardOptionsTarget.date !== date || boardOptionsTarget.mealType !== meal.value)) return []
    const dishes = cellItems(date, meal.value)
    const defaultDish = defaultMealDish(dishes) ?? dishes[0]
    const options = dishes.filter(dish => dish.id !== defaultDish?.id)
    return options.length ? [{ date, mealType: meal.value, defaultDish, options }] : []
  })) : []
  const parentChoiceDishes = parentChoiceTarget ? cellItems(parentChoiceTarget.date, parentChoiceTarget.mealType) : []
  const parentChoiceSelection = parentChoiceTarget ? resolveParentChoice(parentChoiceTarget.date, parentChoiceTarget.mealType, parentChoiceDishes) : null
  if (loadError) return <section className="card boarding-menu-error" role="alert"><CircleHelp size={34} /><h2>Chưa tải được dữ liệu quản lý bếp</h2><p>{loadError}</p><button className="outline" onClick={() => { try { setItems(boardingMenuRepository.seed()); setKitchens(kitchenDirectoryRepository.seed()); setLoadError('') } catch { setLoadError('Trình duyệt đang chặn bộ nhớ cục bộ.') } }}>Dùng lại dữ liệu DEMO</button></section>
  return <section className={`boarding-menu-manager ${locked ? 'read-only' : ''} ${publicView ? 'public-view' : ''}`} aria-label={!locked && !publicView ? 'Quản lý thực đơn tuần' : undefined} aria-labelledby={locked || publicView ? 'boarding-menu-title' : undefined}>
    {(publicView || locked) && <header className="boarding-menu-title"><div><span className="section-kicker">{publicView ? 'THỰC ĐƠN CÔNG KHAI · DỮ LIỆU MINH HỌA' : 'ĐỐI CHIẾU THỰC ĐƠN · DỮ LIỆU MINH HỌA'}</span><h2 id="boarding-menu-title">{publicView ? 'Thực đơn tuần của trường' : 'Thực đơn tuần theo phạm vi được giao'}</h2><p>{publicView ? parentCanChoose ? 'Lịch tuần hiển thị món đang áp dụng và đầy đủ các món lựa chọn đã được Ban Giám hiệu duyệt. Nhấn Đổi món để chọn cho học sinh.' : 'Hiển thị đầy đủ các món được Ban Giám hiệu duyệt theo từng ngày, bữa ăn và nhóm tuổi; chỉ xem, không chỉnh sửa.' : 'Theo dõi món ăn, số suất dự kiến và đơn vị chuẩn bị theo từng ngày; chế độ này không cho phép chỉnh sửa.'}</p></div>{!publicView&&<ClickSpark className="menu-action-sparks" sparkColor={['#087f6d', '#276bd1']} sparkSize={5} sparkRadius={20} sparkCount={6} sparkWidth={1.4} duration={320} easing="ease-out" randomness={0.16} ring><div className="boarding-title-actions"><button className="outline" onClick={() => setPreviewDate(week.includes(selectedDate) ? selectedDate : week[0]!)}><Eye size={17} /> Xem bản công khai</button></div></ClickSpark>}</header>}
    {notice && <div className="boarding-notice" role="status"><Check size={17} />{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {!publicView&&locked&&<SpotlightCard role="region" className="kitchen-directory rb-menu-spotlight" aria-labelledby="kitchen-directory-title" theme="light" spotlightColor="#087f6d" intensity={0.22} spotlightSize={280} softness={0.82} borderGlow={0.26} proximity={36} smoothing={0.45} flare={false}><header><div><span className="section-kicker">ĐƠN VỊ CHUẨN BỊ ĐƯỢC PHÂN CÔNG</span><h3 id="kitchen-directory-title">{managementScope === 'ALL' ? 'Bếp trung tâm & bếp tại trường' : serviceModeLabel(managementScope)}</h3><p>Thông tin bếp được hiển thị để đối chiếu theo phạm vi tài khoản.</p></div></header><div className="kitchen-profile-grid">{schoolKitchens.map(kitchen => <article className="kitchen-profile" key={kitchen.id}><span className={`kitchen-profile-icon ${kitchen.type === 'CENTRAL_KITCHEN' ? 'central' : ''}`}>{kitchen.type === 'CENTRAL_KITCHEN' ? <Building2 /> : <ChefHat />}</span><div><div className="kitchen-profile-meta"><span>{serviceModeLabel(kitchen.type)}</span><small className={kitchen.active ? 'active' : 'inactive'}>{kitchen.active ? 'Đang hoạt động' : 'Tạm ngừng'}</small></div><h4>{kitchen.name}</h4><p>{kitchen.code} · {kitchen.capacity.toLocaleString('vi-VN')} suất/ngày</p><small>Phụ trách: {kitchen.managerName}</small></div></article>)}{!schoolKitchens.length && <div className="kitchen-empty"><ChefHat size={28} /><strong>Chưa có bếp phù hợp</strong><span>Chưa có đơn vị bếp trong phạm vi được giao.</span></div>}</div></SpotlightCard>}
    {!publicView&&<SpotlightCard className="boarding-filter-card rb-menu-spotlight rb-menu-filter-spotlight" theme="light" spotlightColor="#276bd1" intensity={0.16} spotlightSize={240} softness={0.86} borderGlow={0.2} proximity={28} smoothing={0.5} flare={false}><div className="boarding-filters"><label>Khối lớp<Select label="Khối lớp" value={grade} onValueChange={value => { const next=value as GradeLevel;setGrade(next);setAgeBand(defaultAgeBandForGrade(next)) }} options={gradeOptions} /></label><label>Nhóm tuổi<Select label="Nhóm tuổi" value={ageBand} onValueChange={value => setAgeBand(value as SchoolAgeBand)} options={AGE_BANDS.filter(item => ageBandsForGrade(grade).includes(item.id)).map(item => ({value:item.id,label:item.label}))} /></label><label>Năm<Select label="Năm" value={year} onValueChange={changeYear} options={['2025', '2026', '2027'].map(value => ({ value, label: value }))} /></label><label>Tháng<Select label="Tháng" value={month} onValueChange={changeMonth} options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: `Tháng ${index + 1}` }))} /></label><label className="week-filter">Tuần áp dụng<Select label="Tuần áp dụng" value={monday} onValueChange={setMonday} options={weeksForMonth.map(value => ({ value, label: `${dateLabel(value, { day: '2-digit', month: '2-digit' })} – ${dateLabel(addDays(value, 6), { day: '2-digit', month: '2-digit' })}` }))} /></label></div><div className="boarding-summary"><div><span>Đã lên</span><strong><CountUp to={filledCells} duration={0.55} trigger="load" /><small>/21 ô bữa ăn</small></strong></div><div><span>Bếp hoạt động</span><strong><CountUp to={schoolKitchens.filter(item => item.active).length} duration={0.5} trigger="load" /><small>/ {schoolKitchens.length} đơn vị</small></strong></div></div></SpotlightCard>}
    {!publicView && canApprove && <p className="demo-note">Ban Giám hiệu có thể <strong>duyệt từng món</strong> (ngay trên thẻ món mặc định hoặc trong popup món lựa chọn), <strong>duyệt theo bữa</strong> hoặc <strong>duyệt toàn bộ thực đơn tuần</strong>. Chỉ món <strong>Chờ duyệt</strong> mới được phê duyệt; bản nháp không tự được duyệt. AI chỉ hỗ trợ tham khảo.</p>}
    {!publicView && isKitchen && <p className="demo-note">Bếp tạo món ở mục <strong>Tạo món & dinh dưỡng</strong>, lên lịch món mặc định và món lựa chọn, sau đó chọn <strong>Gửi BGH duyệt</strong>. Không được tự phê duyệt hay sửa món đã duyệt.</p>}
    {publicView && <div className="age-public-selector public-menu-filters"><label>Khối lớp <select aria-label="Khối lớp thực đơn công khai" value={grade} onChange={event=>{ const next=event.target.value as GradeLevel;setGrade(next);setAgeBand(defaultAgeBandForGrade(next)) }}>{gradeOptions.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Nhóm tuổi <select aria-label="Nhóm tuổi thực đơn công khai" value={ageBand} onChange={event=>setAgeBand(event.target.value as SchoolAgeBand)}>{AGE_BANDS.filter(item=>ageBandsForGrade(grade).includes(item.id)).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><small><ShieldCheck size={14} aria-hidden="true"/> Chỉ hiển thị món được BGH duyệt · Dữ liệu DEMO</small></div>}
    {showApprovedHighlights && <section className="parent-approved-menu" aria-labelledby="parent-approved-heading">
      <div className="parent-approved-heading">
        <div><span className="section-kicker">MÓN ĐÃ DUYỆT · DỮ LIỆU MINH HỌA</span><h3 id="parent-approved-heading"><ShieldCheck size={18} aria-hidden="true"/> {parentCanChoose ? 'Món đã được Ban Giám hiệu duyệt' : 'Món đã duyệt trong phạm vi bếp'}</h3>
        <p>{approvedHighlights.length ? <>Ngày {dateLabel(approvedHighlights[0]!.serviceDate)} · {AGE_BAND_LABEL(ageBand)}{highlightsHistorical ? ' · Thực đơn lưu trữ, không thuộc tuần đang xem' : ''}</> : 'Chưa có món nào được duyệt cho trường và nhóm tuổi này.'}</p></div>
        {highlightsHistorical && <button type="button" className="parent-approved-view-week" onClick={() => {
          const targetDate = approvedHighlights[0]!.serviceDate
          setMonday(mondayOfWeek(targetDate))
          setYear(String(parseIsoDate(targetDate).getFullYear()))
          setMonth(String(parseIsoDate(targetDate).getMonth() + 1))
          onSelectDate?.(targetDate)
        }}>Xem tuần đã duyệt <ChevronRight size={14}/></button>}
      </div>
      {approvedHighlights.length > 0 && <div className="parent-approved-list">{approvedHighlights.map(dish => {
        const group = items.filter(item => item.status === 'APPROVED' && item.schoolId === dish.schoolId && item.gradeLevel === dish.gradeLevel && item.serviceDate === dish.serviceDate && item.mealType === dish.mealType && (item.ageBand ?? defaultAgeBandForGrade(item.gradeLevel)) === (dish.ageBand ?? defaultAgeBandForGrade(dish.gradeLevel)))
        const isDefault = defaultMealDish(group)?.id === dish.id
        return <article className="parent-approved-dish" key={dish.id}>
          <button type="button" className="parent-approved-details" onClick={() => setSelectedDish(dish)} aria-label={`Xem chi tiết món đã duyệt ${dish.name}`}>
            <img src={dishImage(dish.name, dish.mealType, dish.imageUrl)} alt="" loading="lazy"/>
            <span className="parent-approved-copy"><strong>{dish.name}</strong><span className="parent-approved-tags"><small className="approved"><CheckCircle2 size={12}/> Đã duyệt</small><small className={isDefault ? 'default' : 'option'}>{isDefault ? 'Món mặc định' : 'Món lựa chọn'}</small></span><small>{mealLabel(dish.mealType)} · {dish.portionWeightGrams != null ? `${dish.portionWeightGrams.toLocaleString('vi-VN')} g/suất` : 'Chưa có định lượng'}</small></span>
          </button>
          <button type="button" className="parent-approved-ai" onClick={() => setAiDish(dish)} aria-label={`AI phân tích món đã duyệt ${dish.name}`}><Sparkles size={14}/> AI phân tích</button>
        </article>
      })}</div>}
      <small className="parent-approved-footnote">Cùng nguồn thực đơn với Ban Giám hiệu và các vai trò khác · Chỉ hiển thị trạng thái Đã duyệt. Dữ liệu DEMO không thay thế phê duyệt thực tế.</small>
    </section>}
    {parentCanChoose && choiceError && <div className="parent-weekly-choice-error" role="alert">{choiceError}</div>}
    <div className="boarding-weekbar"><div><button className="icon-button" aria-label="Tuần trước" onClick={() => shiftWeek(-7)}><ChevronLeft /></button><span><CalendarDays size={17} /><strong>{dateLabel(week[0]!, { day: '2-digit', month: '2-digit' })} – {dateLabel(week[6]!, { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></span><button className="icon-button" aria-label="Tuần sau" onClick={() => shiftWeek(7)}><ChevronRight /></button></div><div className="boarding-weekbar-actions">
      {monday !== currentMonday && <button type="button" className="board-week-today" onClick={goToCurrentWeek} title={`Xem tuần có ngày ${dateLabel(currentDay)}`}><CalendarDays size={15} aria-hidden="true"/> Về tuần hiện tại</button>}
      <div className="board-date-legend" aria-label="Chú giải màu thời gian của lịch thực đơn"><span className="is-past">Đã qua</span><span className="is-current">Hôm nay</span><span className="is-future">Sắp tới</span></div>
      {publicView && <button type="button" className={`board-toggle-options ${expandedPublicMenu ? 'expanded' : ''}`} aria-pressed={expandedPublicMenu} onClick={()=>setExpandedPublicMenu(value=>!value)}><Eye size={16} aria-hidden="true"/><span>{expandedPublicMenu ? 'Thu gọn thẻ món ăn' : 'Hiện đầy đủ thẻ món ăn'}</span></button>}
      {canApprove && <button type="button" className="board-approve-week" disabled={pendingWeekItems.length === 0} onClick={() => openReview({ scope: 'WEEK', action: 'APPROVED' })} title={pendingWeekItems.length ? `Duyệt ${pendingWeekItems.length} món đã được bếp gửi trong tuần` : 'Tuần này không có món đang chờ duyệt'}><ShieldCheck size={17} aria-hidden="true"/> Duyệt toàn bộ thực đơn tuần {pendingWeekItems.length > 0 && <strong>{pendingWeekItems.length}</strong>}</button>}
      {canApprove && <button type="button" className="board-toggle-options" disabled={boardOptionsCount === 0} onClick={() => setBoardOptionsTarget('ALL')}>
        <Eye size={16} aria-hidden="true" />
        <span>Hiện tất cả món lựa chọn</span>
        {boardOptionsCount > 0 && <strong>{boardOptionsCount}</strong>}
      </button>}
      <small>{publicView ? (parentCanChoose ? 'Đủ các món đã duyệt · Món hiện tại và các phương án đổi · DEMO' : 'Đủ các món đã duyệt · Chỉ đọc · DEMO') : canApprove ? `${approvedWeekCount} món đã duyệt · ${pendingWeekItems.length} chờ duyệt · ${unsubmittedWeekCount} chưa gửi/trả lại` : 'Bếp chọn món mặc định (☆), tối đa 5 món trưa · Sau đó gửi BGH duyệt'}</small>
    </div></div>
    <div id="boarding-week-calendar" className="boarding-calendar-scroll" tabIndex={0} aria-label="Lịch thực đơn tuần, có thể cuộn ngang"><div className="boarding-calendar" role="table" aria-label="Lịch thực đơn 7 ngày và 3 bữa"><div className="calendar-header" role="row"><div className="calendar-corner" role="columnheader">Bữa ăn</div>{week.map((date, index) => <div key={date} role="columnheader" className={`calendar-day ${relativeDayClass(date, currentDay)} ${date === currentDay ? 'today' : ''} ${publicView && date === selectedDate ? 'selected' : ''} ${index > 4 ? 'weekend' : ''}`} title={`${weekdayShort[index]} ${dateLabel(date)} · ${relativeDayLabel(date, currentDay)}`}>{publicView?<button className="calendar-day-button" aria-label={`Xem chi tiết ${weekdayShort[index]} ${dateLabel(date)} · ${relativeDayLabel(date, currentDay)}`} onClick={() => onSelectDate?.(date)}><span>{weekdayShort[index]}</span><strong>{dateLabel(date, { day: '2-digit', month: '2-digit' })}</strong><small className="calendar-day-period">{relativeDayLabel(date, currentDay)}</small></button>:<><span>{weekdayShort[index]}</span><strong>{dateLabel(date, { day: '2-digit', month: '2-digit' })}</strong><small className="calendar-day-period">{relativeDayLabel(date, currentDay)}</small></>}</div>)}</div>{mealTypeOptions.map(meal => { const Icon = mealIcons[meal.value]; return <div className="calendar-row" role="row" key={meal.value}><div className="meal-row-title" role="rowheader"><span><Icon size={19} /></span><strong>{meal.label}</strong></div>{week.map(date => { const dishes = cellItems(date, meal.value); const mealChoice = parentCanChoose ? resolveParentChoice(date, meal.value, dishes) : null; const defaultDish = defaultMealDish(dishes); const displayedDishes = canApprove ? (defaultDish ? [defaultDish] : dishes.slice(0, 1)) : publicView && !expandedPublicMenu ? (mealChoice?.dish ? [mealChoice.dish] : defaultDish ? [defaultDish] : dishes.slice(0, 1)) : dishes; const compactPublicOptions = publicView && !expandedPublicMenu ? dishes.filter(dish => !displayedDishes.some(shown => shown.id === dish.id)) : []; const hiddenBoardOptions = canApprove ? Math.max(0, dishes.length - displayedDishes.length) : 0; const alternativeCount = mealChoice?.dish ? Math.max(0, dishes.length - 1) : 0; return <div className={`meal-calendar-cell ${dishes.length ? 'has-items' : ''} ${relativeDayClass(date, currentDay)}`} role="cell" aria-label={`${meal.label} ${dateLabel(date)} · ${relativeDayLabel(date, currentDay)}`} key={date}>{displayedDishes.map(dish => <DishMealCard key={dish.id} dish={dish} order={Math.max(1, dishes.findIndex(item => item.id === dish.id) + 1)} isDefault={defaultMealDish(dishes)?.id === dish.id} selectionCount={role !== 'parent' ? (explicitChoiceCounts.get(dish.id) ?? 0) : undefined} isChosen={mealChoice?.dish?.id === dish.id} explicitChoice={mealChoice?.explicit ?? false} canManage={!locked && dish.status!=='APPROVED' && dish.status!=='SUBMITTED'} onSetDefault={() => setDefault(dish)}
  onAnalyze={() => setAiDish(dish)}
  onReview={canApprove && dish.status === 'SUBMITTED' ? () => openReview({ scope: 'DISH', dishId: dish.id, action: 'APPROVED' }) : undefined}
  onReject={canApprove && dish.status === 'SUBMITTED' ? () => openReview({ scope: 'DISH', dishId: dish.id, action: 'REJECTED' }) : undefined}
  onOpen={() => setSelectedDish(dish)}
  onEdit={() => setEditor({ date, mealType: meal.value, item: dish })}
  onRemove={() => setDeleteItem(dish)}/>
  )}{compactPublicOptions.length > 0 && <div className="public-cell-options" aria-label={`${compactPublicOptions.length} món ăn khác đã duyệt`}><div className="public-cell-options-heading"><Utensils size={13}/><strong>{compactPublicOptions.length} món khác đã duyệt</strong></div>{compactPublicOptions.map(dish => <button type="button" key={dish.id} className={`public-cell-option ${dish.id === defaultDish?.id ? 'is-default' : ''}`} onClick={()=>setSelectedDish(dish)} title={`Xem chi tiết ${dish.name}`}><img src={dishImage(dish.name, dish.mealType, dish.imageUrl)} alt="" loading="lazy"/><span><strong>{dish.name}</strong><small>{dish.id === defaultDish?.id ? 'Món mặc định' : 'Món lựa chọn'}</small></span><ChevronRight size={13} aria-hidden="true"/></button>)}</div>}{hiddenBoardOptions > 0 && <button type="button" className="board-cell-options" onClick={() => setBoardOptionsTarget({ date, mealType: meal.value })} aria-haspopup="dialog" aria-label={`Xem popup ${hiddenBoardOptions} món lựa chọn ${mealLabel(meal.value)} ngày ${dateLabel(date)}`}>
    <Eye size={14} aria-hidden="true"/><span>+{hiddenBoardOptions} món lựa chọn</span><ChevronRight size={13} aria-hidden="true"/>
  </button>}{/* Các nút duyệt vẫn dùng dishes đầy đủ, không dùng displayedDishes. */}{!publicView && isKitchen && dishes.some(item => item.status === 'DRAFT' || item.status === 'REJECTED') && <button type="button" className="menu-submit-button" onClick={()=>submitForApproval(date,meal.value)}><Send size={13}/>Gửi {dishes.filter(item => item.status === 'DRAFT' || item.status === 'REJECTED').length} món BGH duyệt</button>}{!publicView && canApprove && dishes.length>0 && <div className="menu-review-actions"><span>{dishes.every(item=>item.status==='APPROVED')?'Đã duyệt toàn bộ':`${dishes.filter(item=>item.status==='APPROVED').length}/${dishes.length} đã duyệt · ${dishes.filter(item=>item.status==='SUBMITTED').length} chờ duyệt`}</span>{dishes.some(item=>item.status==='SUBMITTED')&&<><button type="button" onClick={()=>openReview({scope:'MEAL',date,mealType:meal.value,action:'APPROVED'})}><ShieldCheck size={13}/> Duyệt các món chờ</button><button type="button" onClick={()=>openReview({scope:'MEAL',date,mealType:meal.value,action:'REJECTED'})}><RotateCcw size={13}/> Trả lại</button></>}</div>}{mealChoice?.dish && alternativeCount > 0 && <button type="button" className="parent-change-dish" aria-label={`Đổi món ${mealLabel(meal.value).toLocaleLowerCase('vi')} ngày ${dateLabel(date)}, ${alternativeCount} món khác`} onClick={() => setParentChoiceTarget({ date, mealType: meal.value })}><RefreshCw size={14}/><span>Đổi món</span><strong>{alternativeCount}</strong><small>món khác</small></button>}{locked?<span className="meal-cell-readonly">{dishes.length ? mealChoice ? (mealChoice.replaced ? 'Món cũ đã gỡ · Dùng mặc định' : mealChoice.explicit ? `Đã lưu lựa chọn ${mealLabel(meal.value).toLocaleLowerCase('vi')} · DEMO` : 'Áp dụng món mặc định · DEMO') : publicView ? 'Danh sách món đã duyệt · DEMO' : 'Đã ghi nhận' : (publicView || role === 'culture_social_office') ? 'Chưa có món được duyệt' : 'Chưa cập nhật'}</span>:<button className="add-dish-button" disabled={dishes.length >= maxDishesPerMeal(meal.value) || !schoolKitchens.some(item => item.active)} title={dishes.length >= maxDishesPerMeal(meal.value) ? `Đã đạt giới hạn ${maxDishesPerMeal(meal.value)} món` : 'Thêm món'} onClick={() => setEditor({ date, mealType: meal.value, initialScope: 'DAY' })}><Plus size={16} /><span className="add-dish-label">{dishes.length ? 'Thêm món' : 'Thêm món ăn'}</span>{dishes.length >= maxDishesPerMeal(meal.value) && <small>Đã đủ {maxDishesPerMeal(meal.value)} món</small>}</button>}</div>})}</div> })}</div></div>
    <div className="boarding-help"><CircleHelp size={17} /><p>{publicView ? <>Thông tin đang hiển thị là <strong>dữ liệu minh họa</strong>, không thay thế thông báo chính thức hoặc kết luận an toàn thực phẩm.</> : <>Thực đơn mới lưu ở trạng thái <strong>Bản nháp</strong>. Việc gắn đúng bếp và đủ món không đồng nghĩa bữa ăn đã được xác nhận hoặc an toàn thực phẩm.</>}</p></div>
    {selectedDish && <DishDetailDialog dish={selectedDish} kitchen={kitchens.find(kitchen => kitchen.id === selectedDish.preparationKitchenId)}
      linkedLots={publicView && selectedDish.serviceDate === '2026-10-17' ? publicTraceLots.filter(lot => lot.linkedDish === selectedDish.name) : []}
      operationEvents={publicView && selectedDish.mealType === 'LUNCH' ? publicEntries?.find(entry => entry.date === selectedDish.serviceDate)?.data.events : undefined}
      publicInspection={publicView ? publicEntries?.find(entry => entry.date === selectedDish.serviceDate)?.data.publicInspection : undefined}
      onClose={() => setSelectedDish(null)} onEdit={locked ? undefined : () => { setEditor({ date: selectedDish.serviceDate, mealType: selectedDish.mealType, item: selectedDish }); setSelectedDish(null) }} />}
    {boardOptionsTarget && canApprove && <Modal label="Danh sách món ăn lựa chọn dành cho Ban Giám hiệu" wide={boardOptionsTarget === 'ALL'} requestClose={() => setBoardOptionsTarget(null)}>
      <div className="board-options-dialog">
        <header className="board-options-dialog-header">
          <div><span className="section-kicker">BAN GIÁM HIỆU · THỰC ĐƠN MINH HỌA</span>
            <h2>{boardOptionsTarget === 'ALL' ? 'Tất cả món lựa chọn trong tuần' : `Món lựa chọn · ${mealLabel(boardOptionsTarget.mealType)}`}</h2>
            <p>{boardOptionsTarget === 'ALL' ? `${dateLabel(week[0]!)} – ${dateLabel(week[6]!)} · ${AGE_BAND_LABEL(ageBand)}` : `${dateLabel(boardOptionsTarget.date, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} · ${AGE_BAND_LABEL(ageBand)}`}</p>
          </div>
          <button type="button" className="icon-button" aria-label="Đóng danh sách món lựa chọn" onClick={() => setBoardOptionsTarget(null)}><X size={21}/></button>
        </header>
        <div className="board-options-dialog-summary"><Eye size={17}/><span><strong>{boardPopupGroups.reduce((total, group) => total + group.options.length, 0)} món lựa chọn</strong><small>Nhấn vào món để xem thông tin chi tiết; nút AI dùng để phân tích dinh dưỡng.</small></span></div>
        <div className="board-options-dialog-content">
          {boardPopupGroups.map(group => <section className="board-options-section" key={`${group.date}-${group.mealType}`}>
            <div className="board-options-section-heading"><span><CalendarDays size={16}/>{dateLabel(group.date, { weekday: 'long', day: '2-digit', month: '2-digit' })} · {mealLabel(group.mealType)}</span><small>{group.options.length} món lựa chọn</small></div>
            {group.defaultDish && <div className="board-options-current"><CheckCircle2 size={15}/><span>Món mặc định: <strong>{group.defaultDish.name}</strong></span></div>}
            <div className="board-options-list">{group.options.map((dish, index) => <article className="board-options-dish" key={dish.id}>
              <button type="button" className="board-options-dish-main" onClick={() => { setBoardOptionsTarget(null); setSelectedDish(dish) }} aria-label={`Xem chi tiết ${dish.name}`}>
                <img src={dishImage(dish.name, dish.mealType, dish.imageUrl)} alt="" loading="lazy"/>
                <span><small>MÓN LỰA CHỌN {index + 1}</small><strong>{dish.name}</strong><em>{dish.portionWeightGrams ? `${dish.portionWeightGrams.toLocaleString('vi-VN')} g/suất` : 'Chưa có định lượng'} · {dish.status === 'APPROVED' ? 'Đã duyệt' : dish.status === 'SUBMITTED' ? 'Chờ duyệt' : dish.status === 'REJECTED' ? 'Cần điều chỉnh' : 'Bản nháp'}</em></span>
                <ChevronRight size={18}/>
              </button>
              <div className="board-options-dish-actions"><button type="button" className="board-options-dish-ai" onClick={() => { setBoardOptionsTarget(null); setAiDish(dish) }} aria-label={`AI phân tích món ${dish.name}`}><Sparkles size={15}/> AI phân tích</button>{dish.status === 'SUBMITTED' && <><button type="button" className="board-options-dish-approve" onClick={() => { setBoardOptionsTarget(null); openReview({ scope: 'DISH', dishId: dish.id, action: 'APPROVED' }) }}><ShieldCheck size={15}/> Duyệt món</button><button type="button" className="board-options-dish-reject" onClick={() => { setBoardOptionsTarget(null); openReview({ scope: 'DISH', dishId: dish.id, action: 'REJECTED' }) }}><RotateCcw size={15}/> Trả lại</button></>}</div>
            </article>)}</div>
          </section>)}
          {boardPopupGroups.length === 0 && <p className="board-options-empty">Không có món lựa chọn trong phạm vi đang xem.</p>}
        </div>
        <footer className="board-options-dialog-footer"><ShieldCheck size={17}/><span>Mỗi món được duyệt độc lập; các món chờ duyệt mới có nút Duyệt món hoặc Trả lại. Dữ liệu DEMO không phải phê duyệt thật.</span></footer>
      </div>
    </Modal>}
    {parentChoiceTarget && <Modal label={`Đổi món ${mealLabel(parentChoiceTarget.mealType).toLocaleLowerCase('vi')} ngày ${dateLabel(parentChoiceTarget.date)}`} requestClose={() => setParentChoiceTarget(null)}>
      <div className="parent-choice-dialog">
        <header><div><span className="section-kicker">LỰA CHỌN SUẤT ĂN · DEMO</span><h2>Đổi món {mealLabel(parentChoiceTarget.mealType).toLocaleLowerCase('vi')}</h2><p>{dateLabel(parentChoiceTarget.date, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} · {studentCode.trim() || 'Chưa nhập mã học sinh'}</p></div><button type="button" className="icon-button" aria-label="Đóng danh sách món" onClick={() => setParentChoiceTarget(null)}><X /></button></header>
        <div className="parent-choice-dialog-summary"><Utensils size={18}/><span><strong>{parentChoiceDishes.length} món do nhà trường công bố</strong><small>Chọn một món; lựa chọn hiện tại được đánh dấu bên dưới.</small></span></div>
        <label className="parent-choice-student-field" htmlFor="parent-choice-student-code">Mã học sinh
          <input id="parent-choice-student-code" value={studentCode} maxLength={60} autoComplete="off"
            onChange={event => { setStudentCode(event.target.value); setChoiceError('') }} placeholder="VD: HS-DEMO-01" />
        </label>
        {choiceError && <div className="parent-weekly-choice-error parent-choice-inline-error" role="alert">{choiceError}</div>}
        <div className="parent-choice-dialog-list">{parentChoiceDishes.map(dish => { const current = parentChoiceSelection?.dish?.id === dish.id; return <button type="button" key={dish.id} className={current ? 'current' : ''} disabled={current} aria-label={current ? `Món đang áp dụng ${dish.name}` : `Chọn món ${dish.name}`} onClick={() => { if (chooseFromCalendar(dish)) setParentChoiceTarget(null) }}><img src={dishImage(dish.name, dish.mealType, dish.imageUrl)} alt=""/><span><small>{defaultMealDish(parentChoiceDishes)?.id === dish.id ? 'MÓN MẶC ĐỊNH' : 'MÓN LỰA CHỌN'}</small><strong>{dish.name}</strong><em>{dish.portionWeightGrams ? `${dish.portionWeightGrams.toLocaleString('vi-VN')} g / suất` : 'Chưa có định lượng'}</em></span>{current ? <span className="parent-choice-current"><CheckCircle2 size={15}/>{parentChoiceSelection?.explicit ? 'Đã chọn' : 'Đang áp dụng'}</span> : <span className="parent-choice-select">Chọn món này<ChevronRight size={15}/></span>}</button> })}</div>
        <footer><CircleHelp size={15}/><span>Lựa chọn DEMO chỉ lưu trên trình duyệt này, chưa gửi đơn đặt món thật cho bếp.</span></footer>
      </div>
    </Modal>}
    {!locked&&editor && <MealEditor target={editor} week={week} items={items.filter(item => item.schoolId === school.id && item.gradeLevel === grade)} kitchens={schoolKitchens} managementScope={managementScope} ageBand={ageBand} gradeLevel={grade} kitchenProposals={kitchenProposals.filter(item=>item.schoolId===school.id)} onClose={() => setEditor(null)} onSave={save} />}
    {aiDish && <NutritionAIReview dish={aiDish} onClose={()=>setAiDish(null)}/>}
    {reviewTarget && canApprove && <Modal label="BGH xét duyệt thực đơn" requestClose={()=>setReviewTarget(null)}><div className="nutrition-review-form board-review-dialog"><div className="nutrition-review-form-head"><ShieldCheck size={27}/><div><h2>{reviewTarget.action === 'REJECTED' ? 'Yêu cầu bếp điều chỉnh' : reviewTarget.scope === 'WEEK' ? 'Duyệt toàn bộ thực đơn tuần' : reviewTarget.scope === 'DISH' ? 'Duyệt từng món ăn' : 'Duyệt các món trong bữa'}</h2><p>{reviewSummary}</p></div></div><div className="board-review-impact"><strong>{reviewCandidates.length} món đang chờ duyệt</strong><span>{reviewTarget.scope === 'WEEK' ? `${approvedWeekCount} món đã duyệt · ${unsubmittedWeekCount} món nháp/trả lại không thuộc lần duyệt này` : 'Chỉ những món đã được bếp gửi duyệt mới được xử lý.'}</span></div><div className="board-review-dish-list" aria-label="Danh sách món được xét duyệt">{reviewCandidates.map(dish => <div key={dish.id} className="board-review-dish-row"><img src={dishImage(dish.name,dish.mealType,dish.imageUrl)} alt="" loading="lazy"/><span><strong>{dish.name}</strong><small>{dateLabel(dish.serviceDate, { weekday: 'short', day: '2-digit', month: '2-digit' })} · {mealLabel(dish.mealType)} · {dish.isDefault ? 'Mặc định' : 'Lựa chọn'}</small></span><span className="board-review-status">Chờ duyệt</span></div>)}</div><p className="board-review-caution">Kết quả AI chỉ đối chiếu với hướng dẫn chính thức, không thay thế việc kiểm tra định lượng, dị ứng, điều kiện an toàn thực phẩm và hồ sơ của bếp. Món bản nháp không được tự động duyệt.</p><label>Nhận xét của Ban Giám hiệu<textarea rows={3} maxLength={600} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder={reviewTarget.action === 'REJECTED' ? 'Nêu rõ lý do cần chỉnh sửa...' : 'Ghi chú cho bếp (không bắt buộc)'}/></label>{reviewTarget.action === 'APPROVED' && <label className="menu-review-ack"><input type="checkbox" checked={reviewAcknowledged} onChange={e=>setReviewAcknowledged(e.target.checked)}/> Tôi đã kiểm tra danh sách món, định lượng, cảnh báo AI và thông tin liên quan trước khi quyết định duyệt.</label>}<footer><button type="button" className="outline" onClick={()=>setReviewTarget(null)}>Hủy</button><button type="button" className="primary" onClick={reviewMeal} disabled={!reviewCandidates.length || reviewTarget.action === 'APPROVED' && !reviewAcknowledged || reviewTarget.action === 'REJECTED' && !reviewNote.trim()}>{reviewTarget.action === 'APPROVED' ? `Xác nhận duyệt ${reviewCandidates.length} món` : `Trả lại ${reviewCandidates.length} món`}</button></footer></div></Modal>}
    {!locked&&kitchenEditor && <KitchenEditor item={kitchenEditor === 'new' ? undefined : kitchenEditor} lockedType={managementScope === 'ALL' ? undefined : managementScope} school={school} onClose={() => setKitchenEditor(null)} onSave={saveKitchen} />}
    {!locked&&deleteItem && <Modal label="Xác nhận xóa món" requestClose={() => setDeleteItem(null)}><div className="confirm-dialog"><span className="confirm-icon"><Trash2 /></span><h2>Xóa “{deleteItem.name}”?</h2><p>Món sẽ được gỡ khỏi {mealLabel(deleteItem.mealType).toLocaleLowerCase('vi')} ngày {dateLabel(deleteItem.serviceDate)}. Thao tác chỉ ảnh hưởng dữ liệu DEMO trên trình duyệt.</p><div><button className="outline" onClick={() => setDeleteItem(null)}>Giữ lại</button><button className="danger-button" onClick={remove}>Xóa món</button></div></div></Modal>}
    {previewDate && <Modal label="Xem trước thực đơn công khai" requestClose={() => setPreviewDate(null)}><div className="preview-dialog"><header><div><span className="section-kicker">XEM TRƯỚC BẢN CÔNG KHAI · DEMO</span><h2>Thực đơn {dateLabel(previewDate, { weekday: 'long', day: '2-digit', month: '2-digit' })}</h2></div><button className="icon-button" aria-label="Đóng" onClick={() => setPreviewDate(null)}><X /></button></header>{mealTypeOptions.map(meal => <section key={meal.value}><strong>{meal.label}</strong>{cellItems(previewDate, meal.value).length ? <ul>{cellItems(previewDate, meal.value).map(item => <li key={item.id}><button className="preview-dish-trigger" type="button" onClick={() => { setPreviewDate(null); setSelectedDish(item) }}><img className="preview-dialog-photo" src={dishImage(item.name, item.mealType, item.imageUrl)} alt={`Ảnh minh họa ${item.name}`} /><span>{item.name}{defaultMealDish(cellItems(previewDate, meal.value))?.id === item.id ? ' · Món mặc định' : ' · Món lựa chọn'}</span></button><small>{serviceModeLabel(item.serviceMode)} · {item.description || 'Chưa có mô tả.'}</small></li>)}</ul> : <p>Chưa cập nhật</p>}</section>)}</div></Modal>}
  </section>
}
