import { useEffect, useMemo, useState } from "react";
import { Building2, Factory, GraduationCap, KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserRound, UserRoundX, Users, X } from "lucide-react";
import {
  createManagedUser,
  getManagedSchools,
  getManagedUsers,
  resetManagedUserPassword,
  updateManagedUser,
  type ManagedSchool,
  type ManagedUser,
} from "./lib/usersApi";
import { getStoredUser } from "./lib/authApi";
import "./UserManagement.css";
import CentralKitchenManagement from "./CentralKitchenManagement";

type Role = "UBND_ADMIN" | "SCHOOL_ADMIN" | "SCHOOL_KITCHEN" | "SCHOOL_STAFF";
type FormState = { fullName: string; email: string; password: string; role: Role; wardId: string; schoolId: string };
const emptyForm = (isSuperAdmin: boolean): FormState => ({
  fullName: "",
  email: "",
  password: "",
  role: isSuperAdmin ? "UBND_ADMIN" : "SCHOOL_KITCHEN",
  wardId: "",
  schoolId: "",
});
const roleLabel = (role: string) =>
  role === "UBND_ADMIN" ? "Cán bộ UBND phường" :
  role === "SCHOOL_ADMIN" ? "Ban Giám hiệu" :
  role === "SCHOOL_KITCHEN" ? "Bếp tại trường" :
  role === "SCHOOL_STAFF" ? "Nhân viên trường" : role;

