# CanTinSo — Quy trình Giám sát & an toàn theo ngày và điều chỉnh sau duyệt

## Đối tượng và phạm vi

- Mỗi hồ sơ là duy nhất theo **trường + ngày phục vụ + bữa** (BREAKFAST / LUNCH / SNACK).
- Bếp báo cáo kiểm thực/lưu mẫu và mốc vận hành. BGH xác nhận. UBND chỉ giám sát trong phạm vi được phân quyền.
- Hồ sơ từ ngày trước và ngày tương lai **được xem** bình thường nếu tài khoản có quyền.
- Mốc ngày so sánh dùng **Asia/Ho_Chi_Minh** ở backend. Đồng hồ trình duyệt chỉ để thông báo; quyền thực sự do API kiểm tra.

## Quy tắc bắt buộc

| Ngày phục vụ | Quyền xem | Ghi nhận kiểm thực, mốc vận hành, xác nhận |
| --- | --- | --- |
| Ngày hiện tại (giờ VN) | Có | Có, theo đúng vai trò và trạng thái |
| Ngày đã qua | Có | Có, **bắt buộc `lateReason` 10–1000 ký tự**; lưu người, giờ thực tế và lý do |
| Ngày tương lai | Có | **Không**; API trả 403 kể cả gửi trực tiếp, không phụ thuộc nút ẩn trên trình duyệt |
| Bữa đã BGH xác nhận tổng thể | Có | Khóa báo cáo và xác nhận trực tiếp; BGH phải **mở điều chỉnh từng mục** |

Khi BGH mở điều chỉnh một kiểm thực đã xác nhận, API `check_reopen` đổi trạng thái thành `revision_requested`, ghi thêm sự kiện `reopen` vào lịch sử. Bếp mới có thể báo cáo lại; BGH xác nhận nội dung mới.

Khi BGH mở điều chỉnh một mốc đã xác nhận, API `stage_reopen` chuyển mốc thành `revisionRequested`, giữ lịch sử cũ. Bếp phải báo cáo lại trước khi BGH xác nhận mốc; không được bỏ qua báo cáo mới.

Sau khi mở điều chỉnh, **xác nhận tổng thể cũ trở thành không còn hiện hành**, nhưng vẫn hiển thị trong lịch sử. BGH cần xác nhận lại tổng thể sau khi tất cả mục và mốc đã xác nhận.

## API

- `POST /api/v1/supervision/:schoolId/:date/:mealType/actions`
- Action hiện có: `check_report`, `check_confirm`, `check_revision`, `stage_report`, `stage_confirm`, `meal_confirm`
- Action mới: `check_reopen`, `stage_reopen` (chỉ BGH, trên mục/mốc đã xác nhận)
- Payload chung: `{ action, itemId, note, lateReason? }`. Với ngày đã qua, `lateReason` bắt buộc.
- Dữ liệu lưu trong `SupervisionMeal.checks/stages/approvals` và nhật ký `SupervisionEvent`; không cần migration mới.

## Nghiệm thu khuyến nghị

1. Kiểm thử ngày hiện tại: bếp báo cáo bước 1, BGH xác nhận, bếp cập nhật mốc; không yêu cầu `lateReason`.
2. Chọn ngày mai: nút cập nhật/xác nhận không hiện; gọi API trực tiếp cũng bị 403.
3. Chọn ngày hôm qua: nhập báo cáo hoặc xác nhận không có lý do => API 400; nhập ít nhất 10 ký tự => lưu và hiện trong lịch sử.
4. Hoàn thành đủ 4 mục kiểm thực/lưu mẫu và các mốc, BGH xác nhận tổng thể.
5. Thử báo cáo tiếp khi xác nhận tổng thể còn hiệu lực => 409; BGH chọn **Mở điều chỉnh** cho đúng mục => trạng thái tổng thể không còn hiện hành.
6. Bếp báo cáo lại mục được mở; BGH xác nhận; BGH xác nhận tổng thể lần hai; cả hai lần xác nhận phải còn trong lịch sử.
7. Thử **Mở điều chỉnh** mốc READY: bếp phải gửi báo cáo mới và ảnh thực tế mới, BGH không thể xác nhận lại khi chưa báo cáo.
8. BGH chỉ được sửa đúng trường của mình, bếp chỉ được báo cáo trường được phân công; UBND không được thay đổi dữ liệu.

## Kiểm tra kỹ thuật

Chạy `powershell -ExecutionPolicy Bypass -File .\check-supply-build.ps1` tại gốc repo. Script bao gồm test `npm run test:supervision-dates`, Prisma, Nest và frontend build. Không có migration đi kèm tính năng này.
