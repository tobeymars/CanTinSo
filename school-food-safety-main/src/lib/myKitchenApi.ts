import { getAccessToken } from './authApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

export type MyKitchenContext = {
  providerType: 'CENTRAL' | 'SCHOOL'
  assignmentId: string | null
  startsAt: string | null
  kitchen: {
    id: string
    code: string
    name: string
    type: 'CENTRAL' | 'SCHOOL'
    address: string | null
    contactName: string | null
    phone: string | null
    capacity: number | null
    schools?: Array<{
      id: string
      startsAt: string
      endsAt: string | null
      school: { id: string; name: string; code: string | null }
    }>
  }
}

export async function fetchMyKitchenContext(): Promise<MyKitchenContext> {
  const token = getAccessToken()
  if (!token) throw new Error('Chưa đăng nhập bằng tài khoản hệ thống.')
  const response = await fetch(`${API_BASE_URL}/users/my-kitchen`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || 'Không thể tải thông tin bếp được gán.')
  }
  return response.json() as Promise<MyKitchenContext>
}
