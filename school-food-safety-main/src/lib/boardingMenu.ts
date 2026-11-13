import { useUI } from './store'
import { inventoryItems } from './inventory'
import { defaultAgeBandForGrade } from './schoolNutrition'
import type { SchoolAgeBand } from './schoolNutrition'

export type GradeLevel = 'KINDERGARTEN' | 'PRIMARY' | 'SECONDARY' | 'HIGH_SCHOOL'
export type BoardingMealType = 'BREAKFAST' | 'LUNCH' | 'SNACK'
export type MealServiceMode = 'ON_SITE' | 'CENTRAL_KITCHEN'
export type BoardingMenuStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export type KitchenProfile = {
  id: string
  code: string
  name: string
  type: MealServiceMode
  managerName: string
  capacity: number
  assignedSchoolIds: string[]
  active: boolean
  updatedAt: string
  demo: true
}

/** Định lượng dự kiến và khai báo nguồn gốc của từng nguyên liệu. Chưa phải hồ sơ xác nhận. */
export type DishIngredientRecord = {
  /** Mã nguyên liệu/lô thực sự đã chọn trong kho DEMO; không suy đoán từ tên. */
  inventoryItemId?: string
  name: string
  amountPerServing: number | null
  unit: 'g' | 'ml'
  supplier: string
  lotCode: string
  origin: string
}

/** Nhật ký do đơn vị khai báo; không phải kết luận ATTP từ cơ quan chức năng. */
export type DishSafetyMonitoring = {
  threeStep: 'NOT_RECORDED' | 'REPORTED'
  retainedSample: 'NOT_RECORDED' | 'REPORTED'
  supervisor: string
  recordedAt: string
  note: string
}

export type BoardingDish = {
  id: string
  schoolId: string
  gradeLevel: GradeLevel
  ageBand?: SchoolAgeBand
  serviceDate: string
  mealType: BoardingMealType
  name: string
  /** Món BGH đặt làm mặc định cho học sinh chưa chọn; chỉ một món trong mỗi bữa/ngày. */
  isDefault?: boolean
  imageUrl?: string
  ingredients: string[]
  /** Khối lượng một khẩu phần theo kế hoạch (g), null khi chưa có thông tin. */
  portionWeightGrams?: number | null
  /** Phiên bản bộ định lượng DEMO; không tự điền lại giá trị BGH cố ý chỉnh sửa. */
  demoPortionSampleVersion?: 1 | 2
  ingredientRecords?: DishIngredientRecord[]
  safetyMonitoring?: DishSafetyMonitoring
  description: string
  priority: number
  expectedQuantity: number
  serviceMode: MealServiceMode
  preparationKitchenId: string
  status: BoardingMenuStatus
  submittedAt?: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNote?: string
  version: number
  createdAt: string
  updatedAt: string
  demo: true
}

export type DishTemplate = Pick<BoardingDish, 'name' | 'ingredients' | 'description'> & { id: string }

/** Món do bếp đề xuất để BGH đưa vào lịch, không tự sửa thực đơn công khai. */
export type KitchenDishProposal = {
  /** Nhóm lớp áp dụng; dữ liệu cũ chưa có trường này vẫn tải được. */
  ageBand?: SchoolAgeBand
  id: string
  schoolId: string
  kitchenId: string
  createdBy: 'central_kitchen' | 'school_kitchen'
  mealType: BoardingMealType
  gradeLevel: GradeLevel
  name: string
  description: string
  imageUrl?: string
  expectedQuantity: number
  portionWeightGrams: number
  priority: number
  ingredientRecords: DishIngredientRecord[]
  safetyMonitoring: DishSafetyMonitoring
  createdAt: string
  updatedAt: string
  demo: true
}
export const KITCHEN_DISH_PROPOSALS_KEY = 'demo-kitchen-dish-proposals-v1'

export const BOARDING_MENU_STORAGE_KEY = 'demo-boarding-menu-v3'
export const KITCHEN_DIRECTORY_STORAGE_KEY = 'demo-kitchen-directory-v1'

export const gradeOptions: { value: GradeLevel; label: string }[] = [
  { value: 'KINDERGARTEN', label: 'Mầm non' },
  { value: 'PRIMARY', label: 'Tiểu học' },
  { value: 'SECONDARY', label: 'THCS' },
  { value: 'HIGH_SCHOOL', label: 'THPT' },
]

export const mealTypeOptions: { value: BoardingMealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Ăn sáng' },
  { value: 'LUNCH', label: 'Ăn trưa' },
  { value: 'SNACK', label: 'Ăn xế' },
]

export const serviceModeOptions: { value: MealServiceMode; label: string; description: string }[] = [
  { value: 'CENTRAL_KITCHEN', label: 'Bếp trung tâm', description: 'Chế biến tại bếp trung tâm và giao đến trường.' },
  { value: 'ON_SITE', label: 'Bếp tại trường', description: 'Chế biến, ra món và phục vụ ngay tại trường.' },
]

const seedKitchens = (): KitchenProfile[] => [
  { id: 'kitchen-an-tam', code: 'BTT-001', name: 'Bếp trung tâm An Tâm', type: 'CENTRAL_KITCHEN', managerName: 'Nguyễn Minh Anh', capacity: 1800, assignedSchoolIds: ['an-phu', 'binh-an', 'an-khanh'], active: true, updatedAt: '2026-10-17T07:30:00+07:00', demo: true },
  { id: 'kitchen-binh-an', code: 'BTT-BA-01', name: 'Bếp tại trường Mầm non Bình An', type: 'ON_SITE', managerName: 'Trần Thị Hương', capacity: 350, assignedSchoolIds: ['binh-an'], active: true, updatedAt: '2026-10-17T07:30:00+07:00', demo: true },
  { id: 'kitchen-an-khanh', code: 'BTT-AK-01', name: 'Bếp tại trường THCS An Khánh', type: 'ON_SITE', managerName: 'Lê Quốc Bảo', capacity: 520, assignedSchoolIds: ['an-khanh'], active: true, updatedAt: '2026-10-17T07:30:00+07:00', demo: true },
]

export const dishTemplates: DishTemplate[] = [
  { id: 'chao-ga', name: 'Cháo gà rau củ', ingredients: ['Gạo tẻ', 'Thịt gà', 'Cà rốt', 'Hành lá'], description: 'Cháo nấu mềm cùng thịt gà và rau củ theo mùa.' },
  { id: 'bun-bo', name: 'Bún bò rau xanh', ingredients: ['Bún tươi', 'Thịt bò', 'Rau xanh', 'Nước dùng'], description: 'Bún bò dùng kèm rau xanh, khẩu phần theo khối lớp.' },
  { id: 'com-ga', name: 'Cơm gà kho gừng', ingredients: ['Cơm trắng', 'Thịt gà', 'Gừng', 'Rau luộc'], description: 'Cơm trắng, gà kho gừng và rau luộc trong bữa trưa.' },
  { id: 'ca-sot', name: 'Cá sốt cà chua', ingredients: ['Cá phi lê', 'Cà chua', 'Hành', 'Gia vị'], description: 'Cá phi lê sốt cà chua, dùng cùng cơm và canh trong ngày.' },
  { id: 'sua-trai-cay', name: 'Sữa chua và trái cây', ingredients: ['Sữa chua', 'Trái cây theo mùa'], description: 'Bữa xế nhẹ với sữa chua và trái cây theo mùa.' },
]

const pad = (value: number) => String(value).padStart(2, '0')
export const toIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
export const parseIsoDate = (value: string) => new Date(`${value}T12:00:00`)
export const addDays = (value: string, amount: number) => {
  const date = parseIsoDate(value)
  date.setDate(date.getDate() + amount)
  return toIsoDate(date)
}
export const mondayOfWeek = (value: string) => {
  const date = parseIsoDate(value)
  const weekday = date.getDay() || 7
  date.setDate(date.getDate() - weekday + 1)
  return toIsoDate(date)
}
export const weekFromMonday = (monday: string) => Array.from({ length: 7 }, (_, index) => addDays(monday, index))

