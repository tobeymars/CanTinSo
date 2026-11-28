import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Utensils, XCircle } from 'lucide-react'
import { getAccessToken, getStoredUser } from './lib/authApi'
import './DishApprovalInbox.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
type Approval = {
  id: string
  status: string
  submittedAt: string
  dishVersion: {
    versionNo: number
    recipeSnapshot: Record<string, unknown>
    ingredients: Array<{ quantity: string | number; unitCode: string; ingredient: { name: string; code: string } }>
    dish: { id: string; code: string; name: string; kitchen: { name: string } }
  }
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  if (!token) throw new Error('Vui lòng đăng nhập bằng tài khoản Ban Giám hiệu.')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Không thể xử lý yêu cầu.')
  }
  return response.json() as Promise<T>
}

export default function DishApprovalInbox() {
  const [items, setItems] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError('') }
    try {
      const result = await api<Approval[]>('/dishes/pending-approvals')
      setItems(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách món chờ duyệt.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])
  useEffect(() => { if (getStoredUser()?.role === 'SCHOOL_ADMIN') void load(); else { setLoading(false); setError('Chức năng này chỉ dành cho tài khoản Ban Giám hiệu.') } }, [load])
  useEffect(() => { const refresh = () => { if (getStoredUser()?.role === 'SCHOOL_ADMIN') void load(true) }; window.addEventListener('cantinso:business-updated', refresh); return () => window.removeEventListener('cantinso:business-updated', refresh) }, [load])
  const decide = async (item: Approval, decision: 'approve' | 'return') => {
    const reason = reasons[item.id]?.trim() ?? ''
    if (decision === 'return' && !reason) { setError('Vui lòng nhập lý do trả lại món để bếp biết nội dung cần chỉnh sửa.'); return }
    setBusy(item.id)
    setError('')
    try {
      await api(`/dishes/approvals/${item.id}/${decision}`, { method: 'POST', body: JSON.stringify(decision === 'return' ? { reason } : {}) })
      setItems(current => current.filter(row => row.id !== item.id))
      setNotice(decision === 'approve' ? `Đã duyệt món “${String(item.dishVersion.recipeSnapshot.name ?? item.dishVersion.dish.name)}”.` : `Đã trả món “${String(item.dishVersion.recipeSnapshot.name ?? item.dishVersion.dish.name)}” về bếp.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật quyết định duyệt.')
    } finally { setBusy(null) }
  }
  return <section className="dish-approval-page">
    <header className="dish-approval-heading"><div><span className="dish-label">QUẢN LÝ CHẤT LƯỢNG BỮA ĂN</span><h2>Duyệt món từ bếp</h2><p>Các phiên bản công thức do bếp được phân công gửi đến trường này.</p></div><button type="button" className="dish-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Làm mới</button></header>
    {notice && <div className="dish-approval-notice success"><CheckCircle2 size={17}/>{notice}</div>}
    {error && <div className="dish-approval-notice error"><AlertTriangle size={17}/>{error}</div>}
    {loading ? <div className="dish-approval-empty">Đang tải món chờ duyệt…</div> : items.length === 0 ? <div className="dish-approval-empty"><CheckCircle2 size={28}/><h3>Không có món chờ duyệt</h3><p>Khi bếp gửi công thức đến trường, nội dung sẽ xuất hiện tại đây.</p></div> : <div className="dish-approval-list">{items.map(item => {
      const snapshot = item.dishVersion.recipeSnapshot ?? {}
      const name = String(snapshot.name ?? item.dishVersion.dish.name)
      return <article className="dish-approval-card" key={item.id}>
        <div className="dish-approval-card-head"><div><span className="dish-approval-pending"><Clock3 size={13}/> Chờ duyệt · Phiên bản {item.dishVersion.versionNo}</span><h3>{name}</h3><p>Bếp gửi: <strong>{item.dishVersion.dish.kitchen.name}</strong> · {new Date(item.submittedAt).toLocaleString('vi-VN')}</p></div><Utensils size={22}/></div>
        <p className="dish-approval-description">{String(snapshot.description ?? '')}</p>
        <div className="dish-approval-facts"><span>Bữa: {String(snapshot.mealType ?? 'Chưa khai báo')}</span><span>Nhóm lớp: {String(snapshot.ageBand ?? 'Chưa khai báo')}</span><span>Khối lượng: {String(snapshot.portionWeightGrams ?? '—')} g/suất</span><span>Dự kiến: {String(snapshot.expectedQuantity ?? '—')} suất</span></div>
        <h4>Thành phần công thức</h4>
        <div className="dish-approval-ingredients">{item.dishVersion.ingredients.map(row => <span key={row.ingredient.code}>{row.ingredient.name}: {Number(row.quantity).toLocaleString('vi-VN')} {row.unitCode}</span>)}</div>
        <label className="dish-approval-reason">Lý do trả lại (bắt buộc nếu không duyệt)<textarea rows={2} value={reasons[item.id] ?? ''} onChange={event => setReasons(current => ({ ...current, [item.id]: event.target.value }))} placeholder="Nêu rõ nội dung cần bếp điều chỉnh…"/></label>
        <div className="dish-approval-actions"><button type="button" className="dish-return-button" disabled={busy === item.id} onClick={() => void decide(item, 'return')}><XCircle size={16}/> Trả lại bếp</button><button type="button" className="dish-approve-button" disabled={busy === item.id} onClick={() => void decide(item, 'approve')}><CheckCircle2 size={16}/> {busy === item.id ? 'Đang xử lý…' : 'Duyệt công thức'}</button></div>
      </article>
    })}</div>}
  </section>
}
