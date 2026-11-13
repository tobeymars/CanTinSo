import type { ViewRole } from './store'
import { readSuppliers } from './suppliers'

export type InventoryMovementType = 'RECEIPT' | 'ISSUE'
export type InventoryUnit = 'kg' | 'lít' | 'chai'

export type InventoryActor = {
  id: string
  name: string
  role: ViewRole
  schoolId: string | null
  kitchenId: string | null
  wardId: string | null
}

export type InventoryItem = {
  id: string
  schoolId: string
  schoolName: string
  wardId: string
  kitchenId: string
  kitchenName: string
  ingredientName: string
  unit: InventoryUnit
  openingBalance: number
  minimumStock: number
  lotCode: string
  expiresAt: string
  supplierId: string
  origin: string
}

export type InventoryMovement = {
  id: string
  itemId: string
  type: InventoryMovementType
  quantity: number
  occurredAt: string
  recordedAt: string
  reference: string
  note: string
  actorId: string
  actorName: string
  actorRole: 'kitchen_staff'
  demo: true
  idempotencyKey: string
}

export type InventoryRow = InventoryItem & {
  received: number
  issued: number
  closingBalance: number
  latestMovementAt: string | null
}

export type SupervisionIngredientOption = {
  itemId: string
  ingredientName: string
  unit: InventoryUnit
  lotCode: string
  expiresAt: string
  supplierId: string
  supplierName: string
  supplierContact: string
}

export type ReceivingReferenceOption = {
  reference: string
  ingredientName: string
  occurredAt: string
  lotCode: string
}

