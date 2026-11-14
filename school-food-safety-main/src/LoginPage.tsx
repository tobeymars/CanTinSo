import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { login, type AuthUser } from "./lib/authApi";
import "./LoginPage.css";

export default function LoginPage({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [email, setEmail] = useState("admin@cantinso.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-brand">
          <div className="login-brand-mark"><ShieldCheck size={27} /></div>
          <div><strong>CanTinSo</strong><span>QUẢN LÝ BỮA ĂN HỌC ĐƯỜNG</span></div>
        </div>
        <div className="login-heading">
          <span className="login-eyebrow">CỔNG QUẢN TRỊ HỆ THỐNG</span>
          <h1>Chào mừng trở lại</h1>
          <p>Đăng nhập để tiếp tục quản lý và theo dõi hoạt động căn tin số.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <div className="login-input-wrap">
            <Mail size={18} />
            <input id="login-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Nhập email tài khoản" />
          </div>
          <label htmlFor="login-password">Mật khẩu</label>
          <div className="login-input-wrap">
            <LockKeyhole size={18} />
            <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" />
            <button type="button" className="login-show-password" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword(v => !v)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Đang xác thực..." : "Đăng nhập"}
          </button>
        </form>
        <p className="login-security"><LockKeyhole size={14} /> Phiên đăng nhập được bảo vệ bằng JWT.</p>
        <p className="login-footer">CanTinSo · Hệ thống quản lý bữa ăn học đường</p>
      </section>
    </main>
  );
}
