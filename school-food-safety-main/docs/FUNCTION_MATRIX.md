# Function matrix — KIDO ADMIN MBH

Ma trận này phản ánh mã nguồn tham chiếu, không khẳng định hành vi production.

## Ma trận phân hệ

| Phân hệ | Read/filter | Create | Update/state | Delete | Export/print | API/data | Trạng thái |
|---|---|---|---|---|---|---|---|
| Đăng nhập | — | Login | Phiên cục bộ | Logout | — | `authApi` | SOURCE_CONFIRMED |
| Tổng quan | KPI, biểu đồ, hoạt động | — | Refresh/filter thời gian | — | — | dashboard/report API | SOURCE_CONFIRMED |
| Hàng hóa | Search, category/status | Sản phẩm, nhóm, ảnh | Sản phẩm, bulk, công thức | Có | Chưa xác nhận | product/kitchen recipe API | SOURCE_CONFIRMED |
| Thiết lập giá | Search/category | — | Giá từng dòng/bulk | — | — | product API | SOURCE_CONFIRMED |
| Nhà cung cấp | Search/status/time/debt | Có | Có | Có | Nút export/import cần xác minh | supplier API | INCOMPLETE |
| Khách hàng | Search/pagination/detail | Có | Có | Không thấy | UI export cần xác minh | customer API | SOURCE_CONFIRMED |
| Ví thành viên | Search/type/pagination | — | Clearance công nợ | — | Chưa xác nhận | wallet API | SOURCE_CONFIRMED |
| Đơn hàng | Search/status/time/payment/detail/log | — | pending/ready/done/received/cancel/receive cash | Có API delete | Chưa xác nhận | order API | SOURCE_CONFIRMED |
| Bán trú | Khối/năm/tháng/tuần | Meal option/product | Update option/product | Có | — | meal item/product API | SOURCE_CONFIRMED |
| Nhân viên | Search/status/detail | Có | Có | Có | Chưa xác nhận | employee API | SOURCE_CONFIRMED |
| Lịch làm việc | Nhân viên/kỳ | Ca và lặp tuần | Có | Có | — | work schedule API | SOURCE_CONFIRMED |
| Chấm công | Ngày/tuần/tháng/search | — | Không | — | — | Hardcode trong component | MOCK |
| Bảng lương | Search/status/kỳ/detail | Có | Có | Có | Chưa xác nhận | payroll API | SOURCE_CONFIRMED |
| Thu chi | Phiếu/tổng hợp/quỹ | Quỹ, thu, chi | Chưa đủ bằng chứng | — | Chưa đủ bằng chứng | finance API + một số source fixture | INCOMPLETE |
| Tổng quan kho | KPI, chart, cảnh báo | Quick material import | Refresh/filter | — | — | warehouse API | SOURCE_CONFIRMED |
| Tồn kho | Search/filter/detail/movement | — | — | — | Excel | warehouse API | SOURCE_CONFIRMED |
| Lô/serial | Filter/detail/trace | Opening/register serial | — | — | QR label | stock lot/warehouse API | SOURCE_CONFIRMED |
| Nhập kho | List/detail/filter | Phiếu nhập | — | — | — | stock voucher API + fallback fixture | MOCK/INCOMPLETE |
| Xuất kho/bán | List/detail/filter | Phiếu xuất/bán | — | — | — | stock voucher API + fallback fixture | MOCK/INCOMPLETE |
| Chuyển kho | List/detail/filter | Phiếu chuyển | Complete | — | — | transfer/voucher API | SOURCE_CONFIRMED |
| Báo cáo cuối ngày | Date/range/view | — | Filter/zoom/fullscreen | — | Excel/print/PDF | report API | SOURCE_CONFIRMED |
| Báo cáo hàng hóa | Branch/time/category/type/interest | — | Filter/view/zoom | — | Excel/print | report API | SOURCE_CONFIRMED |
| Báo cáo nhân viên | Employee/time/view/interest | — | Filter/zoom/fullscreen | — | Excel/print | report API | SOURCE_CONFIRMED |
| Báo cáo bán trú | Branch/level/meal/time | — | Filter/view/zoom | — | Excel/print | report API | SOURCE_CONFIRMED |
| Tài khoản | Profile | — | Update profile/password fields | — | — | user API | SOURCE_CONFIRMED |
| Gian hàng | Thông tin tĩnh | — | Không | — | — | Hardcode | MOCK/INCOMPLETE |