/** Khối lớp mặc định theo trường DEMO (không dựa vào vai trò đang xem). */
export const gradeForSchool = (schoolId: string): GradeLevel =>
  schoolId === 'binh-an' ? 'KINDERGARTEN' : schoolId === 'an-khanh' ? 'SECONDARY' : 'PRIMARY'

/**
 * Một nguồn dữ liệu DEMO dùng chung cho tất cả không gian làm việc.
 * Chỉ tạo dữ liệu mẫu khi chưa có bản lưu; tuyệt đối không tự bổ sung món vào thực đơn đã sửa/xóa.
 */
const seedMenu = (): BoardingDish[] => {
  const now = '2026-10-12T08:00:00+07:00'
  const currentMonday = mondayOfWeek(toIsoDate(new Date()))
  // DEMO: lịch mẫu hoàn chỉnh cho tuần cố định và tuần trước/hiện tại/tuần sau.
  // Chỉ để minh họa giao diện, không thay thế phê duyệt của BGH trên dữ liệu thật.
  const weeks = Array.from(new Set(['2026-10-12', addDays(currentMonday, -7), currentMonday, addDays(currentMonday, 7)]))
  const lunchNames = ['Thịt heo kho trứng', 'Cá sốt cà chua', 'Gà kho gừng', 'Bò xào rau củ', 'Cá thu kho thơm', 'Mì xào gà', 'Cơm chiên rau củ']
  const lunchAlternatives = ['Đậu hũ sốt nấm', 'Trứng hấp thịt rau củ', 'Cá viên sốt rau củ', 'Gà áp chảo sốt nhẹ', 'Thịt viên kho củ quả', 'Bún gà rau xanh', 'Nui xào bò rau củ']
  const breakfastExtra = ['Nui nấu thịt bằm', 'Bánh cuốn thịt rau']
  const snackExtra = ['Khoai lang hấp và sữa', 'Phô mai và trái cây']
  const schoolSamples = [
    { id: 'an-phu', grade: 'PRIMARY' as const, mode: 'CENTRAL_KITCHEN' as const, kitchen: 'kitchen-an-tam', servings: 485 },
    { id: 'binh-an', grade: 'KINDERGARTEN' as const, mode: 'ON_SITE' as const, kitchen: 'kitchen-binh-an', servings: 216 },
    { id: 'an-khanh', grade: 'SECONDARY' as const, mode: 'ON_SITE' as const, kitchen: 'kitchen-an-khanh', servings: 360 },
  ]
  const items: BoardingDish[] = []
  for (const school of schoolSamples) {
    for (const monday of weeks) {
      weekFromMonday(monday).forEach((serviceDate, index) => {
        // Cả 7 ngày × 3 bữa đều có món mẫu được duyệt (và món lựa chọn).
        // Đây chỉ là trạng thái phê duyệt mô phỏng, không phải phê duyệt thật.
        // Khi localStorage đã có món do người dùng chỉnh sửa, luồng đọc phía dưới
        // KHÔNG tự nâng duyệt các món đó.
        const workflow = { serviceMode: school.mode, preparationKitchenId: school.kitchen, status: 'APPROVED' as BoardingMenuStatus, version: 1 }
        const common = { schoolId: school.id, gradeLevel: school.grade, ageBand: defaultAgeBandForGrade(school.grade), reviewedBy: 'Dữ liệu mẫu DEMO (không phải xác nhận thật)', reviewedAt: now, reviewNote: 'Chỉ là mẫu giao diện, không phải thực đơn được nhà trường phê duyệt.', serviceDate, ...workflow, createdAt: now, updatedAt: now, demo: true as const }
        items.push({ ...common, id: `demo-${school.id}-${serviceDate}-lunch`, mealType: 'LUNCH', name: lunchNames[index]!, isDefault: true, ingredients: ['Cơm trắng', lunchNames[index]!, 'Canh rau củ'], description: 'Thực đơn bữa trưa minh họa theo kế hoạch tuần.', priority: 1, expectedQuantity: school.servings })
        items.push({ ...common, id: `demo-${school.id}-${serviceDate}-lunch-alt`, mealType: 'LUNCH', name: lunchAlternatives[index]!, ingredients: ['Cơm trắng', lunchAlternatives[index]!, 'Canh rau củ'], description: 'Phương án món bữa trưa minh họa để phụ huynh lựa chọn.', priority: 2, expectedQuantity: school.servings })
        // Bữa trưa mẫu: 1 món mặc định + 4 món lựa chọn (đủ 5 món/bữa).
        for (let extra = 0; extra < 3; extra++) {
          const name = lunchAlternatives[(index + (extra + 1) * 2) % lunchAlternatives.length]!
          items.push({ ...common, id: `demo-${school.id}-${serviceDate}-lunch-alt-${extra + 2}`, mealType: 'LUNCH', name, ingredients: ['Cơm trắng', name, 'Canh rau củ'], description: 'Món lựa chọn minh họa; chỉ dữ liệu mẫu mới được đánh dấu đã duyệt.', priority: extra + 3, expectedQuantity: school.servings })
        }
        items.push({ ...common, id: `demo-${school.id}-${serviceDate}-breakfast`, mealType: 'BREAKFAST', name: index % 2 ? 'Bún thịt rau xanh' : 'Cháo gà rau củ', isDefault: true, ingredients: index % 2 ? ['Bún tươi', 'Thịt heo', 'Rau xanh'] : ['Gạo tẻ', 'Thịt gà', 'Cà rốt'], description: 'Bữa sáng minh họa, định lượng chưa được xác minh.', priority: 1, expectedQuantity: school.servings })
        items.push({ ...common, id: `demo-${school.id}-${serviceDate}-breakfast-alt`, mealType: 'BREAKFAST', name: index % 2 ? 'Cháo thịt bằm bí đỏ' : 'Bánh mì trứng rau', ingredients: index % 2 ? ['Gạo tẻ', 'Thịt heo', 'Bí đỏ'] : ['Bánh mì', 'Trứng', 'Rau xanh'], description: 'Phương án bữa sáng minh họa để phụ huynh lựa chọn.', priority: 2, expectedQuantity: school.servings })
        items.push({ ...common, id: `demo-${school.id}-${serviceDate}-breakfast-alt-2`, mealType: 'BREAKFAST', name: breakfastExtra[index % 2]!, ingredients: ['Nui hoặc bột gạo', 'Thịt', 'Rau củ'], description: 'Món sáng thay thế minh họa cho học sinh.', priority: 3, expectedQuantity: school.servings })
        items.push({ ...common, id: `demo-${school.id}-${serviceDate}-snack`, mealType: 'SNACK', name: index % 2 ? 'Bánh mềm và sữa' : 'Sữa chua và trái cây', isDefault: true, ingredients: index % 2 ? ['Bánh mềm', 'Sữa'] : ['Sữa chua', 'Trái cây theo mùa'], description: 'Bữa xế minh họa theo kế hoạch nhà trường.', priority: 1, expectedQuantity: school.servings })
        items.push({ ...common, id: `demo-${school.id}-${serviceDate}-snack-alt`, mealType: 'SNACK', name: index % 2 ? 'Chè đậu xanh ít ngọt' : 'Bánh chuối và sữa', ingredients: index % 2 ? ['Đậu xanh', 'Sữa'] : ['Bánh chuối', 'Sữa'], description: 'Phương án bữa xế minh họa để phụ huynh lựa chọn.', priority: 2, expectedQuantity: school.servings })
        items.push({ ...common, id: `demo-${school.id}-${serviceDate}-snack-alt-2`, mealType: 'SNACK', name: snackExtra[index % 2]!, ingredients: ['Thực phẩm chính', 'Sữa hoặc trái cây'], description: 'Món xế thay thế minh họa theo thực đơn tuần.', priority: 3, expectedQuantity: school.servings })
      })
    }
  }
  // Nhà cung cấp và mã lô DEMO được tạo để minh họa luồng thông tin, không phải bằng chứng kiểm định.
  return items.map(item => ({
    ...applyDemoRecipe(item),
    safetyMonitoring: {
      // Ngày đã qua có nhật ký tự khai báo DEMO; ngày tương lai chỉ có kế hoạch.
      // REPORTED là khai báo nội bộ, KHÔNG đồng nghĩa kết quả kiểm thực/lưu mẫu hợp lệ.
      threeStep: item.serviceDate <= toIsoDate(new Date()) ? 'REPORTED' as const : 'NOT_RECORDED' as const,
      retainedSample: item.serviceDate <= toIsoDate(new Date()) ? 'REPORTED' as const : 'NOT_RECORDED' as const,
      supervisor: 'Nhân viên phụ trách (DEMO)',
      recordedAt: item.serviceDate <= toIsoDate(new Date()) ? `${item.serviceDate}T10:40:00+07:00` : '',
      note: 'Mô phỏng nhật ký tự khai báo DEMO; chưa có phiếu kiểm thực, dữ liệu lưu mẫu hoặc chứng từ thực tế được xác minh.',
    },
  }))
}

