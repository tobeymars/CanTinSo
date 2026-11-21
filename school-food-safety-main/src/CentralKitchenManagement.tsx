import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "./lib/authApi";
import { Factory, KeyRound, Plus, RefreshCw, Search, ShieldCheck, UserRound, UserRoundX } from "lucide-react";
import {
  createCentralKitchen,
  getCentralKitchens,
  getManagedSchools,
  resetManagedUserPassword,
  updateManagedUser,
  type CentralKitchen,
  type ManagedSchool,
} from "./lib/usersApi";

type FormState = {
  code: string; name: string; address: string; contactName: string; phone: string;
  capacity: string; adminFullName: string; adminEmail: string; password: string; schoolIds: string[];
};
const emptyForm = (): FormState => ({
  code: "", name: "", address: "", contactName: "", phone: "", capacity: "",
  adminFullName: "", adminEmail: "", password: "", schoolIds: [],
});

export default function CentralKitchenManagement() {
  const isWardAdmin = getStoredUser()?.role === "UBND_ADMIN";
  const [kitchens, setKitchens] = useState<CentralKitchen[]>([]);
  const [schools, setSchools] = useState<ManagedSchool[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [passwordUser, setPasswordUser] = useState<{id:string;email:string} | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [kitchenRows, schoolRows] = await Promise.all([getCentralKitchens(), getManagedSchools()]);
      setKitchens(kitchenRows); setSchools(schoolRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách bếp trung tâm.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const assignedSchoolIds = useMemo(() => new Set(kitchens.flatMap(k => k.schools.map(item => item.school.id))), [kitchens]);

  const filtered = useMemo(() => kitchens.filter(k =>
    `${k.code} ${k.name} ${k.contactName}`.toLocaleLowerCase("vi").includes(keyword.toLocaleLowerCase("vi"))
  ), [kitchens, keyword]);

  function toggleSchool(id: string) {
    setForm(current => ({
      ...current,
      schoolIds: current.schoolIds.includes(id)
        ? current.schoolIds.filter(item => item !== id)
        : [...current.schoolIds, id],
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await createCentralKitchen({
        code: form.code.trim(), name: form.name.trim(), address: form.address.trim() || undefined,
        contactName: form.contactName.trim(), phone: form.phone.trim() || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        adminFullName: form.adminFullName.trim(), adminEmail: form.adminEmail.trim(),
        password: form.password, schoolIds: form.schoolIds,
      });
      setShowForm(false); setForm(emptyForm());
      setNotice("Đã tạo hồ sơ bếp trung tâm, tài khoản quản trị và phân công trường.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể tạo bếp trung tâm."); }
    finally { setBusy(false); }
  }

  async function toggleUser(user: {id:string;email:string;isActive:boolean}) {
    setBusy(true); setError(""); setNotice("");
    try {
      await updateManagedUser(user.id, { isActive: !user.isActive });
      setNotice(user.isActive ? "Đã khóa tài khoản quản trị bếp." : "Đã mở khóa tài khoản quản trị bếp.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể cập nhật tài khoản."); }
    finally { setBusy(false); }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!passwordUser) return;
    setBusy(true); setError("");
    try {
      await resetManagedUserPassword(passwordUser.id, newPassword);
      setNotice(`Đã đặt lại mật khẩu cho ${passwordUser.email}.`);
      setPasswordUser(null); setNewPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể đặt lại mật khẩu."); }
    finally { setBusy(false); }
  }

  return <section className="user-management central-kitchen-management">
    <div className="um-intro"><div>
      <span className="um-eyebrow"><Factory size={15}/> QUẢN TRỊ ĐƠN VỊ BẾP</span>
      <h2>Quản lý bếp trung tâm</h2>
      <p>{isWardAdmin ? "Quản lý bếp trung tâm và phân công trường trong phường của bạn." : "Quản trị nền tảng: tạo hồ sơ bếp, tài khoản quản trị và phân công trường cùng phường."}</p>
    </div><button className="um-primary" onClick={() => {setForm(emptyForm());setError("");setShowForm(true);}}><Plus size={17}/> Tạo bếp trung tâm</button></div>
    <div className="um-stats">
      <div><Factory/><span><strong>{kitchens.length}</strong><small>Tổng bếp trung tâm</small></span></div>
      <div><UserRound/><span><strong>{kitchens.filter(k=>k.isActive).length}</strong><small>Đang hoạt động</small></span></div>
      <div><ShieldCheck/><span><strong>{kitchens.reduce((n,k)=>n+k.schools.length,0)}</strong><small>Lượt phân công trường</small></span></div>
    </div>
    {notice && <div className="um-notice" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {error && !showForm && <div className="um-error" role="alert">{error}</div>}
    <div className="um-toolbar"><label><Search size={17}/><input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="Tìm theo mã bếp, tên bếp..."/></label><button className="um-secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Làm mới</button></div>
    {loading ? <div className="um-empty">Đang tải danh sách bếp trung tâm...</div> : filtered.length===0 ? <div className="um-empty">Chưa có bếp trung tâm nào.</div> : <div className="um-table-wrap"><table className="um-table">
      <thead><tr><th>Bếp trung tâm</th><th>Trường được phục vụ</th><th>Tài khoản quản trị</th><th>Trạng thái</th></tr></thead>
      <tbody>{filtered.map(k=><tr key={k.id}>
        <td><strong>{k.name}</strong><small>{k.code} · {k.contactName}{k.phone ? ` · ${k.phone}` : ""}</small></td>
        <td><strong>{k.schools.length} trường</strong><small>{k.schools.map(x=>x.school.name).join(", ")}</small></td>
        <td>{k.users.map(u=><div key={u.id} className="um-central-user"><strong>{u.fullName}</strong><small>{u.email} · {u.isActive ? "Đang hoạt động" : "Đã khóa"}</small><div className="um-actions">
          <button title="Đặt lại mật khẩu" onClick={()=>{setPasswordUser({id:u.id,email:u.email});setNewPassword("");}}><KeyRound size={15}/></button>
          <button title={u.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"} disabled={busy} onClick={()=>void toggleUser(u)}>{u.isActive?<UserRoundX size={15}/>:<UserRound size={15}/>}</button>
        </div></div>)}</td>
        <td><span className={`um-status ${k.isActive?"active":"inactive"}`}>{k.isActive?"Đang hoạt động":"Đã khóa"}</span></td>
      </tr>)}</tbody>
    </table></div>}
    <p className="um-footnote">Mỗi trường chỉ được có một đơn vị cung cấp suất ăn chính đang hiệu lực. Bếp trung tâm chỉ được phục vụ trường cùng phường.</p>

    {showForm && <div className="um-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false);}}>
      <form className="um-modal um-central-modal" onSubmit={submit}>
        <div className="um-modal-head"><h3>Tạo bếp trung tâm và tài khoản quản trị</h3><button type="button" onClick={()=>setShowForm(false)}>×</button></div>
        <div className="um-central-form-grid">
          <label>Mã bếp<input required minLength={2} maxLength={30} value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
          <label>Tên bếp<input required minLength={2} maxLength={160} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Người phụ trách<input required value={form.contactName} onChange={e=>setForm({...form,contactName:e.target.value})}/></label>
          <label>Số điện thoại<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
          <label>Địa chỉ<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
          <label>Năng lực (suất/ngày)<input type="number" min="1" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label>
        </div>
        <h4>Trường được bếp phục vụ</h4>
        <div className="um-school-checks">{schools.map(s=><label key={s.id}><input type="checkbox" checked={form.schoolIds.includes(s.id)} disabled={assignedSchoolIds.has(s.id) && !form.schoolIds.includes(s.id)} onChange={()=>toggleSchool(s.id)}/><span>{s.name}{s.ward?.name ? ` · ${s.ward.name}` : ""}{assignedSchoolIds.has(s.id) && !form.schoolIds.includes(s.id) ? " · Đã được phân công" : ""}</span></label>)}</div>
        {!schools.length && <div className="um-error">Chưa có trường trong hệ thống.</div>}
        <h4>Tài khoản quản trị bếp trung tâm</h4>
        <label>Họ và tên<input required value={form.adminFullName} onChange={e=>setForm({...form,adminFullName:e.target.value})}/></label>
        <label>Email đăng nhập<input required type="email" value={form.adminEmail} onChange={e=>setForm({...form,adminEmail:e.target.value})}/></label>
        <label>Mật khẩu ban đầu<input required type="password" minLength={8} maxLength={100} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><small>Tối thiểu 8 ký tự.</small></label>
        {error && <div className="um-error" role="alert">{error}</div>}
        <div className="um-modal-actions"><button type="button" className="um-secondary" onClick={()=>setShowForm(false)}>Hủy</button><button className="um-primary" disabled={busy||!form.schoolIds.length}>{busy?"Đang tạo...":"Tạo bếp và tài khoản"}</button></div>
      </form>
    </div>}
    {passwordUser && <div className="um-modal-backdrop"><form className="um-modal" onSubmit={resetPassword}>
      <div className="um-modal-head"><h3>Đặt lại mật khẩu quản trị bếp</h3><button type="button" onClick={()=>setPasswordUser(null)}>×</button></div>
      <p>Tài khoản: <strong>{passwordUser.email}</strong></p>
      <label>Mật khẩu mới<input required type="password" minLength={8} maxLength={100} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
      {error && <div className="um-error" role="alert">{error}</div>}
      <div className="um-modal-actions"><button type="button" className="um-secondary" onClick={()=>setPasswordUser(null)}>Hủy</button><button className="um-primary" disabled={busy}>Lưu mật khẩu</button></div>
    </form></div>}
  </section>;
}
