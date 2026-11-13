import readyServingDemo from './assets/ready-service-demo.jpg'
import supervisionCheckDemo from './assets/supervision-check-demo.svg'
import supervisionSampleDemo from './assets/supervision-sample-demo.svg'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, AlertCircle, ArrowRight, Bell, Building2, CalendarDays, CheckCheck, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock3, CookingPot, FileCheck2, FileSearch, Heart, House, Leaf, LogIn, Menu, MessageCircle, MessageSquareText, Moon, QrCode, School as SchoolIcon, Search, ShieldCheck, Scale, Sprout, Sun, Users, Utensils, Warehouse, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { demoData, demo, schools as demoSchools } from './lib/data'
import type { DayData, PublicInspection, School } from './lib/data'
import { useUI } from './lib/store'
import type { ViewRole } from './lib/store'
import './App.css'
import MobileNavigation from './MobileNavigation'
import Select from './components/ui/Select'
import CountUp from './components/react-bits/CountUp'
import SpotlightCard from './components/react-bits/SpotlightCard'
import ClickSpark from './components/react-bits/ClickSpark'
import { MealJourneyPanel, MealJourneyProgress } from './MealJourney'
import KitchenLegalDocuments from './KitchenLegalDocuments'
import { compactDateLabel, weekDates, weekdayLabel } from './lib/dates'
import IngredientTraceDialog from './IngredientTraceDialog'
import type { IngredientPortion } from './lib/data'
import './components/react-bits/integration.css'

const AdminPanel = lazy(() => import('./Admin'))
const CanteenGallery = lazy(() => import('./CanteenGallery'))
const PortionTracePage = lazy(() => import('./PortionTracePage'))
const BoardingMenuManager = lazy(() => import('./BoardingMenuManager'))
const FeedbackForm = lazy(() => import('./FeedbackForm'))
const roleLabels:Record<ViewRole,string> = {parent:'Phụ huynh',school_board:'Ban Giám hiệu',central_kitchen:'Bếp trung tâm',school_receiver:'Tiếp nhận tại trường',meal_service_staff:'Nhân viên ra món',school_kitchen:'Bếp tại trường',culture_social_office:'Ủy ban phường · Phòng VH–XH'}
const roleHomeHeadings:Record<Exclude<ViewRole,'parent'>,string>={school_board:'Chăm chút bữa ăn, mỗi ngày.',central_kitchen:'Từ căn bếp, gửi trọn an tâm.',school_receiver:'Tiếp nhận đúng chuyến, đúng trường.',meal_service_staff:'Sẵn sàng phục vụ, đúng từng mốc.',school_kitchen:'Từ căn bếp, gửi trọn an tâm.',culture_social_office:'Một góc nhìn, toàn địa bàn.'}
const adminNavigation = [{path:'/',label:'Tổng quan điều hành',icon:House},{path:'/thuc-don',label:'Thực đơn & bữa ăn',icon:Utensils},{path:'/giam-sat',label:'Giám sát & an toàn',icon:ShieldCheck},{path:'/ho-so-phap-ly',label:'Hồ sơ pháp lý & điều kiện bếp',icon:FileCheck2},{path:'/ma-qr-suat-an',label:'QR từng suất ăn',icon:QrCode},{path:'/quan-ly-kho',label:'Quản lý kho',icon:Warehouse},{path:'/nha-cung-cap',label:'Nhà cung cấp',icon:Building2},{path:'/phan-anh',label:'Phản ánh & góp ý',icon:MessageSquareText},{path:'/bao-cao',label:'Báo cáo tổng hợp',icon:CalendarDays}]
const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })
const navigation: { path: string; label: string; icon: LucideIcon }[] = [
  {path:'/', label:'Tổng quan', icon:House}, {path:'/bua-an',label:'Bữa ăn học đường',icon:Utensils}, {path:'/giam-sat',label:'Giám sát & an toàn',icon:ShieldCheck}, {path:'/ho-so-phap-ly',label:'Hồ sơ pháp lý & điều kiện bếp',icon:FileCheck2}, {path:'/phan-anh',label:'Phản ánh & góp ý',icon:MessageSquareText},
]
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN', {weekday:'long',day:'2-digit',month:'long',year:'numeric'})
function Badge({ children, amber = false }: { children: ReactNode; amber?: boolean }) { return <span className={`badge ${amber ? 'amber' : ''}`}>{amber ? <Clock3 size={12}/> : <CheckCheck size={13}/>} {children}</span> }
function Dialog({ title, children, close }: {title:string;children:ReactNode;close:()=>void}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const el = ref.current; el?.showModal(); return () => el?.close() }, [])
  return <dialog aria-label={title} ref={ref} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close() }}><div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Đóng" onClick={close}><X/></button></div>{children}</dialog>
}
function useReducedMotionPreference() {
 const [reduced,setReduced]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)
 useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[])
 return reduced
}
type MealDayModal = 'date'|'photo'|'meal'
/** Chi tiết bữa trưa trong ngày; dùng chung cho phụ huynh (bản công khai) và Phòng VH–XH (chỉ xem, cùng dữ liệu công khai). */
/** Bảng định lượng dùng đúng dữ liệu thực đơn của BGH (không tạo bộ dữ liệu DEMO riêng). */
function MealPortionSummary({ data }: { data: DayData }) {
  const [activeIngredient, setActiveIngredient] = useState<IngredientPortion | null>(null)
  const number = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
  const quantity = (amount: number, unit: 'g' | 'ml') => {
    if (amount >= 1000) return `${number(amount / 1000)} ${unit === 'g' ? 'kg' : 'lít'}`
    return `${number(amount)} ${unit}`
  }

  return <section className="meal-portion-panel" aria-label="Định lượng nguyên liệu theo thực đơn hôm nay">
    <div className="meal-portion-heading">
      <div className="meal-portion-heading-text">
        <span className="meal-portion-symbol"><Scale size={17}/></span>
        <div><span className="section-kicker">ĐỊNH LƯỢNG KHẨU PHẦN</span><h3>Nguyên liệu cho bữa ăn hôm nay</h3></div>
      </div>
      <span className="meal-portion-demo">DEMO · Ước tính</span>
    </div>
    {data.dishDetails.length === 0 ?
      <p className="meal-portion-empty">Chưa có thực đơn để hiển thị định lượng.</p> :
      <div className="meal-portion-dishes">
        {data.dishDetails.map((dish, index) => {
          const servings = dish.expectedServings ?? data.servings
          return <article className="meal-portion-dish" key={`${index}-${dish.name}`}>
            <div className="meal-portion-dish-head">
              <strong>{dish.name}</strong>
              <div className="meal-portion-metrics">
                <span>{dish.servingWeightGrams == null ? 'Chưa có khối lượng món' : `${number(dish.servingWeightGrams)} g/suất`}</span>
                <span>{number(servings)} suất dự kiến</span>
              </div>
            </div>
            {dish.ingredients.length ?
              <div className="meal-portion-table-wrap"><table className="meal-portion-table">
                <thead><tr><th scope="col">Nguyên liệu</th><th scope="col">1 suất</th><th scope="col">Tổng dự kiến</th></tr></thead>
                <tbody>{dish.ingredients.map((ingredient, itemIndex) =>
                  <tr key={`${ingredient.name}-${itemIndex}`}>
                    <th scope="row"><button type="button" className="meal-portion-ingredient-button" onClick={() => setActiveIngredient(ingredient)} title={`Xem nguồn gốc ${ingredient.name}`}><FileSearch size={14}/>{ingredient.name}<ChevronRight size={13}/></button></th>
                    <td>{quantity(ingredient.amount, ingredient.unit)}</td>
                    <td>{quantity(ingredient.amount * servings, ingredient.unit)}</td>
                  </tr>
                )}</tbody>
              </table></div> :
              <p className="meal-portion-empty">Chưa có định lượng nguyên liệu cho món này.</p>}
          </article>
        })}
      </div>}
    {activeIngredient && <IngredientTraceDialog record={{ name: activeIngredient.name, inventoryItemId: activeIngredient.inventoryItemId, amountPerServing: activeIngredient.amount, unit: activeIngredient.unit, supplier: activeIngredient.supplier ?? '', lotCode: activeIngredient.lotCode ?? '', origin: activeIngredient.origin ?? '' }} onClose={() => setActiveIngredient(null)}/>}
    <p className="meal-portion-disclaimer">Số liệu theo kế hoạch, chưa xác minh. Tổng lượng = định lượng mỗi suất × số suất dự kiến của từng món; khối lượng món sau chế biến có thể khác tổng nguyên liệu đầu vào.</p>
  </section>
}

