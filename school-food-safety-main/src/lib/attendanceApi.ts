const API_BASE_URL = "http://localhost:3000/api/v1";
const TOKEN_KEY = "cantinso_access_token";

export type AttendanceEvent = {
  id: string;
  schoolId: string;
  studentId: string | null;
  deviceId: string;
  deviceSerialNo: string;
  employeeNoString: string;
  major: number;
  minor: number;
  occurredAt: string;
  attendanceStatus: string | null;
  currentVerifyMode: string | null;
  student: {
    id: string;
    code: string;
    name: string;
    classroom: {
      name: string;
    } | null;
  } | null;
};

export async function getAttendanceEvents(
  limit = 200,
): Promise<AttendanceEvent[]> {
  const token = sessionStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new Error("Chưa đăng nhập hoặc không tìm thấy JWT.");
  }

  const response = await fetch(`${API_BASE_URL}/attendance?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || "Không thể tải dữ liệu điểm danh.");
  }

  return result as AttendanceEvent[];
}
