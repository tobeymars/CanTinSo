import readyServingDemo from '../assets/ready-service-demo.jpg'
import { boardingMenuRepository, defaultMealDish, gradeForSchool, parentMealChoiceRepository } from './boardingMenu'
import type { BoardingMealType } from './boardingMenu'
import { dishImage } from './dishImages'
import { defaultAgeBandForGrade } from './schoolNutrition'
import { canViewUnconfirmedMealPhotos } from '../../packages/domain/policy'
import type { Actor, MealPhotoScope } from '../../packages/domain/policy'
export type School = { id: string; name: string; address: string; mode: 'ON_SITE' | 'CENTRAL_KITCHEN' }
export type MealEvent = {
  status: string
  label: string
  time: string
  actor: string
  confirmed: boolean
  /** Ảnh hiển thị cho người xem: phụ huynh chỉ nhận ảnh BGH đã xác nhận; vai trò nội bộ đúng phạm vi nhận cả ảnh chờ xác nhận (xem `confirmed`). */
  photos: string[]
  hasReportedPhotos: boolean
}
export type IngredientPortion = { name: string; amount: number; unit: 'g' | 'ml'; inventoryItemId?: string; supplier?: string; lotCode?: string; origin?: string }
export type NutritionEstimate = { energyKcal: number; proteinGrams: number; carbohydrateGrams: number; fatGrams: number }
export type DishDetail = {
  name: string
  servingWeightGrams: number | null
  /** Số suất dự kiến riêng của món, lấy từ thực đơn Ban Giám hiệu. */
  expectedServings: number
  ingredients: IngredientPortion[]
  nutrition: NutritionEstimate | null
  verification: 'estimated' | 'unverified'
}
export type PublicInspection = {
  id: string
  title: string
  recordNumber: string
  authority: string
  inspectedAt: string
  publishedAt: string
  scope: string
  summary: string
  findingCount: number
  outcome: 'follow_up_required' | 'no_follow_up'
}
export type DayData = { serviceDate: string; mealType: BoardingMealType; servings: number; suppliers: number; dishes: string[]; dishDetails: DishDetail[]; events: MealEvent[]; kitchen: string; photo: string; updatedAt: string; transportDistanceKm: number | null; transportDurationMinutes: number | null; publicInspection: PublicInspection | null; /** Hạn phục vụ do đơn vị ghi nhận; không được suy diễn thành hạn dùng pháp lý. */ mealUseByAt: string | null }
export type KitchenDocumentStatus = 'valid' | 'expiring' | 'missing' | 'not_applicable'
export type KitchenDocumentCategory = 'legal' | 'people' | 'facility' | 'operations'
export type KitchenDocument = {
  id: string
  title: string
  category: KitchenDocumentCategory
  status: KitchenDocumentStatus
  applicability: 'required' | 'conditional' | 'recurring'
  documentNumber?: string
  issuer?: string
  issuedAt?: string
  expiresAt?: string
  updatedAt?: string
  note: string
  publicSummary: string
}
export type PublicBatchDocument = {
  type: 'DELIVERY_NOTE' | 'ORIGIN_RECORD' | 'RECEIVING_RECORD'
  title: string
  reference: string
  recordedAt: string
  status: 'demo_reported'
}
export type PublicTraceLot = {
  id: string
  ingredient: string
  supplier: string
  lotCode: string
  origin: string
  producedAt: string
  expiresAt: string
  receivedAt: string
  receivingSummary: string
  linkedDish: string
  documents: PublicBatchDocument[]
}
export type FeedbackAttachment = { id: string; name: string; mimeType: 'image/jpeg'; size: number; dataUrl: string }
export type Feedback = { id: string; schoolId: string; kind: string; content: string; status: string; createdAt: string; attachments: FeedbackAttachment[] }
export const demo = true
/** Phạm vi DEMO của bữa ăn theo trường; cùng quy ước mã bếp và địa bàn với QR suất ăn và kho. */
export const mealScope = (school: School): MealPhotoScope => ({ schoolId: school.id, wardId: 'ward-binh-hung-hoa', kitchenId: school.mode === 'CENTRAL_KITCHEN' ? 'kitchen-an-tam' : `kitchen-${school.id}` })
/** Danh tính DEMO của vai trò đang xem trường đã chọn; chỉ mô phỏng phạm vi, không phải xác thực. */
export const demoMealViewer = (role: Actor['role'], school: School): Actor => ({
  id: `${role}.demo-user`, role,
  schoolId: ['school_board', 'school_receiver', 'meal_service_staff', 'school_kitchen'].includes(role) ? school.id : null,
  kitchenId: role === 'central_kitchen' ? 'kitchen-an-tam' : role === 'school_kitchen' ? mealScope(school).kitchenId : null,
  wardId: role === 'parent' ? null : mealScope(school).wardId,
})
export const schools: School[] = [
  { id: 'an-phu', name: 'Tiểu học An Phú', address: 'Phường Bình Hưng Hoà · Thành phố Hồ Chí Minh', mode: 'CENTRAL_KITCHEN' },
  { id: 'binh-an', name: 'Mầm non Bình An', address: 'Phường Bình Hưng Hoà · Thành phố Hồ Chí Minh', mode: 'ON_SITE' },
  { id: 'an-khanh', name: 'THCS An Khánh', address: 'Phường Bình Hưng Hoà · Thành phố Hồ Chí Minh', mode: 'ON_SITE' },
]
export const foodPhoto = readyServingDemo
export const publicTraceLots: PublicTraceLot[] = [
  {
    id:'rice-demo-01',ingredient:'Gạo thơm',supplier:'HTX Nông nghiệp An Phú',lotCode:'DEMO-GAO-1810',origin:'Vùng nguyên liệu minh họa · Đồng bằng sông Cửu Long',producedAt:'2026-09-28',expiresAt:'2027-03-28',receivedAt:'2026-10-17T06:35:00+07:00',receivingSummary:'Bao bì nguyên vẹn; số lượng giao nhận đã được ghi nhận trong phiếu DEMO.',linkedDish:'Cơm trắng',documents:[
      {type:'ORIGIN_RECORD',title:'Thông tin nguồn gốc lô',reference:'DEMO-NG-GAO-1810',recordedAt:'2026-10-16',status:'demo_reported'},
      {type:'RECEIVING_RECORD',title:'Phiếu kiểm tra tiếp nhận',reference:'DEMO-KT-1710-01',recordedAt:'2026-10-17',status:'demo_reported'},
    ],
  },
  {
    id:'chicken-demo-02',ingredient:'Thịt gà',supplier:'Thực phẩm An Tâm',lotCode:'DEMO-GA-1810',origin:'Cơ sở sơ chế minh họa · Thành phố Hồ Chí Minh',producedAt:'2026-10-17',expiresAt:'2026-10-19',receivedAt:'2026-10-17T07:05:00+07:00',receivingSummary:'Giao trong thùng bảo ôn; nhiệt độ tiếp nhận khai báo 4,2°C (DEMO).',linkedDish:'Gà kho gừng',documents:[
      {type:'DELIVERY_NOTE',title:'Phiếu giao hàng',reference:'DEMO-GH-1710-08',recordedAt:'2026-10-17',status:'demo_reported'},
      {type:'RECEIVING_RECORD',title:'Biên bản kiểm tra đầu vào',reference:'DEMO-KT-1710-02',recordedAt:'2026-10-17',status:'demo_reported'},
    ],
  },
  {
    id:'vegetable-demo-03',ingredient:'Rau củ theo mùa',supplier:'Nông trại Xanh',lotCode:'DEMO-RAU-1810',origin:'Vùng trồng minh họa · Lâm Đồng',producedAt:'2026-10-16',expiresAt:'2026-10-20',receivedAt:'2026-10-17T06:50:00+07:00',receivingSummary:'Rau củ được ghi nhận tình trạng cảm quan phù hợp tại thời điểm tiếp nhận DEMO.',linkedDish:'Canh rau củ',documents:[
      {type:'ORIGIN_RECORD',title:'Bảng kê nguồn gốc',reference:'DEMO-BK-RAU-1810',recordedAt:'2026-10-16',status:'demo_reported'},
      {type:'DELIVERY_NOTE',title:'Phiếu giao nhận',reference:'DEMO-GN-1710-11',recordedAt:'2026-10-17',status:'demo_reported'},
    ],
  },
  {
    id:'fruit-demo-04',ingredient:'Trái cây',supplier:'Nông sản Việt',lotCode:'DEMO-TC-1810',origin:'Vùng trồng minh họa · Tiền Giang',producedAt:'2026-10-15',expiresAt:'2026-10-21',receivedAt:'2026-10-17T07:20:00+07:00',receivingSummary:'Số lượng và tình trạng bên ngoài đã được đối chiếu theo phiếu giao nhận DEMO.',linkedDish:'Tráng miệng',documents:[
      {type:'ORIGIN_RECORD',title:'Thông tin vùng trồng',reference:'DEMO-VT-TC-1810',recordedAt:'2026-10-15',status:'demo_reported'},
      {type:'RECEIVING_RECORD',title:'Phiếu kiểm tra tiếp nhận',reference:'DEMO-KT-1710-04',recordedAt:'2026-10-17',status:'demo_reported'},
    ],
  },
]
const pause = () => new Promise(resolve => setTimeout(resolve, 280))
const minutesBetween = (start?: string, end?: string): number | null => {
  if (!start || !end) return null
  const [startHour,startMinute]=start.split(':').map(Number)
  const [endHour,endMinute]=end.split(':').map(Number)
  if ([startHour,startMinute,endHour,endMinute].some(value=>!Number.isFinite(value))) return null
  const duration=(endHour!*60+endMinute!)-(startHour!*60+startMinute!)
  return duration >= 0 ? duration : null
}
const publicInspections: Record<string, PublicInspection> = {
  'an-phu': {
    id: 'inspection-demo-an-phu-2026-041',
    title: 'Kiểm tra điều kiện tổ chức bữa ăn bán trú',
    recordNumber: 'DEMO/KT-ATTP/2026-041',
    authority: 'Đoàn kiểm tra liên ngành phường Bình Hưng Hoà (minh họa)',
    inspectedAt: '2026-10-08',
    publishedAt: '2026-10-10T09:15:00+07:00',
    scope: 'Hồ sơ, khu vực tiếp nhận và quy trình phục vụ bữa trưa',
    summary: 'Biên bản DEMO ghi nhận 02 nội dung cần bổ sung hồ sơ. Đơn vị đã gửi phản hồi và đang chờ xác nhận kết quả khắc phục.',
    findingCount: 2,
    outcome: 'follow_up_required',
  },
  'binh-an': {
    id: 'inspection-demo-binh-an-2026-035',
    title: 'Kiểm tra định kỳ bếp ăn tại trường',
    recordNumber: 'DEMO/KT-ATTP/2026-035',
    authority: 'Đoàn kiểm tra liên ngành phường Bình Hưng Hoà (minh họa)',
    inspectedAt: '2026-09-25',
    publishedAt: '2026-09-27T14:30:00+07:00',
    scope: 'Hồ sơ bếp, khu sơ chế và nhật ký kiểm thực',
    summary: 'Biên bản DEMO ghi nhận 01 nội dung cần bổ sung trong hồ sơ nhà cung cấp. Phản hồi khắc phục đang được theo dõi.',
    findingCount: 1,
    outcome: 'follow_up_required',
  },
  'an-khanh': {
    id: 'inspection-demo-an-khanh-2026-038',
    title: 'Kiểm tra điều kiện phục vụ suất ăn bán trú',
    recordNumber: 'DEMO/KT-ATTP/2026-038',
    authority: 'Đoàn kiểm tra liên ngành phường Bình Hưng Hoà (minh họa)',
    inspectedAt: '2026-10-02',
    publishedAt: '2026-10-04T08:45:00+07:00',
    scope: 'Hồ sơ tổ chức bếp, lưu mẫu và khu vực phục vụ',
    summary: 'Biên bản DEMO không ghi nhận nội dung cần theo dõi thêm tại thời điểm kiểm tra. Kết quả này không thay cho đánh giá ở thời điểm khác.',
    findingCount: 0,
    outcome: 'no_follow_up',
  },
}
const kitchenDocuments: KitchenDocument[] = [
  { id:'business-registration', title:'Đăng ký kinh doanh / quyết định thành lập', category:'legal', status:'valid', applicability:'conditional', documentNumber:'DEMO-DKKD-2024-018', issuer:'Cơ quan đăng ký kinh doanh (minh họa)', issuedAt:'2024-08-12', updatedAt:'2026-09-30', note:'Áp dụng theo loại hình pháp lý của đơn vị vận hành bếp.', publicSummary:'Đã có hồ sơ nhận diện pháp lý của đơn vị vận hành. Thông tin chi tiết chỉ hiển thị trong phạm vi được phép công khai.' },
  { id:'food-safety-certificate', title:'Giấy chứng nhận cơ sở đủ điều kiện ATTP', category:'legal', status:'expiring', applicability:'conditional', documentNumber:'DEMO-ATTP-0248', issuer:'Cơ quan có thẩm quyền (minh họa)', issuedAt:'2024-01-15', expiresAt:'2027-01-15', updatedAt:'2026-10-10', note:'Nếu cơ sở thuộc diện miễn cấp, cần lưu căn cứ và hồ sơ chứng minh tương ứng thay cho giấy chứng nhận.', publicSummary:'Hồ sơ minh họa đang trong thời gian hiệu lực và được đánh dấu sắp đến kỳ rà soát.' },
  { id:'meal-service-contract', title:'Hợp đồng cung cấp suất ăn / quyết định tổ chức bếp', category:'legal', status:'valid', applicability:'required', documentNumber:'DEMO-HĐ-2026-09', issuer:'Nhà trường và đơn vị cung cấp (minh họa)', issuedAt:'2026-08-20', expiresAt:'2027-05-31', updatedAt:'2026-09-05', note:'Hồ sơ phải xác định rõ đơn vị chịu trách nhiệm, phạm vi phục vụ và thời hạn.', publicSummary:'Đã ghi nhận văn bản xác lập trách nhiệm tổ chức bữa ăn cho năm học hiện tại.' },
  { id:'supplier-files', title:'Hồ sơ pháp lý và hợp đồng nhà cung cấp', category:'legal', status:'missing', applicability:'required', updatedAt:'2026-10-12', note:'Cần đủ hồ sơ theo từng nhà cung cấp và nhóm nguyên liệu; chứng từ nhạy cảm không công khai.', publicSummary:'Còn thiếu hồ sơ của 1/4 nhà cung cấp trong bộ dữ liệu minh họa.' },
  { id:'health-checks', title:'Hồ sơ khám sức khỏe người trực tiếp chế biến', category:'people', status:'valid', applicability:'recurring', updatedAt:'2026-09-18', note:'Theo dõi theo từng nhân sự, thời điểm khám và thời hạn rà soát; không công khai dữ liệu sức khỏe cá nhân.', publicSummary:'Danh sách nhân sự thuộc phạm vi bếp đã được ghi nhận đầy đủ; dữ liệu sức khỏe được bảo vệ.' },
  { id:'food-safety-training', title:'Hồ sơ tập huấn kiến thức an toàn thực phẩm', category:'people', status:'valid', applicability:'recurring', updatedAt:'2026-09-22', note:'Lưu danh sách, nội dung, thời điểm tập huấn và xác nhận của đơn vị theo quy định áp dụng.', publicSummary:'Đã có hồ sơ tập huấn của nhóm nhân sự trực tiếp tham gia chế biến.' },
  { id:'water-testing', title:'Kết quả kiểm nghiệm nguồn nước sử dụng', category:'facility', status:'expiring', applicability:'recurring', documentNumber:'DEMO-NƯỚC-1026', issuer:'Đơn vị kiểm nghiệm (minh họa)', issuedAt:'2026-04-18', updatedAt:'2026-10-01', note:'Tần suất và chỉ tiêu kiểm nghiệm cần cấu hình theo nguồn nước và yêu cầu của cơ quan quản lý.', publicSummary:'Đã có kết quả minh họa; hệ thống đang nhắc lịch rà soát tiếp theo.' },
  { id:'pest-sanitation', title:'Hồ sơ vệ sinh, kiểm soát côn trùng và chất thải', category:'facility', status:'valid', applicability:'recurring', updatedAt:'2026-10-14', note:'Gồm kế hoạch, nhật ký thực hiện, hóa chất/dịch vụ sử dụng và đơn vị phụ trách khi áp dụng.', publicSummary:'Nhật ký vệ sinh và kiểm soát côn trùng đã được cập nhật trong kỳ.' },
  { id:'fire-safety', title:'Hồ sơ phòng cháy, chữa cháy và an toàn thiết bị', category:'facility', status:'not_applicable', applicability:'conditional', updatedAt:'2026-09-10', note:'Yêu cầu hồ sơ cụ thể phụ thuộc quy mô, công năng, thiết bị và phân loại cơ sở.', publicSummary:'Đang chờ đơn vị phụ trách xác định danh mục áp dụng cho khu bếp.' },
  { id:'three-step-records', title:'Sổ kiểm thực ba bước', category:'operations', status:'valid', applicability:'recurring', updatedAt:'2026-10-18', note:'Ghi nhận theo từng bữa/ca, người thực hiện, thời điểm và bằng chứng; bản đã xác nhận không được sửa đè.', publicSummary:'Nhật ký minh họa hôm nay đã ghi nhận đủ ba bước.' },
  { id:'food-sample-records', title:'Sổ lưu mẫu thức ăn và bàn giao / hủy mẫu', category:'operations', status:'valid', applicability:'recurring', updatedAt:'2026-10-18', note:'Theo dõi món, mã mẫu, lượng mẫu, thời gian lấy, điều kiện lưu, vị trí và sự kiện bàn giao/hủy.', publicSummary:'Mẫu lưu của bữa ăn minh họa hôm nay đã được ghi nhận.' },
  { id:'inspection-corrections', title:'Biên bản kiểm tra và hồ sơ khắc phục', category:'operations', status:'valid', applicability:'conditional', documentNumber:'DEMO/KT-ATTP/2026-041', issuer:'Đoàn kiểm tra liên ngành phường Bình Hưng Hoà (minh họa)', issuedAt:'2026-10-08', updatedAt:'2026-10-10', note:'Chỉ công khai kết quả đã được người/cơ quan có thẩm quyền xác nhận; bản tự khai phải hiển thị tách biệt.', publicSummary:'Đã có biên bản kiểm tra DEMO được chốt và duyệt công khai; 02 nội dung bổ sung đang được theo dõi khắc phục.' },
]
function readFeedback(): Feedback[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('demo-feedback') ?? '[]')
    if (!Array.isArray(value)) return []
    return value.flatMap(item => {
      if (typeof item !== 'object' || item === null) return []
      const candidate = item as Record<string, unknown>
      if (typeof candidate.id !== 'string' || typeof candidate.schoolId !== 'string' || typeof candidate.kind !== 'string' || typeof candidate.content !== 'string' || typeof candidate.status !== 'string' || typeof candidate.createdAt !== 'string') return []
      const attachments = Array.isArray(candidate.attachments) ? candidate.attachments.filter((attachment): attachment is FeedbackAttachment => {
        if (typeof attachment !== 'object' || attachment === null) return false
        const photo = attachment as Record<string, unknown>
        return typeof photo.id === 'string' && typeof photo.name === 'string' && photo.mimeType === 'image/jpeg' && typeof photo.size === 'number' && typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('data:image/jpeg;base64,')
      }).slice(0, 3) : []
      return [{ id: candidate.id, schoolId: candidate.schoolId, kind: candidate.kind, content: candidate.content, status: candidate.status, createdAt: candidate.createdAt, attachments }]
    })
  } catch { return [] }
}
export const demoData = {
  reply: (id:string):string => {try{return (JSON.parse(localStorage.getItem('demo-replies')??'{}') as Record<string,string>)[id]??''}catch{return ''}},
  schools: async (): Promise<School[]> => (await pause(), schools),
  /** Không truyền `viewer` (hoặc phụ huynh): chỉ trả ảnh đã được BGH xác nhận. */
  day: async (school: School, date: string, viewer?: Actor, mealType: BoardingMealType = 'LUNCH'): Promise<DayData> => {
    await pause()
    const showUnconfirmedPhotos = viewer ? canViewUnconfirmedMealPhotos(viewer, mealScope(school)) : false
    const stored = JSON.parse(localStorage.getItem('demo-admin-meals') ?? '[]') as {schoolId:string;date:string;mealType?:BoardingMealType;servings:number;dishes:string[];portions?:Record<string,number>;events:{status:string;time:string;confirmed:boolean;photos?:unknown;actorLabel?:unknown}[]}[]
    // Bản ghi cũ thiếu mealType mặc định là LUNCH. Không sử dụng nhật ký của bữa khác.
    const saved = stored.find(m => m.schoolId===school.id && m.date===date && (m.mealType ?? 'LUNCH')===mealType)
    const central = school.mode === 'CENTRAL_KITCHEN'
    // Đồng bộ thực đơn theo trường + khối lớp + ngày do BGH quản lý.
    // Bản ghi vận hành DEMO (demo-admin-meals) chỉ cung cấp hành trình, KHÔNG ghi đè tên món.
    let boardDishes: ReturnType<typeof boardingMenuRepository.load> = []
    try {
      boardDishes = boardingMenuRepository.load()
        .filter(dish => dish.schoolId === school.id && dish.gradeLevel === gradeForSchool(school.id)
          && dish.serviceDate === date && dish.mealType === mealType
          // Công khai tuyệt đối không dùng món nháp/chờ duyệt để hiển thị ở trang chủ.
          && (!viewer || (viewer.role !== 'parent' && viewer.role !== 'culture_social_office') || dish.status === 'APPROVED'))
        .sort((a, b) => a.priority - b.priority)
    } catch { /* Có thể vẫn hiển thị hành trình, nhưng không thay bằng thực đơn khác nguồn. */ }
    // Tổng quan phụ huynh chỉ trình bày đúng một món đang áp dụng cho mỗi bữa.
    // Các vai trò nội bộ vẫn nhận đủ phương án để quản lý và đối soát.
    if (viewer?.role === 'parent' && boardDishes.length) {
      const studentCode = localStorage.getItem(`demo-student-code-${school.id}`) || 'HS-DEMO-01'
      const gradeLevel = gradeForSchool(school.id)
      const appliedDish = parentMealChoiceRepository.resolve(boardDishes, {
        studentCode, schoolId: school.id, gradeLevel, ageBand: defaultAgeBandForGrade(gradeLevel),
        serviceDate: date, mealType,
      }).dish ?? defaultMealDish(boardDishes)
      boardDishes = appliedDish ? [appliedDish] : []
    }
    const selectedDishes = boardDishes.map(dish => dish.name)
    const dishDetails: DishDetail[] = boardDishes.map(dish => ({
      name: dish.name,
      servingWeightGrams: dish.portionWeightGrams ?? null,
      expectedServings: dish.expectedQuantity,
      ingredients: (dish.ingredientRecords ?? []).flatMap(item => item.amountPerServing === null
        ? [] : [{ name: item.name, amount: item.amountPerServing, unit: item.unit, inventoryItemId: item.inventoryItemId, supplier: item.supplier, lotCode: item.lotCode, origin: item.origin }]),
      nutrition: null,
      verification: 'unverified',
    }))
    const eventTimes = mealType==='BREAKFAST'
      ? {PREPARING:'05:45',DISPATCHED:'06:30',ARRIVED:'06:50',PLATED:'07:05',READY:'07:15'}
      : mealType==='LUNCH'
        ? {PREPARING:'08:30',DISPATCHED:'09:30',ARRIVED:'10:00',PLATED:'10:20',READY:'10:45'}
        : {PREPARING:'13:10',DISPATCHED:'13:45',ARRIVED:'14:00',PLATED:'14:10',READY:'14:20'}
    const events: MealEvent[] = saved ? saved.events.filter(e=>e.status!=='PREPARING').map(e=>{
      const reportedPhotos=e.status==='READY'&&Array.isArray(e.photos) ? e.photos.filter((photo):photo is string=>typeof photo==='string'&&photo.startsWith('data:image/')) : []
      return {status:e.status,label:({PREPARING:'Bắt đầu chế biến',DISPATCHED:'Xuất bếp',ARRIVED:'Đến trường',PLATED:'Ra món',READY:'Sẵn sàng phục vụ'} as Record<string,string>)[e.status] ?? e.status,time:e.time,actor:typeof e.actorLabel==='string'?e.actorLabel:'Người thao tác DEMO',confirmed:e.confirmed,photos:e.confirmed||showUnconfirmedPhotos?reportedPhotos:[],hasReportedPhotos:reportedPhotos.length>0}
    }) : [
      ...(central ? [{ status: 'DISPATCHED', label: 'Xuất bếp', time: eventTimes.DISPATCHED, actor: 'Bếp trung tâm An Tâm', confirmed: true, photos: [], hasReportedPhotos: false }, { status: 'ARRIVED', label: 'Đến trường', time: eventTimes.ARRIVED, actor: 'Nhân viên tiếp nhận', confirmed: true, photos: [], hasReportedPhotos: false }] : []),
      { status: 'PLATED', label: 'Ra món', time: eventTimes.PLATED, actor: 'Nhân viên bếp', confirmed: true, photos: [], hasReportedPhotos: false }, { status: 'READY', label: 'Sẵn sàng phục vụ', time: eventTimes.READY, actor: 'Nhân viên bếp (DEMO)', confirmed: true, photos: [], hasReportedPhotos: false },
    ]
    const dispatchedAt=events.find(event=>event.status==='DISPATCHED')?.time
    const arrivedAt=events.find(event=>event.status==='ARRIVED')?.time
    const plannedDish = boardDishes.find(dish => dish.isDefault) ?? boardDishes[0]
    const plannedPhoto = plannedDish
      ? dishImage(plannedDish.name, plannedDish.mealType, plannedDish.imageUrl)
      : dishImage(mealType === 'BREAKFAST' ? 'Bữa sáng' : 'Trái cây bữa xế', mealType)
    return { serviceDate: date, mealType, servings: boardDishes.length ? Math.max(...boardDishes.map(dish => dish.expectedQuantity)) : (mealType === 'LUNCH' ? (saved?.servings ?? 0) : 0), suppliers: 4, dishes: selectedDishes, dishDetails, kitchen: central ? 'Bếp trung tâm An Tâm' : 'Bếp ăn nhà trường', photo: plannedPhoto, updatedAt: events.at(-1)?.time ?? eventTimes.READY, events, transportDistanceKm: central ? 12.4 : null, transportDurationMinutes: central ? minutesBetween(dispatchedAt,arrivedAt) : null, publicInspection: mealType==='LUNCH' ? (publicInspections[school.id] ?? null) : null, mealUseByAt: !saved ? `${date}T${mealType==='BREAKFAST'?'08:15':mealType==='LUNCH'?'12:45':'15:00'}:00+07:00` : null }
  },
  kitchenDocuments: async (school: School): Promise<KitchenDocument[]> => {
    await pause()
    const inspection = publicInspections[school.id]
    return kitchenDocuments.map(document => document.id !== 'inspection-corrections' ? document : inspection ? {
      ...document,
      documentNumber: inspection.recordNumber,
      issuer: inspection.authority,
      issuedAt: inspection.inspectedAt,
      updatedAt: inspection.publishedAt.slice(0, 10),
      publicSummary: inspection.findingCount > 0
        ? `Đã có biên bản kiểm tra DEMO được chốt và duyệt công khai; ${inspection.findingCount.toLocaleString('vi-VN').padStart(2, '0')} nội dung đang được theo dõi.`
        : 'Đã có biên bản kiểm tra DEMO được chốt và duyệt công khai; không có nội dung cần theo dõi thêm tại thời điểm kiểm tra.',
    } : {
      ...document,
      status: 'missing',
      documentNumber: undefined,
      issuer: undefined,
      issuedAt: undefined,
      publicSummary: 'Chưa có kết quả kiểm tra nào được duyệt công khai trong bộ dữ liệu minh họa.',
    })
  },
  feedback: async (): Promise<Feedback[]> => readFeedback(),
  sendFeedback: async (input: Omit<Feedback, 'id' | 'status' | 'createdAt'>): Promise<Feedback> => {
    await pause(); const item = { ...input, id: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, status: 'received', createdAt: new Date().toISOString() }
    const all = await demoData.feedback(); localStorage.setItem('demo-feedback', JSON.stringify([item, ...all])); return item
  },
}
