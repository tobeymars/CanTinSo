# API mapping — KIDO ADMIN MBH

Nguồn: các file `src/api/*` của repo tham chiếu commit `1e81db4…`. Tất cả endpoint dưới đây là `SOURCE_CONFIRMED` từ source, chưa được gọi vào backend production/staging trong đợt audit.

## HTTP client và phiên

- Base URL: `VITE_API_URL`, fallback `http://localhost:3002`.
- Auth header: Bearer token đọc từ `localStorage`; route demo bán trú có token `sessionStorage` riêng.
- Request interceptor loại chuỗi rỗng, `null`, `undefined` khỏi params/body.
- Response interceptor cố chuẩn hóa payload phân trang và gắn metadata không enumerable lên array.
- Không có refresh token flow hoặc response interceptor xử lý 401/403 được xác nhận.
- Không có runtime response schema validation.

## Authentication, user, branch

| Method | Endpoint | Service method |
|---|---|---|
| POST | `/auth/login/admin` | `authApi.login` |
| GET | `/users/me` | `userApi.getMe` |
| PUT | `/users/me` | `userApi.updateProfile` |
| GET | `/branches` | `branchApi.getAll` |
| GET | `/branches/:id` | `branchApi.getById` |

Logout chỉ xóa session ở client; chưa thấy endpoint revoke/logout.

## Dashboard và báo cáo

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/dashboard/revenue` | KPI doanh thu |
| GET | `/dashboard/customers` | KPI khách hàng |
| GET | `/dashboard/recent-activities` | Hoạt động gần đây |
| GET | `/dashboard/employee-attendance` | Tổng quan nhân viên |
| GET | `/dashboard/revenue/hourly` | Doanh thu theo giờ |
| GET | `/dashboard/customers/hourly` | Khách theo giờ |
| GET | `/reports/menu-performance` | Hiệu quả món/nhóm |
| GET | `/reports/cancellations` | Đơn/món hủy |
| GET | `/reports/revenue` | Doanh thu |
| GET | `/reports/revenue/daily` | Doanh thu theo ngày |
| GET | `/reports/customer` | Báo cáo khách hàng |
| GET | `/reports/top-products` | Top sản phẩm |
| GET | `/reports/bottom-products` | Sản phẩm thấp |
| GET | `/reports/end-of-day` | Cuối ngày |
| GET | `/reports/inventory` | Tồn kho báo cáo |
| GET | `/reports/shifts/:shiftId/summary` | Tổng hợp ca |
| GET | `/reports/monthly-order-plan` | Kế hoạch đơn tháng |
| GET | `/reports/employee` | Báo cáo nhân viên |
| GET | `/reports/meal-items` | Báo cáo bán trú |

## Hàng hóa, nhóm, đơn vị và công thức

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/products`, `/products/full`, `/products/:id` | Danh sách/chi tiết |
| POST/PUT/DELETE | `/products`, `/products/:id` | CRUD sản phẩm |
| PUT | `/products/bulk/update` | Cập nhật hàng loạt |
| POST | `/upload/images` | Tải ảnh |
| GET/POST/PUT/DELETE | `/categories`, `/categories/:id` | CRUD nhóm hàng |
| GET | `/kitchen/units` | Đơn vị đo |
| GET/POST | `/kitchen/recipes` | Danh sách/tạo công thức |
| POST | `/kitchen/recipes/:id/:action` | Review công thức |
| POST | `/kitchen/notifications/:id/read` | Đọc thông báo |
| GET | `/kitchen/notifications` | Danh sách thông báo |

Endpoint request recipe được dựng động trong `kitchenRecipeApi`; cần xác nhận payload/action với backend trước khi refactor.

## Nhà cung cấp, khách hàng và ví

| Method | Endpoint | Mục đích |
|---|---|---|
| GET/POST | `/suppliers` | Danh sách/tạo supplier |
| GET/PUT/DELETE | `/suppliers/:id` | Chi tiết/sửa/xóa |
| GET | `/suppliers/:id/debts` | Công nợ supplier |
| POST | `/customers/generate-code` | Sinh mã khách |
| GET/POST | `/customers` | Danh sách/tạo khách |
| GET | `/customers/search` | Tìm khách |
| GET/PUT | `/customers/:id` | Chi tiết/sửa |
| GET | `/wallet-transactions` | Lịch sử ví |
| POST | `/wallets/customer-debt/clearance` | Xử lý công nợ ví |

