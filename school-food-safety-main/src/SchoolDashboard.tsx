import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Building2, CalendarDays, ChefHat, ClipboardList, Users, Utensils } from "lucide-react";
import { getMyKitchen, getMySchoolOverview } from "./lib/usersApi";

type Props = { date: string };

const mealLabels: Record<string, string> = {
  BREAKFAST: "Bữa sáng",
  LUNCH: "Bữa trưa",
  SNACK: "Bữa xế",
};

export default function SchoolDashboard({ date }: Props) {
  const overview = useQuery({
    queryKey: ["my-school-overview", date],
    queryFn: () => getMySchoolOverview(date),
  });
  const kitchen = useQuery({
    queryKey: ["my-school-kitchen"],
    queryFn: getMyKitchen,
  });

  if (overview.isPending) {
    return <section className="card"><p>Đang tải tổng quan thực tế của trường…</p></section>;
  }
  if (overview.isError || !overview.data) {
    return <section className="card" role="alert">
      <div className="management-readonly"><AlertCircle size={20}/><div><strong>Không tải được dữ liệu trường</strong><p>{overview.error instanceof Error ? overview.error.message : "Vui lòng kiểm tra kết nối máy chủ và thử tải lại."}</p></div></div>
    </section>;
  }

  const { school, counts, mealPlans } = overview.data;
  const stats = [
    { icon: Users, value: counts.students, label: "Học sinh trong hệ thống" },
    { icon: Utensils, value: counts.plannedServings, label: "Suất ăn đã lập kế hoạch" },
    { icon: CalendarDays, value: counts.mealPlans, label: "Kế hoạch bữa ăn trong ngày" },
    { icon: Building2, value: counts.suppliers, label: "Nhà cung cấp đã ghi nhận" },
  ];

  return <div className="school-real-dashboard">
    <div className="admin-stats">
      {stats.map(item => <div className="card admin-stat" key={item.label}>
        <item.icon size={21}/>
        <strong>{item.value.toLocaleString("vi-VN")}</strong>
        <span>{item.label}</span>
      </div>)}
    </div>

    <section className="card" style={{marginTop:24}}>
      <div className="card-header">
        <div>
          <div className="section-kicker">DỮ LIỆU TỪ HỆ THỐNG</div>
          <h2>Kế hoạch bữa ăn ngày {new Date(date + "T12:00:00").toLocaleDateString("vi-VN")}</h2>
          <p>{school.name}{school.ward ? " · " + school.ward.name : ""}</p>
        </div>
        <span className="supplier-status declared">Dữ liệu thực tế</span>
      </div>
      {mealPlans.length ? <div className="table-scroll"><table>
        <thead><tr><th>Bữa ăn</th><th>Số suất</th><th>Trạng thái</th></tr></thead>
        <tbody>{mealPlans.map(plan => <tr key={plan.id}>
          <td><strong>{mealLabels[plan.mealType] ?? plan.mealType}</strong></td>
          <td>{plan.servings.toLocaleString("vi-VN")}</td>
          <td><span className="admin-status">{plan.status}</span></td>
        </tr>)}</tbody>
      </table></div> : <div className="empty-state">
        <ClipboardList size={34}/><h3>Chưa có kế hoạch bữa ăn trong ngày</h3>
        <p>Khi nhà trường lập kế hoạch bữa ăn trên hệ thống, thông tin sẽ hiển thị tại đây. Không sử dụng số liệu DEMO thay thế.</p>
      </div>}
    </section>

    <section className="card" style={{marginTop:20}}>
      <div className="card-header"><div><div className="section-kicker">MÔ HÌNH BẾP</div><h2>Bếp đang phục vụ trường</h2></div></div>
      {kitchen.isPending ? <p>Đang tải thông tin phân công bếp…</p>
        : kitchen.isError ? <p className="error">Không tải được thông tin bếp: {kitchen.error instanceof Error ? kitchen.error.message : "Lỗi kết nối"}</p>
        : kitchen.data ? <div className="supplier-document-grid">
          <div><span>Loại bếp</span><strong>{kitchen.data.providerType === "CENTRAL" ? "Bếp trung tâm" : "Bếp tại trường"}</strong></div>
          <div><span>Tên bếp</span><strong>{kitchen.data.kitchen.name}</strong></div>
          <div><span>Địa chỉ</span><strong>{kitchen.data.kitchen.address || "Chưa cập nhật"}</strong></div>
          <div><span>Liên hệ</span><strong>{kitchen.data.kitchen.contactName || "Chưa cập nhật"}{kitchen.data.kitchen.phone ? " · " + kitchen.data.kitchen.phone : ""}</strong></div>
          <div><span>Phường quản lý</span><strong>{kitchen.data.kitchen.ward?.name || "Theo hồ sơ trường"}</strong></div>
        </div>
        : <div className="empty-state"><ChefHat size={34}/><h3>Chưa có bếp được ghi nhận</h3><p>UBND phường chưa phân công bếp trung tâm hoặc trường chưa có hồ sơ bếp tại chỗ.</p></div>}
    </section>

    <p className="table-note" style={{marginTop:16}}>Các chỉ số trên được truy vấn từ dữ liệu gắn với tài khoản trường đang đăng nhập. Những nội dung chưa được lưu trên backend sẽ hiển thị là chưa có dữ liệu.</p>
  </div>;
}
