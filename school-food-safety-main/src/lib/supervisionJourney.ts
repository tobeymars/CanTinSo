import type { DayData, School } from './data'
import type { ViewRole } from './store'
import type { SupervisionMealType, SupervisionScope } from './supervisionStatus'

export const SUPERVISION_JOURNEY_EVENT = 'demo-supervision-journey-updated'
export type JourneyStatus = 'PREPARING' | 'DISPATCHED' | 'ARRIVED' | 'PLATED' | 'READY'
export type SavedJourneyEvent = {
  status: JourneyStatus
  time: string
  confirmed: boolean
  photos: string[]
  note: string
  actorRole: ViewRole
  actorLabel: string
  confirmedAt?: string
  confirmedBy?: string
  confirmationNote?: string
}
type SavedJourney = {
  schoolId: string
  date: string
  mealType?: SupervisionMealType
  status: JourneyStatus
  events: SavedJourneyEvent[]
  servings: number
  dishes: string[]
}
const STORAGE_KEY = 'demo-admin-meals'
/** PREPARING được giữ trong type để đọc bản DEMO cũ, nhưng không còn là mốc người dùng phải cập nhật. */
const allStages: JourneyStatus[] = ['DISPATCHED', 'ARRIVED', 'PLATED', 'READY']
export const stageNames: Record<JourneyStatus, string> = {
  PREPARING: 'Bắt đầu chế biến', DISPATCHED: 'Xuất bếp', ARRIVED: 'Đến trường', PLATED: 'Ra món', READY: 'Sẵn sàng phục vụ',
}
const roleNames: Partial<Record<ViewRole, string>> = {
  central_kitchen: 'Bếp trung tâm', school_kitchen: 'Bếp tại trường', school_board: 'Ban Giám hiệu',
}
/** Bếp tại trường không có bước tiếp nhận chuyến giao trong giao diện tác nghiệp.
 * Không xóa dữ liệu ARRIVED lịch sử: các vai trò khác vẫn đọc được khi có quyền.
 */
export const stagesForSchool = (mode: School['mode'], role?: ViewRole): JourneyStatus[] =>
  mode === 'CENTRAL_KITCHEN'
    ? role === 'school_kitchen' ? ['DISPATCHED', 'PLATED', 'READY'] : allStages
    : ['PLATED', 'READY']

function readAll(): SavedJourney[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((item): item is SavedJourney => !!item && typeof item === 'object'
      && typeof item.schoolId === 'string' && typeof item.date === 'string' && Array.isArray(item.events))
  } catch {
    return []
  }
}
function matching(meal: SavedJourney, scope: SupervisionScope): boolean {
  return meal.schoolId === scope.schoolId && meal.date === scope.serviceDate && (meal.mealType ?? 'LUNCH') === scope.mealType
}
export const getSavedJourney = (scope: SupervisionScope): SavedJourney | undefined => readAll().find(meal => matching(meal, scope))
export function canReportStage(role: ViewRole, mode: School['mode'], stage: JourneyStatus): boolean {
  if (!stagesForSchool(mode, role).includes(stage)) return false
  if (mode === 'ON_SITE') return role === 'school_kitchen'
  return stage === 'DISPATCHED' ? role === 'central_kitchen'
    : role === 'school_kitchen' // Bếp tại trường nhận suất và phục vụ cả bữa nấu từ bếp trung tâm.
}
export function getNextReportableStage(scope: SupervisionScope, mode: School['mode'], role: ViewRole): JourneyStatus | null {
  const record = getSavedJourney(scope)
  const stages = stagesForSchool(mode, role)
  const next = stages.find(stage => !record?.events.some(event => event.status === stage))
  if (!next || !canReportStage(role, mode, next)) return null
  // Chuỗi mốc của một bữa bắt buộc tuần tự, kể cả khi BGH chưa duyệt mốc trước.
  return next
}
export function updateJourney(args: {
  scope: SupervisionScope
  school: School
  data: DayData
  role: ViewRole
  action: 'report' | 'confirm'
  status: JourneyStatus
  note: string
  photo?: string
}): void {
  const { scope, school, data, role, action, status } = args
  if (scope.schoolId !== school.id || scope.serviceDate !== data.serviceDate || scope.mealType !== data.mealType)
    throw Error('Dữ liệu không khớp trường, ngày hoặc bữa được chọn.')
  const note = args.note.trim()
  if (note.length < 5 || note.length > 1000) throw Error('Ghi chú phải có từ 5 đến 1000 ký tự.')
  const meals = readAll()
  const previous = meals.find(meal => matching(meal, scope))
  const record: SavedJourney = previous
    ? { ...previous, mealType: scope.mealType, events: [...previous.events] }
    : { schoolId: scope.schoolId, date: scope.serviceDate, mealType: scope.mealType,
      status, events: [], servings: data.servings, dishes: [...data.dishes] }
  if (action === 'report') {
    if (getNextReportableStage(scope, school.mode, role) !== status)
      throw Error('Không có quyền hoặc chưa đến mốc được cập nhật. Cần thực hiện đúng thứ tự.')
    if (status === 'READY' && (!args.photo || !/^data:image\/(jpeg|png|webp);base64,/.test(args.photo)))
      throw Error('Mốc Sẵn sàng phục vụ cần một ảnh thực tế JPEG, PNG hoặc WebP.')
    record.events.push({ status, time: new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()), confirmed: false,
      photos: status === 'READY' ? [args.photo!] : [], note, actorRole: role, actorLabel: roleNames[role] ?? role })
    record.status = status
  } else if (action === 'confirm') {
    if (role !== 'school_board') throw Error('Chỉ Ban Giám hiệu được xác nhận mốc vận hành.')
    const event = record.events.find(event => event.status === status)
    if (!event || event.confirmed) throw Error('Mốc chưa được báo cáo hoặc đã được xác nhận.')
    event.confirmed = true
    event.confirmedAt = new Date().toISOString()
    event.confirmedBy = 'Ban Giám hiệu'
    event.confirmationNote = note
  } else {
    throw Error('Thao tác không được hỗ trợ.')
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...meals.filter(meal => !matching(meal, scope)), record]))
  } catch {
    throw Error('Không thể lưu nhật ký. Có thể bộ nhớ trình duyệt đã đầy.')
  }
  window.dispatchEvent(new Event(SUPERVISION_JOURNEY_EVENT))
}