## Đơn hàng và truy xuất sản xuất

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/orders`, `/orders/:id` | Danh sách/chi tiết |
| PUT | `/orders/:id/pending` | Chuyển pending |
| PUT | `/orders/:id/ready-to-pickup` | Sẵn sàng nhận |
| PUT | `/orders/:id/done` | Hoàn tất |
| PUT | `/orders/:id/received` | Xác nhận đã nhận |
| PUT | `/orders/:id/cancel` | Hủy kèm lý do |
| POST | `/orders/:id/receive-cash` | Thu tiền mặt |
| DELETE | `/orders/:id` | Xóa đơn |
| GET | `/orders/:id/status-logs` | Lịch sử trạng thái |
| GET | Production trace endpoints | Đơn → mẻ → nhãn/serial/lô nguyên liệu; đường dẫn được dựng trong `productionTraceApi` |

State transition hợp lệ phải lấy từ backend; không suy diễn thêm trong frontend.

## Bán trú

| Method | Endpoint | Mục đích |
|---|---|---|
| GET/POST | `/meal-items` | Lịch/tạo lựa chọn món |
| GET/PUT/DELETE | `/meal-items/:id` | Chi tiết/sửa/xóa |
| GET/POST/PUT | Product endpoints | Chọn món mẫu hoặc tạo/cập nhật product kèm ảnh |

`BoardingOrderAdmin` hiện phối hợp nhiều mutation product/meal item theo tuần. Cần transaction/idempotency phía backend hoặc chiến lược rollback; source frontend chưa đảm bảo atomicity.

## Nhân sự và lịch làm việc

| Method | Endpoint | Mục đích |
|---|---|---|
| GET/POST | `/employees` | Danh sách/tạo nhân viên |
| GET/PUT/DELETE | `/employees/:id` | Chi tiết/sửa/xóa |
| GET | `/work-schedules/timesheet` | Lịch theo khoảng ngày |
| GET | `/work-schedules/monthly` | Lịch tháng |
| GET/PUT/DELETE | `/work-schedules/:id` | Chi tiết/sửa/xóa ca |
| POST | `/work-schedules` | Tạo ca |
| POST | `/work-schedules/weekly-repeat` | Tạo lặp tuần |
| GET/POST | `/payrolls` | Danh sách/tạo bảng lương |
| GET/PUT/DELETE | `/payrolls/:id` | Chi tiết/sửa/xóa |

Không có attendance/time-keeping API trong source; màn chấm công hiện là `MOCK`.

## Kho, lô, serial và chuyển kho

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/warehouse/:path` | Adapter nhiều dashboard/detail kho |
| GET | `/kitchen/staff-overview` | Thiếu nguyên liệu bếp |
| GET/POST/PUT/DELETE | `/inventory-items`, `/inventory-items/:id` | CRUD item kho |
| GET/POST | `/stock-vouchers` | Danh sách/tạo phiếu nhập/xuất/chuyển |
| POST | `/stock-vouchers/sales` | Phiếu xuất bán |
| GET | `/stock-lots` | Danh sách lô |
| GET | `/stock-lots/fefo` | Gợi ý FEFO |
| GET | `/stock-lots/opening-preview` | Preview mở theo dõi lô |
| POST | `/stock-lots/opening` | Khởi tạo theo dõi lô |
| GET | `/production-trace/lookup` | Truy xuất lô/serial |
| GET/POST | `/warehouse/serials/lots/:lotId/registration` | Đọc/đăng ký serial |
| GET/POST | `/stock-transfers`, `/stock-transfers/:id` | Danh sách/chi tiết/chuyển |
| POST | `/stock-transfers/:id/complete` | Hoàn tất chuyển |
| GET/POST | `/stock-takes`, `/stock-takes/drafts` | Danh sách/tạo draft kiểm kê |
| GET | `/stock-takes/:id` | Chi tiết kiểm kê |
| PUT | `/stock-takes/:id/items` | Cập nhật item |
| POST | `/stock-takes/:id/complete` | Hoàn tất kiểm kê |

`stockInApi` và `stockOutApi` có fallback fixture cho chi tiết không lấy được từ API. Phải bỏ sự pha trộn này ở production adapter hoặc hiển thị nhãn MOCK rõ ràng.

## Tài chính

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/finance/money-vouchers` | Danh sách phiếu |
| GET | `/finance/summary` | Tổng hợp |
| GET/POST | `/finance/funds` | Danh sách/tạo quỹ |
| POST | `/finance/receipts` | Tạo phiếu thu |
| POST | `/finance/payments` | Tạo phiếu chi |
| GET | `/finance/receipts/received` | Phiếu đã thu |
| GET | `/finance/receipts/paid` | Phiếu đã chi |
| GET | `/finance/details` | Chi tiết tài chính |

## Yêu cầu trước tích hợp

1. Cung cấp OpenAPI hoặc response fixtures đã redacted từ staging.
2. Xác nhận auth/session/refresh/401/403 và role claims.
3. Xác nhận pagination chuẩn thay vì gắn metadata lên array.
4. Phân loại filter/sort client-side và server-side cho từng endpoint.
5. Thêm AbortSignal hoặc request identity cho mọi filter query.
6. Dùng schema validation ở adapter boundary.
7. Tách `productionApi` và `mockApi`; không fallback im lặng.
8. Viết contract test cho mutation tài chính, order state và kho trước khi redesign luồng.

