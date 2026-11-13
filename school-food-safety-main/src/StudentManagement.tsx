import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownToLine,
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  UserX,
  X,
  SlidersHorizontal,
  LayoutDashboard,
  School,
  ScanFace,
  Camera,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import "./StudentManagement.css";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from "./lib/studentApi";
import { getAttendanceEvents, type AttendanceEvent } from "./lib/attendanceApi";
type Student = {
  id: string;
  code: string;
  name: string;
  className: string;
  gender: "Nam" | "Nữ" | "Khác";
  birthDate: string;
  guardian: string;
  phone: string;
  status: "Đang học" | "Tạm nghỉ" | "Đã chuyển trường";
};

type FaceStatus = "Đã đăng ký" | "Chưa đăng ký";
type CheckinStatus = "Đã điểm danh" | "Chưa điểm danh";

type FaceRecord = {
  faceStatus: FaceStatus;
  checkinStatus: CheckinStatus;
  checkinTime: string;
};

type TabKey = "overview" | "classes" | "face";

const STORAGE_KEY = "school-students-demo-v1";
const FACE_STORAGE_KEY = "school-students-face-demo-v1";

const seed: Student[] = [
  {
    id: "1",
    code: "HS001",
    name: "Nguyễn Minh Anh",
    className: "1A1",
    gender: "Nữ",
    birthDate: "2019-03-12",
    guardian: "Nguyễn Thị Lan",
    phone: "0901234567",
    status: "Đang học",
  },
  {
    id: "2",
    code: "HS002",
    name: "Trần Gia Bảo",
    className: "1A1",
    gender: "Nam",
    birthDate: "2019-07-24",
    guardian: "Trần Văn Hùng",
    phone: "0912345678",
    status: "Đang học",
  },
  {
    id: "3",
    code: "HS003",
    name: "Lê Khánh Linh",
    className: "2A2",
    gender: "Nữ",
    birthDate: "2018-11-02",
    guardian: "Lê Thị Hoa",
    phone: "0933456789",
    status: "Đang học",
  },
  {
    id: "4",
    code: "HS004",
    name: "Phạm Đức Minh",
    className: "3A1",
    gender: "Nam",
    birthDate: "2017-05-19",
    guardian: "Phạm Quốc Tuấn",
    phone: "0987654321",
    status: "Tạm nghỉ",
  },
  {
    id: "5",
    code: "HS005",
    name: "Đỗ Ngọc Hà",
    className: "2A1",
    gender: "Nữ",
    birthDate: "2018-08-30",
    guardian: "Đỗ Thị Mai",
    phone: "0977123456",
    status: "Đang học",
  },
  {
    id: "6",
    code: "HS006",
    name: "Võ Hoàng Nam",
    className: "4A1",
    gender: "Nam",
    birthDate: "2016-01-15",
    guardian: "Võ Văn Thành",
    phone: "0966123456",
    status: "Đang học",
  },
];

const loadStudents = (): Student[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Student[]) : seed;
  } catch {
    return seed;
  }
};

