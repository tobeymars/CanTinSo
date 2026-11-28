const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
const TOKEN_KEY = "cantinso_access_token";
const USER_KEY = "cantinso_user";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  schoolId: string | null;
  kitchenId?: string | null;
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

function normalizedUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const account = raw as Record<string, unknown>;
  // Older /auth/me versions return JWT "sub" instead of "id".
  const id = typeof account.id === 'string' ? account.id
    : typeof account.sub === 'string' ? account.sub : '';
  if (!id || typeof account.email !== 'string' || typeof account.role !== 'string') return null;
  return {
    id,
    email: account.email,
    fullName: typeof account.fullName === 'string' ? account.fullName : account.email,
    role: account.role,
    schoolId: typeof account.schoolId === 'string' ? account.schoolId : null,
    kitchenId: typeof account.kitchenId === 'string' ? account.kitchenId : null,
  };
}

export function getStoredUser(): AuthUser | null {
  const value = sessionStorage.getItem(USER_KEY);
  if (!value) return null;
  try { return normalizedUser(JSON.parse(value)); } catch { return null; }
}

export function saveSession(result: AuthResponse): AuthUser {
  sessionStorage.setItem(TOKEN_KEY, result.accessToken);
  const user = normalizedUser(result.user);
  if (!user) throw new Error("Máy chủ trả về thông tin tài khoản không hợp lệ.");
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
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
  const user = normalizedUser(await response.json());
  if (!user) throw new Error("Máy chủ trả về thông tin phiên đăng nhập không hợp lệ.");
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}
