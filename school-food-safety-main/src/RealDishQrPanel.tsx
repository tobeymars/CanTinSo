import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, CheckCircle2, ExternalLink, Printer, QrCode, RefreshCw, Search, ShieldAlert, CalendarDays, School, UtensilsCrossed } from 'lucide-react';
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
  return <section className="real-qr-workspace">
    <header className="real-qr-hero">
      <div className="real-qr-hero-icon"><QrCode size={26}/></div>
      <div className="real-qr-hero-copy">
        <span className="real-qr-eyebrow">QUẢN LÝ TRUY XUẤT</span>
        <h2>QR từng món ăn</h2>
        <p>Phát hành, in và theo dõi mã truy xuất từ thực đơn đã được Ban Giám hiệu phê duyệt.</p>
      </div>
      <button type="button" className="real-qr-btn real-qr-btn-light" onClick={() => { void loadPlans(); if (selectedId) void loadRegistry(selectedId); }} disabled={busy || loading}><RefreshCw size={16}/> Làm mới</button>
    </header>

    <section className="real-qr-surface real-qr-picker">
      <div className="real-qr-section-title"><div><span className="real-qr-step">01</span><h3>Chọn thực đơn</h3></div><p>Chọn trường, ngày phục vụ và bữa ăn để xem mã QR tương ứng.</p></div>
      <label className="real-qr-field"><span><CalendarDays size={16}/> Thực đơn cần quản lý</span>
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={loading || busy}>
          {!plans.length && <option value="">Chưa có thực đơn</option>}
          {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.school?.name ?? 'Trường học'} · {new Date(plan.serviceDate).toLocaleDateString('vi-VN')} · {mealName(plan.mealType)}</option>)}
        </select>
      </label>
    </section>

    {error && <div className="real-qr-alert real-qr-alert-error" role="alert"><AlertTriangle size={19}/><span>{error}</span></div>}
    {notice && <div className="real-qr-alert real-qr-alert-success" role="status"><CheckCircle2 size={19}/><span>{notice}</span></div>}
    {loading && <div className="real-qr-surface real-qr-empty" role="status">Đang tải thực đơn…</div>}
    {!loading && !plans.length && <div className="real-qr-surface real-qr-empty"><UtensilsCrossed size={34}/><h3>Chưa có thực đơn</h3><p>Hãy lập thực đơn và gửi BGH phê duyệt trước khi phát hành QR.</p></div>}
    {selected && !registry && !error && <div className="real-qr-surface real-qr-empty" role="status">Đang tải danh sách mã QR…</div>}

    {selected && registry && <>
      <div className="real-qr-metrics">
        <div className="real-qr-metric"><span className="real-qr-metric-icon green"><CheckCircle2 size={21}/></span><div><strong>{active.length}</strong><span>Đang hiệu lực</span></div></div>
        <div className="real-qr-metric"><span className="real-qr-metric-icon blue"><QrCode size={21}/></span><div><strong>{registry.records.length}</strong><span>Đã phát hành</span></div></div>
        <div className="real-qr-metric"><span className="real-qr-metric-icon amber"><ShieldAlert size={21}/></span><div><strong>{registry.records.length - active.length}</strong><span>Hết hiệu lực</span></div></div>
        <div className="real-qr-metric"><span className="real-qr-metric-icon violet"><UtensilsCrossed size={21}/></span><div><strong>{expectedCount ?? '—'}</strong><span>QR cần có</span></div></div>
      </div>

      <section className="real-qr-surface real-qr-overview">
        <div className="real-qr-section-title"><div><span className="real-qr-step">02</span><h3>Thông tin phê duyệt</h3></div><span className={`real-qr-status ${registry.plan.status === 'APPROVED' ? 'approved' : 'pending'}`}>{registry.plan.status === 'APPROVED' ? <CheckCircle2 size={15}/> : <ShieldAlert size={15}/>} {registry.plan.status === 'APPROVED' ? 'Đã duyệt' : 'Chưa được duyệt'}</span></div>
        <div className="real-qr-overview-grid">
          <div><small><School size={15}/> Trường</small><strong>{registry.plan.schoolName}</strong></div>
          <div><small><CalendarDays size={15}/> Ngày phục vụ</small><strong>{new Date(registry.plan.serviceDate).toLocaleDateString('vi-VN')}</strong></div>
          <div><small><UtensilsCrossed size={15}/> Bữa ăn</small><strong>{mealName(registry.plan.mealType)}</strong></div>
          <div><small>Phiên bản</small><strong>Lần {selected.revisions[0]?.revisionNo ?? '—'}</strong></div>
        </div>
        <div className="real-qr-approved-dishes"><strong>Món trong thực đơn</strong><div>{approvedDishNames.length ? approvedDishNames.map((name,index)=><span key={index}>{name}</span>) : <em>Chưa có dữ liệu món từ API</em>}</div></div>
        <div className="real-qr-note"><ShieldAlert size={18}/><p>QR chỉ có hiệu lực khi phiên bản mới nhất đã được BGH duyệt. Thông tin công thức không đồng nghĩa với việc đã xác minh lô nguyên liệu thực tế.</p></div>
      </section>

      {canIssue && <section className="real-qr-surface real-qr-issue">
        <div className="real-qr-section-title"><div><span className="real-qr-step">03</span><h3>Phát hành mã QR</h3></div>{missingCount !== null && <span className="real-qr-missing">{missingCount > 0 ? `Còn thiếu ${missingCount} mã` : 'Đã đủ mã'}</span>}</div>
        <div className="real-qr-issue-content"><p>Mã được tạo riêng cho từng món ăn và nhóm tuổi. Không phát hành trùng mã đã tồn tại.</p><div className="real-qr-issue-buttons">
          <button type="button" className="real-qr-btn real-qr-btn-primary" disabled={busy || registry.plan.status !== 'APPROVED' || missingCount === null || missingCount === 0} onClick={() => void mutate('issue')}><QrCode size={17}/>{registry.records.length ? 'Bổ sung QR còn thiếu' : 'Phát hành QR'}</button>
          <button type="button" className="real-qr-btn real-qr-btn-outline" disabled={busy || !active.length} onClick={() => window.print()}><Printer size={17}/> In mã QR</button>
        </div></div>
        {missingCount === null && <p className="real-qr-hint">Backend chưa trả về số lượng mã cần phát hành. Hãy khởi động lại backend phiên bản mới.</p>}
      </section>}

      <section className="real-qr-surface real-qr-registry">
        <div className="real-qr-section-title"><div><span className="real-qr-step">{canIssue ? '04' : '03'}</span><h3>Danh sách mã QR</h3></div><span className="real-qr-count">{rows.length} mã hiển thị</span></div>
        <div className="real-qr-tools">
          <label className="real-qr-search"><Search size={18}/><input aria-label="Tìm món hoặc nhóm tuổi" placeholder="Tìm tên món ăn, nhóm tuổi…" value={filter} onChange={event => setFilter(event.target.value)}/></label>
          <label className="real-qr-check"><input type="checkbox" checked={showRevoked} onChange={event => setShowRevoked(event.target.checked)}/><span>Hiện mã hết hiệu lực</span></label>
        </div>
        <div className="real-qr-grid">
          {rows.map(row => { const url = `${window.location.origin}/truy-xuat-suat/${row.token}`; return <article className="real-qr-print-card" key={row.id}>
            <div className="real-qr-card-head"><span className={`real-qr-status ${row.state === 'ACTIVE' ? 'approved' : 'pending'}`}>{row.state === 'ACTIVE' ? 'Đang hiệu lực' : 'Hết hiệu lực'}</span><small>{row.ageGroup}</small></div>
            <h4>{row.dishName}</h4>
            <div className="real-qr-code"><QRCodeSVG value={url} size={166} level="M" marginSize={2}/></div>
            <div className="real-qr-card-foot"><p>{registry.plan.schoolName} · {new Date(registry.plan.serviceDate).toLocaleDateString('vi-VN')}</p><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Xem trang truy xuất</a></div>
          </article>; })}
        </div>
        {!rows.length && <div className="real-qr-empty"><QrCode size={32}/><h3>Chưa có mã QR phù hợp</h3><p>{canIssue && registry.plan.status === 'APPROVED' && (missingCount ?? 0) > 0 ? 'Hãy phát hành mã QR cho các món trong thực đơn đã duyệt.' : 'Thử thay đổi bộ lọc hoặc chọn thực đơn khác.'}</p></div>}
      </section>

      {canIssue && active.length > 0 && <section className="real-qr-surface real-qr-revoke">
        <div className="real-qr-section-title"><div><span className="real-qr-step muted">!</span><h3>Thu hồi mã QR</h3></div></div>
        <p>Chỉ sử dụng khi mã không còn phù hợp. Thao tác này sẽ thu hồi toàn bộ QR đang hiệu lực của phiên bản thực đơn đã chọn.</p>
        <form onSubmit={event => { event.preventDefault(); if (window.confirm('Thu hồi toàn bộ mã QR đang hiệu lực của phiên bản này?')) void mutate('revoke'); }}>
          <label className="real-qr-field"><span>Lý do thu hồi</span><input value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={300} required placeholder="Nhập lý do cụ thể (ít nhất 8 ký tự)"/></label>
          <button type="submit" className="real-qr-btn real-qr-btn-danger" disabled={busy || reason.trim().length < 8}>Thu hồi QR</button>
        </form>
      </section>}
    </>}
    <style>{`@media print { body * { visibility:hidden!important } .real-qr-workspace .real-qr-print-card, .real-qr-workspace .real-qr-print-card * {visibility:visible!important} .real-qr-grid{position:absolute;left:0;top:0;display:grid!important;grid-template-columns:repeat(2,1fr)!important;width:100%;gap:15px} .real-qr-print-card{break-inside:avoid;border:1px solid #bbb!important} }`}</style>
  </section>;
}