const loadFaceRecords = (): Record<string, FaceRecord> => {
  try {
    const raw = localStorage.getItem(FACE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const emptyForm = () => ({
  code: "",
  name: "",
  className: "",
  gender: "Nam" as Student["gender"],
  birthDate: "",
  guardian: "",
  phone: "",
  status: "Đang học" as Student["status"],
});

const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(-1)[0]?.charAt(0).toUpperCase() || "?";

const getToday = () => new Date().toLocaleDateString("vi-VN");

const getTime = () =>
  new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>(loadStudents);
  const [faceRecords, setFaceRecords] =
    useState<Record<string, FaceRecord>>(loadFaceRecords);
  useEffect(() => {
    let cancelled = false;

    getStudents()
      .then((result) => {
        if (!cancelled) {
          setStudents(result.data);
          setNotice("Đã tải danh sách học sinh từ máy chủ.");
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setNotice(`Không tải được dữ liệu: ${error.message}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>(
    [],
  );
  useEffect(() => {
    if (activeTab !== "face") return;

    let cancelled = false;

    const loadAttendance = async () => {
      try {
        setAttendanceLoading(true);

        const events = await getAttendanceEvents(200);

        if (!cancelled) {
          setAttendanceEvents(events);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Không thể tải dữ liệu điểm danh.",
          );
        }
      } finally {
        if (!cancelled) {
          setAttendanceLoading(false);
        }
      }
    };

    void loadAttendance();

    const timer = window.setInterval(() => {
      void loadAttendance();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeTab]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");

  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");

  const classes = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.className))).sort((a, b) =>
        a.localeCompare(b, "vi"),
      ),
    [students],
  );

  const filtered = students.filter(
    (s) =>
      `${s.code} ${s.name} ${s.guardian}`
        .toLowerCase()
        .includes(keyword.toLowerCase()) &&
      (classFilter === "all" || s.className === classFilter) &&
      (statusFilter === "all" || s.status === statusFilter) &&
      (selectedClass === "all" || s.className === selectedClass),
  );

  function getStudentAttendance(student: Student) {
    const today = new Date().toDateString();

    return attendanceEvents.find(
      (event) =>
        event.employeeNoString === student.code &&
        new Date(event.occurredAt).toDateString() === today,
    );
  }

  function getStudentCheckinTime(student: Student) {
    const event = getStudentAttendance(student);

    if (!event) return "";

    return new Date(event.occurredAt).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const active = students.filter((s) => s.status === "Đang học").length;
  const paused = students.length - active;

  const registeredFaces = students.filter(
    (s) => faceRecords[s.id]?.faceStatus === "Đã đăng ký",
  ).length;

  const checkedIn = students.filter((student) =>
    Boolean(getStudentAttendance(student)),
  ).length;

  const saveFaceRecords = (next: Record<string, FaceRecord>) => {
    setFaceRecords(next);
    localStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(next));
  };

  const getFaceRecord = (student: Student): FaceRecord => {
    const event = getStudentAttendance(student);

    return {
      faceStatus: faceRecords[student.id]?.faceStatus || "Chưa đăng ký",
      checkinStatus: event ? "Đã điểm danh" : "Chưa điểm danh",
      checkinTime: getStudentCheckinTime(student),
    };
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = (student: Student) => {
    setEditing(student);
    setForm({
      code: student.code,
      name: student.name,
      className: student.className,
      gender: student.gender,
      birthDate: student.birthDate,
      guardian: student.guardian,
      phone: student.phone,
      status: student.status,
    });
    setModal(true);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalized = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      className: form.className.trim(),
      guardian: form.guardian.trim(),
      phone: form.phone.trim(),
    };

    if (
      students.some(
        (s) =>
          s.code.toLowerCase() === normalized.code.toLowerCase() &&
          s.id !== editing?.id,
      )
    ) {
      setNotice("Mã học sinh đã tồn tại.");
      return;
    }

    try {
      if (editing) {
        const updated = await updateStudent(editing.id, normalized);

        setStudents((current) =>
          current.map((s) => (s.id === editing.id ? updated : s)),
        );

        setNotice("Đã cập nhật học sinh vào PostgreSQL.");
      } else {
        const created = await createStudent(normalized);

        setStudents((current) => [created, ...current]);

        setNotice("Đã thêm học sinh vào PostgreSQL.");
      }

      setModal(false);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Không thể lưu dữ liệu học sinh.",
      );
    }
  };

  const remove = async (student: Student) => {
    if (!window.confirm(`Bạn có chắc muốn xóa học sinh ${student.name}?`)) {
      return;
    }

    try {
      await deleteStudent(student.id);

      setStudents((current) => current.filter((s) => s.id !== student.id));

      const nextFaces = { ...faceRecords };
      delete nextFaces[student.id];
      saveFaceRecords(nextFaces);

      setNotice("Đã xóa học sinh khỏi PostgreSQL.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Không thể xóa học sinh.",
      );
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        "Mã học sinh",
        "Họ và tên",
        "Lớp",
        "Giới tính",
        "Ngày sinh",
        "Người giám hộ",
        "Số điện thoại",
        "Trạng thái",
        "Face ID",
        "Điểm danh",
        "Giờ điểm danh",
      ],
      ...filtered.map((s) => {
        const face = getFaceRecord(s);
        return [
          s.code,
          s.name,
          s.className,
          s.gender,
          s.birthDate,
          s.guardian,
          s.phone,
          s.status,
          face.faceStatus,
          face.checkinStatus,
          face.checkinTime,
        ];
      }),
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
        )
        .join("\r\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = "danh-sach-hoc-sinh-DEMO.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Mô phỏng đăng ký khuôn mặt, chưa kết nối camera thật.
  const registerFace = (student: Student) => {
    const next = {
      ...faceRecords,
      [student.id]: {
        ...getFaceRecord(student),
        faceStatus: "Đã đăng ký" as FaceStatus,
      },
    };

    saveFaceRecords(next);
    setNotice(`Đã mô phỏng đăng ký Face ID cho ${student.name}.`);
  };

  // Mô phỏng điểm danh bằng Face ID.
  const simulateCheckin = (student: Student) => {
    const current = getFaceRecord(student);

    if (current.faceStatus !== "Đã đăng ký") {
      setNotice("Học sinh cần đăng ký Face ID trước khi điểm danh.");
      return;
    }

    const next = {
      ...faceRecords,
      [student.id]: {
        ...current,
        checkinStatus: "Đã điểm danh" as CheckinStatus,
        checkinTime: getTime(),
      },
    };

    saveFaceRecords(next);
    setNotice(`Điểm danh thành công: ${student.name}.`);
  };

  const resetCheckins = () => {
    if (!window.confirm("Bạn muốn đặt lại trạng thái điểm danh hôm nay?"))
      return;

    const next = { ...faceRecords };

    students.forEach((student) => {
      const current = getFaceRecord(student);
      next[student.id] = {
        ...current,
        checkinStatus: "Chưa điểm danh",
        checkinTime: "",
      };
    });

    saveFaceRecords(next);
    setNotice("Đã đặt lại dữ liệu điểm danh DEMO.");
  };

  const renderStudentTable = (list: Student[]) => (
    <div className="student-table-wrap">
      <table className="student-table">
        <thead>
          <tr>
            <th>HỌC SINH</th>
            <th>MÃ HỌC SINH</th>
            <th>LỚP</th>
            <th>GIỚI TÍNH</th>
            <th>NGƯỜI GIÁM HỘ</th>
            <th>TRẠNG THÁI</th>
            <th className="student-actions-col">THAO TÁC</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id}>
              <td>
                <div className="student-person">
                  <span className="student-avatar">{getInitials(s.name)}</span>
                  <div>
                    <strong>{s.name}</strong>
                    <small>
                      {s.birthDate
                        ? new Date(
                            `${s.birthDate}T12:00:00`,
                          ).toLocaleDateString("vi-VN")
                        : "Chưa có ngày sinh"}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <span className="student-code">{s.code}</span>
              </td>
              <td>
                <span className="student-class-chip">{s.className}</span>
              </td>
              <td>{s.gender}</td>
              <td>
                <div className="student-guardian">
                  {s.guardian || "Chưa cập nhật"}
                  <small>{s.phone || "Chưa có số điện thoại"}</small>
                </div>
              </td>
              <td>
                <span
                  className={`student-status ${s.status === "Đang học" ? "is-active" : "is-paused"}`}
                >
                  <i />
                  {s.status}
                </span>
              </td>
              <td>
                <div className="student-row-actions">
                  <button
                    title="Chỉnh sửa"
                    aria-label={`Chỉnh sửa ${s.name}`}
                    onClick={() => openEdit(s)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    title="Xóa"
                    aria-label={`Xóa ${s.name}`}
                    onClick={() => remove(s)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!list.length && (
        <div className="student-empty">
          <Users size={34} />
          <strong>Không tìm thấy học sinh</strong>
          <span>Hãy thử thay đổi từ khóa hoặc bộ lọc.</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="student-page">
      <header className="student-page-head">
        <div>
          <div className="student-eyebrow">
            <GraduationCap size={15} /> KHỐI QUẢN TRỊ NHÀ TRƯỜNG
          </div>
          <h1>Quản lý học sinh</h1>
          <p>Theo dõi hồ sơ, lớp học và tình trạng điểm danh của học sinh.</p>
        </div>

        <div className="student-head-actions">
          <button className="student-btn student-btn-light" onClick={exportCsv}>
            <ArrowDownToLine size={16} /> Xuất danh sách
          </button>
          <button
            className="student-btn student-btn-primary"
            onClick={openCreate}
          >
            <Plus size={17} /> Thêm học sinh
          </button>
        </div>
      </header>

      <nav className="student-tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          <LayoutDashboard size={17} />
          Tổng quan
        </button>
        <button
          className={activeTab === "classes" ? "active" : ""}
          onClick={() => setActiveTab("classes")}
        >
          <School size={17} />
          Theo lớp
        </button>
        <button
          className={activeTab === "face" ? "active" : ""}
          onClick={() => setActiveTab("face")}
        >
          <ScanFace size={17} />
          Face Check-in
        </button>
      </nav>

      {activeTab === "overview" && (
        <>
          <section className="student-kpis">
            <article>
              <span className="student-kpi-icon blue">
                <Users size={19} />
              </span>
              <div>
                <small>Tổng học sinh</small>
                <strong>{students.length.toLocaleString("vi-VN")}</strong>
                <em>Trong danh sách hiện tại</em>
              </div>
            </article>

            <article>
              <span className="student-kpi-icon green">
                <UserCheck size={19} />
              </span>
              <div>
                <small>Đang học</small>
                <strong>{active.toLocaleString("vi-VN")}</strong>
                <em>
                  {students.length
                    ? Math.round((active / students.length) * 100)
                    : 0}
                  % tổng số học sinh
                </em>
              </div>
            </article>

            <article>
              <span className="student-kpi-icon orange">
                <UserX size={19} />
              </span>
              <div>
                <small>Tạm nghỉ</small>
                <strong>{paused.toLocaleString("vi-VN")}</strong>
                <em>Cần theo dõi tình trạng</em>
              </div>
            </article>

            <article>
              <span className="student-kpi-icon violet">
                <GraduationCap size={19} />
              </span>
              <div>
                <small>Số lớp</small>
                <strong>{classes.length}</strong>
                <em>Lớp có học sinh trong danh sách</em>
              </div>
            </article>
          </section>

          <section className="student-overview-grid">
            <article className="student-list-card">
              <div className="student-list-title">
                <div>
                  <h2>Trạng thái học sinh</h2>
                  <p>Tổng hợp theo trạng thái hiện tại</p>
                </div>
              </div>

              <div className="student-overview-stats">
                <div>
                  <span className="student-stat-dot green" />
                  <span>Đang học</span>
                  <strong>{active}</strong>
                </div>
                <div className="student-progress">
                  <span
                    style={{
                      width: `${students.length ? (active / students.length) * 100 : 0}%`,
                    }}
                  />
                </div>

                <div>
                  <span className="student-stat-dot orange" />
                  <span>Tạm nghỉ</span>
                  <strong>{paused}</strong>
                </div>
                <div className="student-progress orange">
                  <span
                    style={{
                      width: `${students.length ? (paused / students.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </article>

            <article className="student-list-card">
              <div className="student-list-title">
                <div>
                  <h2>Face ID</h2>
                  <p>Trạng thái dữ liệu khuôn mặt DEMO</p>
                </div>
                <ScanFace size={22} />
              </div>

              <div className="student-face-summary">
                <span className="student-face-status is-unregistered">
                  <ShieldCheck size={14} />
                  Tự động từ máy
                </span>
                <div>
                  <strong>{checkedIn}</strong>
                  <span>Đã điểm danh hôm nay</span>
                </div>
              </div>
            </article>
          </section>

          <section className="student-list-card">
            <div className="student-list-title">
              <div>
                <h2>Học sinh mới nhất</h2>
                <p>Danh sách học sinh trong hệ thống</p>
              </div>
              <button
                className="student-btn student-btn-light"
                onClick={() => setActiveTab("classes")}
              >
                Xem danh sách
              </button>
            </div>
            {renderStudentTable(students.slice(0, 5))}
          </section>
        </>
      )}

      {activeTab === "classes" && (
        <>
          <section className="student-class-section">
            <div className="student-list-title">
              <div>
                <h2>Danh sách lớp học</h2>
                <p>Chọn một lớp để xem danh sách học sinh.</p>
              </div>
              <span className="student-record-count">{classes.length} lớp</span>
            </div>

            <div className="student-class-grid">
              <button
                className={`student-class-card ${selectedClass === "all" ? "selected" : ""}`}
                onClick={() => setSelectedClass("all")}
              >
                <span className="student-class-card-icon">
                  <School size={20} />
                </span>
                <strong>Tất cả lớp</strong>
                <small>{students.length} học sinh</small>
              </button>

              {classes.map((className) => {
                const classStudents = students.filter(
                  (s) => s.className === className,
                );

                return (
                  <button
                    key={className}
                    className={`student-class-card ${selectedClass === className ? "selected" : ""}`}
                    onClick={() => setSelectedClass(className)}
                  >
                    <span className="student-class-card-icon">
                      <GraduationCap size={20} />
                    </span>
                    <strong>Lớp {className}</strong>
                    <small>{classStudents.length} học sinh</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="student-list-card">
            <div className="student-list-title">
              <div>
                <h2>
                  {selectedClass === "all"
                    ? "Toàn bộ học sinh"
                    : `Danh sách lớp ${selectedClass}`}
                </h2>
                <p>
                  Hiển thị{" "}
                  {
                    students.filter(
                      (s) =>
                        selectedClass === "all" ||
                        s.className === selectedClass,
                    ).length
                  }{" "}
                  học sinh
                </p>
              </div>
            </div>

            <div className="student-filters">
              <label className="student-search">
                <Search size={17} />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo mã, tên hoặc phụ huynh..."
                  aria-label="Tìm học sinh"
                />
              </label>
              <label className="student-select">
                <SlidersHorizontal size={15} />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="all">Tất cả lớp</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {renderStudentTable(filtered)}
          </section>
        </>
      )}

      {activeTab === "face" && (
        <>
          <section className="student-face-banner">
            <div className="student-face-banner-icon">
              <ScanFace size={34} />
            </div>
            <div>
              <span>FACE RECOGNITION DEMO</span>
              <h2>Điểm danh học sinh bằng khuôn mặt</h2>
              <p>
                Giao diện mô phỏng quy trình đăng ký Face ID và điểm danh. Chưa
                kết nối camera hoặc hệ thống nhận diện thật.
              </p>
            </div>
          </section>

          <section className="student-kpis">
            <article>
              <span className="student-kpi-icon blue">
                <Users size={19} />
              </span>
              <div>
                <small>Tổng học sinh</small>
                <strong>{students.length}</strong>
                <em>Trong dữ liệu DEMO</em>
              </div>
            </article>

            <article>
              <span className="student-kpi-icon green">
                <ShieldCheck size={19} />
              </span>
              <div>
                <small>Đã đăng ký Face ID</small>
                <strong>{registeredFaces}</strong>
                <em>
                  {students.length
                    ? Math.round((registeredFaces / students.length) * 100)
                    : 0}
                  % học sinh
                </em>
              </div>
            </article>

            <article>
              <span className="student-kpi-icon violet">
                <CheckCircle2 size={19} />
              </span>
              <div>
                <small>Đã điểm danh</small>
                <strong>{checkedIn}</strong>
                <em>Trong ngày hôm nay</em>
              </div>
            </article>

            <article>
              <span className="student-kpi-icon orange">
                <Clock3 size={19} />
              </span>
              <div>
                <small>Chưa điểm danh</small>
                <strong>{students.length - checkedIn}</strong>
                <em>Chờ ghi nhận</em>
              </div>
            </article>
          </section>

          <section className="student-list-card">
            <div className="student-list-title">
              <div>
                <h2>Quản lý Face ID và điểm danh</h2>
                <p>
                  Đăng ký khuôn mặt hoặc mô phỏng điểm danh cho từng học sinh.
                </p>
              </div>
            </div>

            <div className="student-filters">
              <label className="student-search">
                <Search size={17} />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm học sinh..."
                  aria-label="Tìm học sinh Face ID"
                />
              </label>

              <label className="student-select">
                <SlidersHorizontal size={15} />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="all">Tất cả lớp</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="student-table-wrap">
              <table className="student-table student-face-table">
                <thead>
                  <tr>
                    <th>HỌC SINH</th>
                    <th>LỚP</th>
                    <th>FACE ID</th>
                    <th>ĐIỂM DANH</th>
                    <th>THỜI GIAN</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const face = getFaceRecord(s);

                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="student-person">
                            <span className="student-avatar">
                              {getInitials(s.name)}
                            </span>
                            <div>
                              <strong>{s.name}</strong>
                              <small>{s.code}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="student-class-chip">
                            {s.className}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`student-face-status ${face.faceStatus === "Đã đăng ký" ? "is-registered" : "is-unregistered"}`}
                          >
                            {face.faceStatus === "Đã đăng ký" ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Clock3 size={14} />
                            )}
                            {face.faceStatus}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`student-face-status ${face.checkinStatus === "Đã điểm danh" ? "is-registered" : "is-unregistered"}`}
                          >
                            {face.checkinStatus === "Đã điểm danh"
                              ? "Đã điểm danh"
                              : "Chưa điểm danh"}
                          </span>
                        </td>

                        <td>{face.checkinTime || "--:--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!filtered.length && (
                <div className="student-empty">
                  <Users size={34} />
                  <strong>Không tìm thấy học sinh</strong>
                  <span>Hãy thử thay đổi từ khóa hoặc bộ lọc.</span>
                </div>
              )}
            </div>

            <div className="student-table-foot">
              <CalendarDays size={14} />
              Ngày: {getToday()}. Dữ liệu đồng bộ .
              {attendanceLoading && " Đang cập nhật..."}
            </div>
          </section>
        </>
      )}

      {notice && (
        <div className="student-toast" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Đóng thông báo">
            <X size={15} />
          </button>
        </div>
      )}

      {modal && (
        <div
          className="student-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <section
            className="student-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
          >
            <header>
              <div>
                <small>HỒ SƠ HỌC SINH</small>
                <h2 id="student-modal-title">
                  {editing ? "Cập nhật thông tin" : "Thêm học sinh mới"}
                </h2>
              </div>
              <button onClick={() => setModal(false)} aria-label="Đóng">
                <X />
              </button>
            </header>

            <form onSubmit={submit}>
              <div className="student-form-grid">
                <label>
                  Mã học sinh *
                  <input
                    required
                    maxLength={30}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="VD: HS007"
                  />
                </label>

                <label>
                  Họ và tên *
                  <input
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nhập họ và tên"
                  />
                </label>

                <label>
                  Lớp *
                  <input
                    required
                    maxLength={30}
                    value={form.className}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        className: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="VD: 1A1"
                  />
                </label>

                <label>
                  Giới tính
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gender: e.target.value as Student["gender"],
                      })
                    }
                  >
                    <option>Nam</option>
                    <option>Nữ</option>
                  </select>
                </label>

                <label>
                  Ngày sinh
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) =>
                      setForm({ ...form, birthDate: e.target.value })
                    }
                  />
                </label>

                <label>
                  Trạng thái
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as Student["status"],
                      })
                    }
                  >
                    <option>Đang học</option>
                    <option>Tạm nghỉ</option>
                  </select>
                </label>

                <label>
                  Người giám hộ
                  <input
                    maxLength={120}
                    value={form.guardian}
                    onChange={(e) =>
                      setForm({ ...form, guardian: e.target.value })
                    }
                    placeholder="Họ tên phụ huynh"
                  />
                </label>

                <label>
                  Số điện thoại
                  <input
                    type="tel"
                    maxLength={20}
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="Số điện thoại liên hệ"
                  />
                </label>
              </div>

              <p className="student-form-hint">
                * Là trường thông tin bắt buộc. Đây là biểu mẫu minh họa, chưa
                gửi dữ liệu lên máy chủ.
              </p>

              <footer>
                <button
                  type="button"
                  className="student-btn student-btn-light"
                  onClick={() => setModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="student-btn student-btn-primary"
                  type="submit"
                >
                  {editing ? "Lưu thay đổi" : "Thêm học sinh"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
