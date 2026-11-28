import { getAccessToken } from './authApi'
import type { LegalDocument, LegalAttachment } from './kitchenLegalStorage'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
export type KitchenLegalRecord = LegalDocument & { kitchenId: string; kitchen?: { id: string; name: string }; events?: { id: string; action: string; actorId: string; createdAt: string }[] }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  if (!token) throw new Error('Bạn cần đăng nhập để xem hồ sơ.')
  const response = await fetch(`${BASE}/kitchen-legal${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Không thể xử lý hồ sơ.')
  }
  return response.json() as Promise<T>
}
const day = (value?: string | null) => value ? value.slice(0,10) : undefined
function normalize(row: any): KitchenLegalRecord {
  return { ...row, issuedAt: day(row.issuedAt), expiresAt: day(row.expiresAt), updatedAt: day(row.updatedAt), custom: true,
    attachments: Array.isArray(row.attachments) ? row.attachments.map((a: any) => ({ ...a, type: a.mimeType, addedAt: a.createdAt })) : [] }
}
export async function listKitchenLegal(): Promise<KitchenLegalRecord[]> { return (await request<any[]>('')).map(normalize) }
export async function getKitchenLegal(id: string): Promise<KitchenLegalRecord> { return normalize(await request<any>(`/${encodeURIComponent(id)}`)) }
export async function saveKitchenLegal(value: LegalDocument): Promise<KitchenLegalRecord> {
  const body = JSON.stringify(value)
  return normalize(await request<any>(value.id.startsWith('new-') ? '' : `/${encodeURIComponent(value.id)}`, { method: value.id.startsWith('new-') ? 'POST' : 'PATCH', body }))
}
export async function deleteKitchenLegal(id: string) { await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
function toBase64(file: File): Promise<string> {
  return new Promise((resolve,reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Không đọc được tệp.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(file)
  })
}
export async function uploadKitchenLegal(id: string, file: File): Promise<LegalAttachment> {
  const data = await request<any>(`/${encodeURIComponent(id)}/attachments`, { method: 'POST', body: JSON.stringify({ name: file.name, mimeType: file.type, base64: await toBase64(file) }) })
  return { id: data.id, name: data.name, type: data.mimeType, size: data.size, addedAt: data.createdAt }
}
export async function deleteKitchenLegalFile(id: string, fileId: string) { await request(`/${encodeURIComponent(id)}/attachments/${encodeURIComponent(fileId)}`, { method: 'DELETE' }) }
export async function downloadKitchenLegalFile(id: string, file: LegalAttachment) {
  const data = await request<{ name: string; mimeType: string; base64: string }>(`/${encodeURIComponent(id)}/attachments/${encodeURIComponent(file.id)}`)
  const raw = atob(data.base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([bytes], { type: data.mimeType }))
  const link = document.createElement('a'); link.href = url; link.download = data.name; document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
