# Bữa ăn học đường — Frontend

Ứng dụng React + TypeScript + Vite, chỉ frontend theo yêu cầu cập nhật. Không có backend, database, đăng nhập thật hoặc gửi thông báo.

## Chạy

```powershell
npm.cmd install
npm.cmd run dev
```

Mở URL Vite hiển thị (mặc định http://localhost:5173).

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e
```

E2E dùng Microsoft Edge có sẵn trên Windows (`channel: msedge`). Nếu dùng hệ điều hành khác, đổi channel trong `playwright.config.ts` và cài browser phù hợp.

## Trải nghiệm

- Phụ huynh: chọn 3 trường; xem đồng thời thực đơn đủ 7 ngày và mở chi tiết từng ngày; xem ảnh phóng to, nguồn gốc minh họa, timeline hai mô hình, hồ sơ kiểm tra công khai DEMO, gửi góp ý hoặc phản ánh và xem lại.
- Truy xuất DEMO: 4 lô nguyên liệu có nguồn gốc khai báo, thời gian giao nhận, kiểm tra đầu vào, món liên kết và metadata chứng từ công khai; không cung cấp bản scan hoặc dữ liệu nhạy cảm.
- Nút tài khoản góc trên mở bộ chọn không gian DEMO: Phụ huynh / BGH / Bếp trung tâm / Nhân viên tiếp nhận tại trường / Nhân viên ra món / Bếp nấu tại trường / Phòng VH–XH. Đây là chuyển giao diện, không phải xác thực hay cơ chế bảo mật.
- BGH: sửa thực đơn/số suất bản nháp, mô phỏng xác nhận từng mốc và duyệt ảnh ở bước Sẵn sàng phục vụ, thêm thông tin giấy tờ, phản hồi ý kiến cục bộ và xem xuất–nhập–tồn đúng trường.
- BGH — Quản lý học sinh: danh sách học sinh, tìm kiếm theo mã/tên/người giám hộ, lọc lớp và trạng thái, thêm/sửa/xóa hồ sơ DEMO, thống kê nhanh và xuất CSV. Dữ liệu lưu localStorage trên trình duyệt, chưa kết nối API hoặc cơ sở dữ liệu.
- Quản lý bếp trung tâm: trong **Thực đơn & bữa ăn**, quản lý hồ sơ bếp trung tâm được phân công và lập bản nháp thực đơn ngày/tuần; mỗi món phải gắn đúng bếp chuẩn bị. Các vai trò bếp trung tâm khác chỉ xem theo quyền. Mốc xuất bếp vẫn được ghi nhận riêng tại tiến trình.
- Nhân viên tiếp nhận tại trường: chỉ cập nhật mốc `ARRIVED` sau khi bếp trung tâm đã xuất bếp; không ghi thay mốc xuất bếp, ra món hoặc xác nhận của BGH.
- Nhân viên ra món: cập nhật tuần tự `PLATED` và `READY`; chỉ `READY` bắt buộc ảnh thực tế; không sửa thực đơn hoặc xác nhận thay BGH.
- Ban Giám hiệu: duyệt thực đơn và xác nhận các mốc đã được vai trò tác nghiệp báo cáo; không trực tiếp tạo mốc xuất bếp/đến trường/ra món.
- Trang tổng quan có CTA dẫn thẳng tới tiến trình: nhóm bếp/tiếp nhận/ra món thấy **Cập nhật tiến trình suất ăn**; BGH thấy **Xem & xác nhận tiến trình**; Phòng VH–XH thấy **Xem tiến trình suất ăn**. Phụ huynh không có CTA tác nghiệp.
- QR từng suất bếp trung tâm: phát hành đúng một token opaque cho mỗi suất, in nhãn QR, thu hồi/cấp lại có lịch sử và mở trang truy xuất public allowlist. Mốc xuất bếp bị chặn nếu số QR hoạt động không khớp số suất thực xuất. Toàn bộ vẫn là dữ liệu DEMO cục bộ.
- Bếp nấu tại trường: trong **Thực đơn & bữa ăn**, quản lý danh mục bếp `ON_SITE` của đúng trường và lập bản nháp thực đơn ngày/tuần; ghi nhận ra món/sẵn sàng và phiếu nhập/xuất vẫn thực hiện ở đúng khu vực tác nghiệp.
- Thực đơn & bữa ăn: BGH quản lý được cả hai mô hình; quản lý bếp trung tâm chỉ thao tác `CENTRAL_KITCHEN`, bếp tại trường chỉ thao tác `ON_SITE`. Danh mục bếp lưu mã, tên, người phụ trách, công suất, trạng thái và trường được gắn. Thực đơn lưu mô hình phục vụ, bếp chuẩn bị, trạng thái `DRAFT` và `version`; nút **Lên thực đơn ngày** áp dụng một ngày, **Lên thực đơn tuần** tạo mẫu cho bảy ngày rồi cho phép chỉnh từng ngày. Phòng VH–XH và các vai trò không có quyền tiếp tục chỉ đọc.
- Nguồn gốc và Giám sát (mọi vai trò liên quan): dùng chung component hiển thị với bản phụ huynh để trạng thái công khai không bị lệch. BGH/bếp có dải giải thích quyền và liên kết sang khu vực tác nghiệp; Phòng VH–XH chỉ đọc theo trường trong địa bàn. Ảnh chờ duyệt, bản scan và chứng từ nội bộ không xuất hiện trong phần dùng chung.
- Phòng VH–XH: giám sát thực đơn và tiến trình bữa ăn theo từng trường trong địa bàn, đối chiếu trạng thái, xem xuất–nhập–tồn và tải CSV minh họa; không có quyền sửa thực đơn, số suất hoặc định lượng.
- Quản lý nhà cung cấp: 6 bản ghi seed DEMO, KPI công nợ, tìm kiếm/lọc, phân trang, export CSV và CRUD lưu localStorage. BGH/bếp được thao tác; Phòng VH–XH chỉ đọc.
- Quản lý kho: 7 tab Tổng quan, Tồn kho, Nhập kho, Xuất kho, Chuyển kho, Lô hàng/Serial và Truy xuất nguồn gốc; gồm 31 mặt hàng, 16 lô, KPI/cảnh báo/biểu đồ, form chứng từ và lịch sử DEMO. Đây là module mới, không thay thế màn `Xuất nhập tồn` nghiệp vụ đã có.
- Chi tiết tồn kho (bảng Tồn kho → Chi tiết): 5 tab Theo kho, Theo lô / hạn dùng, Lịch sử nhập xuất, Điều chỉnh, Truy xuất nguồn gốc. Tồn khả dụng = tồn thực tế − tồn lô hết hạn − giữ chỗ hợp lệ (không âm); lịch sử chỉ lấy từ phiếu nhập/xuất/chuyển DEMO đã hoàn thành; điều chỉnh chỉ từ phiếu "Nhập điều chỉnh"/"Xuất điều chỉnh"; truy xuất theo mã lô, thiếu liên kết thì ghi "Chưa có dữ liệu liên kết". Quy tắc tính nằm ở `packages/domain/stock-detail.ts`.
- Dữ liệu lưu trong localStorage trên cùng trình duyệt. Không nhập dữ liệu cá nhân hoặc hồ sơ thật. Xóa dữ liệu trình duyệt sẽ mất bản nháp.
- Các phân hệ quản trị, form phản ánh, thực đơn tuần, gallery và trang truy xuất QR được tải theo nhu cầu; bundle chính hiện khoảng 387 KB trước gzip.
- Ảnh mốc Sẵn sàng phục vụ: phụ huynh chỉ thấy sau khi BGH xác nhận; BGH, bếp tại trường, nhân viên ra món/tiếp nhận (đúng trường), bếp trung tâm (đúng bếp) và Phòng VH–XH (đúng địa bàn) thấy ngay tại Giám sát với nhãn "Chờ BGH xác nhận, chưa công khai cho phụ huynh" (quy tắc `canViewUnconfirmedMealPhotos` trong `packages/domain/policy.ts`). Ảnh lớn ở thẻ bữa ăn vẫn chỉ dùng ảnh đã xác nhận.
- Ảnh tại mốc Sẵn sàng phục vụ giới hạn 4 ảnh, mỗi ảnh 1 MB. Các mốc trước không nhận ảnh. Chọn giấy tờ chỉ lưu tên file, không lưu/tải tài liệu.

## Cấu trúc

`src/App.tsx`: shell, giao diện phụ huynh, dialog, bộ chọn vai trò.
`src/Admin.tsx`: các chế độ xem tác nghiệp minh họa (lazy loaded).
`src/StudentManagement.tsx`, `src/StudentManagement.css`: giao diện quản lý học sinh dành riêng cho BGH (DEMO localStorage).
`src/lib/data.ts`: nguồn dữ liệu trình duyệt, không gọi HTTP API.
`src/lib/store.ts`: Zustand cho trường/ngày/vai trò giao diện.
`src/BoardingMenuManager.tsx`, `src/lib/boardingMenu.ts`: danh mục bếp trung tâm/bếp tại trường, phân phạm vi vai trò và thực đơn ngày/tuần DEMO có version.
`src/BoardingMenuManager.tsx`, `src/lib/dates.ts`: bảng thực đơn ngày × bữa dùng thống nhất cho các vai trò. BGH/quản lý bếp thao tác theo scope; vai trò tác nghiệp liên quan và phụ huynh dùng chế độ chỉ đọc, trong đó bản phụ huynh chỉ nhận dữ liệu công khai.
`src/PortionQrPanel.tsx`, `src/PortionTracePage.tsx`, `src/lib/portionQr.ts`: vertical slice QR riêng từng suất ăn.
`src/SupplierManagement.tsx`, `src/lib/suppliers.ts`: danh sách và CRUD nhà cung cấp DEMO.
`src/WarehouseManagement.tsx`, `src/WarehouseManagement.css`: dashboard và 7 phân hệ quản lý kho DEMO.
`src/index.css`, `src/App.css`, `src/Admin.css`: tokens và giao diện responsive/dark mode.
`packages/domain`: logic quy trình thuần TypeScript và kiểm thử; không phải backend.
`tests`: kiểm thử trình duyệt và axe.
`docs/screenshots`: ảnh chụp QA.
`docs/PORTION_QR.md`: ERD, migration PostgreSQL và API đích cho QR từng suất.

Ảnh minh họa thực phẩm: Unsplash, https://images.unsplash.com/photo-1547592180-85f173990554, lưu tại `public/meal-demo.jpg`. Không phải ảnh báo cáo thực tế.

Ảnh `public/meal-ready-demo.webp` do người dùng cung cấp, được tối ưu thành asset web và chỉ gắn với mốc `READY` trong dữ liệu DEMO. Ảnh không phải kết luận an toàn thực phẩm.

## Giới hạn

Quyền giao diện chỉ dùng mô phỏng. Không cung cấp bảo mật dữ liệu, xác minh giấy phép, chữ ký chính thức, upload server, QR truy xuất thật, thông báo Zalo hoặc quy trình vận hành production. Không triển khai hosting/production. Chưa kiểm thử trong runtime Zalo thực tế.