/**
 * Bộ định lượng THAM KHẢO cho giao diện DEMO; không phải định mức dinh dưỡng đã phê duyệt.
 * Dùng để bổ sung các bản thực đơn v2 cũ còn trống định lượng, ở bất kỳ vai trò xem nào.
 * Không suy luận từ giấy tờ kiểm thực hoặc dùng để xác nhận ATTP.
 */
const demoWeightByMeal: Record<BoardingMealType, number> = { BREAKFAST: 280, LUNCH: 320, SNACK: 150 }

const normalizeIngredientName = (name: string) => name.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim()

const demoIngredientAmounts: Record<string, { amount: number; unit?: 'g' | 'ml' }> = {
  'gao te': { amount: 65 },
  'thit ga': { amount: 55 },
  'ca rot': { amount: 40 },
  'hanh la': { amount: 5 },
  'bun tuoi': { amount: 170 },
  'thit heo': { amount: 60 },
  'thit bo': { amount: 65 },
  'rau xanh': { amount: 35 },
  'nuoc dung': { amount: 120, unit: 'ml' },
  'com trang': { amount: 150 },
  'canh rau cu': { amount: 70 },
  'canh rau ngot': { amount: 70 },
  'canh cu qua': { amount: 70 },
  'thit heo kho trung': { amount: 100 },
  'ca sot ca chua': { amount: 100 },
  'ga kho gung': { amount: 100 },
  'bo xao rau cu': { amount: 100 },
  'ca thu kho thom': { amount: 100 },
  'mi xao ga': { amount: 165 },
  'com chien rau cu': { amount: 165 },
  'ca phi le': { amount: 90 },
  'ca chua': { amount: 40 },
  'hanh': { amount: 8 },
  'gung': { amount: 5 },
  'gia vi': { amount: 5 },
  'rau luoc': { amount: 65 },
  'sua chua': { amount: 90 },
  'trai cay theo mua': { amount: 60 },
  'banh mem': { amount: 65 },
  'sua': { amount: 120, unit: 'ml' },
}

const demoIngredientAmount = (name: string, mealType: BoardingMealType, index: number): { amount: number; unit: 'g' | 'ml' } => {
  const normalized = normalizeIngredientName(name)
  const known = demoIngredientAmounts[normalized]
  if (known) return { amount: known.amount, unit: known.unit ?? 'g' }
  // Nguyên liệu không có trong danh mục mẫu: điền số giả định, vẫn gắn DEMO.
  // Các món mới được BGH nhập và lưu sau lần cập nhật không bị tự điền lại.
  const guesses: Record<BoardingMealType, number[]> = {
    BREAKFAST: [100, 55, 35, 10], LUNCH: [150, 100, 70, 20], SNACK: [90, 60, 25],
  }
  const amounts = guesses[mealType]
  const isLiquid = normalized.includes('nuoc') || normalized === 'sua' || normalized.includes('sot')
  return { amount: amounts[Math.min(index, amounts.length - 1)]!, unit: isLiquid ? 'ml' : 'g' }
}

type DemoRecipeRow = { name: string; amount: number; unit?: 'g' | 'ml' }

/** Công thức minh họa dùng nguyên liệu thực tế, không dùng tên món phụ làm nguyên liệu. */
const demoRecipes: Record<string, readonly DemoRecipeRow[]> = {
  'mi xao ga': [
    { name: 'Mì sợi', amount: 180 }, { name: 'Thịt gà', amount: 65 },
    { name: 'Rau cải', amount: 35 }, { name: 'Cà rốt', amount: 25 },
    { name: 'Dầu thực vật và gia vị', amount: 15 },
  ],
  'thit heo kho trung': [
    { name: 'Thịt heo', amount: 105 }, { name: 'Trứng gà', amount: 60 },
    { name: 'Nước dừa', amount: 45, unit: 'ml' }, { name: 'Hành và gia vị', amount: 15 },
  ],
  'ca sot ca chua': [
    { name: 'Cá phi lê', amount: 120 }, { name: 'Cà chua', amount: 70 },
    { name: 'Nước sốt', amount: 40, unit: 'ml' }, { name: 'Hành và gia vị', amount: 10 },
  ],
  'ga kho gung': [
    { name: 'Thịt gà', amount: 125 }, { name: 'Nước kho', amount: 35, unit: 'ml' },
    { name: 'Gừng', amount: 8 }, { name: 'Hành và gia vị', amount: 12 },
  ],
  'bo xao rau cu': [
    { name: 'Thịt bò', amount: 90 }, { name: 'Rau củ', amount: 120 },
    { name: 'Dầu thực vật và gia vị', amount: 15 },
  ],
  'ca thu kho thom': [
    { name: 'Cá thu', amount: 120 }, { name: 'Thơm', amount: 55 },
    { name: 'Nước kho', amount: 35, unit: 'ml' }, { name: 'Hành và gia vị', amount: 10 },
  ],
  'com chien rau cu': [
    { name: 'Gạo tẻ', amount: 90 }, { name: 'Trứng gà', amount: 50 },
    { name: 'Rau củ', amount: 70 }, { name: 'Dầu thực vật và gia vị', amount: 15 },
  ],
  'dau hu sot nam': [
    { name: 'Đậu hũ', amount: 120 }, { name: 'Nấm', amount: 70 },
    { name: 'Cà chua', amount: 45 }, { name: 'Gia vị', amount: 10 },
  ],
  'trung hap thit rau cu': [
    { name: 'Trứng gà', amount: 90 }, { name: 'Thịt heo', amount: 45 },
    { name: 'Rau củ', amount: 55 }, { name: 'Nước dùng', amount: 30, unit: 'ml' },
  ],
  'ca vien sot rau cu': [
    { name: 'Cá viên', amount: 110 }, { name: 'Rau củ', amount: 80 },
    { name: 'Nước sốt', amount: 40, unit: 'ml' },
  ],
  'ga ap chao sot nhe': [
    { name: 'Thịt gà', amount: 130 }, { name: 'Rau củ', amount: 70 },
    { name: 'Nước sốt', amount: 25, unit: 'ml' },
  ],
  'thit vien kho cu qua': [
    { name: 'Thịt heo', amount: 110 }, { name: 'Củ quả', amount: 90 },
    { name: 'Nước kho', amount: 35, unit: 'ml' },
  ],
  'bun ga rau xanh': [
    { name: 'Bún tươi', amount: 165 }, { name: 'Thịt gà', amount: 60 },
    { name: 'Rau xanh', amount: 35 }, { name: 'Nước dùng', amount: 60, unit: 'ml' },
  ],
  'nui xao bo rau cu': [
    { name: 'Nui', amount: 170 }, { name: 'Thịt bò', amount: 65 },
    { name: 'Rau củ', amount: 65 }, { name: 'Dầu thực vật và gia vị', amount: 15 },
  ],
  'chao ga rau cu': [
    { name: 'Gạo tẻ', amount: 45 }, { name: 'Thịt gà', amount: 55 },
    { name: 'Cà rốt', amount: 30 }, { name: 'Nước dùng', amount: 150, unit: 'ml' },
  ],
  'bun thit rau xanh': [
    { name: 'Bún tươi', amount: 155 }, { name: 'Thịt heo', amount: 55 },
    { name: 'Rau xanh', amount: 35 }, { name: 'Nước dùng', amount: 35, unit: 'ml' },
  ],
  'chao thit bam bi do': [
    { name: 'Gạo tẻ', amount: 45 }, { name: 'Thịt heo', amount: 50 },
    { name: 'Bí đỏ', amount: 45 }, { name: 'Nước dùng', amount: 140, unit: 'ml' },
  ],
  'banh mi trung rau': [
    { name: 'Bánh mì', amount: 100 }, { name: 'Trứng gà', amount: 55 },
    { name: 'Rau xanh', amount: 35 }, { name: 'Sốt', amount: 15 },
  ],
  'banh mem va sua': [{ name: 'Bánh mềm', amount: 50 }, { name: 'Sữa', amount: 100, unit: 'ml' }],
  'sua chua va trai cay': [{ name: 'Sữa chua', amount: 90 }, { name: 'Trái cây theo mùa', amount: 60 }],
  'che dau xanh it ngot': [{ name: 'Đậu xanh', amount: 45 }, { name: 'Nước', amount: 90, unit: 'ml' }, { name: 'Đường', amount: 10 }],
  'banh chuoi va sua': [{ name: 'Bánh chuối', amount: 55 }, { name: 'Sữa', amount: 95, unit: 'ml' }],
  'nui nau thit bam': [{ name: 'Nui', amount: 110 }, { name: 'Thịt heo', amount: 55 }, { name: 'Cà rốt', amount: 35 }, { name: 'Nước dùng', amount: 110, unit: 'ml' }],
  'banh cuon thit rau': [{ name: 'Bột gạo', amount: 115 }, { name: 'Thịt heo', amount: 55 }, { name: 'Rau xanh', amount: 35 }, { name: 'Nước chấm', amount: 25, unit: 'ml' }],
  'khoai lang hap va sua': [{ name: 'Khoai lang', amount: 110 }, { name: 'Sữa', amount: 120, unit: 'ml' }],
  'pho mai va trai cay': [{ name: 'Phô mai', amount: 35 }, { name: 'Trái cây theo mùa', amount: 110 }],
}

