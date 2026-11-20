import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, ChefHat, CheckCircle2, Clock3, School, ShieldCheck } from 'lucide-react';
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
  return <main className="portion-public-page" style={{maxWidth:920,margin:'0 auto',padding:'32px 16px 60px'}}>
    <header className="card" style={{padding:24,marginBottom:20}}>
      <span className="section-kicker"><ShieldCheck size={16}/> CANTINSO · TRUY XUẤT MÓN ĂN</span>
      <h1 style={{fontSize:26,margin:'12px 0 6px'}}>Thông tin truy xuất món ăn</h1>
      <p className="muted">Thông tin từ thực đơn được lưu trên hệ thống, theo phiên bản được phê duyệt.</p>
    </header>
    {loading && <div className="card" role="status" style={{padding:24}}>Đang tải thông tin truy xuất…</div>}
    {error && <div className="card" role="alert" style={{padding:24,color:'#a33'}}><AlertCircle/>{error}</div>}
    {data && <>
      <div className="card" style={{padding:24,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,color:data.state === 'ACTIVE'?'#237a4a':'#aa4b32'}}>
          {data.state === 'ACTIVE'?<CheckCircle2/>:<AlertCircle/>}
          <strong>{data.state === 'ACTIVE' ? 'Mã QR đang hiệu lực' : 'Mã QR đã hết hiệu lực'}</strong>
        </div>
        {data.state !== 'ACTIVE' && <p role="alert">Thông tin này chỉ để đối chiếu lịch sử, không đại diện cho thực đơn hiện hành. {data.revokeReason ?? ''}</p>}
        <h2 style={{fontSize:25,margin:'0 0 20px'}}>{data.dishName}</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:15}}>
          <div><School size={18}/><small style={{display:'block'}}>Trường</small><strong>{data.schoolName}</strong></div>
          <div><ChefHat size={18}/><small style={{display:'block'}}>Bếp phục vụ</small><strong>{data.kitchenName}</strong></div>
          <div><CalendarDays size={18}/><small style={{display:'block'}}>Ngày và bữa</small><strong>{new Date(data.serviceDate).toLocaleDateString('vi-VN')} · {mealLabels[data.mealType] ?? data.mealType}</strong></div>
          <div><Clock3 size={18}/><small style={{display:'block'}}>Nhóm tuổi</small><strong>{data.ageGroup}</strong></div>
        </div>
      </div>
      <section className="card" style={{padding:24,marginBottom:16}}>
        <h2 style={{fontSize:19}}>Công thức nguyên liệu dự kiến</h2>
        <p className="muted">Định lượng gốc của phiên bản công thức. Hệ số khẩu phần theo nhóm tuổi: {Number(data.portionFactor).toLocaleString('vi-VN')}.</p>
        {data.ingredients.length ? <div className="table-scroll"><table><thead><tr><th>Nguyên liệu</th><th>Định lượng công thức</th></tr></thead><tbody>{data.ingredients.map((item,index) => <tr key={index}><td>{item.name}</td><td>{Number(item.quantity).toLocaleString('vi-VN')} {item.unit}</td></tr>)}</tbody></table></div> : <p>Chưa có nguyên liệu được khai báo.</p>}
      </section>
      {data.nutrition && <section className="card" style={{padding:24,marginBottom:16}}><h2 style={{fontSize:19}}>Thông tin dinh dưỡng trong công thức</h2><div style={{display:'flex',flexWrap:'wrap',gap:12}}>{Object.entries(data.nutrition).filter(([,value]) => typeof value === 'number' || typeof value === 'string').slice(0,16).map(([key,value]) => <div key={key} style={{padding:10,border:'1px solid var(--border)',borderRadius:10}}><small style={{display:'block'}}>{key}</small><strong>{String(value)}</strong></div>)}</div></section>}
      <p className="muted" style={{fontSize:12,lineHeight:1.6}}><AlertCircle size={15} style={{verticalAlign:'middle'}}/> {data.note} QR không phải chứng nhận an toàn thực phẩm.</p>
    </>}
  </main>;
}
