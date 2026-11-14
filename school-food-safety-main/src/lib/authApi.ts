const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
const TOKEN_KEY = "cantinso_access_token";
const USER_KEY = "cantinso_user";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  schoolId: string | null;
};

type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthUser;
};

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const value = sessionStorage.getItem(USER_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as AuthUser; } catch { return null; }
}

export function saveSession(result: AuthResponse): AuthUser {
  sessionStorage.setItem(TOKEN_KEY, result.accessToken);
  sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
  return result.user;
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function readError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return Array.isArray(body?.message)
    ? body.message.join(", ")
    : body?.message || "Không thể kết nối máy chủ. Vui lòng thử lại.";
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const result = await response.json() as AuthResponse;
  if (!result.accessToken || !result.user) throw new Error("Máy chủ trả về dữ liệu đăng nhập không hợp lệ.");
  return saveSession(result);
}

export async function validateSession(): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) throw new Error("Chưa đăng nhập.");
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    clearSession();
    throw new Error(await readError(response));
  }
  const user = await response.json() as AuthUser;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}