function recipeRows(name: string, mealType: BoardingMealType, fallback: readonly string[]): DemoRecipeRow[] {
  return [...(demoRecipes[normalizeIngredientName(name)] ?? fallback.map((ingredient, index) => ({
    name: ingredient, ...demoIngredientAmount(ingredient, mealType, index),
  })))]
}

function applyDemoRecipe(dish: BoardingDish): BoardingDish {
  const recipe = recipeRows(dish.name, dish.mealType, dish.ingredients)
  const ingredientRecords: DishIngredientRecord[] = recipe.map((row, index) => {
    const stock = inventoryItems.find(item => item.schoolId === dish.schoolId
      && normalizeIngredientName(item.ingredientName) === normalizeIngredientName(row.name))
    return {
      ...(stock && { inventoryItemId: stock.id }),
      name: row.name,
      amountPerServing: row.amount,
      unit: row.unit ?? 'g',
      supplier: index === 0 ? 'Nhà cung cấp lương thực (DEMO)' : 'Nhà cung cấp thực phẩm (DEMO)',
      lotCode: stock?.lotCode ?? `DEMO-${dish.schoolId.toUpperCase()}-${dish.serviceDate.replace(/-/g, '')}-${index + 1}`,
      origin: stock?.origin ?? 'Nguồn nguyên liệu minh họa · Chưa đối chiếu chứng từ',
    }
  })
  return {
    ...dish,
    ingredients: recipe.map(row => row.name),
    portionWeightGrams: recipe.reduce((total, row) => total + row.amount, 0),
    ingredientRecords,
    demoPortionSampleVersion: 2,
  }
}

/** Hoàn thiện dữ liệu v2 cũ tại lúc đọc, không ghi localStorage từ vai trò chỉ xem. */
const withDemoPortionSamples = (dish: BoardingDish): BoardingDish => {
  if (dish.demoPortionSampleVersion === 2) return dish
  // Chỉ sửa công thức của seed chưa bị người dùng chỉnh; dữ liệu tự nhập được giữ nguyên.
  if (dish.id.startsWith('demo-') && dish.createdAt === dish.updatedAt && demoRecipes[normalizeIngredientName(dish.name)]) {
    return applyDemoRecipe(dish)
  }
  const existing = dish.ingredientRecords ?? []
  const needsPortion = dish.portionWeightGrams == null
  const needsIngredient = dish.ingredients.some(name => {
    const record = existing.find(item => normalizeIngredientName(item.name) === normalizeIngredientName(name))
    return record?.amountPerServing == null
  })
  if (!needsPortion && !needsIngredient) return dish
  const records: DishIngredientRecord[] = dish.ingredients.map((name, index) => {
    const record = existing.find(item => normalizeIngredientName(item.name) === normalizeIngredientName(name))
    const sample = demoIngredientAmount(name, dish.mealType, index)
    return {
      name,
      amountPerServing: record?.amountPerServing ?? sample.amount,
      unit: record?.unit ?? sample.unit,
      supplier: record?.supplier ?? '',
      lotCode: record?.lotCode ?? '',
      origin: record?.origin ?? '',
    }
  })
  // Không loại bỏ các dòng định lượng bổ sung thủ công dù chưa trùng tên với thành phần.
  const extraRecords = existing.filter(record => !dish.ingredients.some(name => normalizeIngredientName(name) === normalizeIngredientName(record.name)))
  return {
    ...dish,
    portionWeightGrams: dish.portionWeightGrams ?? demoWeightByMeal[dish.mealType],
    ingredientRecords: [...records, ...extraRecords],
    demoPortionSampleVersion: 2,
  }
}

const isIngredientRecord = (value: unknown): value is DishIngredientRecord => {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.name === 'string'
    && (item.inventoryItemId === undefined || typeof item.inventoryItemId === 'string')
    && (item.amountPerServing === null || (typeof item.amountPerServing === 'number' && Number.isFinite(item.amountPerServing) && item.amountPerServing > 0))
    && (item.unit === 'g' || item.unit === 'ml')
    && typeof item.supplier === 'string'
    && typeof item.lotCode === 'string'
    && typeof item.origin === 'string'
}

const isSafetyMonitoring = (value: unknown): value is DishSafetyMonitoring => {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (item.threeStep === 'NOT_RECORDED' || item.threeStep === 'REPORTED')
    && (item.retainedSample === 'NOT_RECORDED' || item.retainedSample === 'REPORTED')
    && typeof item.supervisor === 'string'
    && typeof item.recordedAt === 'string'
    && typeof item.note === 'string'
}

