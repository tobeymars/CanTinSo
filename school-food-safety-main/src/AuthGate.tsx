import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import LoginPage from "./LoginPage";
import "./AuthGate.css";
import { useUI, type ActiveViewRole } from "./lib/store";
import { clearSession, getAccessToken, validateSession, type AuthUser } from "./lib/authApi";

const workspaceByBackendRole: Partial<Record<string, ActiveViewRole>> = {
  PARENT: "parent",
  SCHOOL_ADMIN: "school_board",
  SUPER_ADMIN: "school_board",
  UBND_ADMIN: "culture_social_office",
  CENTRAL_KITCHEN: "central_kitchen",
  SCHOOL_KITCHEN: "school_kitchen",
};

function applyWorkspace(user: AuthUser, setRole: (role: ActiveViewRole) => void): boolean {
  const workspace = workspaceByBackendRole[user.role];
  if (!workspace) return false;
  setRole(workspace);
  return true;
}

type SessionContextValue = { user: AuthUser; signOut: () => void };
const SessionContext = createContext<SessionContextValue | null>(null);

/** Authenticated account actions rendered inside the main sidebar, not floating over pages. */
export function AuthSessionProfile() {
  const session = useContext(SessionContext);
  if (!session) return null;
  const {user,signOut} = session;
  return <div className="auth-sidebar-profile" aria-label="Tài khoản đang đăng nhập">
    <span className="auth-sidebar-avatar" aria-hidden="true">{(user.fullName || user.email).trim().slice(0,1).toLocaleUpperCase('vi')}</span>
    <span className="auth-sidebar-user" title={user.fullName || user.email}>
      <strong>{user.fullName || user.email}</strong>
      <small>Tài khoản hệ thống</small>
    </span>
    <button type="button" className="auth-sidebar-logout" onClick={signOut} title="Đăng xuất khỏi tài khoản">Đăng xuất</button>
  </div>;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const isPublicTrace = location.pathname.startsWith("/truy-xuat-suat/");
  const setRole = useUI(state => state.setRole);
  const hasWorkspace = !!user && !!workspaceByBackendRole[user.role];

  useEffect(() => {
    let active = true;
    if (isPublicTrace) { setChecking(false); return; }
    if (!getAccessToken()) { setUser(null); setChecking(false); return; }
    setChecking(true);
    validateSession()
      .then(value => {
        if (active) {
          setUser(value);
          applyWorkspace(value, setRole);
        }
      })
      .catch(() => { if (active) { clearSession(); setUser(null); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [location.pathname, isPublicTrace, setRole]);

  if (isPublicTrace) return <>{children}</>;
  if (checking) return <div className="login-loading">Đang kiểm tra phiên đăng nhập...</div>;
  if (!user) return <LoginPage onSuccess={value => { setUser(value); applyWorkspace(value, setRole); }} />;
  if (!hasWorkspace) {
    return (
      <main className="login-loading" role="alert">
        <p>Tài khoản đã đăng nhập nhưng chưa được cấp không gian làm việc.</p>
        <p>Vai trò hiện tại: <strong>{user.role}</strong></p>
        <button type="button" onClick={() => { clearSession(); setUser(null); }}>Đăng xuất</button>
      </main>
    );
  }
  return (
    <SessionContext.Provider value={{user,signOut:()=>{clearSession();setUser(null);}}}>
      {children}
    </SessionContext.Provider>
  );
}