## Action nhạy cảm cần xác nhận quyền backend

| Action | Endpoint/source | Frontend guard hiện có | Kết luận |
|---|---|---|---|
| Xóa sản phẩm | `DELETE /products/:id` | Chưa thấy policy tập trung | UNKNOWN |
| Bulk update sản phẩm | `PUT /products/bulk/update` | Chưa thấy policy tập trung | UNKNOWN |
| Duyệt/từ chối công thức | `POST /kitchen/recipes/:id/:action` | UI theo context, chưa có permission matrix | UNKNOWN |
| Xóa supplier | `DELETE /suppliers/:id` | UI có multi-delete | UNKNOWN |
| Điều chỉnh công nợ ví | `POST /wallets/customer-debt/clearance` | Chưa xác minh role | UNKNOWN |
| Hủy đơn/thu tiền mặt | order endpoints | Confirm UI cần audit chi tiết | UNKNOWN |
| Xóa nhân viên | `DELETE /employees/:id` | Chưa xác minh trạng thái/role | UNKNOWN |
| Tạo/sửa/xóa payroll | payroll endpoints | Chưa xác minh rule trạng thái | UNKNOWN |
| Tạo/complete chuyển kho | transfer endpoints | UI có save/complete | UNKNOWN |
| Complete kiểm kê | `POST /stock-takes/:id/complete` | Page route hiện redirect | INCOMPLETE |
| Tạo phiếu thu/chi | finance endpoints | Có validation cục bộ | UNKNOWN |

## Matrix vai trò

Mã nguồn lưu `role` từ login nhưng không cung cấp danh mục permission hoặc guard route/action trung tâm. Vì vậy không thể điền ma trận role × action đáng tin cậy.

| Resource/action | Admin | Quản lý | Thu ngân | Bếp | Kho | Trạng thái |
|---|---:|---:|---:|---:|---:|---|
| Xem dashboard | ? | ? | ? | ? | ? | UNKNOWN |
| Sửa giá | ? | ? | ? | ? | ? | UNKNOWN |
| Chuyển trạng thái đơn | ? | ? | ? | ? | ? | UNKNOWN |
| Thu tiền mặt | ? | ? | ? | ? | ? | UNKNOWN |
| Nhập/xuất/chuyển kho | ? | ? | ? | ? | ? | UNKNOWN |
| Duyệt công thức | ? | ? | ? | ? | ? | UNKNOWN |
| Quản lý nhân viên/lương | ? | ? | ? | ? | ? | UNKNOWN |
| Xuất báo cáo | ? | ? | ? | ? | ? | UNKNOWN |

Yêu cầu trước triển khai: lấy permission contract từ backend hoặc product owner. Ẩn nút ở frontend không thay thế authorization phía server.

## Các luồng cần E2E ưu tiên

1. Login thành công/thất bại/hết hạn và redirect.
2. Navigation desktop/tablet/mobile, direct URL, 404/403.
3. Product create/edit/image/category/recipe và cảnh báo giá vốn.
4. Order status state machine, cancel reason, cash receipt và status log.
5. Boarding 7 ngày, giới hạn 3 món, apply day/week, rollback khi mutation lỗi.
6. Stock-in với lô/hạn/serial/unit conversion; stock-out với FEFO và tồn khả dụng.
7. Transfer draft/complete, chặn cùng kho nguồn-đích và số lượng không hợp lệ.
8. Employee/work schedule conflict và payroll permissions.
9. Report filter → chart/table → export/print đồng nhất.
10. Không trộn fixture với response API thật và không thay đổi production data trong test.

