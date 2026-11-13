import { useEffect, useState } from 'react'
import { CheckCircle2, CircleHelp, Utensils } from 'lucide-react'
import { boardingMenuRepository, defaultMealDish, gradeForSchool, parentMealChoiceRepository, PARENT_MEAL_CHOICES_EVENT, PARENT_MEAL_CHOICES_KEY, BOARDING_MENU_STORAGE_KEY } from './lib/boardingMenu'
import type { BoardingDish } from './lib/boardingMenu'
import { dishImage } from './lib/dishImages'
import { useUI } from './lib/store'
import './ParentMealChoice.css'

/** Lựa chọn độc lập theo mã học sinh, trường, ngày và bữa trưa; chưa có liên kết tài khoản thật. */
export default function ParentMealChoice({ schoolId, date }: { schoolId: string; date: string }) {
  const role = useUI(state => state.role)
  const [studentCode, setStudentCode] = useState(() => {
    try { return localStorage.getItem(`demo-student-code-${schoolId}`) || 'HS-DEMO-01' } catch { return 'HS-DEMO-01' }
  })
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    const storage = (event: StorageEvent) => { if (!event.key || [BOARDING_MENU_STORAGE_KEY, PARENT_MEAL_CHOICES_KEY].includes(event.key)) refresh() }
    window.addEventListener('storage', storage)
    window.addEventListener('demo-boarding-menu-updated', refresh)
    window.addEventListener(PARENT_MEAL_CHOICES_EVENT, refresh)
    return () => { window.removeEventListener('storage', storage); window.removeEventListener('demo-boarding-menu-updated', refresh); window.removeEventListener(PARENT_MEAL_CHOICES_EVENT, refresh) }
  }, [])
  void revision
  const dishes = (() => {
    try { return boardingMenuRepository.load().filter(dish => dish.schoolId === schoolId
      && dish.gradeLevel === gradeForSchool(schoolId) && dish.serviceDate === date && dish.mealType === 'LUNCH')
      .sort((a, b) => a.priority - b.priority) } catch { return [] as BoardingDish[] }
  })()
  const scope = { studentCode: studentCode.trim(), schoolId, gradeLevel: gradeForSchool(schoolId), serviceDate: date, mealType: 'LUNCH' as const }
  const selected = parentMealChoiceRepository.resolve(dishes, scope)
  const defaultDish = defaultMealDish(dishes)
  const choose = (dishId: string) => {
    try {
      parentMealChoiceRepository.select(scope, dishId)
      localStorage.setItem(`demo-student-code-${schoolId}`, scope.studentCode)
      setNotice('Đã lưu món cho học sinh trong bản DEMO trên trình duyệt này.')
      setError('')
      setRevision(value => value + 1)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Không lưu được lựa chọn.') }
  }
  if (role !== 'parent') return null
  return <section className="parent-meal-choice" aria-label="Chọn món cho học sinh">
    <div className="parent-choice-heading"><div><span className="section-kicker">LỰA CHỌN SUẤT ĂN · DEMO</span><h3>Chọn một món cho học sinh</h3><p>Ban Giám hiệu lên tối đa 5 món bữa trưa. Chưa chọn sẽ sử dụng món mặc định.</p></div><Utensils size={24} /></div>
    <label className="parent-choice-student">Mã học sinh <span>(mô phỏng, có thể nhập mã khác để chọn cho học sinh khác)</span><input aria-label="Mã học sinh để chọn món" value={studentCode} maxLength={60} onChange={event => { setStudentCode(event.target.value); setNotice(''); setError('') }} placeholder="VD: HS-DEMO-01" /></label>
    {!dishes.length ? <p className="parent-choice-empty">Ban Giám hiệu chưa lên món bữa trưa cho ngày này.</p> : <><div className="parent-choice-grid">{dishes.map(dish => {
      const picked = selected.dish?.id === dish.id
      return <button type="button" key={dish.id} className={`parent-choice-dish ${picked ? 'picked' : ''}`} onClick={() => choose(dish.id)} aria-pressed={picked}>
        <img src={dishImage(dish.name, dish.mealType, dish.imageUrl)} alt={`Ảnh minh họa ${dish.name}`} loading="lazy" />
        <span><strong>{dish.name}</strong><small>{dish.portionWeightGrams ? `${dish.portionWeightGrams} g/suất` : 'Chưa có định lượng'}</small>{defaultDish?.id === dish.id && <em>Món mặc định</em>}</span>
        {picked && <CheckCircle2 size={20} aria-label="Món đang chọn" />}
      </button>
    })}</div><div className="parent-choice-result"><CheckCircle2 size={18} /><span>{selected.explicit ? 'Đã chọn cho học sinh' : 'Áp dụng mặc định'}: <strong>{selected.dish?.name ?? 'Chưa có món'}</strong>{selected.replaced ? ' · Món đã chọn trước đó không còn, đã chuyển về mặc định.' : ''}</span></div></>}
    {notice && <p className="parent-choice-notice" role="status">{notice}</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <p className="parent-choice-disclaimer"><CircleHelp size={15} />Đây là lựa chọn DEMO lưu cục bộ theo mã học sinh, chưa liên kết tài khoản/phê duyệt suất ăn thực tế và chưa gửi đơn đặt món cho bếp.</p>
  </section>
}
