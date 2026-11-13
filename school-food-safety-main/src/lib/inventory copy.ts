import type { ViewRole } from './store'

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
  /** Nhà cung cấp gắn với lô kho, dữ liệu minh họa chưa kiểm chứng. */
  supplierId?: string
  origin?: string
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

export const inventoryItems: InventoryItem[] = [
  {id:'rice-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Gạo thơm',unit:'kg',openingBalance:86,minimumStock:40,lotCode:'DEMO-GAO-1810',expiresAt:'2027-03-20',supplierId:'supplier-rice',origin:'Đồng bằng sông Cửu Long (DEMO)'},
  {id:'chicken-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Thịt gà',unit:'kg',openingBalance:28,minimumStock:12,lotCode:'DEMO-GA-1810',expiresAt:'2026-10-20',supplierId:'supplier-meat',origin:'TP.HCM (DEMO)'},
  {id:'oil-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Dầu thực vật',unit:'lít',openingBalance:34,minimumStock:10,lotCode:'DEMO-DAU-1009',expiresAt:'2027-09-10',supplierId:'supplier-demo-trace',origin:'Đã khai báo tại phiếu nhập DEMO'},
  {id:'rice-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Gạo thơm',unit:'kg',openingBalance:48,minimumStock:24,lotCode:'DEMO-GAO-1710',expiresAt:'2027-02-28',supplierId:'supplier-rice',origin:'Đồng bằng sông Cửu Long (DEMO)'},
  {id:'pork-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Thịt heo',unit:'kg',openingBalance:19,minimumStock:8,lotCode:'DEMO-HEO-1810',expiresAt:'2026-10-20',supplierId:'supplier-meat',origin:'TP.HCM (DEMO)'},
  {id:'milk-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Sữa tiệt trùng',unit:'chai',openingBalance:260,minimumStock:150,lotCode:'DEMO-SUA-1210',expiresAt:'2027-04-12',supplierId:'supplier-demo-trace',origin:'Theo nhãn lô (DEMO)'},
  {id:'rice-an-khanh',schoolId:'an-khanh',schoolName:'THCS An Khánh',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-khanh',kitchenName:'Bếp ăn THCS An Khánh',ingredientName:'Gạo thơm',unit:'kg',openingBalance:68,minimumStock:32,lotCode:'DEMO-GAO-1610',expiresAt:'2027-03-12',supplierId:'supplier-rice',origin:'Đồng bằng sông Cửu Long (DEMO)'},
  {id:'fish-an-khanh',schoolId:'an-khanh',schoolName:'THCS An Khánh',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-khanh',kitchenName:'Bếp ăn THCS An Khánh',ingredientName:'Cá phi lê',unit:'kg',openingBalance:21,minimumStock:10,lotCode:'DEMO-CA-1810',expiresAt:'2026-10-19',supplierId:'supplier-meat',origin:'Theo phiếu nhập DEMO'},
  {id:'chicken-fresh-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Thịt gà',unit:'kg',openingBalance:75,minimumStock:22,lotCode:'DEMO-GA-2810',expiresAt:'2026-11-03',supplierId:'supplier-meat',origin:'TP.HCM (DEMO)'},
  {id:'carrot-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Cà rốt',unit:'kg',openingBalance:65,minimumStock:18,lotCode:'DEMO-CR-2810',expiresAt:'2026-11-03',supplierId:'supplier-farm',origin:'Đà Lạt (DEMO)'},
  {id:'spring-onion-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Hành lá',unit:'kg',openingBalance:14,minimumStock:4,lotCode:'DEMO-HL-2810',expiresAt:'2026-11-02',supplierId:'supplier-farm',origin:'Lâm Đồng (DEMO)'},
  {id:'pork-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Thịt heo',unit:'kg',openingBalance:84,minimumStock:20,lotCode:'DEMO-HEO-2810',expiresAt:'2026-11-03',supplierId:'supplier-meat',origin:'TP.HCM (DEMO)'},
  {id:'vegetable-an-phu',schoolId:'an-phu',schoolName:'Tiểu học An Phú',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-tam',kitchenName:'Bếp trung tâm An Tâm',ingredientName:'Rau xanh',unit:'kg',openingBalance:85,minimumStock:24,lotCode:'DEMO-RAU-2810',expiresAt:'2026-11-02',supplierId:'supplier-farm',origin:'Đà Lạt (DEMO)'},
  {id:'carrot-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Cà rốt',unit:'kg',openingBalance:32,minimumStock:8,lotCode:'DEMO-CR-BA-2810',expiresAt:'2026-11-03',supplierId:'supplier-farm',origin:'Đà Lạt (DEMO)'},
  {id:'chicken-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Thịt gà',unit:'kg',openingBalance:29,minimumStock:10,lotCode:'DEMO-GA-BA-2810',expiresAt:'2026-11-03',supplierId:'supplier-meat',origin:'TP.HCM (DEMO)'},
  {id:'vegetable-binh-an',schoolId:'binh-an',schoolName:'Mầm non Bình An',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-binh-an',kitchenName:'Bếp ăn Mầm non Bình An',ingredientName:'Rau xanh',unit:'kg',openingBalance:39,minimumStock:10,lotCode:'DEMO-RAU-BA-2810',expiresAt:'2026-11-02',supplierId:'supplier-farm',origin:'Đà Lạt (DEMO)'},
  {id:'carrot-an-khanh',schoolId:'an-khanh',schoolName:'THCS An Khánh',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-khanh',kitchenName:'Bếp ăn THCS An Khánh',ingredientName:'Cà rốt',unit:'kg',openingBalance:42,minimumStock:12,lotCode:'DEMO-CR-AK-2810',expiresAt:'2026-11-03',supplierId:'supplier-farm',origin:'Đà Lạt (DEMO)'},
  {id:'chicken-an-khanh',schoolId:'an-khanh',schoolName:'THCS An Khánh',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-khanh',kitchenName:'Bếp ăn THCS An Khánh',ingredientName:'Thịt gà',unit:'kg',openingBalance:42,minimumStock:12,lotCode:'DEMO-GA-AK-2810',expiresAt:'2026-11-03',supplierId:'supplier-meat',origin:'TP.HCM (DEMO)'},
  {id:'vegetable-an-khanh',schoolId:'an-khanh',schoolName:'THCS An Khánh',wardId:'ward-binh-hung-hoa',kitchenId:'kitchen-an-khanh',kitchenName:'Bếp ăn THCS An Khánh',ingredientName:'Rau xanh',unit:'kg',openingBalance:48,minimumStock:15,lotCode:'DEMO-RAU-AK-2810',expiresAt:'2026-11-02',supplierId:'supplier-farm',origin:'Đà Lạt (DEMO)'},
]

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
