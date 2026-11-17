import { useEffect, useState } from "react";
import { AlertCircle, Building2, CookingPot, MapPin, Phone, Users } from "lucide-react";
import { getMyKitchen, type MyKitchen } from "./lib/usersApi";
import { getStoredUser } from "./lib/authApi";

export default function KitchenManagement() {
  const [data, setData] = useState<MyKitchen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = getStoredUser();

  useEffect(() => {
    if (user?.role !== "SCHOOL_ADMIN") {
      setError("Chức năng này chỉ dành cho tài khoản Ban Giám hiệu.");
      setLoading(false);
      return;
    }
    let active = true;
    getMyKitchen()
      .then((result) => { if (active) setData(result); })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Không tải được thông tin bếp.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.role]);

  if (user?.role !== "SCHOOL_ADMIN") {
    return <div className="management-page"><section className="card management-access-denied"><AlertCircle/><h2>Không có quyền truy cập</h2><p>Chức năng quản lý bếp chỉ dành cho Ban Giám hiệu.</p></section></div>;
  }

  return <div className="management-page">
    <header className="management-page-header">
      <div>
        <div className="section-kicker">TỔ CHỨC BẾP PHỤC VỤ NHÀ TRƯỜNG</div>
        <h2>Quản lý bếp</h2>
        <p>Theo dõi bếp trung tâm do UBND phường phân công hoặc hồ sơ bếp nấu tại trường. Việc thay đổi bếp trung tâm phải được UBND thực hiện.</p>
      </div>
    </header>

    {loading && <section className="card"><p>Đang tải thông tin bếp từ hệ thống…</p></section>}
    {error && <section className="card" role="alert"><div className="management-readonly"><AlertCircle size={18}/>{error}</div></section>}
    {!loading && !error && !data && <section className="card">
      <div className="empty-state"><CookingPot size={38}/><h3>Trường chưa có bếp đang hoạt động</h3><p>UBND phường chưa phân công bếp trung tâm và hệ thống chưa có hồ sơ bếp nấu tại trường. Vui lòng liên hệ UBND phường để xác nhận mô hình bếp.</p></div>
    </section>}
    {!loading && !error && data && <section className="card">
      <div className="card-header">
        <div>
          <div className="section-kicker">BẾP ĐANG PHỤC VỤ TRƯỜNG</div>
          <h2>{data.kitchen.name}</h2>
          <p>{data.providerType === "CENTRAL" ? "Bếp trung tâm · Được UBND phường phân công" : "Bếp nấu tại trường · Hồ sơ thuộc trường quản lý"}</p>
        </div>
        <span className="supplier-status declared">Đang hoạt động</span>
      </div>
      <div className="supplier-document-grid">
        <div><span>Loại bếp</span><strong>{data.providerType === "CENTRAL" ? "Bếp trung tâm" : "Bếp tại trường"}</strong></div>
        <div><span>Mã bếp</span><strong>{data.kitchen.code}</strong></div>
        <div><span>Phường quản lý</span><strong>{data.kitchen.ward?.name ?? "Theo hồ sơ trường"}</strong></div>
        <div><span>Người liên hệ</span><strong>{data.kitchen.contactName || "Chưa cập nhật"}</strong></div>
        <div><span>Điện thoại</span><strong>{data.kitchen.phone || "Chưa cập nhật"}</strong></div>
        <div><span>Địa chỉ</span><strong>{data.kitchen.address || "Chưa cập nhật"}</strong></div>
        <div><span>Công suất</span><strong>{data.kitchen.capacity ? data.kitchen.capacity.toLocaleString("vi-VN") + " suất/ngày" : "Chưa cập nhật"}</strong></div>
        {data.providerType === "CENTRAL" && data.startsAt && <div><span>Ngày bắt đầu phân công</span><strong>{new Date(data.startsAt).toLocaleDateString("vi-VN")}</strong></div>}
      </div>
      <div className="management-readonly" style={{marginTop:20}}>
        <AlertCircle size={17}/>
        <span>{data.providerType === "CENTRAL" ? "Thông tin phân công do UBND phường quản lý. Ban Giám hiệu được xem thông tin bếp đang phục vụ trường; không tự ý đổi hoặc kết thúc phân công." : "Hồ sơ bếp tại trường đang được hiển thị theo dữ liệu hệ thống. Các thao tác cập nhật hồ sơ bếp sẽ được bổ sung theo phân quyền."}</span>
      </div>
    </section>}
  </div>;
}
