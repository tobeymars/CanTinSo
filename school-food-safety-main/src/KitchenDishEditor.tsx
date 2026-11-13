import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, FileSearch, Leaf, Plus, Scale, ShieldAlert, Sparkles, Trash2, UploadCloud, X } from 'lucide-react'
import SpotlightCard from './components/react-bits/SpotlightCard'
import ClickSpark from './components/react-bits/ClickSpark'
import type { School } from './lib/data'
import type { ViewRole } from './lib/store'
import { useUI } from './lib/store'
import { inventoryItems } from './lib/inventory'
import { readSuppliers } from './lib/suppliers'
import { compressDishPhoto, dishImage } from './lib/dishImages'
import { gradeForSchool, kitchenDishProposalsRepository, kitchenDirectoryRepository, mealTypeOptions } from './lib/boardingMenu'
import type { BoardingMealType, KitchenDishProposal } from './lib/boardingMenu'
import { AGE_BANDS, AGE_BAND_LABEL, ALLERGENS, ageBandsForGrade, defaultAgeBandForGrade, suggestMeals } from './lib/schoolNutrition'
import type { NutritionGoal, SchoolAgeBand } from './lib/schoolNutrition'
import { OFFICIAL_FOOD_REFERENCE as FOOD_REFERENCE, analyzeOfficialRecipe as analyzeRecipe, findOfficialFood as findFood } from './lib/officialFoodNutrition'
import IngredientTraceDialog from './IngredientTraceDialog'

