import type { ViewRole } from './store'
import type { BoardingMealType } from './boardingMenu'
import { receivingReferenceCatalog, supervisionIngredientCatalog } from './inventory'
import type { SupervisionIngredientOption } from './inventory'

/** Frontend DEMO. Production must validate identity, role and scope on the server. */
export const SUPERVISION_STATUS_STORAGE_KEY = 'demo-supervision-status-v1'
export const SUPERVISION_STATUS_EVENT = 'demo-supervision-status-updated'
export type SupervisionMealType = BoardingMealType
export type CheckId = 'ingredient_receipt' | 'processing' | 'before_serving' | 'food_sample'
export type CheckStatus = 'not_reported' | 'reported' | 'revision_requested' | 'confirmed'
export type CheckAction = 'report' | 'confirm' | 'request_revision'
export type SupervisionScope = { schoolId: string; serviceDate: string; mealType: SupervisionMealType }
export type StatusHistory = {
  id: string
  action: CheckAction
  status: Exclude<CheckStatus, 'not_reported'>
  actorRole: ViewRole
  actorLabel: string
  recordedAt: string
  note: string
  evidenceRef: string
  ingredientReceipts?: IngredientReceiptLine[]
}
export type IngredientReceiptLine = SupervisionIngredientOption & { quantity: number }
export type SupervisionEvidenceOption = { value: string; label: string; description: string; tag: string }
export type CheckRecord = { id: CheckId; status: CheckStatus; history: StatusHistory[] }
export const CHECK_DEFINITIONS: readonly { id: CheckId; label: string; description: string }[] = [
  { id: 'ingredient_receipt', label: 'Kiểm thực bước 1 · Tiếp nhận nguyên liệu', description: 'Đối chiếu nguyên liệu và điều kiện đầu vào trước chế biến' },
  { id: 'processing', label: 'Kiểm thực bước 2 · Sơ chế, chế biến', description: 'Ghi nhận kiểm tra trong quá trình sơ chế và nấu' },
  { id: 'before_serving', label: 'Kiểm thực bước 3 · Trước khi phục vụ', description: 'Kiểm tra trước khi chia suất và phục vụ' },
  { id: 'food_sample', label: 'Lưu mẫu thức ăn', description: 'Ghi nhận mã sổ/mẫu, thời gian và điều kiện bảo quản trong hồ sơ nghiệp vụ' },
]
const roleLabels: Partial<Record<ViewRole, string>> = {
  central_kitchen: 'Bếp trung tâm', school_kitchen: 'Bếp tại trường', school_board: 'Ban Giám hiệu',
}
const validStatuses: CheckStatus[] = ['not_reported', 'reported', 'revision_requested', 'confirmed']

const mealCode = (mealType: SupervisionMealType): string => mealType === 'BREAKFAST' ? 'SANG' : mealType === 'LUNCH' ? 'TRUA' : 'XE'
const compactDate = (value: string): string => value.split('-').reverse().join('')

/**
 * Danh mục hồ sơ có thể liên kết theo đúng scope. Production cần lấy danh mục này
 * từ API đã kiểm tra quyền; DEMO hiện dùng phiếu kho và sổ/mẫu minh họa theo bữa.
 */
export function supervisionEvidenceCatalog(scope: SupervisionScope, id: CheckId): SupervisionEvidenceOption[] {
  if (id === 'ingredient_receipt') {
    return receivingReferenceCatalog(scope.schoolId, scope.serviceDate).map(item => ({
      value: item.reference,
      label: item.reference,
      description: `Phiếu tiếp nhận · ${item.ingredientName} · Lô ${item.lotCode}`,
      tag: 'DEMO',
    }))
  }
  const suffix = compactDate(scope.serviceDate)
  const code = mealCode(scope.mealType)
  const records: Record<Exclude<CheckId, 'ingredient_receipt'>, SupervisionEvidenceOption> = {
    processing: { value: `DEMO-KT3B-${code}-${suffix}-B2`, label: `DEMO-KT3B-${code}-${suffix}-B2`, description: 'Sổ kiểm thực bước 2 · Sơ chế, chế biến', tag: 'DEMO' },
    before_serving: { value: `DEMO-KT3B-${code}-${suffix}-B3`, label: `DEMO-KT3B-${code}-${suffix}-B3`, description: 'Sổ kiểm thực bước 3 · Trước khi phục vụ', tag: 'DEMO' },
    food_sample: { value: `DEMO-LM-${code}-${suffix}-01`, label: `DEMO-LM-${code}-${suffix}-01`, description: 'Phiếu lưu mẫu thức ăn theo bữa', tag: 'DEMO' },
  }
  return [records[id]]
}

const keyFor = (scope: SupervisionScope, id: CheckId): string =>
  JSON.stringify([scope.schoolId, scope.serviceDate, scope.mealType, id])
