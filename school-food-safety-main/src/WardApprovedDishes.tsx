import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Filter, Search, ShieldCheck, Utensils } from 'lucide-react';
import { getAccessToken } from './lib/authApi';
import { getManagedSchools } from './lib/usersApi';
import './WardApprovedDishes.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
type IngredientRow = { quantity: number | string; unitCode: string; ingredient: { id: string; code: string; name: string; unit: string } };
type ApprovedRow = {
  id: string; decidedAt?: string | null; decisionNote?: string | null;
  school: { id: string; name: string; ward?: { name: string } | null };
  dishVersion: {
    id: string; versionNo: number; recipeSnapshot?: Record<string, unknown> | null;
    ingredients: IngredientRow[];
    dish: { id: string; code: string; name: string; category?: string | null; kitchen?: { id: string; name: string; code: string } | null };
  };
};
async function loadApproved(): Promise<ApprovedRow[]> {
  const token = getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const response = await fetch(`${API}/dishes/ward-approved`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Không tải được danh sách món đã duyệt.');
  }
  return response.json() as Promise<ApprovedRow[]>;
}
export default function WardApprovedDishes() {
  const [rows, setRows] = useState<ApprovedRow[]>([]);
  const [managedSchools, setManagedSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schoolId, setSchoolId] = useState('ALL');
  const [search, setSearch] = useState('');
  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const [approvedRows, schoolRows] = await Promise.all([loadApproved(), getManagedSchools()]);
      setRows(approvedRows);
      setManagedSchools(schoolRows.map(school => ({ id: school.id, name: school.name })));
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  // Bộ lọc hiển thị toàn bộ trường thuộc phường, kể cả trường chưa có món được duyệt.
  const schools = useMemo(() => managedSchools.slice().sort((a,b)=>a.name.localeCompare(b.name,'vi')), [managedSchools]);
  const visible = useMemo(() => rows.filter(row =>
    (schoolId === 'ALL' || row.school.id === schoolId) &&
    [row.dishVersion.dish.name, row.dishVersion.dish.code, row.school.name, row.dishVersion.dish.kitchen?.name ?? '', ...row.dishVersion.ingredients.map(x=>x.ingredient.name)].join(' ').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))
  ), [rows, schoolId, search]);
  return <section className="ward-approved-page">
    <header className="ward-approved-header">
      <div><span className="ward-approved-eyebrow"><ShieldCheck size={15}/> GIÁM SÁT THEO ĐỊA BÀN</span><h2>Món ăn đã được trường phê duyệt</h2><p>Danh sách chỉ gồm phiên bản món ăn đã được Ban Giám hiệu duyệt tại các trường thuộc phường quản lý.</p></div>
      <div className="ward-approved-total"><strong>{visible.length}</strong><span>phiên bản được duyệt</span></div>
    </header>
    <div className="ward-approved-toolbar">
      <label className="ward-approved-school"><Filter size={17}/><span>Trường</span><select value={schoolId} onChange={e=>setSchoolId(e.target.value)}><option value="ALL">Tất cả trường trong phường</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="ward-approved-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm món, mã món, bếp hoặc nguyên liệu…"/></label>
    </div>
    {loading ? <div className="ward-approved-empty">Đang tải danh sách món đã duyệt…</div> : error ? <div className="ward-approved-error"><strong>Không tải được dữ liệu</strong><p>{error}</p><button onClick={()=>void refresh()}>Thử lại</button></div> : visible.length === 0 ? <div className="ward-approved-empty"><Utensils size={26}/><strong>Chưa có món phù hợp</strong><span>{rows.length ? 'Thử đổi trường hoặc từ khóa tìm kiếm.' : 'Các trường trong phường chưa có món nào được BGH phê duyệt.'}</span></div> :
      <div className="ward-approved-grid">{visible.map(row=>{
        const dish=row.dishVersion.dish, snapshot=row.dishVersion.recipeSnapshot ?? {};
        const portion=typeof snapshot.portionWeightGrams==='number'?snapshot.portionWeightGrams:null;
        const ageBand=typeof snapshot.ageBand==='string'?snapshot.ageBand:null;
        return <article className="ward-approved-card" key={row.id}>
          <div className="ward-approved-card-top"><span className="ward-approved-check"><CheckCircle2 size={14}/> BGH đã duyệt</span><span className="ward-approved-version">Phiên bản v{row.dishVersion.versionNo}</span></div>
          <h3>{dish.name}</h3><div className="ward-approved-school-name">{row.school.name}</div>
          <div className="ward-approved-tags">{ageBand&&<span>{ageBand}</span>}{portion!==null&&<span>{portion.toLocaleString('vi-VN')} g/suất</span>}{dish.category&&<span>{dish.category}</span>}</div>
          <div className="ward-approved-kitchen">Bếp cung cấp: <strong>{dish.kitchen?.name ?? 'Chưa xác định'}</strong></div>
          <div className="ward-approved-ingredients"><strong>Thành phần công thức</strong>{row.dishVersion.ingredients.length?<ul>{row.dishVersion.ingredients.map((item,index)=><li key={item.ingredient.id+'-'+index}><span>{item.ingredient.name}</span><b>{Number(item.quantity).toLocaleString('vi-VN')} {item.unitCode}</b></li>)}</ul>:<small>Chưa có dữ liệu nguyên liệu trong phiên bản này.</small>}</div>
          <footer>{row.decidedAt?new Date(row.decidedAt).toLocaleDateString('vi-VN'): 'Đã phê duyệt'}{row.decisionNote&&<span title={row.decisionNote}>Có ghi chú phê duyệt</span>}</footer>
        </article>;
      })}</div>}
  </section>;
}
