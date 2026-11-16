import { useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserRound, UserRoundX, Users } from "lucide-react";
import {
  createManagedUser,
  getManagedUsers,
  resetManagedUserPassword,
  updateManagedUser,
  type ManagedUser,
} from "./lib/usersApi";
import "./UserManagement.css";

type Role = "SCHOOL_KITCHEN" | "SCHOOL_STAFF";
type FormState = { fullName: string; email: string; password: string; role: Role };
const emptyForm = (): FormState => ({ fullName: "", email: "", password: "", role: "SCHOOL_KITCHEN" });
const roleLabel = (role: string) => role === "SCHOOL_KITCHEN" ? "Bếp tại trường" : role === "SCHOOL_STAFF" ? "Nhân viên trường" : role;

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setUsers(await getManagedUsers()); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được danh sách tài khoản."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => users.filter(user =>
    `${user.fullName} ${user.email} ${roleLabel(user.role)}`.toLocaleLowerCase("vi").includes(keyword.toLocaleLowerCase("vi"))
  ), [users, keyword]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
    setError("");
  }
  function openEdit(user: ManagedUser) {
    setEditing(user);
    setForm({ fullName: user.fullName, email: user.email, password: "", role: user.role as Role });
    setShowForm(true);
    setError("");
  }

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      if (editing) {
        await updateManagedUser(editing.id, { fullName: form.fullName.trim(), email: form.email.trim(), role: form.role });
        setNotice("Đã cập nhật thông tin tài khoản.");
      } else {
        await createManagedUser({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, role: form.role });
        setNotice("Đã tạo tài khoản mới. Tài khoản được gán vào trường của bạn.");
      }
      setShowForm(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu tài khoản."); }
    finally { setBusy(false); }
  }

  async function toggleActive(user: ManagedUser) {
    const action = user.isActive ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.email}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await updateManagedUser(user.id, { isActive: !user.isActive });
      setNotice(user.isActive ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể cập nhật trạng thái."); }
    finally { setBusy(false); }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await resetManagedUserPassword(passwordTarget.id, newPassword);
      setNotice(`Đã đặt lại mật khẩu cho ${passwordTarget.email}.`);
      setPasswordTarget(null); setNewPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể đặt lại mật khẩu."); }
    finally { setBusy(false); }
  }

  return (
    <section className="user-management">
      <div className="um-intro">
        <div><span className="um-eyebrow"><ShieldCheck size={15} /> QUẢN TRỊ TRONG PHẠM VI TRƯỜNG</span>
          <h2>Quản lý tài khoản</h2>
          <p>Tạo và quản lý tài khoản Bếp tại trường, Nhân viên trường thuộc đơn vị của bạn.</p>
        </div>
        <button className="um-primary" onClick={openCreate}><Plus size={17} /> Tạo tài khoản</button>
      </div>
      <div className="um-stats">
        <div><Users /><span><strong>{users.length}</strong><small>Tổng tài khoản</small></span></div>
        <div><UserRound /><span><strong>{users.filter(u => u.isActive).length}</strong><small>Đang hoạt động</small></span></div>
        <div><UserRoundX /><span><strong>{users.filter(u => !u.isActive).length}</strong><small>Đã khóa</small></span></div>
      </div>
      {notice && <div className="um-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Đóng thông báo">×</button></div>}
      {error && !showForm && <div className="um-error" role="alert">{error}</div>}
      <div className="um-toolbar"><label><Search size={17} /><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm theo tên, email hoặc vai trò..." /></label>
        <button className="um-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Làm mới</button>
      </div>
      {loading ? <div className="um-empty">Đang tải danh sách tài khoản...</div> : filtered.length === 0 ? <div className="um-empty">Không tìm thấy tài khoản phù hợp.</div> : (
        <div className="um-table-wrap"><table className="um-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
          <tbody>{filtered.map(user => <tr key={user.id}><td><strong>{user.fullName}</strong><small>{user.email}</small></td><td>{roleLabel(user.role)}</td><td><span className={`um-status ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Đang hoạt động" : "Đã khóa"}</span></td><td>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td><td><div className="um-actions"><button title="Chỉnh sửa" aria-label={`Chỉnh sửa ${user.email}`} onClick={() => openEdit(user)}><Pencil size={16} /></button><button title="Đặt lại mật khẩu" aria-label={`Đặt lại mật khẩu ${user.email}`} onClick={() => { setPasswordTarget(user); setNewPassword(""); setError(""); }}><KeyRound size={16} /></button><button title={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"} aria-label={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"} onClick={() => void toggleActive(user)} disabled={busy}>{user.isActive ? <UserRoundX size={16} /> : <UserRound size={16} />}</button></div></td></tr>)}</tbody>
        </table></div>
      )}
      <p className="um-footnote">Tài khoản Ban Giám Hiệu, Quản trị hệ thống và các đơn vị khác không nằm trong phạm vi chỉnh sửa tại đây.</p>

      {showForm && <div className="um-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
        <form className="um-modal" onSubmit={submitUser}><div className="um-modal-head"><h3>{editing ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}</h3><button type="button" onClick={() => setShowForm(false)} aria-label="Đóng">×</button></div>
          <label>Họ và tên<input required minLength={2} maxLength={120} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
          <label>Email đăng nhập<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          {!editing && <label>Mật khẩu ban đầu<input required type="password" minLength={8} maxLength={100} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>Tối thiểu 8 ký tự.</small></label>}
          <label>Vai trò<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}><option value="SCHOOL_KITCHEN">Bếp tại trường</option><option value="SCHOOL_STAFF">Nhân viên trường</option></select></label>
          {error && <div className="um-error" role="alert">{error}</div>}
          <div className="um-modal-actions"><button type="button" className="um-secondary" onClick={() => setShowForm(false)}>Hủy</button><button className="um-primary" disabled={busy}>{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo tài khoản"}</button></div>
        </form>
      </div>}

      {passwordTarget && <div className="um-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPasswordTarget(null); }}>
        <form className="um-modal" onSubmit={submitPassword}><div className="um-modal-head"><h3>Đặt lại mật khẩu</h3><button type="button" onClick={() => setPasswordTarget(null)} aria-label="Đóng">×</button></div>
          <p>Đặt mật khẩu mới cho <strong>{passwordTarget.email}</strong>.</p>
          <label>Mật khẩu mới<input required type="password" minLength={8} maxLength={100} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /><small>Tối thiểu 8 ký tự.</small></label>
          {error && <div className="um-error" role="alert">{error}</div>}
          <div className="um-modal-actions"><button type="button" className="um-secondary" onClick={() => setPasswordTarget(null)}>Hủy</button><button className="um-primary" disabled={busy}>{busy ? "Đang lưu..." : "Đặt lại mật khẩu"}</button></div>
        </form>
      </div>}
    </section>
  );
}