function recordsFromStorage(): Record<string, CheckRecord> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SUPERVISION_STATUS_STORAGE_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value as Record<string, CheckRecord>
  } catch {
    return {}
  }
}
function recordIsValid(record: CheckRecord | undefined, id: CheckId): record is CheckRecord {
  return !!record && record.id === id && validStatuses.includes(record.status) && Array.isArray(record.history)
}
export function readSupervisionStatuses(scope: SupervisionScope): CheckRecord[] {
  const stored = recordsFromStorage()
  return CHECK_DEFINITIONS.map(({ id }) => {
    const item = stored[keyFor(scope, id)]
    return recordIsValid(item, id) ? item : { id, status: 'not_reported', history: [] }
  })
}
export function canReportSupervision(role: ViewRole, mode: 'ON_SITE' | 'CENTRAL_KITCHEN'): boolean {
  return mode === 'CENTRAL_KITCHEN' ? role === 'central_kitchen' : role === 'school_kitchen'
}
export function canConfirmSupervision(role: ViewRole): boolean {
  return role === 'school_board'
}
export function updateSupervisionStatus(args: {
  scope: SupervisionScope
  id: CheckId
  action: CheckAction
  role: ViewRole
  schoolMode: 'ON_SITE' | 'CENTRAL_KITCHEN'
  note: string
  evidenceRef?: string
  ingredientReceipts?: readonly { itemId: string; quantity: number }[]
}): CheckRecord {
  const { scope, id, action, role, schoolMode } = args
  if (!CHECK_DEFINITIONS.some(item => item.id === id)) throw Error('Mục giám sát không hợp lệ.')
  if (!scope.schoolId || !/^\d{4}-\d{2}-\d{2}$/.test(scope.serviceDate) || !['BREAKFAST', 'LUNCH', 'SNACK'].includes(scope.mealType)) {
    throw Error('Phạm vi trường, ngày hoặc bữa không hợp lệ.')
  }
  const note = args.note.trim()
  const evidenceRef = (args.evidenceRef ?? '').trim()
  if (note.length < 5 || note.length > 1000) throw Error('Ghi chú phải có từ 5 đến 1000 ký tự.')
  const stored = recordsFromStorage()
  const key = keyFor(scope, id)
  const current = stored[key]
  const record = recordIsValid(current, id) ? current : { id, status: 'not_reported' as CheckStatus, history: [] }
  let nextStatus: Exclude<CheckStatus, 'not_reported'>
  let ingredientReceipts: IngredientReceiptLine[] | undefined
  if (action === 'report') {
    if (!canReportSupervision(role, schoolMode)) throw Error('Vai trò này không có quyền cập nhật hồ sơ của bếp.')
    if (!['not_reported', 'revision_requested'].includes(record.status)) throw Error('Trạng thái đã thay đổi. Vui lòng tải lại dữ liệu.')
    const allowedReferences = new Set(supervisionEvidenceCatalog(scope, id).map(item => item.value))
    if (!allowedReferences.has(evidenceRef)) throw Error('Chọn mã sổ, mã mẫu hoặc hồ sơ trong danh mục được phân quyền.')
    if (id === 'ingredient_receipt') {
      const submitted = args.ingredientReceipts ?? []
      if (!submitted.length) throw Error('Chọn ít nhất một nguyên liệu đã tiếp nhận và nhập số lượng.')
      if (submitted.length > 50) throw Error('Mỗi phiếu chỉ được ghi nhận tối đa 50 nguyên liệu.')
      const catalog = new Map(supervisionIngredientCatalog(scope.schoolId).map(item => [item.itemId, item]))
      const seen = new Set<string>()
      ingredientReceipts = submitted.map(line => {
        if (seen.has(line.itemId)) throw Error('Danh sách nguyên liệu có mục bị trùng.')
        seen.add(line.itemId)
        const item = catalog.get(line.itemId)
        if (!item) throw Error('Nguyên liệu không thuộc phạm vi bếp của trường này.')
        if (!Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > 5000) {
          throw Error(`Số lượng ${item.ingredientName} phải lớn hơn 0 và không vượt quá 5.000 ${item.unit}.`)
        }
        return { ...item, quantity: Math.round(line.quantity * 1000) / 1000 }
      })
    }
    nextStatus = 'reported'
  } else if (action === 'confirm' || action === 'request_revision') {
    if (!canConfirmSupervision(role)) throw Error('Chỉ Ban Giám hiệu được xác nhận hoặc yêu cầu bổ sung.')
    if (record.status !== 'reported') throw Error('Chỉ có thể xử lý hồ sơ đã báo cáo và đang chờ xác nhận.')
    if (!record.history.some(item => item.action === 'report' && item.evidenceRef)) throw Error('Chưa có tham chiếu hồ sơ để đối chiếu.')
    nextStatus = action === 'confirm' ? 'confirmed' : 'revision_requested'
  } else {
    throw Error('Thao tác không hợp lệ.')
  }
  const latestEvidence = record.history.filter(item => item.action === 'report').at(-1)?.evidenceRef ?? ''
  const latestIngredientReceipts = record.history.filter(item => item.action === 'report').at(-1)?.ingredientReceipts
  const entry: StatusHistory = {
    id: crypto.randomUUID(), action, status: nextStatus,
    actorRole: role, actorLabel: roleLabels[role] ?? role,
    recordedAt: new Date().toISOString(), note,
    evidenceRef: action === 'report' ? evidenceRef : latestEvidence,
    ...(id === 'ingredient_receipt' && { ingredientReceipts: action === 'report' ? ingredientReceipts : latestIngredientReceipts }),
  }
  const updated: CheckRecord = { id, status: nextStatus, history: [...record.history, entry] }
  // Nếu trình duyệt chặn ghi hoặc vượt quota, không phát sự kiện cập nhật giả.
  localStorage.setItem(SUPERVISION_STATUS_STORAGE_KEY, JSON.stringify({ ...stored, [key]: updated }))
  window.dispatchEvent(new Event(SUPERVISION_STATUS_EVENT))
  return updated
}
