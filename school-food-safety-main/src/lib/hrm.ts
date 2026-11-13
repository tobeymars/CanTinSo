export type EmploymentStatus = 'active' | 'leave' | 'inactive'
export type EmployeePosition = 'head_chef' | 'cook' | 'prep' | 'packing' | 'dispatcher' | 'sanitation'
export type ShiftCode = 'morning' | 'day' | 'afternoon'

export type KitchenEmployee = {
  id: string
  code: string
  fullName: string
  position: EmployeePosition
  phone: string
  startDate: string
  status: EmploymentStatus
  healthCertificateExpiry: string
  foodSafetyTrainingExpiry: string
}

export type WorkAssignment = {
  id: string
  employeeId: string
  date: string
  shift: ShiftCode
  station: string
  task: string
  note: string
}

export const positionLabels: Record<EmployeePosition, string> = {
  head_chef: 'Bếp trưởng',
  cook: 'Bếp chính',
  prep: 'Sơ chế',
  packing: 'Chia suất & đóng gói',
  dispatcher: 'Điều phối giao nhận',
  sanitation: 'Vệ sinh bếp',
}

export const employmentStatusLabels: Record<EmploymentStatus, string> = {
  active: 'Đang làm việc',
  leave: 'Đang nghỉ phép',
  inactive: 'Ngừng làm việc',
}

export const shiftCatalog: Record<ShiftCode, { label: string; time: string; hours: number }> = {
  morning: { label: 'Ca sáng', time: '05:30–13:30', hours: 8 },
  day: { label: 'Ca hành chính', time: '07:00–15:00', hours: 8 },
  afternoon: { label: 'Ca chiều', time: '10:00–18:00', hours: 8 },
}

export const kitchenStations = [
  'Sơ chế',
  'Bếp nóng',
  'Chia suất & đóng gói',
  'Kho & tiếp nhận',
  'Điều phối giao nhận',
  'Vệ sinh bếp',
] as const

export const demoEmployees: KitchenEmployee[] = [
  { id: 'hrm-e01', code: 'BT-001', fullName: 'Nguyễn An Nhiên', position: 'head_chef', phone: '0900000101', startDate: '2023-08-01', status: 'active', healthCertificateExpiry: '2027-03-15', foodSafetyTrainingExpiry: '2027-01-20' },
  { id: 'hrm-e02', code: 'BC-014', fullName: 'Trần Minh Tâm', position: 'cook', phone: '0900000102', startDate: '2024-01-08', status: 'active', healthCertificateExpiry: '2027-02-11', foodSafetyTrainingExpiry: '2027-04-06' },
  { id: 'hrm-e03', code: 'BC-018', fullName: 'Lê Hoài Phương', position: 'cook', phone: '0900000103', startDate: '2024-05-20', status: 'active', healthCertificateExpiry: '2026-11-18', foodSafetyTrainingExpiry: '2027-02-14' },
  { id: 'hrm-e04', code: 'SC-026', fullName: 'Phạm Gia Hân', position: 'prep', phone: '0900000104', startDate: '2025-02-10', status: 'active', healthCertificateExpiry: '2027-05-09', foodSafetyTrainingExpiry: '2026-12-02' },
  { id: 'hrm-e05', code: 'DS-031', fullName: 'Võ Thanh Bình', position: 'packing', phone: '0900000105', startDate: '2025-06-16', status: 'active', healthCertificateExpiry: '2027-06-22', foodSafetyTrainingExpiry: '2027-03-12' },
  { id: 'hrm-e06', code: 'GN-009', fullName: 'Đặng Quốc Bảo', position: 'dispatcher', phone: '0900000106', startDate: '2024-09-02', status: 'active', healthCertificateExpiry: '2027-01-28', foodSafetyTrainingExpiry: '2027-01-28' },
  { id: 'hrm-e07', code: 'VS-011', fullName: 'Bùi Ngọc Mai', position: 'sanitation', phone: '0900000107', startDate: '2025-03-03', status: 'leave', healthCertificateExpiry: '2027-04-18', foodSafetyTrainingExpiry: '2027-04-18' },
  { id: 'hrm-e08', code: 'SC-029', fullName: 'Đỗ Hải Yến', position: 'prep', phone: '0900000108', startDate: '2025-10-13', status: 'active', healthCertificateExpiry: '2026-11-05', foodSafetyTrainingExpiry: '2027-05-30' },
]

const seedWeek = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']
const stations: Record<EmployeePosition, string> = {
  head_chef: 'Bếp nóng', cook: 'Bếp nóng', prep: 'Sơ chế', packing: 'Chia suất & đóng gói', dispatcher: 'Điều phối giao nhận', sanitation: 'Vệ sinh bếp',
}

export const demoAssignments: WorkAssignment[] = seedWeek.flatMap((date, dayIndex) => demoEmployees
  .filter(employee => employee.status === 'active' && !(dayIndex === 5 && ['hrm-e04', 'hrm-e08'].includes(employee.id)))
  .map((employee, employeeIndex) => ({
    id: `hrm-a-${date}-${employee.id}`,
    employeeId: employee.id,
    date,
    shift: employee.position === 'dispatcher' ? 'day' : employeeIndex % 4 === 0 ? 'day' : 'morning',
    station: stations[employee.position],
    task: employee.position === 'dispatcher' ? 'Điều phối chuyến giao đến các trường' : `${positionLabels[employee.position]} theo kế hoạch ngày`,
    note: '',
  })))

const EMPLOYEE_KEY = 'demo-central-kitchen-employees-v1'
const ASSIGNMENT_KEY = 'demo-central-kitchen-assignments-v1'

function readArray<T>(key: string, fallback: T[], guard: (value: unknown) => value is T): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return Array.isArray(parsed) && parsed.every(guard) ? parsed : fallback
  } catch {
    return fallback
  }
}

const isEmployee = (value: unknown): value is KitchenEmployee => typeof value === 'object' && value !== null
  && typeof (value as KitchenEmployee).id === 'string' && typeof (value as KitchenEmployee).code === 'string'
  && typeof (value as KitchenEmployee).fullName === 'string' && (value as KitchenEmployee).position in positionLabels

const isAssignment = (value: unknown): value is WorkAssignment => typeof value === 'object' && value !== null
  && typeof (value as WorkAssignment).id === 'string' && typeof (value as WorkAssignment).employeeId === 'string'
  && typeof (value as WorkAssignment).date === 'string' && (value as WorkAssignment).shift in shiftCatalog

export const readEmployees = () => readArray(EMPLOYEE_KEY, demoEmployees, isEmployee)
export const readAssignments = () => readArray(ASSIGNMENT_KEY, demoAssignments, isAssignment)
export const saveEmployees = (employees: KitchenEmployee[]) => localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(employees))
export const saveAssignments = (assignments: WorkAssignment[]) => localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(assignments))

export function weekFrom(date: string): string[] {
  const value = new Date(`${date}T12:00:00`)
  const day = value.getDay() || 7
  value.setDate(value.getDate() - day + 1)
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(value)
    current.setDate(value.getDate() + index)
    return current.toLocaleDateString('sv-SE')
  })
}
