import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, FilterX, Grid2X2, Leaf, List, Pencil, Plus, Search, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react'
import SpotlightCard from './components/react-bits/SpotlightCard'
import CountUp from './components/react-bits/CountUp'
import ClickSpark from './components/react-bits/ClickSpark'
import type { School } from './lib/data'
import type { ViewRole } from './lib/store'
import { getStoredUser } from './lib/authApi'
import { fetchMyKitchenContext, type MyKitchenContext } from './lib/myKitchenApi'
import { listKitchenDishes, deleteKitchenDish } from './lib/dishCatalogApi'
import { useUI } from './lib/store'
import { dishImage } from './lib/dishImages'
import { gradeForSchool, mealTypeOptions } from './lib/boardingMenu'
import type { BoardingMealType, KitchenDishProposal } from './lib/boardingMenu'
import { AGE_BANDS, AGE_BAND_LABEL, ageBandsForGrade } from './lib/schoolNutrition'
import { analyzeOfficialRecipe as analyzeRecipe } from './lib/officialFoodNutrition'
import type { SchoolAgeBand } from './lib/schoolNutrition'
import KitchenDishEditor from './KitchenDishEditor'
import './KitchenDishCatalog.css'

const number = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
const date = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Chưa có' : parsed.toLocaleDateString('vi-VN') }
const age = (item: KitchenDishProposal): SchoolAgeBand => item.ageBand ?? (item.gradeLevel === 'SECONDARY' ? 'GRADES_6_9' : 'GRADES_1_2')
const recipe = (item: KitchenDishProposal) => analyzeRecipe(item.ingredientRecords.map(row => ({ name: row.name, amount: row.amountPerServing || 0, unit: row.unit })), age(item), item.mealType)
const nutritionDisplay = (summary: ReturnType<typeof recipe>) => summary.energy > 0 ? `${summary.isComplete ? '' : '≥ '}${number(summary.energy)} kcal` : 'Chưa đủ dữ liệu'
const nutritionStatus = (summary: ReturnType<typeof recipe>) => summary.isComplete ? 'Đã đối chiếu đủ dữ liệu Phụ lục 7' : summary.energy > 0 ? 'Dữ liệu chưa đầy đủ · giá trị tối thiểu đã tính' : 'Chưa đủ dữ liệu để tính năng lượng'
const stockComplete = (item: KitchenDishProposal) => item.ingredientRecords.length > 0
const mealName = (meal: BoardingMealType) => mealTypeOptions.find(option => option.value === meal)?.label ?? meal
const PAGE_SIZE = 8

type DisplayMode = 'grid' | 'table'
type SortMode = 'updated' | 'name' | 'kcal' | 'priority'

