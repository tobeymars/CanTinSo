import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, ExternalLink, Printer, QrCode, RefreshCw, ShieldAlert } from 'lucide-react';
import { getAccessToken, getStoredUser } from './lib/authApi';
import type { MealPlanRow } from './lib/mealPlanApi';
import './PortionQr.css';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
type QrRow = { id: string; token: string; dishName: string; ageGroup: string; ageGroupCode: string; revisionId: string; issuedAt: string; revokedAt: string | null; revokeReason: string | null; state: 'ACTIVE' | 'REVOKED' };
type QrRegistry = { expectedCount: number; missingCount: number; approvedDishNames: string[]; plan: { id: string; schoolName: string; kitchenName: string; serviceDate: string; mealType: string; revisionId: string | null; status: string }; records: QrRow[] };
async function api<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
  const response = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(Array.isArray(error?.message) ? error.message.join(', ') : error?.message ?? 'Không thể tải dữ liệu QR.');
  }
  return response.json() as Promise<T>;
}
const mealName = (type: string) => ({ BREAKFAST: 'Bữa sáng', LUNCH: 'Bữa trưa', DINNER: 'Bữa tối', SNACK: 'Bữa xế' } as Record<string,string>)[type] ?? type;
export default function RealDishQrPanel() {
  const role = getStoredUser()?.role;
  const canIssue = role === 'CENTRAL_KITCHEN' || role === 'SCHOOL_KITCHEN';
  const [plans, setPlans] = useState<MealPlanRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [registry, setRegistry] = useState<QrRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');
  const [filter, setFilter] = useState('');
  const [showRevoked, setShowRevoked] = useState(false);
  const selected = useMemo(() => plans.find(p => p.id === selectedId), [plans, selectedId]);
  async function loadPlans() {
    setLoading(true); setError('');
    try {
      const rows = await api<MealPlanRow[]>('/meal-plans');
      setPlans(rows);
      setSelectedId(current => rows.some(row => row.id === current) ? current : rows[0]?.id ?? '');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được thực đơn.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadPlans(); }, []);
  async function loadRegistry(id: string) {
    if (!id) { setRegistry(null); return; }
    setError(''); setRegistry(null);
    try { setRegistry(await api<QrRegistry>(`/meal-plans/${id}/qr`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được mã QR.'); }
  }
  useEffect(() => { void loadRegistry(selectedId); }, [selectedId]);
  async function mutate(action: 'issue' | 'revoke') {
    if (!selectedId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api<{ issued?: number; revoked?: number }>(`/meal-plans/${selectedId}/qr/${action}`, 'POST', action === 'revoke' ? { reason } : undefined);
      setNotice(action === 'issue' ? `Đã phát hành ${result.issued ?? 0} mã QR theo món và nhóm tuổi.` : `Đã thu hồi ${result.revoked ?? 0} mã QR.`);
      setReason('');
      await loadRegistry(selectedId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Thao tác không thành công.'); }
    finally { setBusy(false); }
  }
  // Older backend instances may not expose QR reconciliation fields yet.
  // Never let an incomplete API payload crash the entire management page.
  const approvedDishNames = Array.isArray(registry?.approvedDishNames) ? registry.approvedDishNames : [];
  const expectedCount = typeof registry?.expectedCount === 'number' ? registry.expectedCount : null;
  const missingCount = typeof registry?.missingCount === 'number' ? registry.missingCount : null;
  const rows = (registry?.records ?? []).filter(row => (showRevoked || row.state === 'ACTIVE') && `${row.dishName} ${row.ageGroup}`.toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi')));
  const active = registry?.records.filter(row => row.state === 'ACTIVE') ?? [];
  return <section className="portion-qr-page real-qr-workspace">
    <div className="card portion-qr-card">
      <div className="card-header"><div><span className="section-kicker">TRUY XUẤT MÓN ĂN · DỮ LIỆU HỆ THỐNG</span><h2>Quản lý mã QR món ăn</h2><p className="muted">Mỗi mã gắn với một món, nhóm tuổi và phiên bản thực đơn đã được BGH duyệt.</p></div><QrCode size={30}/></div>
      <div className="portion-qr-filters" style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end',margin:'18px 0'}}>
        <label style={{flex:'1 1 300px'}}>Trường · Ngày · Bữa ăn
          <select value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={loading || busy} style={{display:'block',width:'100%',marginTop:7,padding:11,borderRadius:9}}>
            {!plans.length && <option value="">Chưa có thực đơn</option>}
            {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.school?.name ?? 'Trường học'} · {new Date(plan.serviceDate).toLocaleDateString('vi-VN')} · {mealName(plan.mealType)}</option>)}
          </select>
        </label>
        <button type="button" className="outline" onClick={() => { void loadPlans(); if (selectedId) void loadRegistry(selectedId); }} disabled={busy}><RefreshCw size={16}/>Tải lại</button>
      </div>
      {error && <p className="error portion-error" role="alert">{error}</p>}
      {notice && <p className="inventory-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}
      {selected && registry && <>
        <div className="portion-privacy"><ShieldAlert size={19}/><p><strong>Phiên bản {selected.revisions[0]?.revisionNo ?? '—'} · {registry.plan.status === 'APPROVED' ? 'Đã duyệt' : 'Chưa được duyệt'}.</strong> QR chỉ có hiệu lực khi phiên bản thực đơn mới nhất được duyệt và mã chưa bị thu hồi. Thông tin lô nguyên liệu chưa được xác minh sẽ không hiển thị như dữ liệu thực tế.</p></div>
        <p className="muted" style={{margin:'12px 0'}}>Món trong thực đơn đã duyệt: <strong>{approvedDishNames.join(', ') || 'Chưa có dữ liệu từ API'}</strong>. Dự kiến {expectedCount ?? '—'} mã QR; còn thiếu {missingCount ?? '—'} mã.</p>
        {missingCount === null && <p role="status" className="muted" style={{margin:'8px 0 16px'}}>API QR chưa trả về số lượng mã cần phát hành. Hãy khởi động lại backend để nhận phiên bản mới.</p>}
        <div className="portion-qr-summary">
          <div className="card"><QrCode/><strong>{active.length}</strong><span>QR đang hiệu lực</span></div>
          <div className="card"><CheckCircle2/><strong>{registry.records.length}</strong><span>Tổng mã đã phát hành</span></div>
          <div className="card"><ShieldAlert/><strong>{registry.records.length - active.length}</strong><span>QR hết hiệu lực</span></div>
        </div>
        {canIssue && <div className="portion-actions" style={{flexWrap:'wrap'}}>
          <div><strong>Phát hành theo thực đơn được duyệt</strong><p>Không thể cấp lại mã đã thu hồi cho cùng phiên bản.</p></div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button type="button" className="primary" disabled={busy || registry.plan.status !== 'APPROVED' || missingCount === null || missingCount === 0} onClick={() => void mutate('issue')}><QrCode size={16}/>{registry.records.length ? 'Bổ sung QR còn thiếu' : 'Phát hành QR'}</button>
            <button type="button" className="outline" disabled={busy || !active.length} onClick={() => window.print()}><Printer size={16}/>In QR</button>
          </div>
        </div>}
        {canIssue && active.length > 0 && <form className="portion-reissue" onSubmit={event => { event.preventDefault(); void mutate('revoke'); }}>
          <label>Lý do thu hồi mã QR<input value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={300} required placeholder="Nhập lý do thu hồi (tối thiểu 8 ký tự)"/></label>
          <button type="submit" className="outline" disabled={busy || reason.trim().length < 8}>Thu hồi QR đang hiệu lực</button>
        </form>}
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',margin:'18px 0'}}>
          <input aria-label="Tìm món hoặc nhóm tuổi" placeholder="Tìm món ăn hoặc nhóm tuổi…" value={filter} onChange={event => setFilter(event.target.value)} style={{flex:'1 1 230px',padding:11,borderRadius:9,border:'1px solid var(--border)'}}/>
          <label><input type="checkbox" checked={showRevoked} onChange={event => setShowRevoked(event.target.checked)}/> Hiện mã đã thu hồi</label>
        </div>
        <div className="real-qr-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:14}}>
          {rows.map(row => { const url = `${window.location.origin}/truy-xuat-suat/${row.token}`; return <article className="card real-qr-print-card" key={row.id} style={{padding:18,textAlign:'center'}}>
            <span className="section-kicker">{row.state === 'ACTIVE' ? 'ĐANG HIỆU LỰC' : 'ĐÃ HẾT HIỆU LỰC'}</span>
            <h3 style={{fontSize:16,margin:'10px 0 4px'}}>{row.dishName}</h3><p className="muted" style={{marginBottom:14}}>{row.ageGroup}</p>
            <QRCodeSVG value={url} size={170} level="M" marginSize={2}/>
            <p style={{marginTop:12,fontSize:11,overflowWrap:'anywhere'}}>{registry.plan.schoolName} · {new Date(registry.plan.serviceDate).toLocaleDateString('vi-VN')}</p>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',gap:6,alignItems:'center',marginTop:8}}><ExternalLink size={14}/>Xem trang truy xuất</a>
          </article>; })}
        </div>
        {!rows.length && <p className="portion-empty">Chưa có mã QR phù hợp. {canIssue && registry.plan.status === 'APPROVED' && (missingCount ?? 0) > 0 ? 'Chọn Phát hành QR để tạo mã.' : ''}</p>}
      </>}
      {!loading && !plans.length && <div className="portion-empty"><QrCode size={36}/><h3>Chưa có thực đơn</h3><p>Cần lập thực đơn, gửi và được BGH duyệt trước khi phát hành QR.</p></div>}
    </div>
    <style>{`@media print { body * { visibility:hidden!important } .real-qr-workspace .real-qr-print-card, .real-qr-workspace .real-qr-print-card * {visibility:visible!important} .real-qr-grid{position:absolute;left:0;top:0;display:grid!important;grid-template-columns:repeat(2,1fr)!important;width:100%;gap:15px} .real-qr-print-card{break-inside:avoid;border:1px solid #bbb!important} }`}</style>
  </section>;
}