const isBoardingDish = (value: unknown): value is BoardingDish => {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string'
    && typeof item.schoolId === 'string'
    && gradeOptions.some(option => option.value === item.gradeLevel)
    && typeof item.serviceDate === 'string'
    && mealTypeOptions.some(option => option.value === item.mealType)
    && typeof item.name === 'string'
    && (item.isDefault === undefined || typeof item.isDefault === 'boolean')
    && (item.imageUrl === undefined || (typeof item.imageUrl === 'string' && (item.imageUrl === '' || /^data:image\/jpeg;base64,/.test(item.imageUrl))))
    && Array.isArray(item.ingredients)
    && item.ingredients.every(ingredient => typeof ingredient === 'string')
    && (item.portionWeightGrams === undefined || item.portionWeightGrams === null || (typeof item.portionWeightGrams === 'number' && Number.isFinite(item.portionWeightGrams) && item.portionWeightGrams > 0))
    && (item.demoPortionSampleVersion === undefined || item.demoPortionSampleVersion === 1 || item.demoPortionSampleVersion === 2)
    && (item.ingredientRecords === undefined || (Array.isArray(item.ingredientRecords) && item.ingredientRecords.every(isIngredientRecord)))
    && (item.safetyMonitoring === undefined || isSafetyMonitoring(item.safetyMonitoring))
    && (item.ageBand === undefined || typeof item.ageBand === 'string')
    && typeof item.description === 'string'
    && typeof item.priority === 'number'
    && Number.isInteger(item.priority)
    && item.priority >= 0
    && typeof item.expectedQuantity === 'number'
    && Number.isInteger(item.expectedQuantity)
    && item.expectedQuantity >= 0
    && serviceModeOptions.some(option => option.value === item.serviceMode)
    && typeof item.preparationKitchenId === 'string'
    && (item.status === 'DRAFT' || item.status === 'SUBMITTED' || item.status === 'APPROVED' || item.status === 'REJECTED')
    && typeof item.version === 'number'
    && Number.isInteger(item.version)
    && item.version > 0
    && typeof item.createdAt === 'string'
    && typeof item.updatedAt === 'string'
    && item.demo === true
}

const migrateDish = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value
  const item = value as Record<string, unknown>
  const centralKitchen = item.schoolId === 'an-phu'
  return {
    ...item,
    serviceMode: item.serviceMode ?? (centralKitchen ? 'CENTRAL_KITCHEN' : 'ON_SITE'),
    preparationKitchenId: item.preparationKitchenId ?? (centralKitchen ? 'kitchen-an-tam' : `kitchen-${String(item.schoolId)}`),
    status: item.status ?? 'DRAFT',
    ageBand: item.ageBand ?? defaultAgeBandForGrade((item.gradeLevel as GradeLevel) || 'PRIMARY'),
    version: item.version ?? 1,
  }
}

const isKitchenProfile = (value: unknown): value is KitchenProfile => {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string'
    && typeof item.code === 'string'
    && typeof item.name === 'string'
    && serviceModeOptions.some(option => option.value === item.type)
    && typeof item.managerName === 'string'
    && typeof item.capacity === 'number'
    && Number.isInteger(item.capacity)
    && item.capacity > 0
    && Array.isArray(item.assignedSchoolIds)
    && item.assignedSchoolIds.every(schoolId => typeof schoolId === 'string')
    && typeof item.active === 'boolean'
    && typeof item.updatedAt === 'string'
    && item.demo === true
}

// Lưu trên localStorage chỉ dành cho bản demo; backend production phải xác thực và phân quyền độc lập.
const requireSchoolBoard = () => { if (useUI.getState().role !== 'school_board') throw new Error('Chỉ Ban Giám hiệu được quản lý danh mục bếp.') }
const requireMenuManager = () => { if (!['school_board','school_kitchen','central_kitchen'].includes(useUI.getState().role)) throw new Error('Vai trò hiện tại không được cập nhật thực đơn.') }

/** Một lựa chọn riêng cho mỗi học sinh/ngày/bữa. Dữ liệu chỉ mô phỏng trên thiết bị này. */
export type ParentMealChoice = {
  studentCode: string
  schoolId: string
  gradeLevel: GradeLevel
  ageBand?: SchoolAgeBand
  serviceDate: string
  mealType: BoardingMealType
  dishId: string
  updatedAt: string
}
export const PARENT_MEAL_CHOICES_KEY = 'demo-parent-meal-choices-v1'
export const PARENT_MEAL_CHOICES_EVENT = 'demo-parent-meal-choices-updated'

/** Ngày/bữa chỉ có một mặc định; thực đơn cũ chưa đánh dấu sẽ lấy món có ưu tiên thấp nhất. */
export const defaultMealDish = (dishes: BoardingDish[]): BoardingDish | undefined =>
  dishes.find(dish => dish.isDefault) ?? [...dishes].sort((a, b) => a.priority - b.priority)[0]

/** Danh sách nổi bật ĐÃ DUYỆT dùng CHUNG cho phụ huynh và bếp, không sao chép fixture.
 * Nếu tuần đang xem chưa duyệt, chỉ hiển thị ngày lịch sử có nhãn ngày rõ ràng.
 */
export function approvedDishHighlights(items: BoardingDish[], scope: {
  schoolId: string
  gradeLevel: GradeLevel
  ageBand: SchoolAgeBand
  serviceMode: MealServiceMode | 'ALL'
  week: readonly string[]
  selectedDate: string
}, limit = 4): BoardingDish[] {
  const approved = items.filter(dish => dish.status === 'APPROVED'
    && dish.schoolId === scope.schoolId && dish.gradeLevel === scope.gradeLevel
    && (dish.ageBand ?? defaultAgeBandForGrade(dish.gradeLevel)) === scope.ageBand
    && (scope.serviceMode === 'ALL' || dish.serviceMode === scope.serviceMode))
  const inWeek = approved.filter(dish => scope.week.includes(dish.serviceDate))
  const pool = inWeek.length ? inWeek : approved
  const targetDate = inWeek.some(dish => dish.serviceDate === scope.selectedDate)
    ? scope.selectedDate
    : inWeek.length
      ? [...inWeek].map(dish => dish.serviceDate).sort()[0]
      : [...approved].map(dish => dish.serviceDate).sort().at(-1)
  if (!targetDate) return []
  const day = pool.filter(dish => dish.serviceDate === targetDate)
  const meal = (type: BoardingMealType) => day.filter(dish => dish.mealType === type).sort((a, b) => a.priority - b.priority)
  const breakfast = meal('BREAKFAST')
  const lunch = meal('LUNCH')
  const snack = meal('SNACK')
  const favorites = [defaultMealDish(breakfast), defaultMealDish(lunch),
    lunch.find(dish => dish.id !== defaultMealDish(lunch)?.id), defaultMealDish(snack)]
    .filter((dish): dish is BoardingDish => !!dish)
  const rest = [...breakfast, ...lunch, ...snack].filter(dish => !favorites.some(item => item.id === dish.id))
  return [...favorites, ...rest].slice(0, Math.max(0, limit))
}

/** Bữa trưa có tối đa 5 món để học sinh chọn một; giữ giới hạn 3 ở sáng/xế. */
export const maxDishesPerMeal = (mealType: BoardingMealType) => mealType === 'LUNCH' ? 5 : 3

