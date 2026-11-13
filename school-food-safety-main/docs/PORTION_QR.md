# QR truy xuất theo từng món ăn

## Quy tắc nghiệp vụ

- Phạm vi QR được xác định bởi `schoolId + kitchenId + serviceDate + mealType`.
- Giao diện hiện hỗ trợ riêng **bữa sáng** (`BREAKFAST`) và **bữa trưa** (`LUNCH`).
- Mỗi món trong thực đơn của một bữa có đúng một QR `ACTIVE`; một QR không được chứa nhiều món.
- QR chỉ chứa URL với token opaque ngẫu nhiên tối thiểu 128 bit. Không chứa tên/lớp/mã học sinh, số điện thoại, ID nội bộ hoặc URL file riêng tư.
- Trước mốc `DISPATCHED`, hệ thống kiểm tra tập món có QR khớp chính xác với tập món của thực đơn. Token và `dishName` phải duy nhất trong bữa.
- Thu hồi/cấp lại tạo audit event append-only; token cũ không bị sửa hoặc tái sử dụng.
- QR đầy đủ chỉ chứng minh khả năng truy xuất dữ liệu đã công khai của món, không phải kết luận món ăn “an toàn”.

## Mô hình dữ liệu đích

```text
MealService 1 ─── * MealItem
MealService 1 ─── * DishQrBatch
MealItem    1 ─── * QrPublicToken
QrPublicToken 1 ─── * DishQrEvent (append-only)

MealItem * ─── * ProductBatch (qua MealIngredientBatch)
```

`MealItem` liên kết một món với đúng bữa/ngày/trường. QR không liên kết học sinh.

Các trường tối thiểu của token: `mealServiceId`, `mealItemId`, `publicTokenHash`, `state`, `issuedAt`, `issuedBy`, `version`. Cần unique index bảo đảm chỉ một token `ACTIVE` cho mỗi `mealItemId`.

## API đích

| Endpoint | Quyền | Hành vi |
|---|---|---|
| `POST /api/v1/meal-services/:id/dish-qrs` | Bếp được gán | Phát hành đúng một QR cho mỗi món trong transaction, có `Idempotency-Key` |
| `GET /api/v1/meal-services/:id/dish-qrs` | Bếp, BGH trường nhận, cán bộ đúng địa bàn | Đối soát món đã có/chưa có QR |
| `POST /api/v1/dish-qrs/:id/revoke` | Bếp được gán | Bắt buộc lý do, append audit event |
| `POST /api/v1/meal-services/:id/dish-qrs/reissue` | Bếp được gán | Thu hồi lô cũ và cấp lại theo phiên bản thực đơn hiện hành |
| `POST /api/v1/meal-services/:id/events` (`DISPATCHED`) | Bếp được gán | Chặn nếu tập món và tập QR không khớp |
| `GET /api/public/v1/dish-trace/:publicToken` | Công khai, rate limit | Chỉ trả allowlist dữ liệu của đúng một món |

Response công khai gồm: trạng thái token, tên món, trường nhận, bếp nguồn, ngày/loại bữa, định lượng món, nguyên liệu/lô được duyệt, timeline công khai và cảnh báo thu hồi. Không trả PII, hóa đơn, file private hoặc ảnh chưa duyệt.

## Frontend DEMO hiện tại

- Lưu token trong `demo-dish-qr-v2`; dữ liệu QR từng suất cũ không được trộn vào mô hình mới.
- Seed DEMO phát hành QR theo từng món cho bữa sáng và bữa trưa của Tiểu học An Phú ngày 17/10/2026 khi mở màn giám sát tương ứng.
- Bếp trung tâm có thể phát hành, in, thu hồi và cấp lại. BGH và Phòng VH–XH chỉ đối soát.
- Trang **Giám sát & an toàn** có bộ chọn bữa sáng/bữa trưa; ảnh, timeline, thời gian, QR và dữ liệu truy xuất đổi theo bữa.
- Trang quét QR chỉ hiển thị món gắn với token, không hiển thị toàn bộ món khác trong bữa.

Đây vẫn là dữ liệu một trình duyệt. Production phải thay localStorage bằng API/database transaction và duy trì RBAC, kiểm soát scope, idempotency, audit append-only, rate limit cùng allowlist public response.