function MealDayDetail({school,date,data,weekView,journeyPath,onOpen,onNavigate}:{school:School;date:string;data:DayData;weekView:boolean;journeyPath:string;onOpen:(modal:MealDayModal)=>void;onNavigate:(path:string)=>void}) {
  const readyEvent=data.events.find(event=>event.status==='READY'); const readyPhoto=readyEvent?.confirmed?readyEvent.photos[0]:undefined
  return <div className="content-grid" id="selected-day-detail"><section className="card meal-card"><div className="card-header"><div><div className="section-kicker">CHĂM CHÚT TỪNG BỮA ĂN</div><h2>{weekView?`Chi tiết ${weekdayLabel(date)}, ${compactDateLabel(date)}`:'Thực đơn hôm nay'} <span className="meal-pill">Bữa trưa</span></h2></div><button className="text-button" onClick={()=>weekView?onOpen('date'):onNavigate('/bua-an')}>{weekView?'Chọn ngày':'Xem thực đơn tuần'} <ChevronRight size={15}/></button></div><button className="meal-photo" aria-label={readyPhoto?'Xem ảnh thực tế khi sẵn sàng phục vụ':'Xem ảnh minh họa bữa ăn'} onClick={()=>onOpen('photo')}><img src={readyPhoto??data.photo} onError={event => { event.currentTarget.src = readyServingDemo }} alt={readyPhoto?'Ảnh mốc Sẵn sàng phục vụ đã công khai':'Ảnh minh họa bữa ăn DEMO'}/><span className={`photo-demo ${readyPhoto?'actual':''}`}><span/>{readyPhoto?`Ảnh thực tế khi sẵn sàng · ${readyEvent?.time}`:'Ảnh minh họa DEMO · Chưa có ảnh xác minh'}</span><span className="photo-tag"><Utensils size={13}/> {readyPhoto?'Sẵn sàng phục vụ':'Bữa trưa dự kiến'}</span></button><div className="meal-body"><div className="meal-summary"><div><span className="muted small-text">THỰC ĐƠN DỰ KIẾN</span><h3>{data.dishDetails.length ? 'Ngon miệng, trọn yêu thương' : 'Thực đơn chưa cập nhật'}</h3></div><Badge amber>{readyEvent?.confirmed?'Đã xác nhận':'Đã báo cáo'}</Badge></div><div className="dish-list">{data.dishDetails.length === 0 && <p className="empty-menu-note">Ban Giám hiệu chưa lên thực đơn cho bữa trưa ngày này.</p>}{data.dishDetails.map((dish,i)=><div key={dish.name}><span className={`dish-dot dish-${i}`}/><span>{dish.name}{dish.servingWeightGrams!==null&&<small>{dish.servingWeightGrams} g / suất</small>}</span></div>)}</div><div className="meal-meta"><span><Clock3 size={15}/>Phục vụ dự kiến <strong>11:00</strong></span><span><CookingPot size={15}/>{school.mode==='CENTRAL_KITCHEN'?'Bếp trung tâm':'Nấu tại trường'}</span></div><div className="meal-footer"><span><ShieldCheck size={16}/>Định lượng & dinh dưỡng ước tính</span><button className="text-button" onClick={()=>onOpen('meal')}>Xem thành phần <ArrowRight size={15}/></button></div><MealPortionSummary data={data}/></div></section>
    <section className="card journey-card"><div className="card-header"><div><div className="section-kicker">MINH BẠCH TỪ BẾP ĐẾN TRƯỜNG</div><h2>Hành trình bữa ăn</h2></div><span className="round-icon"><Activity size={19}/></span></div><MealJourneyProgress data={data} mode={school.mode} onReadyPhotoClick={()=>onOpen('photo')}/><button className="wide-link" onClick={()=>onNavigate(journeyPath)}>Xem toàn bộ nhật ký <ArrowRight size={16}/></button></section></div>
}
function PublicInspectionCard({ inspection }: { inspection: PublicInspection | null }) {
  const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!inspection) return <section className="card detail-section public-inspection-card"><div className="card-header"><div><div className="section-kicker">KẾT QUẢ CÓ THẨM QUYỀN</div><h2>Kiểm tra công khai</h2></div><ShieldCheck/></div><div className="empty-state"><FileCheck2 size={38}/><h3>Chưa có kết quả kiểm tra công khai</h3><p>Nhật ký vận hành do đơn vị báo cáo không thay thế kết quả kiểm tra của cơ quan có thẩm quyền.</p></div><div className="privacy"><CircleHelp size={20}/><p>Thông tin kiểm thực ba bước và lưu mẫu chỉ hiển thị sau khi được phê duyệt công khai.</p></div></section>
  return <section className="card detail-section public-inspection-card" aria-label="Hồ sơ kiểm tra công khai DEMO"><div className="card-header"><div><div className="section-kicker">KẾT QUẢ CÓ THẨM QUYỀN</div><h2>Kiểm tra công khai</h2></div><ShieldCheck/></div><article className="inspection-record"><div className="inspection-record-top"><span className="inspection-demo-label">DEMO</span><span className="inspection-published"><CheckCircle2 size={14}/>Đã chốt · Đã công khai</span></div><h3>{inspection.title}</h3><span className={`inspection-outcome ${inspection.outcome}`}>{inspection.outcome==='follow_up_required'?<AlertCircle size={13}/>:<CheckCircle2 size={13}/>} {inspection.outcome==='follow_up_required'?'Đang theo dõi khắc phục':'Không có nội dung cần theo dõi thêm'}</span><p className="inspection-summary">{inspection.summary}</p><div className="inspection-facts"><div><CalendarDays size={17}/><span><small>Ngày kiểm tra</small><strong>{shortDate(inspection.inspectedAt)}</strong></span></div><div><ClipboardCheck size={17}/><span><small>Nội dung cần theo dõi</small><strong>{inspection.findingCount.toLocaleString('vi-VN').padStart(2, '0')} nội dung</strong></span></div></div><div className="inspection-authority"><ShieldCheck size={19}/><span><small>Đơn vị thực hiện</small><strong>{inspection.authority}</strong></span></div><div className="inspection-scope"><small>Phạm vi công khai</small><p>{inspection.scope}</p></div><footer className="inspection-record-footer"><span>{inspection.recordNumber}</span><span>Công khai {new Date(inspection.publishedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span></footer></article><div className="privacy"><CircleHelp size={20}/><p>Đây là dữ liệu minh họa, không phải biên bản thật. Kết quả chỉ phản ánh phạm vi và thời điểm kiểm tra được nêu.</p></div></section>
}
/** Cùng một bản giám sát công khai cho đúng năm vai trò, không tách dữ liệu theo role. */
function SupervisionSection({school,data}:{school:School;data:DayData}) {
 const [photoPreview,setPhotoPreview]=useState<{url:string;title:string;description:string}|null>(null)
 const readyEvent=data.events.find(event=>event.status==='READY')
 const publishedPhoto=readyEvent?.confirmed ? readyEvent.photos[0] : undefined
 const monitoringImages=[
  {key:'ready',url:publishedPhoto??readyServingDemo,title:'Hình ảnh bữa ăn sẵn sàng phục vụ',description:publishedPhoto?'Ảnh do đơn vị ghi nhận và đã được công khai trong DEMO.':'Ảnh minh họa DEMO; chưa có ảnh thực tế được duyệt công khai.',badge:publishedPhoto?'ẢNH ĐÃ CÔNG KHAI':'ẢNH MINH HỌA DEMO'},
  {key:'inspection',url:supervisionCheckDemo,title:'Kiểm thực ba bước',description:'Hình vẽ minh họa nghiệp vụ kiểm thực; xem hồ sơ bên dưới để biết tình trạng ghi nhận.',badge:'MINH HỌA QUY TRÌNH'},
  {key:'sample',url:supervisionSampleDemo,title:'Lưu mẫu thức ăn',description:'Hình vẽ minh họa lưu mẫu; không thay thế nhật ký, nhiệt độ hoặc thời hạn lưu mẫu.',badge:'MINH HỌA QUY TRÌNH'},
 ]
 return <div className="supervision-stack">
  <section className="card supervision-photo-section" aria-labelledby="supervision-photos-title">
   <div className="card-header"><div><div className="section-kicker">HÌNH ẢNH MINH HỌA GIÁM SÁT</div><h2 id="supervision-photos-title">Theo dõi bữa ăn bằng hình ảnh</h2><p className="muted">Cùng bộ ảnh và dữ liệu công khai ở cả năm không gian: Phụ huynh, Ban Giám hiệu, Phòng VH–XH và hai bếp.</p></div><span className="round-icon"><ShieldCheck size={19}/></span></div>
   <div className="supervision-photo-grid">{monitoringImages.map(item=><button key={item.key} className="supervision-photo-card" type="button" onClick={()=>setPhotoPreview({url:item.url,title:item.title,description:item.description})} aria-label={`Xem lớn ${item.title}`}>
    <span className="supervision-photo-frame"><img src={item.url} alt={item.title} loading="lazy" onError={e=>{e.currentTarget.src=readyServingDemo}}/><span className="supervision-photo-badge">{item.badge}</span></span>
    <span className="supervision-photo-body"><strong>{item.title}</strong><small>{item.description}</small><span className="supervision-photo-link">Xem ảnh <ChevronRight size={14}/></span></span>
   </button>)}</div>
   <p className="supervision-media-note"><CircleHelp size={16}/>Hình minh họa không phải chứng từ, kết quả kiểm thực hoặc kết luận an toàn thực phẩm. Chỉ ảnh có xác nhận mới được giới thiệu là ảnh đã công khai.</p>
  </section>
  <div className="content-grid"><MealJourneyPanel school={school} data={data} onReadyPhotoClick={()=>setPhotoPreview({url:publishedPhoto??readyServingDemo,title:'Ảnh bước Sẵn sàng phục vụ',description:publishedPhoto?'Ảnh được ghi nhận và đã công khai trong chế độ DEMO.':'Ảnh minh họa DEMO; chưa có ảnh thực tế được duyệt công khai.'})}/><PublicInspectionCard inspection={data.publicInspection}/></div>
  {photoPreview&&<Dialog title={photoPreview.title} close={()=>setPhotoPreview(null)}><img className="full-photo" src={photoPreview.url} alt={photoPreview.title}/><p className="demo-note">{photoPreview.description}</p></Dialog>}
 </div>
}
function Login({close}:{close:()=>void}) {
 const setRole=useUI(s=>s.setRole);const navigate=useNavigate();const cache=useQueryClient()
 // Chỉ ba vai trò hiển thị được phép đăng nhập/chuyển không gian trong DEMO.
 const options:{role:ViewRole;name:string;description:string;icon:LucideIcon}[]=[
  {role:'parent',name:'Phụ huynh',description:'Theo dõi thực đơn và giám sát bữa ăn công khai',icon:Users},
  {role:'school_board',name:'Ban Giám hiệu',description:'Lập thực đơn, giám sát và theo dõi nhà trường',icon:SchoolIcon},
  {role:'culture_social_office',name:'Ủy ban phường · Phòng VH–XH',description:'Giám sát bữa ăn công khai theo trường trên địa bàn',icon:ShieldCheck},
  {role:'central_kitchen',name:'Bếp trung tâm',description:'Theo dõi thực đơn, tiến trình chế biến và giám sát chung',icon:CookingPot},
  {role:'school_kitchen',name:'Bếp tại trường',description:'Xem thực đơn và nhật ký giám sát theo trường',icon:Utensils},
 ]
 return <Dialog title="Khám phá không gian làm việc" close={close}><p className="muted">Chọn một trong năm vai trò để trải nghiệm giao diện. Đây là bản frontend minh họa, không xác thực tài khoản thật.</p><div className="role-options">{options.map(item=><button key={item.role} aria-label={item.name} onClick={()=>{void cache.invalidateQueries();setRole(item.role);navigate('/');close()}}><span><item.icon size={23}/></span><div><strong>{item.name}</strong><small>{item.description}</small></div><ChevronRight size={18}/></button>)}</div><p className="demo-note">DEMO · Thao tác chỉ lưu trên trình duyệt hiện tại, không gửi tới đơn vị thật.</p></Dialog>
}
function Shell() {
 const {schoolId,date,role,setSchool,setDate} = useUI(); const location = useLocation(); const navigate=useNavigate()
 const reducedMotion=useReducedMotionPreference(); const [drawer,setDrawer]=useState(false); const [modal,setModal]=useState<string|null>(null); const [dark,setDark]=useState(false); const [search,setSearch]=useState('')
 const pendingDetailScroll=useRef(false)
 const queryClient = useQueryClient()
 useEffect(() => {
   const refresh = () => { void queryClient.invalidateQueries({queryKey:['day']}); void queryClient.invalidateQueries({queryKey:['week']}) }
   const onStorage = (event: StorageEvent) => { if (!event.key || event.key === 'demo-boarding-menu-v2' || event.key === 'demo-boarding-menu-v1' || event.key === 'demo-admin-meals') refresh() }
   window.addEventListener('storage', onStorage)
   window.addEventListener('demo-boarding-menu-updated', refresh)
   return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('demo-boarding-menu-updated', refresh) }
 }, [queryClient])
 const week=weekDates(date)
 const schoolQuery=useQuery({queryKey:['schools'],queryFn:demoData.schools})
 const allSchools=schoolQuery.data??demoSchools
 const availableSchools=allSchools
 const school=availableSchools.find(s=>s.id===schoolId) ?? availableSchools[0] ?? demoSchools[0]!
 // Bản công khai của phụ huynh là nguồn đọc chuẩn cho cả năm vai trò, bao gồm quy tắc chỉ hiện ảnh đã duyệt.
 const query=useQuery({queryKey:['day',school.id,date],queryFn:()=>demoData.day(school,date),enabled:!!schoolQuery.data})
 /** Vai trò tác nghiệp và phụ huynh dùng chung cấu trúc bảng; chế độ công khai chỉ đọc dữ liệu được phép hiển thị. */
 const sharedAdminArea=role!=='parent'&&['/thuc-don','/giam-sat','/ho-so-phap-ly'].includes(location.pathname)
 const sharedReferenceArea=role!=='parent'&&location.pathname==='/giam-sat'
 const weeklyQuery=useQuery({queryKey:['week',school.id,week[0]],queryFn:async()=>Promise.all(week.map(async item=>({date:item,data:await demoData.day(school,item)}))),enabled:role==='parent'&&location.pathname==='/bua-an'&&!!schoolQuery.data})
 const feedback=useQuery({queryKey:['feedback'],queryFn:demoData.feedback,enabled:location.pathname==='/phan-anh'})
 const data=query.data; const readyEvent=data?.events.find(event=>event.status==='READY'); const readyPhoto=readyEvent?.confirmed?readyEvent.photos[0]:undefined
 const adminNav=adminNavigation
 const wardReadOnlyPaths=['/','/thuc-don','/giam-sat','/ho-so-phap-ly','/phan-anh','/bao-cao']
 const nav=role==='parent'?navigation:role==='culture_social_office'?adminNav.filter(item=>wardReadOnlyPaths.includes(item.path)):adminNav
 const current=nav.find(item=>item.path===location.pathname) ?? nav[0]!
 const displayRole=roleLabels[role]
 const homeHeading=role==='parent'?'Bữa ăn của con, an tâm của bạn.':roleHomeHeadings[role]
 // Điều hướng trực tiếp tới trang đã gỡ (hoặc trang ngoài phạm vi) không được mở lại bằng URL cũ.

 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light'},[dark])
 useEffect(()=>{window.scrollTo(0,0)},[location.pathname,role])
 useEffect(()=>{if(!query.isLoading&&data&&pendingDetailScroll.current){pendingDetailScroll.current=false;requestAnimationFrame(()=>document.getElementById('selected-day-detail')?.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'start'}))}},[data,query.isLoading,reducedMotion])
 const portionToken=location.pathname.startsWith('/truy-xuat-suat/')?decodeURIComponent(location.pathname.slice('/truy-xuat-suat/'.length)):null
 if(portionToken) return <Suspense fallback={<div className="loading-grid" role="status" aria-label="Đang mở trang truy xuất"><div className="skeleton"/></div>}><PortionTracePage token={portionToken}/></Suspense>
 // Không cho mở màn hình đã bị loại bỏ bằng URL nhập trực tiếp.
 if (location.pathname==='/ho-so') return <Navigate to="/ho-so-phap-ly" replace/>
 if (!nav.some(item=>item.path===location.pathname)) return <Navigate to="/" replace/>
 
 const openFeedback=(kind='MEAL_QUALITY_REPORT')=>setModal(kind)
 const selectWeeklyDay=(selectedDate:string)=>{pendingDetailScroll.current=true;setDate(selectedDate)}
 return <div className="app-shell"><a className="skip-link" href="#main">Đến nội dung chính</a>{drawer&&<div className="sidebar-backdrop" onClick={()=>setDrawer(false)}/>}
 <aside className={`sidebar ${drawer?'open':''}`}><NavLink to="/" className="brand" onClick={()=>setDrawer(false)}><span className="brand-symbol"><Sprout size={26}/></span><span>Bữa ăn học đường<small>AN TÂM TỪ MỖI BỮA ĂN</small></span></NavLink><div className="workspace"><span className="workspace-icon"><Users size={19}/></span><div>{role==='parent'?'Không gian phụ huynh':displayRole}<small>{role==='parent'?'Đồng hành cùng nhà trường':'Không gian làm việc DEMO'}</small></div><span className="small-dot"/></div><p className="nav-label">KHÁM PHÁ</p><nav>{nav.map(item=><NavLink end={item.path==='/'} to={item.path} key={item.path} onClick={()=>setDrawer(false)}><item.icon size={19}/><span>{item.label}</span>{item.path==='/phan-anh'&&<span className="nav-dot"/>}</NavLink>)}</nav><div className="sidebar-bottom"><div className="trust-note"><span><ShieldCheck size={23}/></span><strong>Minh bạch mỗi ngày.<br/>An tâm mỗi bữa ăn.</strong><p>Kết nối gia đình, nhà trường<br/>và những bữa ăn của con.</p><button onClick={()=>setModal('about')}>Tìm hiểu hệ thống <ArrowRight size={14}/></button></div><button className="sidebar-link" onClick={()=>setModal('help')}><CircleHelp size={18}/>Trung tâm hỗ trợ<ArrowRight size={15}/></button><button className="profile" onClick={()=>setModal('login')}><span className="avatar">PH</span><span>{displayRole}<small>Chuyển không gian DEMO</small></span><LogIn size={17}/></button></div></aside>
 <div className="main-wrap"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Mở menu" onClick={()=>setDrawer(true)}><Menu/></button><span>{role==='parent'?'Không gian phụ huynh':displayRole}</span><ChevronRight size={13}/><strong>{current.label}</strong></div><div className="mobile-app-brand"><span><Sprout size={21}/></span><div>Bữa ăn học đường<small>{role==='parent'?'An tâm từ mỗi bữa ăn':displayRole}</small></div></div><div className="top-actions">{demo&&<span className="demo-pill">BẢN DEMO</span>}<button aria-label="Tìm kiếm trường" className="icon-button" onClick={()=>setModal('search')}><Search size={19}/></button><button className="icon-button" aria-label={dark?'Bật giao diện sáng':'Bật giao diện tối'} onClick={()=>setDark(!dark)}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><button className="icon-button notification-button" aria-label="Thông báo" onClick={()=>setModal('notifications')}><Bell size={19}/><i/></button><span className="top-divider"/><button className="avatar small" aria-label="Chuyển không gian làm việc" onClick={()=>setModal('login')}>PH</button></div></header>
 <main id="main"><div className="mobile-greeting"><div><span>{location.pathname==='/'?(role==='parent'?'ĐỒNG HÀNH CÙNG CON':displayRole.toUpperCase()):'BỮA ĂN HỌC ĐƯỜNG'}</span><h2>{location.pathname==='/'?(role==='parent'?'Hôm nay con ăn gì?':homeHeading):current.label}</h2></div><button className="mobile-date-button" aria-label="Chọn ngày theo dõi" onClick={()=>setModal('date')}><CalendarDays size={18}/><span>{new Date(date+'T12:00:00').toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</span><ChevronDown size={12}/></button></div><div className="page-heading"><div><div className="eyebrow"><span/> GẮN KẾT YÊU THƯƠNG, TRỌN VẸN AN TÂM</div><h1>{location.pathname==='/'?homeHeading:current.label}</h1><p>{role!=='parent'?'Theo dõi, phối hợp và quản lý hoạt động bữa ăn trong không gian minh họa.':location.pathname==='/'?'Cùng nhà trường chăm chút từng bữa ăn, đồng hành cùng con khôn lớn.':'Thông tin minh bạch, cập nhật từ nhà trường và đơn vị phụ trách.'}</p></div><button className="outline date-display" onClick={()=>setModal('date')}><CalendarDays size={16}/>{new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}<ChevronDown size={14}/></button></div>
 <SpotlightCard className="school-hero" spotlightColor="#e4bc70" intensity={0.3} spotlightSize={300} borderGlow={0.35} proximity={0} flare={false} theme="dark"><div className="hero-content"><span className="hero-eyebrow"><SchoolIcon size={15}/> {role==='parent'?'NGÔI TRƯỜNG CỦA CON':role==='culture_social_office'?'TRƯỜNG ĐANG THEO DÕI':'PHẠM VI NHÀ TRƯỜNG'}</span><div className="school-picker"><Select label="Chọn trường" variant="hero" value={school.id} onValueChange={setSchool} options={availableSchools.map(s=>({value:s.id,label:s.name,description:s.address}))}/></div><p className="hero-address">{school.address}</p><div className="hero-bottom"><span><span className="live-dot"/>{demo?'Dữ liệu minh họa':'Thông tin công khai'}</span><span className="hero-separator"/><span><Clock3 size={13}/> Cập nhật {data?.updatedAt ?? '—'}</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="plate"><div className="plate-inner"><Sprout size={59} strokeWidth={1.25}/></div></div><Utensils className="hero-utensils" size={80} strokeWidth={1}/><Leaf className="leaf-one" size={42} strokeWidth={1}/><Leaf className="leaf-two" size={24} strokeWidth={1}/><span className="hero-caption">Nuôi dưỡng hôm nay<br/><strong>Vững bước ngày mai.</strong></span></div></SpotlightCard>
 {role!=='parent'?<>
 {!['/giam-sat','/ho-so-phap-ly'].includes(location.pathname)&&<Suspense fallback={<div className="loading-grid"><div className="skeleton"/></div>}><AdminPanel school={school}/></Suspense>}
 {sharedAdminArea&&<div className="section-toolbar shared-admin-toolbar"><div className="segmented">{[{path:'/thuc-don',label:'Bữa ăn',icon:Utensils},{path:'/giam-sat',label:'Giám sát',icon:ShieldCheck},{path:'/ho-so-phap-ly',label:'Hồ sơ pháp lý',icon:FileCheck2}].map(t=><NavLink to={t.path} key={t.path} className={({isActive})=>isActive?'selected':''}><t.icon size={16}/>{t.label}</NavLink>)}</div><span className="updated"><span/> {demo?'Dữ liệu minh họa · Theo phạm vi vai trò':'Dữ liệu theo phạm vi được cấp'}</span></div>}
 {sharedAdminArea&&(schoolQuery.isError||query.isError)?<div className="error-panel" role="alert"><strong>Chưa tải được thông tin</strong><p>{(schoolQuery.error??query.error)?.message}</p><button className="outline" onClick={()=>{void schoolQuery.refetch();void query.refetch()}}>Thử lại</button></div>:<>{sharedReferenceArea&&(query.isLoading||!data)?<div className="loading-grid" role="status" aria-label="Đang tải dữ liệu"><div className="skeleton"/><div className="skeleton"/></div>:<>{location.pathname==='/giam-sat'&&data&&<SupervisionSection school={school} data={data}/>}
 {location.pathname==='/ho-so-phap-ly'&&<KitchenLegalDocuments school={school} role={role}/>}</>}</>}
 </>:schoolQuery.isError||query.isError?<div className="error-panel" role="alert"><strong>Chưa tải được thông tin</strong><p>{(schoolQuery.error??query.error)?.message}</p><button className="outline" onClick={()=>{void schoolQuery.refetch();void query.refetch()}}>Thử lại</button></div>:<>
 <ClickSpark className="rb-stats-sparks" sparkColor={['#5479df','#d89a30']} sparkSize={5} sparkRadius={18} sparkCount={6} duration={300} sparkWidth={1.4} disabled={!!reducedMotion}><div className="stats-grid">{[{icon:Utensils,value:data?.servings,label:'Suất ăn hôm nay',note:'Theo kế hoạch nhà trường',color:'green',path:'/bua-an'},{icon:CookingPot,value:data?.dishes.length,label:'Món trong thực đơn',note:'Cập nhật bởi Ban Giám hiệu',color:'blue',path:'/bua-an'},{icon:FileCheck2,value:data?`${data.events.filter(e=>e.confirmed).length}/${data.events.length}`:undefined,label:'Mốc đã xác nhận',note:'Theo nhật ký công khai',color:'orange',path:'/giam-sat'}].map(s=><button className="stat" key={s.label} onClick={()=>navigate(s.path)}><span className={`stat-icon ${s.color}`}><s.icon size={23}/></span><div><span className="stat-label">{s.label}</span><div className="stat-value">{typeof s.value==='number'?<CountUp to={s.value} duration={0.65} trigger="load"/>:s.value??<span className="skeleton stat-skeleton"/>}<span className="stat-note">{s.note}</span></div></div><ArrowRight size={16} className="stat-arrow"/></button>)}</div></ClickSpark>
 <div className="section-toolbar"><div className="segmented">{[{path:'/bua-an',label:'Bữa ăn',icon:Utensils},{path:'/giam-sat',label:'Giám sát',icon:ShieldCheck},{path:'/ho-so-phap-ly',label:'Hồ sơ pháp lý',icon:FileCheck2}].map(t=><NavLink to={t.path} key={t.path} className={({isActive})=>(isActive||(location.pathname==='/'&&t.path==='/bua-an'))?'selected':''}><t.icon size={16}/>{t.label}</NavLink>)}</div><span className="updated"><span/> {demo?'Dữ liệu minh họa · Không dùng thay kết quả chính thức':'Được cập nhật bởi nhà trường'}</span></div>
 {query.isLoading||!data?<div className="loading-grid" role="status" aria-label="Đang tải dữ liệu"><div className="skeleton"/><div className="skeleton"/></div>:<div className="route-content" key={location.pathname}>
 {(location.pathname==='/'||location.pathname==='/bua-an')&&<>{location.pathname==='/bua-an'&&<>{weeklyQuery.isError?<div className="error-panel" role="alert"><strong>Chưa tải được thực đơn tuần</strong><p>Vui lòng kiểm tra kết nối và thử lại.</p><button className="outline" onClick={()=>{void weeklyQuery.refetch()}}>Thử lại</button></div>:weeklyQuery.isLoading?<div className="loading-grid" role="status" aria-label="Đang tải thực đơn tuần"><div className="skeleton"/></div>:<Suspense fallback={<div className="loading-grid" role="status" aria-label="Đang tải thực đơn tuần"><div className="skeleton"/></div>}><BoardingMenuManager key={`public-${school.id}-${week[0]}`} school={school} selectedDate={date} managementScope={school.mode} readOnly publicView publicEntries={weeklyQuery.data??[]} onSelectDate={selectWeeklyDay}/></Suspense>}</>}
 <MealDayDetail school={school} date={date} data={data} weekView={location.pathname==='/bua-an'} journeyPath="/giam-sat" onOpen={setModal} onNavigate={path=>{void navigate(path)}}/>
 <div className="bottom-grid"><button className="trace-callout" onClick={()=>navigate('/giam-sat')}><span className="qr-tile"><ShieldCheck size={34}/></span><span><span className="section-kicker">MINH BẠCH MỖI NGÀY</span><strong>Giám sát hành trình bữa ăn.</strong><small>Nhật ký vận hành, kiểm tra và hồ sơ an toàn thực phẩm.</small></span><ArrowRight size={21}/></button><div className="feedback-callout"><span className="heart-icon"><Heart size={24}/></span><div><h3>Lắng nghe để tốt hơn mỗi ngày</h3><p>Ý kiến của bạn giúp bữa ăn của con tốt hơn.</p><div><button onClick={()=>openFeedback('MENU_SUGGESTION')}>Góp ý thực đơn <ArrowRight size={13}/></button><button onClick={()=>openFeedback()}>Phản ánh chất lượng <ArrowRight size={13}/></button></div></div></div></div></>}
 {location.pathname==='/giam-sat'&&<SupervisionSection school={school} data={data}/>}
 {location.pathname==='/ho-so-phap-ly'&&<KitchenLegalDocuments school={school} role={role}/>}
 {location.pathname==='/phan-anh'&&<section className="card detail-section"><div className="card-header"><div><div className="section-kicker">GIA ĐÌNH VÀ NHÀ TRƯỜNG</div><h2>Ý kiến của bạn</h2></div><button className="primary" onClick={()=>openFeedback()}><MessageCircle size={17}/>Gửi ý kiến</button></div>{feedback.isError?<div className="error-panel"><p>Đăng nhập để xem hồ sơ riêng tư hoặc thử lại kết nối.</p><button className="outline" onClick={()=>setModal('login')}>Đăng nhập</button></div>:feedback.isLoading?<div className="skeleton feedback-skeleton"/>:!feedback.data?.length?<div className="empty-state"><MessageSquareText size={40}/><h3>Mỗi ý kiến đều được trân trọng</h3><p>Bạn chưa gửi ý kiến nào. Hãy chia sẻ để cùng chăm chút bữa ăn của con.</p><button className="outline" onClick={()=>openFeedback('MENU_SUGGESTION')}>Góp ý thực đơn</button></div>:feedback.data.map(f=><article className="feedback-record" key={f.id}><div><strong>{f.kind==='MENU_SUGGESTION'?'Góp ý thực đơn':'Phản ánh chất lượng'}</strong><Badge amber>Đã tiếp nhận{demo?' tại DEMO':''}</Badge></div><p>{f.content}</p>{f.attachments.length>0&&<div className="feedback-record-photos" aria-label={`${f.attachments.length} ảnh đính kèm`}>{f.attachments.map((photo,index)=><img key={photo.id} src={photo.dataUrl} alt={`Ảnh đính kèm ${index+1}: ${photo.name}`}/>)}</div>}<small>{f.id} · {new Date(f.createdAt).toLocaleString('vi-VN')}</small>{demoData.reply(f.id)&&<blockquote className="parent-reply"><strong>Phản hồi minh họa từ nhà trường</strong><p>{demoData.reply(f.id)}</p></blockquote>}</article>)}</section>}
 </div>}
 </>}
 {location.pathname==='/'&&<Suspense fallback={null}><CanteenGallery/></Suspense>}
 <footer className="page-footer"><span><Sprout size={15}/> Vì những bữa ăn trọn vẹn của con.</span><span>{demo?'DEMO · Dữ liệu và ảnh minh họa':'Bữa ăn học đường'}<i/> <button onClick={()=>setModal('privacy')}>Quyền riêng tư</button><i/><button onClick={()=>setModal('help')}>Trợ giúp</button></span></footer>
 </main></div>
 <MobileNavigation role={role} account={()=>setModal('login')} more={()=>setDrawer(true)} accountOpen={modal==='login'}/>
 {(modal==='MEAL_QUALITY_REPORT'||modal==='MENU_SUGGESTION')&&<Suspense fallback={null}><FeedbackForm school={school} kind={modal} close={()=>setModal(null)}/></Suspense>}
 {modal==='login'&&<Login close={()=>setModal(null)}/>}
 {modal==='date'&&<Dialog title="Chọn ngày theo dõi" close={()=>setModal(null)}><label>Ngày phục vụ<input type="date" value={date} onChange={e=>{if(e.target.value)setDate(e.target.value)}}/></label><p className="muted">{dateLabel(date)}</p><button className="primary full" onClick={()=>setModal(null)}>Xem bữa ăn</button></Dialog>}
 {modal==='search'&&<Dialog title="Tìm trường học" close={()=>setModal(null)}><label>Tên trường<input autoFocus value={search} placeholder="Nhập tên trường…" onChange={e=>setSearch(e.target.value)}/></label><div className="search-results">{(schoolQuery.data??(demo ? demoSchools : [])).filter(s=>s.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).map(s=><button key={s.id} onClick={()=>{setSchool(s.id);setModal(null)}}><SchoolIcon size={20}/><span>{s.name}<small>{s.address}</small></span><ChevronRight size={16}/></button>)}</div></Dialog>}
 {modal==='photo'&&<Dialog title={readyPhoto?'Ảnh đã công khai ở bước Sẵn sàng phục vụ':'Ảnh minh họa bước Sẵn sàng phục vụ'} close={()=>setModal(null)}><img className="full-photo" src={readyPhoto??data?.photo??readyServingDemo} onError={event => { event.currentTarget.src = readyServingDemo }} alt={readyPhoto?'Ảnh mốc Sẵn sàng phục vụ đã công khai':'Ảnh minh họa bữa ăn DEMO'}/><p className="demo-note">{readyPhoto?`Ảnh được ghi nhận lúc ${readyEvent?.time} và đã được BGH xác nhận trong luồng DEMO. Xác nhận quy trình không phải kết luận an toàn thực phẩm.`:'Ảnh DEMO minh họa bước Sẵn sàng phục vụ. Chưa có ảnh thực tế được Ban Giám hiệu duyệt công khai.'}</p></Dialog>}
 {modal==='meal'&&data&&<Dialog title="Thành phần bữa trưa" close={()=>setModal(null)}><p className="meal-detail-context">{school.name} · {dateLabel(date)}</p><div className="nutrition-intro"><div><strong>Định lượng tham khảo</strong><span>Theo 1 suất ăn</span></div><Badge amber>Chưa xác minh</Badge></div><div className="dish-detail-list">{data.dishDetails.map((dish,i)=><article className="dish-detail" key={dish.name}><div className="dish-detail-heading"><span className={`dish-number dish-${i}`}>{String(i+1).padStart(2,'0')}</span><div><h3>{dish.name}</h3><p>{dish.servingWeightGrams!==null?`Khối lượng ${dish.servingWeightGrams} g / suất`:'Chưa có định lượng'}</p></div></div>{dish.ingredients.length>0?<div className="ingredient-chips" aria-label={`Thành phần món ${dish.name}`}>{dish.ingredients.map(ingredient=><span key={`${dish.name}-${ingredient.name}`}><strong>{ingredient.name}</strong>{ingredient.amount} {ingredient.unit}</span>)}</div>:<p className="dish-unverified">Chưa có thành phần được cung cấp.</p>}{dish.nutrition&&<div className="nutrition-grid"><span><small>Năng lượng</small><strong>{dish.nutrition.energyKcal} kcal</strong></span><span><small>Chất đạm</small><strong>{dish.nutrition.proteinGrams} g</strong></span><span><small>Tinh bột</small><strong>{dish.nutrition.carbohydrateGrams} g</strong></span><span><small>Chất béo</small><strong>{dish.nutrition.fatGrams} g</strong></span></div>}<p className="estimate-label">Số liệu ước tính · Chưa được chuyên gia xác nhận</p></article>)}</div><div className="detail-row"><span>Số suất dự kiến</span><strong>{data.servings}</strong></div><div className="detail-row"><span>Đơn vị chuẩn bị</span><strong>{data.kitchen}</strong></div><p className="demo-note">{demo?'DEMO · Định lượng và dinh dưỡng chỉ để minh họa cấu trúc thông tin, không dùng thay tư vấn chuyên môn.':'Định lượng do đơn vị báo cáo; chỉ hiển thị “đã xác nhận” khi có nguồn xác nhận phù hợp.'}</p><button className="primary full" onClick={()=>openFeedback('MENU_SUGGESTION')}>Góp ý thực đơn</button></Dialog>}
 {modal&&['about','help','privacy','notifications'].includes(modal)&&<Dialog title={{about:'An tâm từ mỗi bữa ăn',help:'Trung tâm hỗ trợ',privacy:'Quyền riêng tư',notifications:'Thông báo của bạn'}[modal]!} close={()=>setModal(null)}>{modal==='notifications'?<div className="empty-state"><Bell size={35}/><h3>Chưa có thông báo</h3><p>{demo?'Bản demo không gửi hoặc nhận thông báo thật.':'Đăng nhập để nhận thông báo thuộc phạm vi của bạn.'}</p></div>:modal==='privacy'?<div className="prose"><p>Thông tin bữa ăn công khai không bao gồm dữ liệu cá nhân của học sinh hoặc phụ huynh.</p><p>Trong bản DEMO, ý kiến được lưu cục bộ trên trình duyệt. Chỉ nhập nội dung minh họa. Bản frontend không cung cấp xác thực hoặc bảo vệ dữ liệu như hệ thống thật.</p></div>:modal==='help'?<div className="prose"><h3>Cần hỗ trợ về bữa ăn?</h3><p>Gửi ý kiến trong mục Phản ánh & góp ý để nhà trường tiếp nhận. Trường hợp khẩn cấp, liên hệ ngay nhà trường và cơ quan có thẩm quyền tại địa phương.</p><button className="primary" onClick={()=>openFeedback()}>Gửi ý kiến</button></div>:<div className="prose"><Sprout size={40}/><p>Bữa ăn học đường kết nối gia đình, nhà trường và đơn vị cung cấp qua thông tin thực đơn và nhật ký giám sát bữa ăn.</p><p>Xác nhận quy trình không phải kết luận về mức độ an toàn thực phẩm.</p><p className="demo-note">Phiên bản phát triển · Chưa nghiệm thu vận hành chính thức.</p></div>}</Dialog>}
 </div>
}
export default function App(){return <QueryClientProvider client={client}><BrowserRouter><Shell/></BrowserRouter></QueryClientProvider>}
