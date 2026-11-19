import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Plus, RefreshCw, School, X } from "lucide-react";
import { createManagedSchool, getManagedSchools } from "./lib/usersApi";
import "./WardSchoolManagement.css";

const emptyForm = { name: "", code: "", address: "", contactName: "", phone: "" };

export default function WardSchoolManagement() {
  const cache = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const schools = useQuery({
    queryKey: ["schools", "ward-scoped"],
    queryFn: getManagedSchools,
  });
  const create = useMutation({
    mutationFn: createManagedSchool,
    onSuccess: async (school) => {
      await cache.invalidateQueries({ queryKey: ["schools", "ward-scoped"] });
      setForm(emptyForm);
      setShowForm(false);
      setNotice(`Đã thêm trường ${school.name} vào địa bàn phường.`);
    },
  });
  const update = (key: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="ward-schools">
      <header className="ward-schools-head">
        <div className="ward-schools-heading-icon"><Building2 size={22} /></div>
        <div>
          <span className="ward-schools-eyebrow">QUẢN LÝ ĐỊA BÀN</span>
          <h2>Danh sách trường học</h2>
          <p>Quản lý các trường thuộc phường đang đăng nhập.</p>
        </div>
        <button className="ward-schools-add" onClick={() => { setShowForm((v) => !v); setNotice(""); }}>
          {showForm ? <X size={17} /> : <Plus size={17} />}
          {showForm ? "Đóng biểu mẫu" : "Thêm trường"}
        </button>
      </header>

      {notice && <div className="ward-schools-notice" role="status"><CheckCircle2 size={17} />{notice}</div>}
      {create.isError && <div className="ward-schools-error" role="alert">{create.error.message}</div>}

      {showForm && (
        <form className="ward-school-form" onSubmit={(event) => {
          event.preventDefault();
          create.mutate({
            name: form.name.trim(),
            ...(form.code.trim() ? { code: form.code.trim() } : {}),
            ...(form.address.trim() ? { address: form.address.trim() } : {}),
            ...(form.contactName.trim() ? { contactName: form.contactName.trim() } : {}),
            ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
          });
        }}>
          <div className="ward-school-form-title"><School size={19} /><div><strong>Thông tin trường mới</strong><small>Phường quản lý được tự động xác định từ tài khoản UBND.</small></div></div>
          <div className="ward-school-form-grid">
            <label className="wide">Tên trường <span>*</span><input required minLength={2} maxLength={200} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ví dụ: Trường Tiểu học..." /></label>
            <label>Mã trường<input maxLength={50} value={form.code} onChange={(e) => update("code", e.target.value)} placeholder="Không bắt buộc" /></label>
            <label>Địa chỉ<input maxLength={500} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Số nhà, đường, khu phố..." /></label>
            <label>Người liên hệ<input maxLength={200} value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Họ và tên" /></label>
            <label>Số điện thoại<input maxLength={30} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Số điện thoại liên hệ" /></label>
          </div>
          <div className="ward-school-form-actions">
            <button type="button" className="ward-school-cancel" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Hủy</button>
            <button type="submit" className="ward-schools-add" disabled={create.isPending || !form.name.trim()}>{create.isPending ? <RefreshCw className="spin" size={16} /> : <Plus size={16} />} Lưu trường mới</button>
          </div>
        </form>
      )}

      <div className="ward-schools-summary"><strong>{schools.data?.length ?? 0}</strong><span>Trường thuộc phường</span></div>
      {schools.isLoading ? <div className="ward-schools-loading"><RefreshCw className="spin" size={18} /> Đang tải danh sách trường...</div>
        : schools.isError ? <div className="ward-schools-error" role="alert">{schools.error.message}</div>
        : schools.data?.length ? (
          <div className="ward-schools-table-wrap"><table className="ward-schools-table">
            <thead><tr><th>Trường học</th><th>Mã trường</th><th>Địa chỉ</th><th>Người liên hệ</th><th>Điện thoại</th></tr></thead>
            <tbody>{schools.data.map((school) => <tr key={school.id}>
              <td><strong>{school.name}</strong><small>{school.ward?.name ?? "Phường đang quản lý"}</small></td>
              <td>{school.code || "—"}</td><td>{school.address || "—"}</td><td>{school.contactName || "—"}</td><td>{school.phone || "—"}</td>
            </tr>)}</tbody>
          </table></div>
        ) : <div className="ward-schools-empty"><School size={30} /><strong>Chưa có trường học</strong><p>Thêm trường đầu tiên để bắt đầu quản lý dữ liệu của địa bàn.</p></div>}
      <footer className="ward-schools-foot"><CheckCircle2 size={15} /> Mỗi trường được tự động gắn với phường của tài khoản đang đăng nhập. UBND phường khác không thể quản lý trường này.</footer>
    </section>
  );
}
