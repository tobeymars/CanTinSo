import { getAccessToken } from './authApi'
import type { SupervisionScope } from './supervisionStatus'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
export const isServerSupervisionScope = (scope: SupervisionScope) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scope.schoolId) && !!getAccessToken()
const path = (scope: SupervisionScope) => [scope.schoolId, scope.serviceDate, scope.mealType].map(encodeURIComponent).join('/')
async function call<T>(scope: SupervisionScope, init?: RequestInit, suffix = ''): Promise<T> {
  const token = getAccessToken()
  if (!token) throw Error('Vui lòng đăng nhập để cập nhật giám sát.')
  const response = await fetch(`${BASE}/supervision/${path(scope)}${suffix}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.body ? {'Content-Type':'application/json'} : {}), ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Không thể cập nhật giám sát.')
  }
  return response.json() as Promise<T>
}
export type ServerSupervision = {
  checks: Record<string,{status:string;evidenceRef?:string;ingredientReceipts?:unknown[];history?:unknown[]}>
  stages: Record<string,{confirmed:boolean;photos?:string[];note?:string;time?:string;confirmedAt?:string;confirmationNote?:string}>
  approvals: {snapshot:string;at:string;note:string}[]
  approvalCurrent:boolean
}
export const readServerSupervision = (scope: SupervisionScope) => call<ServerSupervision>(scope)
export const writeServerSupervision = (scope: SupervisionScope, body: Record<string,unknown>) =>
  call<{success:boolean;id:string}>(scope, {method:'POST',body:JSON.stringify(body)}, '/actions')

export type SupervisionContext = {
  schoolId:string;serviceDate:string;mealType:string
  kitchen:{id:string;name:string;type:'CENTRAL'|'SCHOOL'}|null
  legalDocuments:{id:string;title:string;status:string;expiresAt:string|null}[]
  menu:{id:string;servings:number;status:string;dishes:{id:string;name:string}[]}|null
  lots:{itemId:string;ingredientName:string;lotCode:string;supplierName:string;supplierContact:string;expiresAt:string|null;quantityAvailable:number;unit:string;status:string;receivedAt:string}[]
}
export const readSupervisionContext = (scope:SupervisionScope) => call<SupervisionContext>(scope,undefined,'/context')