export default function UserManagement() {
  const currentRole = getStoredUser()?.role;
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const isWardAdmin = currentRole === "UBND_ADMIN";
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [schools, setSchools] = useState<ManagedSchool[]>([]);
  const [wards, setWards] = useState<ManagedSchool["ward"][]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [activeSection, setActiveSection] = useState<"accounts" | "kitchens">("accounts");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(isSuperAdmin));
  const [showForm, setShowForm] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (isWardAdmin) {
        setUsers([]);
        setWards([]);
        return;
      }
      const userRows = await getManagedUsers();
      if (isSuperAdmin) {
        const schoolRows = await getManagedSchools();
        const uniqueWards = new Map<string, NonNullable<ManagedSchool["ward"]>>();
        schoolRows.forEach(school => {
          if (school.ward) uniqueWards.set(school.ward.id, school.ward);
        });
        setSchools(schoolRows.sort((a, b) => a.name.localeCompare(b.name, "vi")));
        setWards(Array.from(uniqueWards.values()).sort((a, b) => a.name.localeCompare(b.name, "vi")));
        setUsers(userRows.filter(user => user.role === "UBND_ADMIN" || user.role === "SCHOOL_ADMIN"));
      } else {
        setUsers(userRows.filter(user => user.role === "SCHOOL_KITCHEN" || user.role === "SCHOOL_STAFF"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách tài khoản.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const wardName = (wardId: string | null) => wards.find(ward => ward?.id === wardId)?.name ?? "Chưa xác định";

  const filtered = useMemo(() => users.filter(user =>
    (roleFilter === "ALL" || user.role === roleFilter) &&
    `${user.fullName} ${user.email} ${roleLabel(user.role)} ${schools.find(s => s.id === user.schoolId)?.name ?? ""} ${wardName(user.wardId)}`.toLocaleLowerCase("vi").includes(keyword.toLocaleLowerCase("vi"))
  ), [users, keyword, roleFilter, schools, wards]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(isSuperAdmin));
    setShowForm(true);
    setError("");
  }
  function openEdit(user: ManagedUser) {
    setEditing(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: "",
      role: user.role as Role,
      wardId: user.wardId ?? "",
      schoolId: user.schoolId ?? "",
    });
    setShowForm(true);
    setError("");
  }

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editing) {
        await updateManagedUser(editing.id, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role,
        });
        setNotice("Đã cập nhật thông tin tài khoản.");
      } else {
        await createManagedUser({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          ...(isSuperAdmin && form.role === "UBND_ADMIN" ? { wardId: form.wardId } : {}),
          ...(isSuperAdmin && form.role === "SCHOOL_ADMIN" ? { schoolId: form.schoolId } : {}),
        });
        setNotice(isSuperAdmin
          ? form.role === "SCHOOL_ADMIN" ? "Đã tạo tài khoản Ban Giám hiệu và gán trường." : "Đã tạo tài khoản UBND phường và gán địa bàn quản lý."
          : "Đã tạo tài khoản mới. Tài khoản được gán vào trường của bạn.");
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: ManagedUser) {
    const action = user.isActive ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.email}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateManagedUser(user.id, { isActive: !user.isActive });
      setNotice(user.isActive ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật trạng thái.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await resetManagedUserPassword(passwordTarget.id, newPassword);
      setNotice(`Đã đặt lại mật khẩu cho ${passwordTarget.email}.`);
      setPasswordTarget(null);
      setNewPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setBusy(false);
    }
  }


  return (
    <>
    {isSuperAdmin && <header className="um-workspace-head">
      <div className="um-workspace-mark"><ShieldCheck size={23} /></div>
      <div><span className="um-eyebrow">TRUNG TÂM QUẢN TRỊ</span><h1>Quản lý tài khoản & đơn vị</h1><p>Quản lý quyền truy cập và đơn vị vận hành trên cùng một không gian.</p></div>
    </header>}
    {isSuperAdmin && <nav className="um-section-nav" aria-label="Phân hệ quản lý">
      <button type="button" className={activeSection === "accounts" ? "active" : ""} aria-current={activeSection === "accounts" ? "page" : undefined} onClick={() => setActiveSection("accounts")}><Users size={18} /><span><strong>Tài khoản người dùng</strong><small>UBND phường · Ban Giám hiệu</small></span></button>
      <button type="button" className={activeSection === "kitchens" ? "active" : ""} aria-current={activeSection === "kitchens" ? "page" : undefined} onClick={() => setActiveSection("kitchens")}><Factory size={18} /><span><strong>Bếp trung tâm</strong><small>Đơn vị bếp · Phân công trường</small></span></button>
    </nav>}
    {(isWardAdmin || (isSuperAdmin && activeSection === "kitchens")) && <CentralKitchenManagement />}
    {!isWardAdmin && activeSection === "accounts" && <section className="user-management um-accounts-section">
      <div className="um-intro um-panel-header">
        <div>
          <span className="um-eyebrow"><ShieldCheck size={15} /> {isSuperAdmin ? "QUẢN TRỊ TỔ CHỨC" : "QUẢN TRỊ TRONG PHẠM VI TRƯỜNG"}</span>
          <h2>{isSuperAdmin ? "Danh sách tài khoản" : "Quản lý tài khoản"}</h2>
          <p>{isSuperAdmin
            ? "Theo dõi tài khoản, phân quyền theo đơn vị và quản lý trạng thái truy cập."
            : "Tạo và quản lý tài khoản Bếp tại trường, Nhân viên trường thuộc đơn vị của bạn."}</p>
        </div>
        <button className="um-primary" onClick={openCreate}><Plus size={17} /> Thêm tài khoản</button>
      </div>
      <div className="um-stats">
        <div><span className="um-stat-icon"><Users /></span><span><strong>{users.length}</strong><small>Tổng tài khoản</small></span></div>
        <div><span className="um-stat-icon"><UserRound /></span><span><strong>{users.filter(u => u.isActive).length}</strong><small>Đang hoạt động</small></span></div>
        <div><span className="um-stat-icon"><UserRoundX /></span><span><strong>{users.filter(u => !u.isActive).length}</strong><small>Đã khóa</small></span></div>
      </div>
      {notice && <div className="um-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Đóng thông báo">×</button></div>}
      {error && !showForm && <div className="um-error" role="alert">{error}</div>}
      <div className="um-list-heading"><div><h3>Người dùng hệ thống</h3><p>{filtered.length} tài khoản phù hợp</p></div></div>
      <div className="um-toolbar">
        <label><Search size={17} /><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm tên, email, trường hoặc phường..." /></label>
        {isSuperAdmin && <div className="um-filter-tabs" role="group" aria-label="Lọc vai trò">{[["ALL", "Tất cả"], ["UBND_ADMIN", "UBND"], ["SCHOOL_ADMIN", "Ban Giám hiệu"]].map(([value, label]) => <button key={value} className={roleFilter === value ? "selected" : ""} onClick={() => setRoleFilter(value)} aria-pressed={roleFilter === value}>{label}</button>)}</div>}
        <button className="um-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Làm mới</button>
      </div>
      {loading ? <div className="um-empty">Đang tải danh sách tài khoản...</div> : filtered.length === 0 ? <div className="um-empty">Không tìm thấy tài khoản phù hợp.</div> : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead><tr><th>Tài khoản</th><th>Vai trò</th>{isSuperAdmin && <th>Đơn vị quản lý</th>}<th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
            <tbody>{filtered.map(user => (
              <tr key={user.id}>
                <td><div className="um-person"><span className="um-avatar">{user.fullName.trim().charAt(0).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{user.email}</small></span></div></td>
                <td><span className={`um-role ${user.role === "SCHOOL_ADMIN" ? "school" : "ward"}`}>{user.role === "SCHOOL_ADMIN" ? <GraduationCap size={14} /> : <Building2 size={14} />}{roleLabel(user.role)}</span></td>
                {isSuperAdmin && <td>{user.role === "SCHOOL_ADMIN" ? (schools.find(school => school.id === user.schoolId)?.name ?? "Chưa xác định") : wardName(user.wardId)}</td>}
                <td><span className={`um-status ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Đang hoạt động" : "Đã khóa"}</span></td>
                <td>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td>
                <td><div className="um-actions">
                  <button type="button" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${user.email}`} onClick={() => openEdit(user)}><Pencil size={16} /></button>
                  <button type="button" title="Đặt lại mật khẩu" aria-label={`Đặt lại mật khẩu ${user.email}`} onClick={() => { setPasswordTarget(user); setNewPassword(""); setError(""); }}><KeyRound size={16} /></button>
                  <button title={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"} aria-label={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"} onClick={() => void toggleActive(user)} disabled={busy}>{user.isActive ? <UserRoundX size={16} /> : <UserRound size={16} />}</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p className="um-footnote">{isSuperAdmin
        ? "Tài khoản UBND gắn với một phường; tài khoản BGH gắn với một trường. Không thay đổi đơn vị quản lý qua thao tác chỉnh sửa thông thường."
        : "Tài khoản Ban Giám Hiệu, Quản trị hệ thống và các đơn vị khác không nằm trong phạm vi chỉnh sửa tại đây."}</p>

      {showForm && <div className="um-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
        <form className="um-modal" onSubmit={submitUser}>
          <div className="um-modal-head"><div><span className="um-modal-kicker">QUẢN LÝ NGƯỜI DÙNG</span><h3>{editing ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}</h3><p>{editing ? "Chỉnh sửa thông tin đăng nhập và hồ sơ người dùng." : "Thiết lập tài khoản và phạm vi truy cập phù hợp."}</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Đóng"><X size={20} /></button></div>
          <label>Họ và tên<input required minLength={2} maxLength={120} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
          <label>Email đăng nhập<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          {!editing && <label>Mật khẩu ban đầu<input required type="password" minLength={8} maxLength={100} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>Tối thiểu 8 ký tự.</small></label>}
          {isSuperAdmin ? (
            <>
              <label>Vai trò
                <select value={form.role} disabled={!!editing} onChange={e => setForm({ ...form, role: e.target.value as Role, wardId: "", schoolId: "" })}>
                  <option value="UBND_ADMIN">Cán bộ UBND phường</option>
                  <option value="SCHOOL_ADMIN">Ban Giám hiệu</option>
                </select>
              </label>
              {form.role === "UBND_ADMIN" ? (
                <label>Phường quản lý
                  <select required value={form.wardId} disabled={!!editing} onChange={e => setForm({ ...form, wardId: e.target.value })}>
                    <option value="">Chọn phường</option>
                    {wards.filter((ward): ward is NonNullable<ManagedSchool["ward"]> => !!ward).map(ward => <option key={ward.id} value={ward.id}>{ward.name}{ward.code ? ` · ${ward.code}` : ""}</option>)}
                  </select>
                  <small>{editing ? "Không thể đổi phường khi chỉnh sửa tài khoản." : "Tài khoản chỉ truy cập các trường thuộc phường được chọn."}</small>
                </label>
              ) : (
                <label>Trường quản lý
                  <select required value={form.schoolId} disabled={!!editing} onChange={e => setForm({ ...form, schoolId: e.target.value })}>
                    <option value="">Chọn trường</option>
                    {schools.map(school => <option key={school.id} value={school.id}>{school.name}{school.ward ? ` · ${school.ward.name}` : ""}</option>)}
                  </select>
                  <small>{editing ? "Không thể đổi trường khi chỉnh sửa tài khoản." : "Tài khoản BGH chỉ quản lý trường được chọn."}</small>
                </label>
              )}
              {!editing && (form.role === "UBND_ADMIN" ? wards.length === 0 : schools.length === 0) && (
                <div className="um-error" role="alert">{form.role === "UBND_ADMIN" ? "Chưa tìm thấy phường có trường học." : "Chưa có trường học. Vui lòng tạo hồ sơ trường trước."}</div>
              )}
            </>
          ) : (
            <label>Vai trò<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}><option value="SCHOOL_KITCHEN">Bếp tại trường</option><option value="SCHOOL_STAFF">Nhân viên trường</option></select></label>
          )}
          {error && <div className="um-error" role="alert">{error}</div>}
          <div className="um-modal-actions"><button type="button" className="um-secondary" onClick={() => setShowForm(false)}>Hủy</button><button className="um-primary" disabled={busy || (isSuperAdmin && !editing && (form.role === "UBND_ADMIN" ? wards.length === 0 : schools.length === 0))}>{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo tài khoản"}</button></div>
        </form>
      </div>}

      {passwordTarget && <div className="um-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPasswordTarget(null); }}>
        <form className="um-modal" onSubmit={submitPassword}>
          <div className="um-modal-head"><div><span className="um-modal-kicker">BẢO MẬT TÀI KHOẢN</span><h3>Đặt lại mật khẩu</h3></div><button type="button" onClick={() => setPasswordTarget(null)} aria-label="Đóng"><X size={20} /></button></div>
          <p>Đặt mật khẩu mới cho <strong>{passwordTarget.email}</strong>.</p>
          <label>Mật khẩu mới<input required type="password" minLength={8} maxLength={100} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /><small>Tối thiểu 8 ký tự.</small></label>
          {error && <div className="um-error" role="alert">{error}</div>}
          <div className="um-modal-actions"><button type="button" className="um-secondary" onClick={() => setPasswordTarget(null)}>Hủy</button><button className="um-primary" disabled={busy}>{busy ? "Đang lưu..." : "Đặt lại mật khẩu"}</button></div>
        </form>
      </div>}
    </section>}
    </>
  );
}