export const parentMealChoiceRepository = {
  load(): ParentMealChoice[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(PARENT_MEAL_CHOICES_KEY) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter((item): item is ParentMealChoice =>
        !!item && typeof item === 'object' && typeof item.studentCode === 'string'
        && typeof item.schoolId === 'string' && typeof item.serviceDate === 'string'
        && typeof item.dishId === 'string' && typeof item.updatedAt === 'string'
        && gradeOptions.some(option => option.value === item.gradeLevel)
        && mealTypeOptions.some(option => option.value === item.mealType)) : []
    } catch { return [] }
  },
  /** Trả về lựa chọn hợp lệ, hoặc món mặc định nếu học sinh chưa chọn/món cũ bị gỡ. */
  resolve(dishes: BoardingDish[], scope: Omit<ParentMealChoice, 'dishId' | 'updatedAt'>) {
    const valid = dishes.filter(dish => dish.status === 'APPROVED' && dish.schoolId === scope.schoolId
      && dish.gradeLevel === scope.gradeLevel && (dish.ageBand ?? defaultAgeBandForGrade(dish.gradeLevel)) === (scope.ageBand ?? defaultAgeBandForGrade(scope.gradeLevel)) && dish.serviceDate === scope.serviceDate
      && dish.mealType === scope.mealType)
    const saved = this.load().find(item => item.studentCode === scope.studentCode
      && item.schoolId === scope.schoolId && item.gradeLevel === scope.gradeLevel && (item.ageBand ?? defaultAgeBandForGrade(item.gradeLevel)) === (scope.ageBand ?? defaultAgeBandForGrade(scope.gradeLevel))
      && item.serviceDate === scope.serviceDate && item.mealType === scope.mealType)
    const explicit = valid.find(dish => dish.id === saved?.dishId)
    return { dish: explicit ?? defaultMealDish(valid), explicit: !!explicit, replaced: !!saved && !explicit }
  },
  select(scope: Omit<ParentMealChoice, 'dishId' | 'updatedAt'>, dishId: string) {
    if (useUI.getState().role !== 'parent') throw new Error('Chỉ phụ huynh được chọn món cho học sinh.')
    if (!scope.studentCode.trim() || scope.studentCode.length > 60) throw new Error('Nhập mã học sinh (tối đa 60 ký tự).')
    const dish = boardingMenuRepository.load().find(item => item.id === dishId)
    if (!dish || dish.status !== 'APPROVED' || dish.schoolId !== scope.schoolId || dish.gradeLevel !== scope.gradeLevel
      || (dish.ageBand ?? defaultAgeBandForGrade(dish.gradeLevel)) !== (scope.ageBand ?? defaultAgeBandForGrade(scope.gradeLevel)) || dish.serviceDate !== scope.serviceDate || dish.mealType !== scope.mealType)
      throw new Error('Món không còn trong thực đơn của học sinh ở ngày đã chọn.')
    const record: ParentMealChoice = { ...scope, studentCode: scope.studentCode.trim(), dishId, updatedAt: new Date().toISOString() }
    const next = this.load().filter(item => !(item.studentCode === record.studentCode
      && item.schoolId === record.schoolId && item.gradeLevel === record.gradeLevel && (item.ageBand ?? defaultAgeBandForGrade(item.gradeLevel)) === (record.ageBand ?? defaultAgeBandForGrade(record.gradeLevel))
      && item.serviceDate === record.serviceDate && item.mealType === record.mealType))
    localStorage.setItem(PARENT_MEAL_CHOICES_KEY, JSON.stringify([...next, record]))
    window.dispatchEvent(new Event(PARENT_MEAL_CHOICES_EVENT))
  },
}

/**
 * Tương thích với dữ liệu DEMO v3 được lưu trước bản lịch tuần có món.
 * Bản cũ tạo sẵn cùng ID món mẫu nhưng giữ DRAFT, khiến phụ huynh thấy cả
 * tuần "Chưa cập nhật" dù mục món đã duyệt có thể có dữ liệu khác.
 *
 * Chỉ nâng trạng thái cho NHÓM món mẫu nguyên bản: ID, tên, phiên bản, ngày
 * tạo/cập nhật và mặc định trùng seed; không động tới món do bếp thêm, món
 * đã sửa, đã gửi duyệt, đã bị từ chối hoặc đã duyệt thực tế.
 * Không thêm lại món đã xóa khỏi dữ liệu localStorage.
 */
