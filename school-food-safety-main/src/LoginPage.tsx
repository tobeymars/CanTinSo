import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sprout } from "lucide-react";
import { login, type AuthUser } from "./lib/authApi";
import "./LoginPage.css";

export default function LoginPage({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-shell">
        <aside className="login-intro" aria-label="Giới thiệu CanTinSo">
          <div className="login-intro-brand">
            <span className="login-intro-logo"><Sprout size={28} strokeWidth={2.1}/></span>
            <span><strong>CanTinSo</strong><small>HỆ THỐNG BỮA ĂN HỌC ĐƯỜNG</small></span>
          </div>

          <div className="login-intro-body">
            <span className="login-intro-kicker"><span className="login-intro-dot" /> NỀN TẢNG QUẢN LÝ TẬP TRUNG</span>
            <h2>Minh bạch từng khâu.<br/><em>An tâm từng bữa.</em></h2>
            <p>Kết nối bếp ăn, nhà trường và đơn vị quản lý.</p>
            <div className="login-intro-features" aria-label="Những chức năng chính">
              <span>Thực đơn & dinh dưỡng</span>
              <span>Giám sát & truy xuất</span>
            </div>
          </div>

          <div className="login-intro-footer"><ShieldCheck size={17}/> Vì những bữa ăn trọn vẹn của con.</div>
        </aside>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-top">
            <span className="login-panel-icon"><ShieldCheck size={24}/></span>
            <span className="login-panel-top-text">CỔNG ĐĂNG NHẬP CAN TIN SỐ</span>
          </div>
          <div className="login-heading">
            <span className="login-eyebrow">CHÀO MỪNG TRỞ LẠI</span>
            <h1 id="login-title">Đăng nhập tài khoản</h1>
            <p>Đăng nhập bằng tài khoản do đơn vị cấp.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} aria-busy={loading}>
            <label htmlFor="login-email">Địa chỉ email <span aria-hidden="true">*</span></label>
            <div className="login-input-wrap">
              <Mail size={19} aria-hidden="true"/>
              <input id="login-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                required maxLength={254} value={email} onChange={e => { setEmail(e.target.value); if(error)setError(""); }}
                placeholder="tenban@donvi.vn" disabled={loading}/>
            </div>
            <label htmlFor="login-password">Mật khẩu <span aria-hidden="true">*</span></label>
            <div className="login-input-wrap">
              <LockKeyhole size={19} aria-hidden="true"/>
              <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                required minLength={8} value={password} onChange={e => { setPassword(e.target.value); if(error)setError(""); }}
                placeholder="Nhập mật khẩu của bạn" disabled={loading}/>
              <button type="button" className="login-show-password"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword}
                onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}
              </button>
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? <><span className="login-spinner" aria-hidden="true"/> Đang xác thực...</> : <>Đăng nhập <ArrowRight size={18} aria-hidden="true"/></>}
            </button>
          </form>

          <div className="login-panel-bottom">
            <p className="login-support"><ShieldCheck size={17}/> Dữ liệu được truy cập theo quyền của tài khoản.</p>
            <p className="login-contact">Bạn chưa có tài khoản hoặc quên mật khẩu?<br/><strong>Liên hệ quản trị viên đơn vị để được hỗ trợ.</strong></p>
          </div>
          <p className="login-footer">© CanTinSo · Quản lý bữa ăn học đường</p>
        </section>
      </div>
    </main>
  );
}
