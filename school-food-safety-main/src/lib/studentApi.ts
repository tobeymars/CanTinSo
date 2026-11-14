const API_BASE_URL = "http://localhost:3000/api/v1";
const TOKEN_KEY = "cantinso_access_token";

export type Student = {
  id: string;
  faceRegistered: boolean;
  code: string;
  name: string;
  className: string;
  gender: "Nam" | "Nữ" | "Khác";
  birthDate: string;
  guardian: string;
  phone: string;
  status: "Đang học" | "Tạm nghỉ" | "Đã chuyển trường";
};

export type StudentPayload = Omit<Student, "id" | "faceRegistered">;

type StudentListResponse = {
  data: Student[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    active: number;
    paused: number;
    classCount: number;
  };
  classes: string[];
};

export function setAccessToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "Chưa có JWT. Hãy thiết lập token kiểm thử trước khi gọi API.",
    );
  }

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
    const message = Array.isArray(result?.message)
      ? result.message.join(", ")
      : result?.message || "Có lỗi khi kết nối Backend";

    throw new Error(message);
  }

  return result as T;
}

export async function getStudents(): Promise<StudentListResponse> {
  return request<StudentListResponse>("/students");
}

export async function createStudent(student: StudentPayload): Promise<Student> {
  return request<Student>("/students", {
    method: "POST",
    body: JSON.stringify(student),
  });
}

export async function updateStudent(
  id: string,
  student: StudentPayload,
): Promise<Student> {
  return request<Student>(`/students/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(student),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  await request(`/students/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export type BulkImportResult = {
  summary: {
    total: number;
    imported: number;
    faceUploaded: number;
    skipped: number;
    failed: number;
  };
  results: Array<{
    code: string;
    name: string;
    status: string;
    message: string;
  }>;
};

export async function importStudentsZip(file: File): Promise<BulkImportResult> {
  const token = getAccessToken();
  if (!token) throw new Error("Bạn chưa đăng nhập hoặc JWT đã hết hạn.");
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API_BASE_URL}/students/bulk-import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(result?.message)
      ? result.message.join(", ")
      : result?.message || "Không thể nhập ZIP.";
    throw new Error(message);
  }
  return result as BulkImportResult;
}

export async function downloadStudentImportTemplate(): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Bạn chưa đăng nhập hoặc JWT đã hết hạn.");
  const response = await fetch(`${API_BASE_URL}/students/import-template`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Không tải được file Excel mẫu.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "CanTinSo_students_template.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}
