# Kế hoạch triển khai frontend — 17/10/2026

## Phạm vi cập nhật
Theo chỉ thị mới nhất của người dùng: **chỉ frontend, không backend**. Không triển khai NestJS, PostgreSQL, API, migration, xác thực thật hoặc production. Các yêu cầu DB → API trong AGENTS.md được thay bằng dữ liệu minh họa cục bộ để đánh giá giao diện.

## Khảo sát và kiến trúc
Starter React 19 + TypeScript + Vite 8 được giữ nguyên. Bổ sung Tailwind v4, Lucide, Motion, React Router, TanStack Query, React Hook Form/Zod, Zustand. Module tác nghiệp tải bằng dynamic import. Dữ liệu dùng localStorage có nhãn DEMO; không gọi API và không gửi dữ liệu ra máy chủ.

## Checklist
- [x] Khảo sát source và đọc AGENTS.md.
- [x] Thiết lập tokens xanh ngọc, font hệ thống, nền sáng/tối và chuyển động giảm theo hệ điều hành.
- [x] Sidebar desktop, drawer mobile, định tuyến, dialog native có bàn phím, bộ chọn trường/ngày.
- [x] Trang phụ huynh: tổng quan, bữa ăn/lịch tuần, ảnh, nguồn gốc, timeline, góp ý/phản ánh lưu cục bộ.
- [x] Chế độ xem BGH: tổng quan, thực đơn nháp, tiến trình, hồ sơ, phản hồi minh họa, CSV.
- [x] Bếp trung tâm: xuất bếp không yêu cầu ảnh; phản ánh chỉ đọc trong UI.
- [x] Tách trách nhiệm tiến trình: Bếp trung tâm → `DISPATCHED`; Nhân viên tiếp nhận tại trường → `ARRIVED`; Nhân viên ra món/Bếp tại trường → `PLATED`, `READY`; BGH chỉ xác nhận bản ghi đã báo cáo.
- [x] VH–XH: tổng quan địa bàn, tìm/lọc, xem chi tiết, CSV.
- [x] Phân biệt ghi nhận và xác nhận minh họa; không tự tuyên bố an toàn thực phẩm.
- [x] Nhà cung cấp: KPI, bộ lọc, CRUD, xác nhận xóa, import JSON/export CSV, phân trang và localStorage.
- [x] Kho: 7 tab, 31 mặt hàng, 16 lô, cảnh báo/KPI/biểu đồ, tồn kho, phiếu nhập/xuất/chuyển, serial và truy xuất DEMO.
- [x] Quyền giao diện module mới: BGH/bếp được thao tác; Phòng VH–XH chỉ đọc; vai trò chuyên biệt ngoài phạm vi bị chặn khi truy cập URL trực tiếp.
- [x] Build frontend, 22 unit tests, 34 Playwright tests và các kiểm tra axe hiện có đã đạt; lint 0 cảnh báo, xem docs/QA_REPORT.md.
- [x] Tách tải theo nhu cầu cho quản trị, form phản ánh, thực đơn tuần, gallery và truy xuất QR; bundle chính giảm còn khoảng 387 KB, không còn cảnh báo chunk lớn.

## Tương tác và dữ liệu
Trường → bữa theo ngày → các mốc; ảnh bữa ăn chỉ thuộc mốc `READY`. Hai luồng ON_SITE và CENTRAL_KITCHEN được hiển thị riêng. Chỉnh thực đơn và sự kiện cục bộ được dùng lại ở màn phụ huynh. Phản ánh có hai kind MENU_SUGGESTION và MEAL_QUALITY_REPORT; phản hồi được lưu trên cùng thiết bị.

Vai trò là lựa chọn giao diện, **không phải authorization**. Không tuyên bố chống IDOR, xác minh chứng cứ hoặc bảo vệ dữ liệu ở cấp backend. File hồ sơ chỉ lưu metadata để duyệt UX, chưa lưu binary. Không có giả lập API gọi sang máy chủ.

## Kiểm thử
- Unit: chuỗi trạng thái và ma trận thao tác thuần TypeScript.
- Playwright: chọn trường, lịch tuần, điều hướng, form, persistence, dark mode, các chế độ xem quản trị, sửa nháp, xuất CSV và ảnh sự kiện.
- Responsive: 375, 390, 430, 768, 1024, 1440px.
- axe WCAG 2 A/AA trên trang phụ huynh và tổng quan địa bàn.
- Ảnh QA trong `docs/screenshots`.

## Chưa thuộc kết quả frontend này
Runtime Zalo, dữ liệu thật, kiểm thử phân quyền server, lưu trữ private, kiểm định giấy tờ, kiểm tra chính thức/khắc phục, queue thông báo và xuất Excel/PDF không được mô tả là đã vận hành. Chỉ mở rộng khi có yêu cầu phù hợp phạm vi frontend.
