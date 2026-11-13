import type { School } from './data'
import type { ViewRole } from './store'
import { CHECK_DEFINITIONS, readSupervisionStatuses } from './supervisionStatus'
import type { SupervisionScope } from './supervisionStatus'
import { getSavedJourney, stageNames, stagesForSchool } from './supervisionJourney'

/** Xác nhận tổng thể theo trường / ngày / bữa. Chỉ dành cho frontend DEMO.
 * Backend production phải xác thực phiên đăng nhập, quyền và phạm vi trường.
 */
export const SUPERVISION_APPROVAL_KEY = 'demo-supervision-meal-approvals-v1'
export const SUPERVISION_APPROVAL_EVENT = 'demo-supervision-meal-approval-updated'

export type MealApproval = {
  id: string
  schoolId: string
  serviceDate: string
  mealType: SupervisionScope['mealType']
  actorRole: 'school_board'
  actorLabel: string
  confirmedAt: string
  note: string
  snapshot: string
}

type ApprovalStatus = {
  confirmedChecks: number
  requiredChecks: number
  confirmedStages: number
  requiredStages: number
  pendingDetails: string[]
  snapshot: string
  ready: boolean
  latest?: MealApproval
  approved: boolean
  stale: boolean
}

const keyFor = (scope: SupervisionScope): string =>
  JSON.stringify([scope.schoolId, scope.serviceDate, scope.mealType])

function readAll(): Record<string, MealApproval[]> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SUPERVISION_APPROVAL_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value as Record<string, MealApproval[]>
  } catch {
    return {}
  }
}

export function readMealApprovalHistory(scope: SupervisionScope): MealApproval[] {
  const entries = readAll()[keyFor(scope)]
  if (!Array.isArray(entries)) return []
  return entries.filter(item => item?.schoolId === scope.schoolId
    && item?.serviceDate === scope.serviceDate && item?.mealType === scope.mealType
    && item?.actorRole === 'school_board' && typeof item.snapshot === 'string')
}

export function mealApprovalStatus(scope: SupervisionScope, school: School): ApprovalStatus {
  if (school.id !== scope.schoolId) throw Error('Phạm vi xác nhận không thuộc trường đang chọn.')
  const checks = readSupervisionStatuses(scope)
  // Bếp tại trường không cập nhật mốc ARRIVED; chỉ yêu cầu các mốc thực sự có
  // thể báo cáo trong quy trình hiện tại, tránh khóa xác nhận do mốc legacy.
  const requiredStages = stagesForSchool(school.mode, 'school_kitchen')
  const events = getSavedJourney(scope)?.events ?? []
  const confirmedChecks = checks.filter(item => item.status === 'confirmed').length
  const confirmedStages = requiredStages.filter(stage => events.some(event => event.status === stage && event.confirmed)).length
  const pendingDetails = [
    ...CHECK_DEFINITIONS.filter(def => checks.find(item => item.id === def.id)?.status !== 'confirmed').map(def => def.label),
    ...requiredStages.filter(stage => !events.some(event => event.status === stage && event.confirmed)).map(stage => `Mốc: ${stageNames[stage]}`),
  ]
  // Snapshot bám lịch sử xác nhận của từng mục và từng mốc. Khi dữ liệu thay đổi,
  // xác nhận trước không còn hiệu lực cho đến khi BGH đối chiếu lại.
  const snapshot = JSON.stringify({
    checks: checks.map(item => [item.id, item.status, item.history.at(-1)?.id ?? null]),
    stages: requiredStages.map(stage => {
      const event = events.find(item => item.status === stage)
      return [stage, event?.confirmed ?? false, event?.time ?? null, event?.confirmedAt ?? null, event?.confirmationNote ?? null]
    }),
  })
  const latest = readMealApprovalHistory(scope).at(-1)
  const ready = pendingDetails.length === 0
  const approved = !!latest && ready && latest.snapshot === snapshot
  return {
    confirmedChecks, requiredChecks: CHECK_DEFINITIONS.length,
    confirmedStages, requiredStages: requiredStages.length,
    pendingDetails, snapshot, ready, latest, approved,
    stale: !!latest && !approved,
  }
}

export function confirmMealSupervision(args: {
  scope: SupervisionScope
  school: School
  role: ViewRole
  note: string
}): MealApproval {
  if (args.role !== 'school_board') throw Error('Chỉ Ban Giám hiệu được xác nhận tổng thể Giám sát & an toàn.')
  if (!args.scope.schoolId || !/^\d{4}-\d{2}-\d{2}$/.test(args.scope.serviceDate)
    || !['BREAKFAST', 'LUNCH', 'SNACK'].includes(args.scope.mealType)) {
    throw Error('Trường, ngày hoặc bữa không hợp lệ.')
  }
  const note = args.note.trim()
  if (note.length < 5 || note.length > 1000) throw Error('Nội dung xác nhận phải dài từ 5 đến 1000 ký tự.')
  const status = mealApprovalStatus(args.scope, args.school)
  if (!status.ready) throw Error('Chưa thể xác nhận: còn hồ sơ kiểm thực hoặc mốc vận hành chưa được BGH đối chiếu.')
  if (status.approved) throw Error('Bữa ăn này đã được xác nhận tổng thể; không cần xác nhận lại.')
  const record: MealApproval = {
    id: crypto.randomUUID(), schoolId: args.scope.schoolId, serviceDate: args.scope.serviceDate,
    mealType: args.scope.mealType, actorRole: 'school_board', actorLabel: 'Ban Giám hiệu (DEMO)',
    confirmedAt: new Date().toISOString(), note, snapshot: status.snapshot,
  }
  const all = readAll()
  const key = keyFor(args.scope)
  localStorage.setItem(SUPERVISION_APPROVAL_KEY, JSON.stringify({ ...all, [key]: [...readMealApprovalHistory(args.scope), record] }))
  window.dispatchEvent(new Event(SUPERVISION_APPROVAL_EVENT))
  return record
}