export default function KitchenDishCatalog({ school, role }: { school: School; role: ViewRole }) {
  const isKitchen = role === 'central_kitchen' || role === 'school_kitchen'
  const storedUser = getStoredUser()
  const [kitchenContext, setKitchenContext] = useState<MyKitchenContext | null>(null)
  const canManage = isKitchen && !!kitchenContext && storedUser?.role === (role === 'central_kitchen' ? 'CENTRAL_KITCHEN' : 'SCHOOL_KITCHEN') && kitchenContext.providerType === (role === 'central_kitchen' ? 'CENTRAL' : 'SCHOOL')
  const [proposals, setProposals] = useState<KitchenDishProposal[]>([])
  const [editor, setEditor] = useState<{ key: string; value: KitchenDishProposal | null } | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [meal, setMeal] = useState<BoardingMealType | ''>('')
  const [band, setBand] = useState<SchoolAgeBand | ''>('')
  const [source, setSource] = useState<'all' | 'linked' | 'missing'>('all')
  const [sort, setSort] = useState<SortMode>('updated')
  const [display, setDisplay] = useState<DisplayMode>('grid')
  const [page, setPage] = useState(1)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (!isKitchen || !storedUser?.kitchenId || storedUser.role !== (role === 'central_kitchen' ? 'CENTRAL_KITCHEN' : 'SCHOOL_KITCHEN')) {
      setProposals([])
      setKitchenContext(null)
      setError('Vui lòng đăng nhập bằng tài khoản bếp thực tế đã được gắn với hồ sơ bếp.')
      return
    }
    fetchMyKitchenContext().then(async context => {
      if (!active) return
      setKitchenContext(context)
      const assignedSchoolId = context.kitchen.schools?.[0]?.school.id ?? context.kitchen.schoolId ?? ''
      const items = await listKitchenDishes(assignedSchoolId, role as 'central_kitchen' | 'school_kitchen')
      if (active) { setProposals(items); setError('') }
    }).catch(reason => {
      if (active) { setProposals([]); setError(reason instanceof Error ? reason.message : 'Không tải được danh mục món từ máy chủ.') }
    })
    return () => { active = false }
  }, [school.id, role, isKitchen, storedUser?.kitchenId, storedUser?.role])
  useEffect(() => { setPage(1); setDetail(null); setDeleting(null); setEditor(null); setSuccess(''); setError('') }, [school.id, role])
  const own = useMemo(() => proposals.filter(item => !isKitchen || item.createdBy === role), [proposals, role, isKitchen])
  const rows = useMemo(() => {
    const key = query.trim().toLocaleLowerCase('vi')
    return own.filter(item => (!key || `${item.name} ${item.description} ${item.ingredientRecords.map(row => row.name).join(' ')}`.toLocaleLowerCase('vi').includes(key)) && (!meal || item.mealType === meal) && (!band || age(item) === band) && (source === 'all' || (source === 'linked' ? stockComplete(item) : !stockComplete(item))))
      .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'vi') : sort === 'kcal' ? recipe(b).energy - recipe(a).energy : sort === 'priority' ? a.priority - b.priority : b.updatedAt.localeCompare(a.updatedAt))
  }, [own, query, meal, band, source, sort])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const shown = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = own.find(item => item.id === detail)
  const pendingDelete = own.find(item => item.id === deleting)
  const linkedCount = own.filter(stockComplete).length
  const needsReview = own.length - linkedCount
  const clearFilters = () => { setQuery(''); setMeal(''); setBand(''); setSource('all'); setSort('updated'); setPage(1) }
  const openCreate = () => { setError(''); setSuccess(''); if (canManage) setEditor({ key: `create-${Date.now()}`, value: null }) }
  const openEdit = (value: KitchenDishProposal) => { if (canManage && value.createdBy === role) { setDetail(null); setError(''); setEditor({ key: `${value.id}-${Date.now()}`, value }) } }
  const saveFinished = (name: string, edited: boolean, submitted: boolean) => { setEditor(null); setDetail(null); setSuccess(`Đã ${edited ? 'tạo phiên bản mới cho' : 'lưu'} món “${name}” vào cơ sở dữ liệu${submitted ? ' và gửi duyệt đến trường được phân công' : ' ở trạng thái bản nháp vì bếp chưa có trường nhận duyệt'}.`); setError(''); void fetchMyKitchenContext().then(context => listKitchenDishes(context.kitchen.schools?.[0]?.school.id ?? context.kitchen.schoolId ?? '', role as 'central_kitchen' | 'school_kitchen')).then(setProposals).catch(reason => setError(reason instanceof Error ? reason.message : 'Không thể tải lại danh mục món.')) }
  const deleteDish = () => {
    if (!pendingDelete || !canManage || useUI.getState().role !== role || useUI.getState().schoolId !== school.id) { setError('Không có quyền xóa món này.'); setDeleting(null); return }
    void deleteKitchenDish(pendingDelete.id).then(() => { setProposals(items => items.filter(item => item.id !== pendingDelete.id)); setSuccess(`Đã lưu trữ món “${pendingDelete.name}”. Lịch sử công thức và duyệt món vẫn được bảo toàn.`); setError(''); setDeleting(null); setDetail(null) }).catch(reason => { setError(reason instanceof Error ? reason.message : 'Không thể xóa món.'); setDeleting(null) })
  }
  const cardsActions = (item: KitchenDishProposal) => <div className="dish-card-actions"><button type="button" className="dish-action-view" onClick={() => setDetail(item.id)} aria-label={`Xem chi tiết ${item.name}`}><Eye size={16}/> Xem</button>{canManage && item.createdBy === role && <><button type="button" onClick={() => openEdit(item)} aria-label={`Sửa ${item.name}`}><Pencil size={16}/> Sửa</button><button type="button" className="dish-delete-action" onClick={() => setDeleting(item.id)} aria-label={`Lưu trữ ${item.name}`}><Trash2 size={16}/></button></>}</div>
  return <section className="dish-catalog" aria-label="Quản lý danh sách món ăn và dinh dưỡng">
    <div className="dish-catalog-hero"><div><span className="dish-label">DINH DƯỠNG HỌC ĐƯỜNG · {school.name.toLocaleUpperCase('vi')}</span><h2>Danh sách món ăn</h2><p>Quản lý công thức, định lượng và món bếp đề xuất để lập thực đơn trình Ban Giám hiệu duyệt.</p></div>{isKitchen && <ClickSpark sparkColor="#3da89d" sparkSize={6} sparkCount={8} duration={300}><button className="dish-primary dish-create-btn" type="button" onClick={openCreate} disabled={!canManage}><Plus size={18}/> Tạo món mới</button></ClickSpark>}</div>
    {isKitchen && !canManage && <div role="status" className="dish-notice"><AlertTriangle size={18}/> Vui lòng chọn trường có bếp phù hợp đã được phân công để tạo hoặc quản lý món.</div>}
    {gradeForSchool(school.id) === 'KINDERGARTEN' && <div className="dish-notice"><AlertTriangle size={18}/> Bộ dữ liệu dinh dưỡng này hiện dành cho Tiểu học và THCS, không áp dụng định mức cho Mầm non.</div>}
    {success && <div className="dish-toast success" role="status"><CheckCircle2 size={18}/>{success}<button type="button" aria-label="Đóng thông báo" onClick={() => setSuccess('')}><X size={16}/></button></div>}
    {error && <div className="dish-toast error" role="alert"><AlertTriangle size={18}/>{error}<button type="button" aria-label="Đóng lỗi" onClick={() => setError('')}><X size={16}/></button></div>}
    <div className="dish-stat-grid"><div className="dish-stat"><div className="dish-stat-icon blue"><List size={20}/></div><span>Tổng số món</span><strong><CountUp to={own.length} duration={0.65} trigger="load"/></strong><small>Công thức đã lưu</small></div><div className="dish-stat"><div className="dish-stat-icon green"><ShieldCheck size={20}/></div><span>Có công thức</span><strong><CountUp to={linkedCount} duration={0.65} trigger="load"/></strong><small>Từ phiên bản công thức gần nhất</small></div><div className="dish-stat"><div className="dish-stat-icon amber"><AlertTriangle size={20}/></div><span>Chưa có công thức</span><strong><CountUp to={needsReview} duration={0.65} trigger="load"/></strong><small>Chưa có thành phần công thức</small></div></div>
    <div className="dish-list-panel"><div className="dish-list-title"><div><h3>Kho món ăn đề xuất <span>{rows.length}</span></h3><p>Tìm nhanh theo tên món, mô tả hoặc nguyên liệu</p></div><div className="dish-layout-choice" role="group" aria-label="Chế độ hiển thị"><button type="button" onClick={() => setDisplay('grid')} aria-label="Hiển thị dạng thẻ" aria-pressed={display === 'grid'} className={display === 'grid' ? 'active' : ''}><Grid2X2 size={17}/></button><button type="button" onClick={() => setDisplay('table')} aria-label="Hiển thị dạng bảng" aria-pressed={display === 'table'} className={display === 'table' ? 'active' : ''}><List size={17}/></button></div></div>
      <div className="dish-toolbar"><label className="dish-search"><Search size={18}/><input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Tìm tên món hoặc nguyên liệu…" aria-label="Tìm kiếm món" /></label><label className="dish-filter"><span>Bữa ăn</span><select value={meal} onChange={event => { setMeal(event.target.value as typeof meal); setPage(1) }}><option value="">Tất cả bữa</option>{mealTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="dish-filter"><span>Nhóm lớp</span><select value={band} onChange={event => { setBand(event.target.value as typeof band); setPage(1) }}><option value="">Tất cả nhóm lớp</option>{AGE_BANDS.filter(item => ageBandsForGrade(gradeForSchool(school.id)).includes(item.id)).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="dish-filter"><span>Thành phần</span><select value={source} onChange={event => { setSource(event.target.value as typeof source); setPage(1) }}><option value="all">Tất cả</option><option value="linked">Đủ nguyên liệu</option><option value="missing">Thiếu nguyên liệu</option></select></label><label className="dish-filter"><span><SlidersHorizontal size={13}/> Sắp xếp</span><select value={sort} onChange={event => setSort(event.target.value as SortMode)}><option value="updated">Cập nhật gần nhất</option><option value="name">Tên món (A–Z)</option><option value="kcal">Năng lượng giảm dần</option><option value="priority">Ưu tiên</option></select></label></div>
      {rows.length === 0 ? <div className="dish-no-results"><div><Leaf size={26}/></div><h3>{own.length ? 'Không tìm thấy món phù hợp' : 'Chưa có món ăn nào'}</h3><p>{own.length ? 'Thử thay đổi các bộ lọc để xem lại danh sách.' : 'Bắt đầu với công thức đầu tiên, khai báo nguyên liệu và định lượng để Ban Giám hiệu có thể lựa chọn.'}</p><div>{own.length ? <button type="button" className="dish-secondary" onClick={clearFilters}><FilterX size={16}/> Xóa bộ lọc</button> : canManage ? <button type="button" className="dish-primary" onClick={openCreate}><Plus size={16}/> Tạo món đầu tiên</button> : null}</div></div> : display === 'grid' ? <div className="dish-grid">{shown.map(item => { const summary = recipe(item); const linked = stockComplete(item); return <SpotlightCard key={item.id} theme="light" className="dish-meal-card" spotlightColor="#3486c0" intensity={0.10} borderGlow={0.12} proximity={28} flare={false} ambient={false}><div className="dish-card-image"><img src={dishImage(item.name, item.mealType, item.imageUrl)} alt={`Ảnh minh họa ${item.name}`}/><span>{mealName(item.mealType)}</span></div><div className="dish-card-content"><div className="dish-card-status"><span className={linked ? 'dish-complete' : 'dish-partial'}>{linked ? <Check size={12}/> : <AlertTriangle size={12}/>} {linked ? 'Đủ nguyên liệu' : 'Thiếu nguyên liệu'}</span></div><h4 title={item.name}>{item.name}</h4><p>{item.description}</p><div className="dish-card-chips"><span>{AGE_BAND_LABEL(age(item))}</span><span>{number(item.portionWeightGrams)} g/suất</span></div><div className="dish-card-nutrition"><span><BarChart3 size={16}/> <b>{nutritionDisplay(summary)}</b> /suất</span><span>{item.ingredientRecords.length} nguyên liệu</span>{!summary.isComplete && <small className="dish-nutrition-status">{nutritionStatus(summary)}</small>}</div><div className="dish-card-bottom"><small><Clock3 size={13}/> {date(item.updatedAt)}</small>{cardsActions(item)}</div></div></SpotlightCard> })}</div> : <div className="dish-table-wrap"><table className="dish-table"><thead><tr><th>Tên món</th><th>Bữa ăn / Nhóm lớp</th><th>Định lượng</th><th>Dinh dưỡng / suất</th><th>Nguồn hàng</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>{shown.map(item => { const summary = recipe(item); return <tr key={item.id}><td><div className="dish-table-title"><img src={dishImage(item.name, item.mealType, item.imageUrl)} alt=""/><div><strong>{item.name}</strong><small>{item.ingredientRecords.length} nguyên liệu</small></div></div></td><td>{mealName(item.mealType)}<small>{AGE_BAND_LABEL(age(item))}</small></td><td>{number(item.portionWeightGrams)} g</td><td><b>{nutritionDisplay(summary)}</b><small>{nutritionStatus(summary)}</small></td><td><span className={stockComplete(item) ? 'dish-complete' : 'dish-partial'}>{stockComplete(item) ? 'Đủ nguyên liệu' : 'Thiếu nguyên liệu'}</span></td><td>{date(item.updatedAt)}</td><td>{cardsActions(item)}</td></tr> })}</tbody></table></div>}
      {rows.length > 0 && <div className="dish-pagination"><span>Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} / {rows.length} món</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Trang trước"><ChevronLeft size={17}/></button><span>Trang {currentPage}/{pages}</span><button type="button" disabled={currentPage >= pages} onClick={() => setPage(value => Math.min(pages, value + 1))} aria-label="Trang sau"><ChevronRight size={17}/></button></div></div>}
    </div>
    {selected && <div className="dish-detail-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null) }}><section className="dish-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="dish-detail-title"><div className="dish-detail-header"><div><span className="dish-label">CHI TIẾT MÓN ĂN</span><h2 id="dish-detail-title">{selected.name}</h2></div><button className="dish-icon-button" type="button" onClick={() => setDetail(null)} aria-label="Đóng chi tiết"><X size={20}/></button></div><div className="dish-detail-scroll"><img className="dish-detail-image" src={dishImage(selected.name, selected.mealType, selected.imageUrl)} alt={`Ảnh món ${selected.name}`}/><div className="dish-detail-meta"><span>{mealName(selected.mealType)}</span><span>{AGE_BAND_LABEL(age(selected))}</span><span>{number(selected.portionWeightGrams)} g/suất</span><span>{selected.expectedQuantity} suất</span></div><h3>Mô tả & cách chế biến</h3><p className="dish-detail-description">{selected.description}</p><h3>Thành phần / một suất</h3><div className="dish-detail-table-wrap"><table><thead><tr><th>Nguyên liệu</th><th>Định lượng</th><th>Mã nguyên liệu</th></tr></thead><tbody>{selected.ingredientRecords.map((row, index) => <tr key={index}><td>{row.name}</td><td>{number(row.amountPerServing ?? 0)} {row.unit}</td><td>{row.ingredientCode || '—'}</td></tr>)}</tbody></table></div><h3>Chỉ số dinh dưỡng ước tính</h3><div className="dish-detail-nutrients"><div><b>{nutritionDisplay(recipe(selected))}</b><small>năng lượng / suất</small></div>{([['protein','Đạm','g'],['fat','Béo','g'],['carbohydrate','Bột đường','g'],['fiber','Xơ','g'],['calcium','Canxi','mg'],['iron','Sắt','mg']] as const).map(([key,label,unit]) => <div key={key}><b>{number(recipe(selected).totals[key])}</b><small>{label} ({unit})</small></div>)}</div>{!recipe(selected).isComplete && <div className="dish-inline-warning"><AlertTriangle size={16}/> {nutritionStatus(recipe(selected))}. Các chỉ số hiện có chỉ phản ánh phần nguyên liệu đã đối chiếu, không phải tổng dinh dưỡng đầy đủ của món.</div>}<h3>Thông tin quản lý</h3><p className="dish-detail-description">Đơn vị tạo: {selected.createdBy === 'central_kitchen' ? 'Bếp trung tâm' : 'Bếp tại trường'} · Tạo ngày {date(selected.createdAt)} · Cập nhật {date(selected.updatedAt)}.</p><p className="dish-detail-description">Xác nhận an toàn thực phẩm: quản lý riêng tại phân hệ Giám sát & an toàn, không được xác nhận tự động từ danh mục.</p></div><footer><button type="button" className="dish-secondary" onClick={() => setDetail(null)}>Đóng</button>{canManage && selected.createdBy === role && <><button type="button" className="dish-secondary danger" onClick={() => setDeleting(selected.id)}><Trash2 size={16}/> Xóa</button><button type="button" className="dish-primary" onClick={() => openEdit(selected)}><Pencil size={16}/> Chỉnh sửa</button></>}</footer></section></div>}
    {pendingDelete && <div className="dish-confirm-overlay"><section className="dish-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dish-confirm-title" aria-describedby="dish-confirm-desc"><div className="dish-confirm-icon"><Trash2 size={24}/></div><h2 id="dish-confirm-title">Lưu trữ món ăn?</h2><p id="dish-confirm-desc">Bạn có chắc chắn muốn lưu trữ <b>“{pendingDelete.name}”</b>? Món sẽ ẩn khỏi danh mục đang sử dụng; lịch sử công thức, duyệt món và thực đơn cũ vẫn được bảo toàn.</p><div><button type="button" className="dish-secondary" onClick={() => setDeleting(null)}>Giữ lại món</button><button type="button" className="dish-danger-button" onClick={deleteDish}><Trash2 size={16}/> Lưu trữ món</button></div></section></div>}
    {editor && <KitchenDishEditor key={editor.key} school={school} role={role} value={editor.value} onClose={() => setEditor(null)} onSaved={saveFinished}/>}
  </section>
}