export function displayApprovedDemoWeek(existing: BoardingDish[], fixtures: BoardingDish[] = seedMenu()): BoardingDish[] {
  const sampleById = new Map(fixtures.filter(item => item.status === 'APPROVED').map(item => [item.id, item]))
  const groupKey = (item: BoardingDish) => [item.schoolId, item.gradeLevel,
    item.ageBand ?? defaultAgeBandForGrade(item.gradeLevel), item.serviceDate, item.mealType].join(':')
  const groups = new Map<string, BoardingDish[]>()
  for (const item of existing) {
    const key = groupKey(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const originalFixture = (item: BoardingDish) => {
    const sample = sampleById.get(item.id)
    return !!sample && item.status === 'DRAFT' && item.version === 1
      && item.createdAt === item.updatedAt && item.createdAt === sample.createdAt
      && item.name === sample.name && item.isDefault === sample.isDefault
      && item.schoolId === sample.schoolId && item.gradeLevel === sample.gradeLevel
      && item.serviceDate === sample.serviceDate && item.mealType === sample.mealType
      && item.serviceMode === sample.serviceMode && item.preparationKitchenId === sample.preparationKitchenId
  }
  const eligibleGroups = new Set([...groups].filter(([, group]) =>
    group.length > 0 && group.every(originalFixture)).map(([key]) => key))
  return existing.map(item => {
    if (!eligibleGroups.has(groupKey(item))) return item
    const sample = sampleById.get(item.id)!
    return { ...item, status: 'APPROVED' as const,
      reviewedAt: sample.reviewedAt, reviewedBy: sample.reviewedBy, reviewNote: sample.reviewNote }
  })
}

/**
 * Chỉ mở rộng nhóm DEMO cũ còn nguyên các món mẫu đã duyệt/bữa.
 * Không chạm nhóm có món do bếp lập, đã đổi tên, điều chỉnh, bị xóa hay đã xét duyệt thật.
 * Hàm thuần, không ghi localStorage từ màn hình phụ huynh/BGH chỉ đọc.
 */
function appendExtraOptionsToUntouchedDemo(existing: BoardingDish[]): BoardingDish[] {
  const samples = seedMenu()
  const byId = new Map(samples.map(item => [item.id, item]))
  const byGroup = new Map<string, BoardingDish[]>()
  const groupKey = (item: BoardingDish) => [item.schoolId, item.gradeLevel, item.ageBand, item.serviceDate, item.mealType].join('|')
  for (const item of existing) {
    const key = groupKey(item)
    byGroup.set(key, [...(byGroup.get(key) ?? []), item])
  }
  const added: BoardingDish[] = []
  for (const [key, group] of byGroup) {
    if (group.length < 1 || group.some(item => {
      const sample = byId.get(item.id)
      return !sample || item.status !== 'APPROVED' || item.name !== sample.name
        || item.isDefault !== sample.isDefault || item.version !== 1
        || item.createdAt !== sample.createdAt || item.updatedAt !== sample.updatedAt
        || item.reviewedBy !== sample.reviewedBy
    })) continue
    const defaultDish = defaultMealDish(group)
    if (!defaultDish || !group.some(item => item.id === defaultDish.id && item.isDefault)) continue
    const fixtureGroup = samples.filter(item => groupKey(item) === key)
    if (!fixtureGroup.some(item => item.id === defaultDish.id) || fixtureGroup.length <= group.length) continue
    added.push(...fixtureGroup.filter(item => !group.some(current => current.id === item.id)))
  }
  return added.length ? [...existing, ...added] : existing
}

/**
 * Nâng cấp DEMO v4: khôi phục các ngày/bữa thiếu của một tuần minh họa cũ
 * (thường chỉ còn Thứ 7/Chủ nhật do cache cũ). KHÔNG tự duyệt món do bếp tạo.
 * Chỉ chạy trên tuần có bằng chứng fixture nguyên bản, chưa có món tùy chỉnh,
 * và bị thiếu nhiều ô. Không bao giờ sửa đè nhóm bữa đã có dữ liệu.
 * Version marker ngăn việc người dùng xóa món sau nâng cấp bị tạo lại.
 */
const DEMO_WEEK_BACKFILL_MARKER = 'demo-boarding-week-backfill-20261105-v2'
export function fillSparseDemoCalendar(existing: BoardingDish[], fixtures: BoardingDish[]): BoardingDish[] {
  const fixtureById = new Map(fixtures.map(item => [item.id, item]))
  const weekKey = (item: BoardingDish) => [item.schoolId, item.gradeLevel,
    item.ageBand ?? defaultAgeBandForGrade(item.gradeLevel), mondayOfWeek(item.serviceDate)].join('|')
  const groupKey = (item: BoardingDish) => [weekKey(item), item.serviceDate, item.mealType].join('|')
  const weeks = new Map<string, BoardingDish[]>()
  for (const item of existing) {
    const key = weekKey(item)
    weeks.set(key, [...(weeks.get(key) ?? []), item])
  }
  const existingGroups = new Set(existing.map(groupKey))
  const recoverableWeeks = new Set<string>()
  for (const [key, group] of weeks) {
    const fixtureWeek = fixtures.filter(item => weekKey(item) === key)
    if (!fixtureWeek.length) continue
    const coveredMeals = new Set(group.map(groupKey)).size
    const fixtureMeals = new Set(fixtureWeek.map(groupKey)).size
    // Tất cả dữ liệu đang có phải đúng nguyên trạng món mẫu đã duyệt; không
    // trộn món tự tạo, đã sửa, bị từ chối hoặc chờ duyệt vào quá trình phục hồi.
    const originalOnly = group.every(item => {
      const sample = fixtureById.get(item.id)
      return !!sample && item.status === 'APPROVED' && item.version === 1
        && item.schoolId === sample.schoolId && item.gradeLevel === sample.gradeLevel
        && item.name === sample.name && item.isDefault === sample.isDefault
        && item.serviceDate === sample.serviceDate && item.mealType === sample.mealType
        && item.createdAt === sample.createdAt && item.updatedAt === sample.updatedAt
        && item.serviceMode === sample.serviceMode && item.preparationKitchenId === sample.preparationKitchenId
        && item.reviewedBy === sample.reviewedBy
    })
    if (originalOnly && coveredMeals > 0 && coveredMeals < Math.min(15, fixtureMeals)) recoverableWeeks.add(key)
  }
  const additions = fixtures.filter(item => recoverableWeeks.has(weekKey(item)) && !existingGroups.has(groupKey(item)))
  return additions.length ? [...existing, ...additions] : existing
}

export const boardingMenuRepository = {
  load(): BoardingDish[] {
    const raw = localStorage.getItem(BOARDING_MENU_STORAGE_KEY)
    const legacyRaw = localStorage.getItem('demo-boarding-menu-v2') ?? localStorage.getItem('demo-boarding-menu-v1')
    if (!raw && !legacyRaw) return seedMenu().map(withDemoPortionSamples)
    const parsed: unknown = JSON.parse(raw ?? legacyRaw!)
    const migratedValue = Array.isArray(parsed) ? parsed.map(migrateDish) : parsed
    const currentWeek = mondayOfWeek(toIsoDate(new Date()))
    const legacyLastDate = Array.isArray(migratedValue)
      ? migratedValue.reduce((latest, item) => isBoardingDish(item) && item.serviceDate > latest ? item.serviceDate : latest, '')
      : ''
    const samples = seedMenu()
    // Dữ liệu v1/v2 chưa đủ 3 bữa; chỉ bổ sung fixture DEMO không trùng ID.
    const migrated = !raw && Array.isArray(migratedValue)
      ? [...migratedValue, ...samples.filter(seed =>
        !migratedValue.some(item => isBoardingDish(item) && item.id === seed.id)
        && (seed.mealType !== 'LUNCH' || (legacyLastDate < currentWeek && seed.serviceDate >= currentWeek)))]
      : migratedValue
    if (!Array.isArray(migrated) || !migrated.every(isBoardingDish)) throw new Error('Dữ liệu thực đơn DEMO trên trình duyệt không đúng định dạng.')
    if (migrated.length === 0) return samples.map(withDemoPortionSamples)

    // Bản cũ chỉ có tuần 12/10: bổ sung tuần hiện tại khi chưa có dữ liệu
    // thuộc giai đoạn này. Không thay đổi nhóm ngày/bữa đã nhập hoặc đã duyệt.
    const lastDate = migrated.reduce((latest, dish) => dish.serviceDate > latest ? dish.serviceDate : latest, '')
    const withCurrentWeek = lastDate < currentWeek
      ? [...migrated, ...samples.filter(dish => dish.serviceDate >= currentWeek && !migrated.some(old => old.id === dish.id))]
      : migrated
    const needsDemoMigration = localStorage.getItem(DEMO_WEEK_BACKFILL_MARKER) !== '1'
    const approved = displayApprovedDemoWeek(withCurrentWeek, samples)
    // Chỉ mở rộng món lựa chọn cũ trong lần di trú đầu tiên.
    const normalized = (needsDemoMigration ? appendExtraOptionsToUntouchedDemo(approved) : approved).map(withDemoPortionSamples)

    // Phục hồi các ngày trống thuộc tuần DEMO cũ đã lưu, chỉ khi nhóm tuần
    // còn nguyên mẫu và thiếu phần lớn bữa; duyệt thật vẫn do BGH quyết định.
    // Chỉ chạy một lần ở marker v2, không lặp sau khi người dùng chỉnh/sửa/xóa.
    if (needsDemoMigration) {
      const repaired = fillSparseDemoCalendar(normalized, samples)
      try {
        if (repaired.length !== normalized.length || !raw) {
          localStorage.setItem(BOARDING_MENU_STORAGE_KEY, JSON.stringify(repaired))
        }
        localStorage.setItem(DEMO_WEEK_BACKFILL_MARKER, '1')
      } catch { /* Nếu trình duyệt hết dung lượng, vẫn hiển thị dữ liệu đã phục hồi trong phiên này. */ }
      return repaired
    }
    return normalized
  },
  save(items: BoardingDish[]) {
    requireMenuManager()
    if (!items.every(isBoardingDish)) throw new Error('Dữ liệu thực đơn không hợp lệ.')
    const groups = new Map<string, BoardingDish[]>()
    for (const dish of items) {
      const key = [dish.schoolId, dish.gradeLevel, dish.ageBand ?? defaultAgeBandForGrade(dish.gradeLevel), dish.serviceDate, dish.mealType].join(':')
      groups.set(key, [...(groups.get(key) ?? []), dish])
    }
    for (const group of groups.values()) {
      if (group.length > maxDishesPerMeal(group[0]!.mealType)) throw new Error('Vượt quá số món cho phép trong một ngày/bữa.')
      if (group.filter(dish => dish.isDefault).length > 1) throw new Error('Mỗi bữa/ngày chỉ được chọn một món mặc định.')
    }
    // Đây chỉ là kiểm soát ở frontend DEMO. Backend production phải xác thực token,
    // vai trò BGH, phạm vi trường, trạng thái trước/sau và ghi audit trong giao dịch DB.
    const {role,schoolId} = useUI.getState()
    if (role === 'school_board') {
      const previous = this.load()
      const previousById = new Map(previous.map(item => [item.id, item]))
      if (items.length !== previous.length) throw new Error('Ban Giám hiệu không được tạo hoặc xóa món khi duyệt.')
      for (const item of items) {
        const old = previousById.get(item.id)
        if (!old) throw new Error('Món chưa có trong thực đơn, không thể duyệt.')
        if (JSON.stringify(item) === JSON.stringify(old)) continue
        if (item.schoolId !== schoolId || old.schoolId !== schoolId || old.status !== 'SUBMITTED'
          || (item.status !== 'APPROVED' && item.status !== 'REJECTED')) {
          throw new Error('Ban Giám hiệu chỉ được duyệt hoặc trả lại món đã gửi trong trường phụ trách.')
        }
        // Không cho sửa âm thầm tên, ngày, bữa, định lượng, món mặc định, bếp...
        // trong cùng thao tác xét duyệt.
        const oldDetails = { ...old, status: undefined, reviewedAt: undefined, reviewedBy: undefined, reviewNote: undefined, updatedAt: undefined }
        const nextDetails = { ...item, status: undefined, reviewedAt: undefined, reviewedBy: undefined, reviewNote: undefined, updatedAt: undefined }
        if (JSON.stringify(oldDetails) !== JSON.stringify(nextDetails))
          throw new Error('Duyệt thực đơn chỉ thay đổi trạng thái và nhật ký xét duyệt của món.')
        if (!item.reviewedAt || !item.reviewedBy?.trim()
          || (item.status === 'REJECTED' && !item.reviewNote?.trim()))
          throw new Error('Thiếu thông tin nhật ký hoặc lý do trả lại món.')
      }
    } else {
      const previous = this.load()
      const previousById = new Map(previous.map(item => [item.id,item]))
      const changed = items.filter(item => JSON.stringify(item) !== JSON.stringify(previousById.get(item.id)))
      if(changed.some(item => item.status === 'APPROVED'))
        throw new Error('Bếp không được sửa hoặc phê duyệt thực đơn đã duyệt.')
      if(changed.some(item => item.status !== 'DRAFT' && item.status !== 'SUBMITTED' && item.status !== 'REJECTED'))
        throw new Error('Trạng thái thực đơn không hợp lệ.')
      if(changed.some(item => item.schoolId !== schoolId || (role === 'central_kitchen' && item.serviceMode !== 'CENTRAL_KITCHEN') || (role === 'school_kitchen' && item.serviceMode !== 'ON_SITE')))
        throw new Error('Bếp không được thay đổi thực đơn ngoài phạm vi phụ trách.')
      if(previous.some(old => !items.some(item => item.id === old.id) && (old.status === 'APPROVED' || old.schoolId !== schoolId || (role==='central_kitchen' && old.serviceMode !== 'CENTRAL_KITCHEN') || (role==='school_kitchen' && old.serviceMode !== 'ON_SITE'))))
        throw new Error('Bếp không được xóa món đã duyệt.')
    }
    localStorage.setItem(BOARDING_MENU_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event('demo-boarding-menu-updated'))
  },
  seed: seedMenu,
}

export const kitchenDirectoryRepository = {
  load(): KitchenProfile[] {
    const raw = localStorage.getItem(KITCHEN_DIRECTORY_STORAGE_KEY)
    if (!raw) return seedKitchens()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isKitchenProfile)) throw new Error('Danh mục bếp DEMO trên trình duyệt không đúng định dạng.')
    return parsed
  },
  save(items: KitchenProfile[]) {
    requireSchoolBoard()
    if (!items.every(isKitchenProfile)) throw new Error('Danh mục bếp không hợp lệ.')
    localStorage.setItem(KITCHEN_DIRECTORY_STORAGE_KEY, JSON.stringify(items))
  },
  seed: seedKitchens,
}

