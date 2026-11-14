import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import LoginPage from "./LoginPage";
import "./AuthGate.css";
import { useUI } from "./lib/store";
import { clearSession, getAccessToken, validateSession, type AuthUser } from "./lib/authApi";

export default function AuthGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const isPublicTrace = location.pathname.startsWith("/truy-xuat-suat/");
  const setRole = useUI(state => state.setRole);

  useEffect(() => {
    let active = true;
    if (isPublicTrace) { setChecking(false); return; }
    if (!getAccessToken()) { setUser(null); setChecking(false); return; }
    setChecking(true);
    validateSession()
      .then(value => { if (active) setUser(value); })
      .catch(() => { if (active) { clearSession(); setUser(null); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [location.pathname, isPublicTrace]);

  if (isPublicTrace) return <>{children}</>;
  if (checking) return <div className="login-loading">Đang kiểm tra phiên đăng nhập...</div>;
  if (!user) return <LoginPage onSuccess={value => { setUser(value); setRole("school_board"); }} />;
  return (
    <>
      <div className="auth-session-bar">
        <span>{user.fullName || user.email}</span>
        <button type="button" onClick={() => { clearSession(); setUser(null); }}>Đăng xuất</button>
      </div>
      {children}
    </>
  );
}