const pretty = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dish-${Date.now()}-${Math.random().toString(36).slice(2)}`
const todayIsoDate = () => new Date().toLocaleDateString('sv-SE')
const nowIso = () => new Date().toISOString()
type IngredientDraft = { key: string; inventoryItemId: string; name: string; amount: string; unit: 'g' | 'ml' }
type Step = 0 | 1 | 2 | 3
type Allergen = (typeof ALLERGENS)[number]
const steps = ['Thông tin món', 'Nguyên liệu', 'Phân tích & gợi ý', 'Hình ảnh & hoàn tất'] as const
const bandFor = (proposal: KitchenDishProposal | null, school: School): SchoolAgeBand => proposal?.ageBand ?? defaultAgeBandForGrade(gradeForSchool(school.id))
const newIngredient = (): IngredientDraft => ({ key: uid(), inventoryItemId: '', name: '', amount: '', unit: 'g' })

export default function KitchenDishEditor({ school, role, value, onClose, onSaved }: {
  school: School; role: ViewRole; value: KitchenDishProposal | null; onClose: () => void; onSaved: (name: string, edited: boolean) => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [name, setName] = useState(value?.name ?? '')
  const [description, setDescription] = useState(value?.description ?? '')
  const [mealType, setMealType] = useState<BoardingMealType>(value?.mealType ?? 'LUNCH')
  const [ageBand, setAgeBand] = useState<SchoolAgeBand>(() => bandFor(value, school))
  const [weight, setWeight] = useState(String(value?.portionWeightGrams ?? 320))
  const [servings, setServings] = useState(String(value?.expectedQuantity ?? 485))
  const [priority, setPriority] = useState(String(value?.priority ?? 1))
  const [imageUrl, setImageUrl] = useState(value?.imageUrl ?? '')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [rows, setRows] = useState<IngredientDraft[]>(() => value?.ingredientRecords.map(row => ({ key: uid(), inventoryItemId: row.inventoryItemId ?? '', name: row.name, amount: String(row.amountPerServing ?? ''), unit: row.unit })) ?? [newIngredient()])
  const [goal, setGoal] = useState<NutritionGoal>('BALANCED')
  const [avoid, setAvoid] = useState<Allergen[]>([])
  const [threeStep, setThreeStep] = useState(value?.safetyMonitoring.threeStep ?? 'NOT_RECORDED')
  const [retainedSample, setRetainedSample] = useState(value?.safetyMonitoring.retainedSample ?? 'NOT_RECORDED')
  const [supervisor, setSupervisor] = useState(value?.safetyMonitoring.supervisor ?? '')
  const [recordedAt, setRecordedAt] = useState(value?.safetyMonitoring.recordedAt.slice(0, 16) ?? '')
  const [safetyNote, setSafetyNote] = useState(value?.safetyMonitoring.note ?? '')
  const [traceId, setTraceId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const grade = gradeForSchool(school.id)
  const kitchen = useMemo(() => kitchenDirectoryRepository.load().find(item => item.active && item.assignedSchoolIds.includes(school.id) && item.type === (role === 'central_kitchen' ? 'CENTRAL_KITCHEN' : 'ON_SITE')),[school.id, role])
  const stock = useMemo(() => inventoryItems.filter(item => item.schoolId === school.id && item.kitchenId === kitchen?.id && item.unit !== 'chai'),[school.id, kitchen?.id])
  const [today] = useState(todayIsoDate)
  const eligible = stock.filter(item => item.expiresAt >= today)
  const suppliers = useMemo(() => readSuppliers(), [])
  const nutrition = useMemo(() => analyzeRecipe(rows.map(row => ({ name: row.name, amount: Number(row.amount), unit: row.unit })), ageBand, mealType), [rows, ageBand, mealType])
  const suggested = useMemo(() => grade === 'KINDERGARTEN' ? [] : suggestMeals(mealType, ageBand, goal, avoid), [mealType, ageBand, goal, avoid, grade])
  const starterSuggestions = useMemo(() => grade === 'KINDERGARTEN' ? [] : suggestMeals(mealType, ageBand, 'BALANCED', []).slice(0, 3), [mealType, ageBand, grade])
  const linked = rows.filter(row => !!row.inventoryItemId).length
  const totalWeight = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const dirty = useMemo(() => JSON.stringify({ name, description, mealType, ageBand, weight, servings, priority, imageUrl, rows: rows.map(row => ({ inventoryItemId: row.inventoryItemId, name: row.name, amount: row.amount, unit: row.unit })), threeStep, retainedSample, supervisor, recordedAt, safetyNote }) !== JSON.stringify({ name: value?.name ?? '', description: value?.description ?? '', mealType: value?.mealType ?? 'LUNCH', ageBand: bandFor(value, school), weight: String(value?.portionWeightGrams ?? 320), servings: String(value?.expectedQuantity ?? 485), priority: String(value?.priority ?? 1), imageUrl: value?.imageUrl ?? '', rows: value?.ingredientRecords.map(row => ({ inventoryItemId: row.inventoryItemId ?? '', name: row.name, amount: String(row.amountPerServing ?? ''), unit: row.unit })) ?? [{ inventoryItemId: '', name: '', amount: '', unit: 'g' }], threeStep: value?.safetyMonitoring.threeStep ?? 'NOT_RECORDED', retainedSample: value?.safetyMonitoring.retainedSample ?? 'NOT_RECORDED', supervisor: value?.safetyMonitoring.supervisor ?? '', recordedAt: value?.safetyMonitoring.recordedAt.slice(0, 16) ?? '', safetyNote: value?.safetyMonitoring.note ?? '' }), [name, description, mealType, ageBand, weight, servings, priority, imageUrl, rows, threeStep, retainedSample, supervisor, recordedAt, safetyNote, school, value])
  const close = () => { if (!dirty || window.confirm('Bạn có thay đổi chưa lưu. Bạn muốn thoát khỏi form?')) onClose() }
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape' && !traceId) { if (!dirty || window.confirm('Các thay đổi chưa lưu sẽ bị mất. Đóng form?')) onClose() } }
    document.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', esc) }
  }, [dirty, onClose, traceId])
  const updateRow = (key: string, patch: Partial<IngredientDraft>) => setRows(current => current.map(row => row.key === key ? { ...row, ...patch } : row))
  const validate = (target: Step): string => {
    if (target >= 1) {
      if (!name.trim()) return 'Vui lòng nhập tên món.'
      if (!description.trim()) return 'Vui lòng nhập mô tả/cách chế biến.'
      if (!Number.isInteger(Number(servings)) || Number(servings) <= 0 || !Number.isFinite(Number(weight)) || Number(weight) <= 0 || !Number.isInteger(Number(priority)) || Number(priority) < 0) return 'Số suất, khối lượng hoặc thứ tự ưu tiên không hợp lệ.'
      if (!ageBandsForGrade(grade).includes(ageBand)) return 'Nhóm lớp không phù hợp cấp học.'
    }
    if (target >= 2) {
      if (!rows.length) return 'Cần ít nhất một nguyên liệu.'
      if (rows.some(row => !row.name.trim() || !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0)) return 'Nhập đủ tên và định lượng lớn hơn 0 cho từng nguyên liệu.'
      if (new Set(rows.map(row => row.name.trim().toLocaleLowerCase('vi'))).size !== rows.length) return 'Không được nhập trùng nguyên liệu trong cùng một món.'
      if (rows.some(row => row.inventoryItemId && !eligible.some(item => item.id === row.inventoryItemId && item.ingredientName === row.name))) return 'Có lô nguyên liệu hết hạn, sai bếp hoặc không khớp thực phẩm.'
    }
    return ''
  }
  const forward = () => { const target = (step + 1) as Step; const reason = step === 1 ? '' : validate(target === 3 ? 2 : target); if (reason) setError(reason); else { setError(''); setStep(target) } }
  const goTo = (next: Step) => { if (next < step) { setError(''); setStep(next) } else if (next === step) return; else { const reason = validate(next === 2 ? 1 : next === 3 ? 2 : next); if (reason) setError(reason); else { setError(''); setStep(next) } } }
  const applySuggestion = (recipe: typeof suggested[number]) => {
    setName(recipe.title); setDescription(recipe.description)
    setRows(recipe.ingredients.map(food => { const item = eligible.find(stockItem => stockItem.ingredientName.toLocaleLowerCase('vi') === food.name.toLocaleLowerCase('vi')); return { key: uid(), inventoryItemId: item?.id ?? '', name: item?.ingredientName ?? food.name, amount: String(food.amount), unit: food.unit } }))
    setWeight(String(Math.round(recipe.ingredients.reduce((sum, ingredient) => sum + ingredient.amount, 0))))
    setError('')
    setStep(1) // Trở lại định lượng để bếp xác nhận và liên kết lô của công thức gợi ý.
  }
  const upload = async (file?: File) => { if (!file) return; setPhotoBusy(true); try { setImageUrl(await compressDishPhoto(file)); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đọc ảnh.') } finally { setPhotoBusy(false) } }
  const save = (event: FormEvent) => {
    event.preventDefault()
    const reason = validate(2)
    if (reason) { setError(reason); setStep(!name.trim() || !description.trim() ? 0 : 1); return }
    if (!kitchen || !['central_kitchen', 'school_kitchen'].includes(role) || useUI.getState().role !== role || useUI.getState().schoolId !== school.id || photoBusy) { setError('Không có quyền lưu món hoặc ảnh chưa xử lý xong.'); return }
    if (grade === 'KINDERGARTEN') { setError('Bộ công thức đang hỗ trợ Tiểu học và THCS, chưa có tiêu chuẩn dành cho Mầm non.'); return }
    const ingredientRecords = rows.map(row => { const item = eligible.find(stockItem => stockItem.id === row.inventoryItemId); const supplier = item && suppliers.find(partner => partner.id === item.supplierId); return { inventoryItemId: item?.id, name: row.name.trim(), amountPerServing: Number(row.amount), unit: row.unit, supplier: supplier?.name ?? '', lotCode: item?.lotCode ?? '', origin: item?.origin ?? '' } })
    const now = nowIso()
    const proposal: KitchenDishProposal = { id: value?.id ?? uid(), schoolId: school.id, kitchenId: value?.kitchenId ?? kitchen.id, createdBy: role as 'central_kitchen' | 'school_kitchen', mealType, gradeLevel: grade, ageBand, name: name.trim(), description: description.trim(), imageUrl: imageUrl || undefined, expectedQuantity: Number(servings), portionWeightGrams: Number(weight), priority: Number(priority), ingredientRecords, safetyMonitoring: { threeStep, retainedSample, supervisor: supervisor.trim(), recordedAt: recordedAt ? new Date(recordedAt).toISOString() : '', note: safetyNote.trim() }, createdAt: value?.createdAt ?? now, updatedAt: now, demo: true }
    setSaving(true)
    try { kitchenDishProposalsRepository.save(proposal); onSaved(proposal.name, !!value) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu món.'); setSaving(false) }
  }
  return <div className="dish-editor-overlay" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
    <div className="dish-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="dish-editor-title">
      <header className="dish-editor-top"><div><span className="dish-label">BẾP ĂN HỌC ĐƯỜNG / DANH MỤC MÓN</span><h2 id="dish-editor-title">{value ? 'Chỉnh sửa công thức' : 'Tạo món ăn mới'}</h2><p>{school.name} · {role === 'central_kitchen' ? 'Bếp trung tâm' : 'Bếp tại trường'}</p></div><button className="dish-icon-button" type="button" aria-label="Đóng form" onClick={close}><X size={20}/></button></header>
      <nav className="dish-step-nav" aria-label="Các bước tạo món">{steps.map((label, index) => <button key={label} type="button" className={`dish-step ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} onClick={() => goTo(index as Step)} aria-current={index === step ? 'step' : undefined}><span className="dish-step-num">{index < step ? <Check size={14}/> : index + 1}</span><span>{label}</span></button>)}</nav>
      <form onSubmit={save} className="dish-editor-form" noValidate>
        <div className="dish-editor-scroll">
          {step === 0 && <div className="dish-editor-section">{starterSuggestions.length > 0 && <section className="dish-starter" aria-labelledby="dish-starter-title"><div className="dish-starter-heading"><div><span><Sparkles size={15}/> BẮT ĐẦU NHANH</span><h3 id="dish-starter-title">Gợi ý món ăn phù hợp</h3><p>Chọn một công thức tham khảo để tự điền thông tin và nguyên liệu. Bạn vẫn có thể chỉnh sửa toàn bộ trước khi lưu.</p></div><small>{AGE_BAND_LABEL(ageBand)} · {mealTypeOptions.find(item => item.value === mealType)?.label}</small></div><div className="dish-starter-list">{starterSuggestions.map(recipe => { const summary = analyzeRecipe(recipe.ingredients, ageBand, mealType); return <button key={recipe.id} className="dish-starter-card" type="button" aria-label={`Dùng công thức gợi ý ${recipe.title}`} onClick={() => applySuggestion(recipe)}><span className="dish-starter-card-label"><Leaf size={14}/> CÔNG THỨC THAM KHẢO</span><strong>{recipe.title}</strong><p>{recipe.description}</p><small>{recipe.ingredients.length} nguyên liệu · {pretty(summary.energy)} kcal đã đối chiếu{!summary.isComplete?" (chưa đủ)":""}/suất</small><span className="dish-starter-card-action">Dùng công thức <ArrowRight size={15}/></span></button> })}</div></section>}<div className="dish-section-intro"><h3>Thông tin cơ bản</h3><p>Những thông tin Ban Giám hiệu sẽ thấy khi lựa chọn món đưa vào thực đơn.</p></div><div className="dish-fields">
            <label className="dish-field wide">Tên món <span>*</span><input autoFocus value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Cơm gà rau củ, canh bí đỏ" /></label>
            <label className="dish-field">Bữa ăn <span>*</span><select value={mealType} onChange={e => setMealType(e.target.value as BoardingMealType)}>{mealTypeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="dish-field">Nhóm lớp <span>*</span><select value={ageBand} onChange={e => setAgeBand(e.target.value as SchoolAgeBand)}>{AGE_BANDS.filter(item => ageBandsForGrade(grade).includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="dish-field">Khối lượng dự kiến (g/suất) <span>*</span><input type="number" min="0.01" step="any" value={weight} onChange={e => setWeight(e.target.value)}/></label>
            <label className="dish-field">Số suất dự kiến <span>*</span><input type="number" min="1" step="1" value={servings} onChange={e => setServings(e.target.value)}/></label>
            <label className="dish-field">Thứ tự ưu tiên<input type="number" min="0" step="1" value={priority} onChange={e => setPriority(e.target.value)}/></label>
            <label className="dish-field">Đơn vị chế biến<input disabled value={kitchen?.name ?? 'Chưa phân công bếp'} readOnly/></label>
            <label className="dish-field wide">Mô tả và hướng dẫn chế biến <span>*</span><textarea maxLength={500} value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Nguyên liệu chính, chế biến, cách phục vụ, lưu ý dinh dưỡng..." /></label>
          </div></div>}
          {step === 1 && <div className="dish-editor-section"><div className="dish-section-intro dish-section-inline"><div><h3>Nguyên liệu & định lượng</h3><p>Định lượng trên một suất ăn. Chỉ được chọn mã lô thực tế từ kho được phân công.</p></div><div className="dish-section-buttons"><button className="dish-secondary" type="button" onClick={() => { setError(''); setStep(2) }}><Sparkles size={16}/> Gợi ý công thức</button><button className="dish-secondary" type="button" onClick={() => setRows(items => [...items, newIngredient()])}><Plus size={16}/> Thêm nguyên liệu</button></div></div>
            <div className="dish-ingredient-list">{rows.map((row, index) => { const record = stock.find(item => item.id === row.inventoryItemId); const supplier = suppliers.find(item => item.id === record?.supplierId); return <div key={row.key} className="dish-ingredient-item"><div className="dish-ingredient-index"><strong>{String(index + 1).padStart(2, '0')}</strong><button aria-label={`Xóa nguyên liệu ${index + 1}`} type="button" onClick={() => setRows(items => items.filter(item => item.key !== row.key))}><Trash2 size={16}/></button></div><div className="dish-ingredient-content"><div className="dish-fields dish-ingredient-fields"><label className="dish-field">Thực phẩm <span>*</span><input list="dish-editor-food-list" value={row.name} onChange={e => updateRow(row.key, { name: e.target.value, inventoryItemId: '' })} placeholder="Chọn hoặc nhập tên thực phẩm" /></label><label className="dish-field">Định lượng / suất <span>*</span><div className="dish-inline-amount"><input type="number" min="0.01" step="any" value={row.amount} onChange={e => updateRow(row.key, { amount: e.target.value })}/><select aria-label={`Đơn vị của nguyên liệu ${index + 1}`} value={row.unit} onChange={e => updateRow(row.key, { unit: e.target.value as 'g' | 'ml' })}><option value="g">g</option><option value="ml">ml</option></select></div></label><label className="dish-field wide">Liên kết lô kho<select value={row.inventoryItemId} onChange={e => { const selected = stock.find(item => item.id === e.target.value); updateRow(row.key, { inventoryItemId: e.target.value, name: selected?.ingredientName ?? row.name, unit: selected?.unit === 'lít' ? 'ml' : 'g' }) }}><option value="">Chưa đối chiếu lô — công thức dự kiến</option>{stock.map(item => <option key={item.id} value={item.id} disabled={item.expiresAt < today}>{item.ingredientName} · {item.lotCode}{item.expiresAt < today ? ' (Hết hạn)' : ''}</option>)}</select></label></div><div className="dish-source-info"><span>Nhà cung cấp: <b>{supplier?.name ?? 'Chưa đối chiếu'}</b></span><span>Mã lô: <b>{record?.lotCode ?? 'Chưa có'}</b></span>{record && <button type="button" onClick={() => setTraceId(record.id)}><FileSearch size={14}/> Xem hồ sơ</button>}</div>{row.name.trim() && !findFood(row.name) && <p className="dish-inline-warning"><AlertTriangle size={14}/> Tên chưa khớp Phụ lục 7 QĐ 3958/QĐ-BYT. Vui lòng dùng đúng loại thực phẩm và số gam ăn được.</p>}</div></div> })}</div>
            <datalist id="dish-editor-food-list">{FOOD_REFERENCE.map(item => <option key={item.name} value={item.name}/>)}</datalist><div className="dish-ingredient-foot"><span><Scale size={16}/> Tổng định lượng đã nhập: <b>{pretty(totalWeight)}</b> <small>(g/ml, cần quy đổi từng nguyên liệu về gam ăn được)</small></span><span>{linked}/{rows.length} nguyên liệu đã đối chiếu lô</span></div>
          </div>}
          {step === 2 && <div className="dish-editor-section"><div className="dish-assistant-hero"><Sparkles size={24}/><div><h3>Trợ lý dinh dưỡng học đường</h3><p>Gợi ý theo nhóm lớp và mục tiêu. Bộ tính theo quy tắc, dùng nguyên liệu đối chiếu đúng tên từ Phụ lục 7 Quyết định 3958/QĐ-BYT; không phải AI trực tuyến hay kết luận của chuyên gia.</p></div></div>
            <div className="dish-assistant-controls">
              <label className="dish-field dish-nutrition-goal">Mục tiêu dinh dưỡng<select value={goal} onChange={e => setGoal(e.target.value as NutritionGoal)}><option value="BALANCED">Cân đối nhóm chất</option><option value="PROTEIN">Ưu tiên nguồn đạm</option><option value="VEGETABLE">Bổ sung rau và chất xơ</option><option value="CALCIUM">Ưu tiên nguồn canxi</option></select><small>Ưu tiên thứ tự công thức phù hợp với mục tiêu đã chọn.</small></label>
              <fieldset className="dish-allergen-picker" role="group" aria-labelledby="dish-allergen-title" aria-describedby="dish-allergen-help">
                <legend className="dish-sr-only">Lọc tránh dị nguyên</legend>
                <div className="dish-allergen-header">
                  <span className="dish-allergen-icon" aria-hidden="true"><ShieldAlert size={20}/></span>
                  <div><strong id="dish-allergen-title">Lọc tránh dị nguyên</strong><small id="dish-allergen-help">Chọn thành phần cần loại khỏi danh sách công thức gợi ý.</small></div>
                  <div className="dish-allergen-actions"><span role="status" aria-live="polite">{avoid.length ? `${avoid.length} đã chọn` : 'Chưa chọn'}</span>{avoid.length > 0 && <button type="button" onClick={() => setAvoid([])}>Bỏ chọn tất cả</button>}</div>
                </div>
                <div className="dish-allergen-options">{ALLERGENS.map(item => { const selected = avoid.includes(item); return <label key={item} className={selected ? 'selected' : ''}><input type="checkbox" checked={selected} onChange={() => setAvoid(current => selected ? current.filter(one => one !== item) : [...current, item])}/><span className="dish-allergen-check" aria-hidden="true">{selected && <Check size={14}/>}</span><span>{item}</span></label> })}</div>
                <p className="dish-allergen-note"><ShieldAlert size={15}/><span><strong>Lưu ý:</strong> Bộ lọc hỗ trợ sàng lọc công thức DEMO, không thay thế việc kiểm tra nhãn, nguy cơ nhiễm chéo hoặc hồ sơ dị ứng của người dùng.</span></p>
              </fieldset>
            </div>
            <div className="dish-suggestion-summary" role="status" aria-live="polite"><div><strong>{suggested.length} công thức phù hợp</strong><span>{avoid.length ? `Đã loại công thức có ${avoid.join(', ')}.` : 'Đang hiển thị gợi ý theo mục tiêu dinh dưỡng.'}</span></div></div>
            <div className="dish-suggestion-grid">{suggested.map(recipe => <SpotlightCard key={recipe.id} className="dish-suggestion-card" theme="light" spotlightColor="#3cbd9f" intensity={0.09} borderGlow={0.1} proximity={26} flare={false} ambient={false}><span className="dish-rec-label"><Leaf size={14}/> GỢI Ý THAM KHẢO</span><h4>{recipe.title}</h4><p>{recipe.description}</p><small>{recipe.ingredients.length} nguyên liệu · {pretty(analyzeRecipe(recipe.ingredients, ageBand, mealType).energy)} kcal được đối chiếu</small><button type="button" className="dish-secondary" onClick={() => applySuggestion(recipe)}><Check size={15}/> Dùng công thức</button></SpotlightCard>)}{!suggested.length && <p className="dish-empty-note">Không có công thức phù hợp bộ lọc. Có thể giảm điều kiện loại trừ.</p>}</div>
            <div className="dish-analysis"><div className="dish-analysis-heading"><div><h3>Phân tích dinh dưỡng <small>/ một suất</small></h3><p>Chỉ tính nguyên liệu trùng tên Phụ lục 7 Bộ Y tế, theo gam phần ăn được. Khoảng tham chiếu dành cho toàn bữa, không phải từng món.</p></div><span className={nutrition.isComplete ? 'dish-complete' : 'dish-partial'}>Dữ liệu {pretty(nutrition.coverage)}%</span></div><div className="dish-metrics"><div className="dish-energy"><small>Năng lượng đối chiếu</small><strong>{pretty(nutrition.energy)}{!nutrition.isComplete ? '+' : ''} <em>kcal</em></strong><small>Tham chiếu bữa: {pretty(nutrition.energyTarget.min)}–{pretty(nutrition.energyTarget.max)} kcal</small></div>{([['protein', 'Đạm','g'],['fat','Chất béo','g'],['carbohydrate','Bột đường','g'],['fiber','Chất xơ','g'],['calcium','Canxi','mg'],['iron','Sắt','mg']] as const).map(([key,label,unit]) => <div key={key}><small>{label}</small><strong>{pretty(nutrition.totals[key])} <em>{unit}</em></strong></div>)}</div>
              {nutrition.ratios && nutrition.isComplete && <div className="dish-ratio"><b>Tỷ lệ năng lượng Đạm / Béo / Bột đường</b><p>{pretty(nutrition.ratios.protein)}% / {pretty(nutrition.ratios.fat)}% / {pretty(nutrition.ratios.carbohydrate)}%</p><div className="dish-ratio-track"><i style={{ width: `${nutrition.ratios.protein}%` }}/><i style={{ width: `${nutrition.ratios.fat}%` }}/><i style={{ width: `${nutrition.ratios.carbohydrate}%` }}/></div></div>}
              <div className="dish-nutrition-table-wrap"><table><thead><tr><th>Nguyên liệu</th><th>Khối lượng</th><th>kcal</th><th>Đạm (g)</th><th>Béo (g)</th><th>Bột đường (g)</th></tr></thead><tbody>{nutrition.matched.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.name}</td><td>{pretty(item.amount)} {rows.find(row => row.name === item.name)?.unit ?? 'g'}</td><td>{pretty(item.energy)}</td><td>{pretty(item.protein)}</td><td>{pretty(item.fat)}</td><td>{pretty(item.carbohydrate)}</td></tr>)}</tbody></table></div>
              {nutrition.allergens.length > 0 && <p className="dish-inline-warning"><ShieldAlert size={16}/> Dị nguyên tiềm ẩn: {nutrition.allergens.join(', ')} — cần xác minh trên thực phẩm thực tế.</p>}{nutrition.notes.map((note, index) => <p key={index} className="dish-analysis-note"><AlertTriangle size={14}/>{note}</p>)}<p className="dish-reference">Mốc năng lượng và các thực phẩm khớp tên: QĐ 3958/QĐ-BYT (25/12/2025), Phụ lục 7. Dữ liệu thiếu không được tính; cân phần ăn được và xác minh hao hụt khi chế biến.</p>
            </div></div>}
          {step === 3 && <div className="dish-editor-section"><div className="dish-section-intro"><h3>Hình ảnh & hoàn tất</h3><p>Kiểm tra công thức, ảnh món và thông tin trước khi đưa vào thực đơn trình BGH duyệt.</p></div><div className="dish-finish-grid"><div><label className="dish-upload"><UploadCloud size={30}/><strong>{photoBusy ? 'Đang tối ưu ảnh…' : 'Tải ảnh món ăn'}</strong><small>JPG, PNG, WebP · Ảnh được tối ưu dung lượng</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }}/></label>{imageUrl && <button type="button" className="dish-text-button" onClick={() => setImageUrl('')}>Xóa ảnh đã chọn</button>}
              <fieldset className="dish-safety-fields"><legend><ClipboardCheck size={16}/> Khai báo giám sát nội bộ (tùy chọn)</legend><p>Không thay thế quy trình kiểm thực hoặc xác nhận của Ban Giám hiệu.</p><div className="dish-fields"><label className="dish-field">Kiểm thực ba bước<select value={threeStep} onChange={e => setThreeStep(e.target.value as typeof threeStep)}><option value="NOT_RECORDED">Chưa khai báo</option><option value="REPORTED">Đã khai báo nội bộ</option></select></label><label className="dish-field">Lưu mẫu thức ăn<select value={retainedSample} onChange={e => setRetainedSample(e.target.value as typeof retainedSample)}><option value="NOT_RECORDED">Chưa khai báo</option><option value="REPORTED">Đã khai báo nội bộ</option></select></label><label className="dish-field">Người ghi nhận<input value={supervisor} maxLength={100} onChange={e => setSupervisor(e.target.value)}/></label><label className="dish-field">Thời gian ghi nhận<input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)}/></label><label className="dish-field wide">Ghi chú<textarea value={safetyNote} maxLength={500} onChange={e => setSafetyNote(e.target.value)} rows={2}/></label></div></fieldset></div>
              <div className="dish-preview"><img src={dishImage(name, mealType, imageUrl)} alt={`Xem trước món ${name}`}/><div><small>XEM TRƯỚC MÓN ĐỀ XUẤT</small><h3>{name || 'Tên món ăn'}</h3><p>{description || 'Mô tả món ăn sẽ hiển thị tại đây'}</p><div className="dish-preview-facts"><span>{AGE_BAND_LABEL(ageBand)}</span><span>{pretty(Number(weight) || 0)} g/suất</span><span>{rows.length} nguyên liệu</span><span>{pretty(nutrition.energy)} kcal đã đối chiếu/suất{!nutrition.isComplete ? ' (chưa đủ)' : ''}</span></div>{linked < rows.length && <p className="dish-inline-warning"><AlertTriangle size={15}/>{rows.length - linked} nguyên liệu chưa gắn lô kho; chỉ là công thức dự kiến.</p>}</div></div></div></div>}
          {error && <div role="alert" className="dish-error"><AlertTriangle size={17}/>{error}</div>}
        </div>
        <footer className="dish-editor-footer"><p><CheckCircle2 size={16}/> {value ? 'Chỉnh sửa món sẽ cập nhật danh mục đề xuất; thực đơn đã lập không tự thay đổi.' : 'Lưu món vào danh mục đề xuất; bếp đưa vào lịch và BGH duyệt thực đơn.'}</p><div><button type="button" className="dish-secondary" onClick={step ? () => { setError(''); setStep((step - 1) as Step) } : close}>{step ? <><ArrowLeft size={16}/> Quay lại</> : 'Hủy'}</button>{step < 3 ? <ClickSpark sparkColor="#2a9d89" sparkCount={6} sparkSize={5} duration={270}><button type="button" className="dish-primary" onClick={forward}>Tiếp tục <ArrowRight size={16}/></button></ClickSpark> : <button type="submit" className="dish-primary" disabled={saving || photoBusy}>{saving ? 'Đang lưu…' : <><Check size={17}/> {value ? 'Lưu thay đổi' : 'Lưu món đề xuất'}</>}</button>}</div></footer>
      </form>
    </div>{traceId && <IngredientTraceDialog stockItem={inventoryItems.find(item => item.id === traceId)} onClose={() => setTraceId('')}/>}
  </div>
}
