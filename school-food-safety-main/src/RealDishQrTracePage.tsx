import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, ChefHat, CheckCircle2, Clock3, ClipboardList, Info, School, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import './PortionQr.css';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
type PublicQr = {
  state: 'ACTIVE' | 'REVOKED'; revokeReason: string | null; schoolName: string; kitchenName: string;
  serviceDate: string; mealType: string; dishName: string; ageGroup: string;
  recipe: Record<string, unknown> | null; nutrition: Record<string, unknown> | null;
  portionFactor: number | string; ingredients: Array<{name: string; quantity: string | number; unit: string}>;
  issuedAt: string; note: string;
};
const mealLabels: Record<string,string> = { BREAKFAST:'Bữa sáng', LUNCH:'Bữa trưa', DINNER:'Bữa tối', SNACK:'Bữa xế' };
const nutritionLabels: Record<string,string> = {
  energy:'Năng lượng', energyKcal:'Năng lượng', calories:'Năng lượng', kcal:'Năng lượng', protein:'Chất đạm', proteinG:'Chất đạm',
  fat:'Chất béo', fatG:'Chất béo', carbohydrate:'Chất bột đường', carbohydrateG:'Chất bột đường', carbs:'Chất bột đường',
  fiber:'Chất xơ', fiberG:'Chất xơ', calcium:'Canxi', calciumMg:'Canxi', iron:'Sắt', ironMg:'Sắt', zinc:'Kẽm', zincMg:'Kẽm', vitaminA:'Vitamin A', vitaminARaeMcg:'Vitamin A',
  vitaminC:'Vitamin C', sodium:'Natri'
};
const nutritionUnits: Record<string,string> = {energy:'kcal',energyKcal:'kcal',calories:'kcal',kcal:'kcal',protein:'g',proteinG:'g',fat:'g',fatG:'g',carbohydrate:'g',carbohydrateG:'g',carbs:'g',fiber:'g',fiberG:'g',calcium:'mg',calciumMg:'mg',iron:'mg',ironMg:'mg',zinc:'mg',zincMg:'mg',vitaminA:'µg',vitaminARaeMcg:'µg',vitaminC:'mg',sodium:'mg'};
const numeric = (value: number | string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : String(value);
};
const date = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Chưa xác định' : d.toLocaleDateString('vi-VN');
};
export default function RealDishQrTracePage({token}:{token:string}) {
  const [data, setData] = useState<PublicQr | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setData(null);
    fetch(`${BASE}/public/dish-qr/${encodeURIComponent(token)}`)
      .then(async response => { if (!response.ok) throw new Error('Mã QR không tồn tại hoặc không thể truy xuất.'); return response.json() as Promise<PublicQr>; })
      .then(result => { if (!cancelled) setData(result); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Không thể truy xuất mã QR.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);
  // The backend stores an immutable Annex 7 nutrition snapshot under nutrition.totals.
  // Legacy snapshots may instead contain the nutrient fields at the top level.
  const snapshot = data?.nutrition && typeof data.nutrition === 'object' && !Array.isArray(data.nutrition) ? data.nutrition : null;
  const nestedTotals = snapshot?.totals;
  const totals = nestedTotals && typeof nestedTotals === 'object' && !Array.isArray(nestedTotals)
    ? nestedTotals as Record<string, unknown> : snapshot;
  const nutrition = totals
    ? Object.entries(totals).filter(([key, value]) => nutritionLabels[key] && (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))))).slice(0, 12)
    : [];
  const coverage = snapshot?.coverage && typeof snapshot.coverage === 'object' && !Array.isArray(snapshot.coverage)
    ? snapshot.coverage as Record<string, unknown> : null;
  const nutritionComplete = coverage?.complete === true;
  const nutritionWarnings = Array.isArray(snapshot?.warnings) ? snapshot.warnings.filter((value): value is string => typeof value === 'string') : [];
  const ingredients = Array.isArray(data?.ingredients) ? data.ingredients : [];
  return <main className="dish-trace-page">
    <div className="dish-trace-shell">
      <header className="dish-trace-header">
        <div className="dish-trace-brand"><span className="dish-trace-brand-icon"><UtensilsCrossed size={22}/></span><div><strong>CanTinSo</strong><small>TRUY XUẤT BỮA ĂN HỌC ĐƯỜNG</small></div></div>
        <span className="dish-trace-header-tag"><ShieldCheck size={16}/> Thông tin từ hệ thống</span>
      </header>
      <section className="dish-trace-intro">
        <span className="dish-trace-eyebrow">MINH BẠCH THÔNG TIN BỮA ĂN</span>
        <h1>Thông tin truy xuất món ăn</h1>
        <p>Tra cứu công thức, dinh dưỡng và thông tin phục vụ theo phiên bản thực đơn đã lưu.</p>
      </section>
      {loading && <div className="dish-trace-panel dish-trace-state" role="status"><span className="dish-trace-spinner"/><h2>Đang tải thông tin món ăn</h2><p>Vui lòng chờ trong giây lát…</p></div>}
      {error && <div className="dish-trace-panel dish-trace-state" role="alert"><span className="dish-trace-state-icon error"><AlertCircle size={28}/></span><h2>Không thể truy xuất mã QR</h2><p>{error}</p></div>}
      {data && <>
        <section className="dish-trace-panel dish-trace-dish">
          <div className="dish-trace-dish-top"><span className={`dish-trace-status ${data.state === 'ACTIVE' ? 'active' : 'revoked'}`}>{data.state === 'ACTIVE' ? <CheckCircle2 size={17}/> : <AlertCircle size={17}/>} {data.state === 'ACTIVE' ? 'Mã QR đang hiệu lực' : 'Mã QR đã thu hồi'}</span><span className="dish-trace-meal"><UtensilsCrossed size={15}/>{mealLabels[data.mealType] ?? data.mealType}</span></div>
          <span className="dish-trace-dish-label">MÓN ĂN ĐƯỢC TRUY XUẤT</span>
          <h2>{data.dishName}</h2>
          <p className="dish-trace-dish-subtitle">Thông tin được ghi nhận theo thực đơn và công thức đã lưu trên hệ thống.</p>
          {data.state !== 'ACTIVE' && <div className="dish-trace-revoked-note" role="alert"><AlertCircle size={20}/><div><strong>Mã này không còn hiệu lực</strong><p>Thông tin chỉ phục vụ đối chiếu lịch sử, không đại diện cho thực đơn hiện hành. {data.revokeReason ?? ''}</p></div></div>}
          <div className="dish-trace-facts">
            <div><span className="dish-trace-fact-icon"><School size={20}/></span><div><small>Trường học</small><strong>{data.schoolName}</strong></div></div>
            <div><span className="dish-trace-fact-icon"><ChefHat size={20}/></span><div><small>Đơn vị bếp phục vụ</small><strong>{data.kitchenName}</strong></div></div>
            <div><span className="dish-trace-fact-icon"><CalendarDays size={20}/></span><div><small>Ngày phục vụ</small><strong>{date(data.serviceDate)}</strong></div></div>
            <div><span className="dish-trace-fact-icon"><Clock3 size={20}/></span><div><small>Nhóm tuổi / lớp</small><strong>{data.ageGroup}</strong></div></div>
          </div>
        </section>
        <section className="dish-trace-panel dish-trace-section">
          <div className="dish-trace-section-heading"><span className="dish-trace-section-icon"><ClipboardList size={20}/></span><div><h2>Nguyên liệu trong công thức</h2><p>Định lượng dự kiến theo phiên bản công thức được lưu.</p></div><span className="dish-trace-total">{ingredients.length} nguyên liệu</span></div>
          {ingredients.length ? <div className="dish-trace-table-wrap"><table className="dish-trace-table"><thead><tr><th>STT</th><th>Tên nguyên liệu</th><th>Định lượng công thức</th></tr></thead><tbody>{ingredients.map((item,index) => <tr key={index}><td>{String(index + 1).padStart(2,'0')}</td><td>{item.name}</td><td><strong>{numeric(item.quantity)} {item.unit}</strong></td></tr>)}</tbody></table></div> : <div className="dish-trace-empty">Chưa có nguyên liệu được khai báo.</div>}
          <div className="dish-trace-factor"><Info size={16}/><span>Hệ số khẩu phần theo nhóm tuổi: <strong>{numeric(data.portionFactor)}</strong>. Đây là dữ liệu công thức dự kiến, không phải khối lượng thực tế đã sử dụng.</span></div>
        </section>
        <section className="dish-trace-panel dish-trace-section">
          <div className="dish-trace-section-heading"><span className="dish-trace-section-icon"><ShieldCheck size={20}/></span><div><h2>Thông tin dinh dưỡng</h2><p>Các chỉ số được lưu cùng phiên bản công thức.</p></div></div>
          {nutrition.length ? <>
            {coverage && !nutritionComplete && <div className="dish-trace-nutrition-warning" role="note"><Info size={17}/><span><strong>Dữ liệu dinh dưỡng chưa đầy đủ.</strong> Các giá trị dưới đây là tổng phần nguyên liệu đã có hồ sơ dinh dưỡng, không phải tổng dinh dưỡng đầy đủ của món. {typeof coverage.calculatedCount === 'number' && typeof coverage.ingredientCount === 'number' ? `Đã tính được ${coverage.calculatedCount}/${coverage.ingredientCount} nguyên liệu.` : ''}</span></div>}
            <div className="dish-trace-nutrients">{nutrition.map(([key,value]) => <div className="dish-trace-nutrient" key={key}><small>{nutritionLabels[key]}</small><strong>{numeric(value as string | number)} <span>{nutritionUnits[key] ?? ''}</span></strong></div>)}</div>
            {nutritionWarnings.length > 0 && <details className="dish-trace-nutrition-details"><summary>Xem lưu ý về dữ liệu dinh dưỡng ({nutritionWarnings.length})</summary><ul>{nutritionWarnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></details>}
          </> : <div className="dish-trace-empty">Phiên bản công thức này chưa có số liệu dinh dưỡng được lưu để hiển thị.</div>}
        </section>
        <aside className="dish-trace-disclaimer"><Info size={20}/><div><strong>Lưu ý về thông tin truy xuất</strong><p>{data.note ? `${data.note} ` : ''}Mã QR cung cấp dữ liệu công thức và thực đơn đã lưu; không phải chứng nhận an toàn thực phẩm hay xác nhận lô nguyên liệu thực tế.</p></div></aside>
        <footer className="dish-trace-footer"><span>CanTinSo · Vì những bữa ăn học đường minh bạch</span><span>Phát hành QR: {date(data.issuedAt)}</span></footer>
      </>}
    </div>
  </main>;
}
