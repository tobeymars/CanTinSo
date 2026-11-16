import { getAccessToken } from "./authApi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "UBND_ADMIN" | "SCHOOL_ADMIN" | "SCHOOL_STAFF" | "SCHOOL_KITCHEN" | string;
  isActive: boolean;
  schoolId: string | null;
  wardId: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type ManagedSchool = {
  id: string;
  name: string;
  wardId: string | null;
  ward: { id: string; name: string; code: string | null } | null;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(result?.message) ? result.message.join(", ") : result?.message;
    throw new Error(message || "Không thể kết nối máy chủ.");
  }
  return result as T;
}

export const getManagedUsers = () => request<ManagedUser[]>("/users");
export const getManagedSchools = () => request<ManagedSchool[]>("/schools");

export function createManagedUser(payload: {
  email: string;
  fullName: string;
  password: string;
  role: "UBND_ADMIN" | "SCHOOL_KITCHEN" | "SCHOOL_STAFF";
  wardId?: string;
}) {
  return request<ManagedUser>("/users", { method: "POST", body: JSON.stringify(payload) });
}

export function updateManagedUser(id: string, payload: {
  email?: string;
  fullName?: string;
  role?: "UBND_ADMIN" | "SCHOOL_KITCHEN" | "SCHOOL_STAFF";
  isActive?: boolean;
}) {
  return request<ManagedUser>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function resetManagedUserPassword(id: string, password: string) {
  return request<{ success: boolean; message: string }>(`/users/${encodeURIComponent(id)}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}