/** Danh mục món của bếp để tái sử dụng khi chính bếp lập lịch và gửi BGH duyệt. */
const isKitchenDishProposal = (value: unknown): value is KitchenDishProposal => {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return typeof p.id === 'string' && typeof p.schoolId === 'string' && typeof p.kitchenId === 'string'
    && (p.createdBy === 'central_kitchen' || p.createdBy === 'school_kitchen')
    && (p.ageBand === undefined || ['GRADES_1_2','GRADES_3_5','GRADES_3_4','GRADES_5','AGES_10_11','GRADES_6_9','GRADES_10_12'].includes(String(p.ageBand)))
    && mealTypeOptions.some(v => v.value === p.mealType) && gradeOptions.some(v => v.value === p.gradeLevel)
    && typeof p.name === 'string' && p.name.trim().length > 0 && typeof p.description === 'string'
    && (p.imageUrl === undefined || (typeof p.imageUrl === 'string' && (p.imageUrl === '' || /^data:image\/jpeg;base64,/.test(p.imageUrl))))
    && typeof p.expectedQuantity === 'number' && Number.isInteger(p.expectedQuantity) && p.expectedQuantity > 0
    && typeof p.priority === 'number' && Number.isInteger(p.priority) && p.priority >= 0
    && typeof p.portionWeightGrams === 'number' && Number.isFinite(p.portionWeightGrams) && p.portionWeightGrams > 0
    && Array.isArray(p.ingredientRecords) && p.ingredientRecords.length > 0
    && p.ingredientRecords.every(row => isIngredientRecord(row) && !!row.name.trim() && row.amountPerServing !== null)
    && isSafetyMonitoring(p.safetyMonitoring) && typeof p.createdAt === 'string'
    && typeof p.updatedAt === 'string' && p.demo === true
}
export const kitchenDishProposalsRepository = {
  load(): KitchenDishProposal[] {
    const raw = localStorage.getItem(KITCHEN_DISH_PROPOSALS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isKitchenDishProposal)) throw new Error('Danh sách món đề xuất không đúng định dạng.')
    return parsed
  },
  save(proposal: KitchenDishProposal): void {
    const { role, schoolId } = useUI.getState()
    if (role !== 'central_kitchen' && role !== 'school_kitchen') throw new Error('Chỉ tài khoản bếp được đề xuất món.')
    if (schoolId !== proposal.schoolId || role !== proposal.createdBy) throw new Error('Không được đề xuất món ngoài phạm vi bếp.')
    if (!isKitchenDishProposal(proposal)) throw new Error('Thiếu dữ liệu bắt buộc của món.')
    // Kiểm tra mã kho và mã lô ngay lúc lưu, không tin dữ liệu do UI gửi lên.
    const kitchen = kitchenDirectoryRepository.load().find(item => item.id === proposal.kitchenId && item.active && item.assignedSchoolIds.includes(schoolId))
    if (!kitchen || kitchen.type !== (role === 'central_kitchen' ? 'CENTRAL_KITCHEN' : 'ON_SITE')) throw new Error('Không được tạo món cho bếp ngoài phạm vi.')
    const stock = inventoryItems.filter(item => item.schoolId === schoolId && item.kitchenId === proposal.kitchenId)
    const today = toIsoDate(new Date())
    if (proposal.ingredientRecords.some(record => record.inventoryItemId ? !stock.some(item => item.id === record.inventoryItemId && item.ingredientName === record.name && item.lotCode === record.lotCode && item.expiresAt >= today) : Boolean(record.lotCode || record.supplier || record.origin))) {
      throw new Error('Lô nguyên liệu phải thuộc kho hợp lệ; nguyên liệu chưa gắn lô không được khai báo chứng từ giả.')
    }
    const existing = this.load().find(item => item.id === proposal.id)
    if (existing && (existing.schoolId !== schoolId || existing.kitchenId !== proposal.kitchenId || existing.createdBy !== role || existing.createdAt !== proposal.createdAt)) throw new Error('Không thể ghi đè món ngoài quyền quản lý hoặc thay đổi lịch sử tạo món.')
    const next = this.load().filter(item => item.id !== proposal.id)
    localStorage.setItem(KITCHEN_DISH_PROPOSALS_KEY, JSON.stringify([...next, proposal]))
    window.dispatchEvent(new Event('demo-kitchen-dishes-updated'))
  },
  remove(id: string): void {
    const { role, schoolId } = useUI.getState()
    if (role !== 'central_kitchen' && role !== 'school_kitchen') throw new Error('Chỉ tài khoản bếp được xóa món.')
    const dishes = this.load()
    const dish = dishes.find(item => item.id === id)
    if (!dish) throw new Error('Món không còn trong danh sách. Vui lòng tải lại.')
    if (dish.schoolId !== schoolId || dish.createdBy !== role) throw new Error('Không được xóa món ngoài phạm vi bếp.')
    const kitchen = kitchenDirectoryRepository.load().find(item => item.id === dish.kitchenId && item.active && item.assignedSchoolIds.includes(schoolId))
    if (!kitchen || kitchen.type !== (role === 'central_kitchen' ? 'CENTRAL_KITCHEN' : 'ON_SITE')) throw new Error('Bếp chưa được cấp quyền quản lý món này.')
    localStorage.setItem(KITCHEN_DISH_PROPOSALS_KEY, JSON.stringify(dishes.filter(item => item.id !== id)))
    window.dispatchEvent(new Event('demo-kitchen-dishes-updated'))
  },
}