export const inventoryItems: InventoryItem[] = [
  {id:'rice-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Gạo thơm',unit:'kg',openingBalance:86,minimumStock:40,lotCode:'DEMO-GAO-1810',expiresAt:'2027-03-20',supplierId:'supplier-rice',origin:'Đồng bằng sông Cửu Long · DEMO'},
  {id:'chicken-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Thịt gà',unit:'kg',openingBalance:28,minimumStock:12,lotCode:'DEMO-GA-1810',expiresAt:'2026-10-20',supplierId:'supplier-meat',origin:'Hóc Môn, TP.HCM · DEMO'},
  {id:'oil-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Dầu thực vật',unit:'lít',openingBalance:34,minimumStock:10,lotCode:'DEMO-DAU-1009',expiresAt:'2027-09-10',supplierId:'supplier-kido',origin:'Việt Nam · DEMO'},
  {id:'rice-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Gạo thơm',unit:'kg',openingBalance:48,minimumStock:24,lotCode:'DEMO-GAO-1710',expiresAt:'2027-02-28',supplierId:'supplier-rice',origin:'Đồng bằng sông Cửu Long · DEMO'},
  {id:'pork-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Thịt heo',unit:'kg',openingBalance:19,minimumStock:8,lotCode:'DEMO-HEO-1810',expiresAt:'2026-10-20',supplierId:'supplier-meat',origin:'Hóc Môn, TP.HCM · DEMO'},
  {id:'milk-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Sữa tiệt trùng',unit:'chai',openingBalance:260,minimumStock:150,lotCode:'DEMO-SUA-1210',expiresAt:'2027-04-12',supplierId:'supplier-kido',origin:'Việt Nam · DEMO'},
  {id:'rice-an-khanh',schoolId:'an-khanh',schoolName:'THCS An Khánh',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-khanh',kitchenName:'Bếp ăn THCS An Khánh',ingredientName:'Gạo thơm',unit:'kg',openingBalance:68,minimumStock:32,lotCode:'DEMO-GAO-1610',expiresAt:'2027-03-12',supplierId:'supplier-rice',origin:'Đồng bằng sông Cửu Long · DEMO'},
  {id:'fish-an-khanh',schoolId:'an-khanh',schoolName:'THCS An Khánh',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-khanh',kitchenName:'Bếp ăn THCS An Khánh',ingredientName:'Cá phi lê',unit:'kg',openingBalance:21,minimumStock:10,lotCode:'DEMO-CA-1810',expiresAt:'2026-10-19',supplierId:'supplier-meat',origin:'TP.HCM · DEMO'},
]

/**
 * Danh mục đầu vào cho kiểm thực bước 1. Chỉ lấy nguyên liệu thuộc đúng trường;
 * thông tin nhà cung cấp là dữ liệu nội bộ để bếp/BGH đối chiếu, không dùng cho
 * public QR. Production phải thực hiện cùng phép lọc scope ở backend.
 */
export function supervisionIngredientCatalog(schoolId: string): SupervisionIngredientOption[] {
  const suppliers = new Map(readSuppliers().map(supplier => [supplier.id, supplier]))
  return inventoryItems
    .filter(item => item.schoolId === schoolId)
    .map(item => {
      const supplier = suppliers.get(item.supplierId)
      return {
        itemId: item.id,
        ingredientName: item.ingredientName,
        unit: item.unit,
        lotCode: item.lotCode,
        expiresAt: item.expiresAt,
        supplierId: item.supplierId,
        supplierName: supplier?.name ?? 'Chưa cập nhật nhà cung cấp',
        supplierContact: supplier?.contact ?? 'Chưa cập nhật người cấp',
      }
    })
}

const seedMovements: InventoryMovement[] = [
  {id:'movement-01',itemId:'rice-an-phu',type:'RECEIPT',quantity:50,occurredAt:'2026-10-17T06:35:00+07:00',recordedAt:'2026-10-17T06:37:00+07:00',reference:'DEMO-PN-1710-01',note:'Nhập theo phiếu giao nhận minh họa.',actorId:'kitchen-an-tam.nguyen-lan',actorName:'Nguyễn Thị Lan · Bếp An Tâm',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-01'},
  {id:'movement-02',itemId:'rice-an-phu',type:'ISSUE',quantity:32,occurredAt:'2026-10-17T08:10:00+07:00',recordedAt:'2026-10-17T08:12:00+07:00',reference:'DEMO-PX-1710-01',note:'Xuất sơ chế bữa trưa.',actorId:'kitchen-an-tam.nguyen-lan',actorName:'Nguyễn Thị Lan · Bếp An Tâm',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-02'},
  {id:'movement-03',itemId:'chicken-an-phu',type:'RECEIPT',quantity:36,occurredAt:'2026-10-17T06:42:00+07:00',recordedAt:'2026-10-17T06:44:00+07:00',reference:'DEMO-PN-1710-02',note:'Lô thực phẩm DEMO, chưa phải chứng từ thật.',actorId:'kitchen-an-tam.tran-minh',actorName:'Trần Văn Minh · Bếp An Tâm',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-03'},
  {id:'movement-04',itemId:'chicken-an-phu',type:'ISSUE',quantity:31,occurredAt:'2026-10-17T08:18:00+07:00',recordedAt:'2026-10-17T08:19:00+07:00',reference:'DEMO-PX-1710-02',note:'Xuất chế biến món gà kho.',actorId:'kitchen-an-tam.tran-minh',actorName:'Trần Văn Minh · Bếp An Tâm',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-04'},
  {id:'movement-05',itemId:'rice-binh-an',type:'RECEIPT',quantity:28,occurredAt:'2026-10-17T06:50:00+07:00',recordedAt:'2026-10-17T06:53:00+07:00',reference:'DEMO-PN-1710-03',note:'Nhập kho bếp tại trường.',actorId:'kitchen-binh-an.le-hoa',actorName:'Lê Thị Hòa · Bếp Bình An',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-05'},
  {id:'movement-06',itemId:'rice-binh-an',type:'ISSUE',quantity:16,occurredAt:'2026-10-17T08:25:00+07:00',recordedAt:'2026-10-17T08:26:00+07:00',reference:'DEMO-PX-1710-03',note:'Xuất theo thực đơn bữa trưa.',actorId:'kitchen-binh-an.le-hoa',actorName:'Lê Thị Hòa · Bếp Bình An',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-06'},
  {id:'movement-07',itemId:'milk-binh-an',type:'ISSUE',quantity:216,occurredAt:'2026-10-17T13:20:00+07:00',recordedAt:'2026-10-17T13:22:00+07:00',reference:'DEMO-PX-1710-04',note:'Xuất bữa xế theo số suất dự kiến.',actorId:'kitchen-binh-an.le-hoa',actorName:'Lê Thị Hòa · Bếp Bình An',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-07'},
  {id:'movement-08',itemId:'rice-an-khanh',type:'RECEIPT',quantity:42,occurredAt:'2026-10-17T06:30:00+07:00',recordedAt:'2026-10-17T06:32:00+07:00',reference:'DEMO-PN-1710-04',note:'Nhập kho đầu ngày.',actorId:'kitchen-an-khanh.pham-son',actorName:'Phạm Văn Sơn · Bếp An Khánh',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-08'},
  {id:'movement-09',itemId:'rice-an-khanh',type:'ISSUE',quantity:27,occurredAt:'2026-10-17T08:05:00+07:00',recordedAt:'2026-10-17T08:07:00+07:00',reference:'DEMO-PX-1710-05',note:'Xuất chế biến bữa trưa.',actorId:'kitchen-an-khanh.pham-son',actorName:'Phạm Văn Sơn · Bếp An Khánh',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-09'},
  {id:'movement-10',itemId:'fish-an-khanh',type:'ISSUE',quantity:24,occurredAt:'2026-10-17T08:12:00+07:00',recordedAt:'2026-10-17T08:14:00+07:00',reference:'DEMO-PX-1710-06',note:'Số xuất lớn hơn tồn đầu nhờ phiếu nhập cùng ngày.',actorId:'kitchen-an-khanh.pham-son',actorName:'Phạm Văn Sơn · Bếp An Khánh',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-10'},
  {id:'movement-11',itemId:'fish-an-khanh',type:'RECEIPT',quantity:18,occurredAt:'2026-10-17T06:38:00+07:00',recordedAt:'2026-10-17T06:40:00+07:00',reference:'DEMO-PN-1710-05',note:'Nhập lô cá dùng trong ngày.',actorId:'kitchen-an-khanh.pham-son',actorName:'Phạm Văn Sơn · Bếp An Khánh',actorRole:'kitchen_staff',demo:true,idempotencyKey:'seed-11'},
]

const storageKey = 'demo-inventory-movements'

function storedMovements(): InventoryMovement[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((value): value is InventoryMovement => typeof value === 'object' && value !== null && typeof (value as InventoryMovement).id === 'string') : []
  } catch { return [] }
}

function allMovements() { return [...seedMovements, ...storedMovements()] }

/** Phiếu tiếp nhận nội bộ theo đúng trường/ngày để liên kết với kiểm thực bước 1. */
export function receivingReferenceCatalog(schoolId: string, serviceDate: string): ReceivingReferenceOption[] {
  const scopedItems = new Map(inventoryItems.filter(item => item.schoolId === schoolId).map(item => [item.id, item]))
  const seen = new Set<string>()
  return allMovements()
    .filter(movement => movement.type === 'RECEIPT' && movement.occurredAt.slice(0, 10) === serviceDate && scopedItems.has(movement.itemId))
    .flatMap(movement => {
      if (seen.has(movement.reference)) return []
      seen.add(movement.reference)
      const item = scopedItems.get(movement.itemId)!
      return [{ reference: movement.reference, ingredientName: item.ingredientName, occurredAt: movement.occurredAt, lotCode: item.lotCode }]
    })
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

/**
 * Allowlist tối thiểu cho trang QR công khai. Chỉ trả dữ liệu tiếp nhận của
 * đúng nguyên liệu đã liên kết với bữa ăn; không trả actor, ghi chú, số lượng
 * tồn hoặc tham chiếu chứng từ nội bộ.
 */
const demoMealInventoryLinks: Record<string, readonly string[]> = {
  'rice-an-phu': ['Cơm trắng', 'Gạo tẻ'],
  'chicken-an-phu': ['Gà kho gừng', 'Mì xào gà', 'Bún gà rau xanh', 'Cháo gà rau củ'],
  'rice-binh-an': ['Cơm trắng', 'Gạo tẻ'],
  'pork-binh-an': ['Thịt heo kho trứng', 'Bún thịt rau xanh', 'Cháo thịt bằm bí đỏ'],
  'milk-binh-an': ['Sữa', 'Sữa tiệt trùng', 'Bánh mềm và sữa', 'Bánh chuối và sữa'],
  'rice-an-khanh': ['Cơm trắng', 'Gạo tẻ'],
  'fish-an-khanh': ['Cá sốt cà chua', 'Cá thu kho thơm', 'Cá phi lê'],
}

export function publicIngredientReceivingTrace(input: {
  itemIds: readonly string[]
  ingredientNames: readonly string[]
  schoolId: string
  serviceDate: string
}) {
  const allowedIds = new Set(input.itemIds)
  const mealNames = new Set(input.ingredientNames)
  for (const item of inventoryItems.filter(value => value.schoolId === input.schoolId)) {
    if (demoMealInventoryLinks[item.id]?.some(name => mealNames.has(name))) allowedIds.add(item.id)
  }
  return allMovements()
    .filter(movement => allowedIds.has(movement.itemId) && movement.type === 'RECEIPT' && movement.occurredAt.slice(0, 10) === input.serviceDate)
    .map(movement => {
      const item = inventoryItems.find(value => value.id === movement.itemId)
      return item ? {
        itemId: item.id,
        ingredientName: item.ingredientName,
        lotCode: item.lotCode,
        receivedAt: movement.occurredAt,
        expiresAt: item.expiresAt,
        demo: true as const,
      } : null
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
}

function mayRead(actor:InventoryActor,item:InventoryItem) {
  return (actor.role==='school_board'&&actor.schoolId===item.schoolId)||(actor.role==='culture_social_office'&&actor.wardId===item.wardId)
}

function mayRecord(actor:InventoryActor,item:InventoryItem) {
  return (actor.role==='central_kitchen'||actor.role==='school_kitchen')&&actor.kitchenId===item.kitchenId
}

export function kitchenActorForSchool(schoolId:string,role:'central_kitchen'|'school_kitchen'): InventoryActor {
  const item=inventoryItems.find(value=>value.schoolId===schoolId)
  return {id:`${item?.kitchenId??'unassigned'}.demo-user`,name:`Tài khoản bếp · ${item?.kitchenName??'Chưa phân công'}`,role,schoolId,kitchenId:item?.kitchenId??null,wardId:item?.wardId??null}
}

export const inventoryDemo = {
  catalog(actor:InventoryActor) {
    return inventoryItems.filter(item=>mayRecord(actor,item)).map(({id,ingredientName,unit,lotCode,expiresAt})=>({id,ingredientName,unit,lotCode,expiresAt}))
  },
  snapshot(actor:InventoryActor): InventoryRow[] {
    const scoped=inventoryItems.filter(item=>mayRead(actor,item))
    if(!scoped.length) throw new Error('FORBIDDEN_INVENTORY_READ')
    const movements=allMovements()
    return scoped.map(item=>{
      const itemMovements=movements.filter(movement=>movement.itemId===item.id)
      const received=itemMovements.filter(movement=>movement.type==='RECEIPT').reduce((sum,movement)=>sum+movement.quantity,0)
      const issued=itemMovements.filter(movement=>movement.type==='ISSUE').reduce((sum,movement)=>sum+movement.quantity,0)
      const latest=[...itemMovements].sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))[0]
      return {...item,received,issued,closingBalance:item.openingBalance+received-issued,latestMovementAt:latest?.recordedAt??null}
    })
  },
  movements(actor:InventoryActor): InventoryMovement[] {
    const readableIds=new Set(inventoryItems.filter(item=>mayRead(actor,item)).map(item=>item.id))
    if(!readableIds.size) throw new Error('FORBIDDEN_INVENTORY_READ')
    return allMovements().filter(movement=>readableIds.has(movement.itemId)).sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))
  },
  kitchenMovements(actor:InventoryActor): InventoryMovement[] {
    const assignedIds=new Set(inventoryItems.filter(item=>mayRecord(actor,item)).map(item=>item.id))
    if(!assignedIds.size) return []
    return allMovements().filter(movement=>assignedIds.has(movement.itemId)).sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))
  },
  record(actor:InventoryActor,input:{itemId:string;type:InventoryMovementType;quantity:number;occurredAt:string;reference:string;note:string;idempotencyKey:string}):InventoryMovement {
    const item=inventoryItems.find(value=>value.id===input.itemId)
    if(!item||!mayRecord(actor,item)) throw new Error('FORBIDDEN_INVENTORY_WRITE')
    if(!Number.isFinite(input.quantity)||input.quantity<=0||input.quantity>5000) throw new Error('INVALID_QUANTITY')
    const existing=allMovements().find(movement=>movement.idempotencyKey===input.idempotencyKey)
    if(existing) return existing
    const current=item.openingBalance+allMovements().filter(movement=>movement.itemId===item.id).reduce((sum,movement)=>sum+(movement.type==='RECEIPT'?movement.quantity:-movement.quantity),0)
    if(input.type==='ISSUE'&&input.quantity>current) throw new Error('INSUFFICIENT_STOCK')
    const movement:InventoryMovement={id:crypto.randomUUID(),...input,recordedAt:new Date().toISOString(),actorId:actor.id,actorName:actor.name,actorRole:'kitchen_staff',demo:true}
    localStorage.setItem(storageKey,JSON.stringify([...storedMovements(),movement]))
    return movement
  },
}
