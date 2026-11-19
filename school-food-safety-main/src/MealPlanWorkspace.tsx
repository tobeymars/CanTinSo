import { useEffect, useState } from 'react';
import { getStoredUser } from './lib/authApi';
import { createAndSubmitMealPlan, decideMealPlan, loadMealPlanWorkspace } from './lib/mealPlanApi';
import type { MealAgeGroup, MealPlanRow, ApprovedDishOption } from './lib/mealPlanApi';
import './MealPlanWorkspace.css';

export default function MealPlanWorkspace() {
  const user = getStoredUser();
  const isKitchen = user?.role === 'CENTRAL_KITCHEN' || user?.role === 'SCHOOL_KITCHEN';
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [ageGroups, setAgeGroups] = useState<MealAgeGroup[]>([]), [plans, setPlans] = useState<MealPlanRow[]>([]);
  const [schools, setSchools] = useState<Array<{id:string;name:string}>>([]), [dishes, setDishes] = useState<Array<ApprovedDishOption & {schoolId:string}>>([]);
  const [schoolId, setSchoolId] = useState(''), [serviceDate, setServiceDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [mealType, setMealType] = useState('LUNCH'), [ageGroupId, setAgeGroupId] = useState(''), [servings, setServings] = useState(''), [selected, setSelected] = useState<string[]>([]);
  const [decisionNote, setDecisionNote] = useState<Record<string,string>>({});
  const refresh = async () => { setLoading(true); setError(''); try {
    const data = await loadMealPlanWorkspace(); setAgeGroups(data.ageGroups); setPlans(data.plans); setSchools(data.schools); setDishes(data.dishes);
    if (!schoolId && data.schools[0]) setSchoolId(data.schools[0].id);
    if (!ageGroupId && data.ageGroups[0]) setAgeGroupId(data.ageGroups[0].id);
  } catch(e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu thực đơn.'); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, []);
  const availableDishes = dishes.filter(d => d.schoolId === schoolId);
  const submit = async () => { setBusy(true); setError(''); setNotice(''); try {
    if (!schoolId || !ageGroupId || !servings || !selected.length) throw new Error('Chọn trường, nhóm tuổi, nhập số suất và chọn ít nhất một món đã duyệt.');
    await createAndSubmitMealPlan({ schoolId, serviceDate, mealType, ageGroupId, servings: Number(servings), dishVersionIds: selected });
    setNotice('Đã lưu và gửi thực đơn đến Ban Giám hiệu.'); setSelected([]); await refresh();
  } catch(e) { setError(e instanceof Error ? e.message : 'Không thể gửi thực đơn.'); } finally { setBusy(false); } };
  const decide = async (id:string, action:'approve'|'return') => { setBusy(true); setError(''); try {
    const note = decisionNote[id] ?? ''; if(action === 'return' && !note.trim()) throw new Error('Nhập lý do trả thực đơn trước khi trả lại.');
    await decideMealPlan(id, action, note); setNotice(action === 'approve' ? 'Đã duyệt thực đơn.' : 'Đã trả thực đơn cho bếp.'); await refresh();
  } catch(e) { setError(e instanceof Error ? e.message : 'Không thể xử lý thực đơn.'); } finally { setBusy(false); } };
  return <section className="meal-plan-workspace">
    <header><div><span className="meal-plan-kicker">DỮ LIỆU NGHIỆP VỤ</span><h1>Thực đơn & bữa ăn</h1><p>Thực đơn được lập từ món đã được trường duyệt, có phiên bản và lịch sử phê duyệt.</p></div><button type="button" onClick={() => void refresh()} disabled={loading}>Làm mới</button></header>
    {error && <div className="meal-plan-error" role="alert">{error}</div>}{notice && <div className="meal-plan-notice" role="status">{notice}</div>}
    {loading ? <p>Đang tải dữ liệu thực đơn…</p> : isKitchen ? <div className="meal-plan-builder">
      <h2>Lập thực đơn gửi trường duyệt</h2>
      <div className="meal-plan-fields">
        <label>Trường phục vụ<select value={schoolId} onChange={e=>{setSchoolId(e.target.value);setSelected([])}}>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Ngày phục vụ<input type="date" value={serviceDate} onChange={e=>setServiceDate(e.target.value)}/></label>
        <label>Bữa ăn<select value={mealType} onChange={e=>setMealType(e.target.value)}><option value="BREAKFAST">Ăn sáng</option><option value="LUNCH">Ăn trưa</option><option value="SNACK">Ăn xế</option></select></label>
        <label>Nhóm tuổi<select value={ageGroupId} onChange={e=>setAgeGroupId(e.target.value)}>{ageGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label>Số suất dự kiến<input type="number" min="0" step="1" value={servings} onChange={e=>setServings(e.target.value)} placeholder="Nhập số suất"/></label>
      </div>
      <h3>Món đã được trường duyệt</h3>
      {availableDishes.length ? <div className="meal-plan-dish-list">{availableDishes.map(d=><label key={d.versionId}><input type="checkbox" checked={selected.includes(d.versionId)} onChange={e=>setSelected(current=>e.target.checked?[...current,d.versionId]:current.filter(x=>x!==d.versionId))}/><span>{d.name}<small>Phiên bản {d.versionNo}</small></span></label>)}</div> : <p className="meal-plan-empty">Trường này chưa có món nào được duyệt từ bếp.</p>}
      <button className="meal-plan-primary" disabled={busy || !schools.length} onClick={()=>void submit()}>{busy?'Đang xử lý…':'Lưu và gửi trường duyệt'}</button>
    </div> : <div className="meal-plan-review"><h2>Thực đơn chờ trường xử lý</h2>
      {plans.filter(p=>p.revisions[0]?.status==='SUBMITTED').length ? plans.filter(p=>p.revisions[0]?.status==='SUBMITTED').map(p=>{const rev=p.revisions[0]!;return <article key={rev.id}><div><strong>{p.serviceDate.slice(0,10)} · {p.mealType==='LUNCH'?'Ăn trưa':p.mealType==='BREAKFAST'?'Ăn sáng':'Ăn xế'}</strong><span>{p.kitchen?.name ?? 'Bếp được phân công'} · {p.servings.toLocaleString('vi-VN')} suất</span></div><ul>{rev.items.map((item,i)=><li key={i}>{item.dishVersion.dish.name} (v{item.dishVersion.versionNo})</li>)}</ul><label>Ghi chú / lý do trả lại<textarea value={decisionNote[rev.id]??''} onChange={e=>setDecisionNote(x=>({...x,[rev.id]:e.target.value}))}/></label><div className="meal-plan-actions"><button disabled={busy} onClick={()=>void decide(rev.id,'approve')}>Duyệt thực đơn</button><button disabled={busy} onClick={()=>void decide(rev.id,'return')}>Trả lại bếp</button></div></article>}) : <p className="meal-plan-empty">Hiện không có thực đơn chờ duyệt.</p>}
    </div>}
    {!loading && plans.length>0 && <div className="meal-plan-history"><h2>Lịch sử thực đơn</h2>{plans.map(p=><p key={p.id}>{p.serviceDate.slice(0,10)} · {p.mealType} · {p.servings.toLocaleString('vi-VN')} suất · {p.revisions[0]?.status ?? p.status}</p>)}</div>}
  </section>;
}
