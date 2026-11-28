# Workspace Bếp tại trường (nhân viên tiếp nhận) — dữ liệu thực

Phạm vi: tài khoản đăng nhập role `SCHOOL_KITCHEN` **không có `kitchenId`** nhưng có `schoolId`. Đây là nhân viên tiếp nhận và phục vụ tại trường do bếp trung tâm cung cấp, **không phải chủ bếp trung tâm**.

## Vấn đề trước đây

App lấy danh sách trường từ `demoData.schools()` khi `SCHOOL_KITCHEN` không có `kitchenId`; dữ liệu ngày, thực đơn và tổng quan từ `demoData.day()`, trong khi API giám sát kiểm tra `schoolId` UUID thật. Kết quả là nhân viên không thấy đúng bữa đã được bếp trung tâm báo cáo.

## Nguồn dữ liệu mới

- `GET /api/v1/schools/me`: chỉ `SCHOOL_ADMIN` và `SCHOOL_KITCHEN`, lấy **duy nhất** trường từ `schoolId` trong JWT; không nhận `schoolId` từ client để chọn trường khác.
- `GET /api/v1/users/my-kitchen`: cho phép `SCHOOL_KITCHEN` không có `kitchenId` xem thông tin bếp trung tâm đã phân công cho trường; quyền quản trị bếp không phát sinh.
- `GET /api/v1/supervision/:schoolId/:date/:mealType/context`: lấy thực đơn **APPROVED** từng bữa, số suất, món và bếp theo đúng trường/ngày/bữa; đọc các bữa sáng, trưa, xế.
- `GET /api/v1/supervision/:schoolId/:date/:mealType`: lấy các mốc vận hành và BGH xác nhận thực tế.
- `POST /api/v1/supervision/:schoolId/:date/:mealType/actions`: chỉ cho nhân viên tại trường báo cáo `ARRIVED`, `PLATED`, `READY` trong luồng bếp trung tâm; `READY` bắt buộc ảnh. Backend vẫn kiểm soát vai trò, ngày và thứ tự. Nhân viên không xác nhận thay BGH.

## Giao diện

- **Tổng quan** (/): bữa sáng, trưa, xế và thực đơn đã duyệt; tình trạng bếp phục vụ. Không có số suất/món demo.
- **Thực đơn & bữa ăn** (/thuc-don): chỉ xem thực đơn thực tế của trường được gán, lọc theo ngày/bữa.
- **Giám sát & an toàn** (/giam-sat): báo cáo `Đến trường → Ra món → Sẵn sàng phục vụ` sau khi bếp trung tâm đã báo cáo Xuất bếp; BGH xác nhận bằng workspace BGH. Có ảnh thực tế, lý do ghi bổ sung ngày quá khứ và hiển thị trạng thái đã xác nhận.
- Các đường dẫn demo cũ khác được ẩn và chuyển về Tổng quan khi nhân viên tiếp nhận truy cập trực tiếp. Nhân viên không có quyền sửa công thức món, kho bếp Long Hoa, quyết định BGH.

## Kiểm thử

1. Đăng nhập `bep.test2@cantinso.local` hoặc `bep.test@cantinso.local`; cả hai phải có `schoolId` thuộc TH Phạm Hùng, `kitchenId` trống. Không thấy trường demo.
2. Tổng quan chỉ hiển thị món/suất từ thực đơn APPROVED; khi chưa có thực đơn phải báo trống, **không giả lập**.
3. Trong Giám sát, chọn 23/11/2026 – Bữa sáng. Mốc Xuất bếp do Bếp Long Hoa báo cáo/ BGH đã xác nhận phải hiển thị trạng thái thật. Bếp tại trường cập nhật Đến trường, BGH xác nhận; tương tự với Ra món và Sẵn sàng phục vụ, có ảnh.
4. Tài khoản Bếp tại trường không thể nhập dữ liệu cho trường UUID khác; backend phải trả 403.
5. Trường không có bếp được phân công: hiển thị thiếu cấu hình, không cho báo cáo với mô hình bếp giả định.
6. Ngày mai chỉ xem; ngày đã qua bổ sung có lý do bắt buộc.
7. Tài khoản BGH và Bếp Long Hoa giữ nguyên luồng quản lý và dữ liệu đang hoạt động.

## Giới hạn giai đoạn này

Đây là workspace **nhân viên tiếp nhận tại trường thuộc tuyến bếp trung tâm**, không phải thiết kế lại toàn bộ vai trò bếp nấu tại chỗ (SCHOOL_KITCHEN có `kitchenId`). Chưa có biên bản giao nhận chi tiết nhiều xe/chuyến, chứng từ vận chuyển riêng hoặc xác nhận kiểm tra thực phẩm theo từng chuyến; mốc vận hành là báo cáo và nhật ký hệ thống, không thay thế biên bản pháp lý.

Không có thay đổi Prisma schema hoặc migration.
