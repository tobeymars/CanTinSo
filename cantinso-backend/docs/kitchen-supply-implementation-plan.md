# CanTinSo — Kế hoạch triển khai chuỗi Nhà cung cấp → Kho bếp → Kiểm thực bước 1

## Nguyên tắc nghiệp vụ đã chốt

- Bếp trung tâm sở hữu kho riêng theo `kitchenId`; có thể cấp nguyên liệu cho nhiều trường được phân công.
- Mỗi trường vẫn có thực đơn, ngày/bữa và hồ sơ kiểm thực riêng. Không nhân bản kho theo `schoolId`.
- Dữ liệu nhà cung cấp và lô thực chỉ được ghi vào PostgreSQL. DEMO localStorage tách riêng.
- Chỉ người thuộc bếp được phân quyền mới được tạo/sửa hồ sơ nhà cung cấp, nhập/xuất kho. BGH/UBND chỉ xem theo phạm vi.
- Xuất lô bắt buộc gắn trường được phân công, ngày phục vụ, loại bữa; bước kiểm thực 1 chỉ thấy các lô được cấp đúng bữa đó.
- Nhật ký nhập, xuất là bất biến; xuất trừ tồn theo thao tác nguyên tử, cấm xuất vượt tồn hoặc lô không hợp lệ.
- Dữ liệu cũ `schoolId` chưa xác định chắc chắn nguồn bếp **không tự động backfill**; đợi kiểm tra rồi mới chuyển.

## Giai đoạn 1 — Nền tảng (đã viết mã, chờ build + nghiệm thu)

1. Prisma: thêm `kitchenId` nullable và quan hệ bếp cho Supplier/InventoryLot; giữ bản ghi cũ; enum `ISSUED`.
2. Migration expand-only `20261121100000_kitchen_inventory_ownership`. Cần chạy `prisma validate`, `generate`, `migrate deploy`.
3. NestJS `/supply`: danh sách bếp/trường/nguyên liệu, CRUD cơ bản nhà cung cấp, danh sách lô, nhập, xuất, lịch sử.
4. Frontend tài khoản thật: giao diện thao tác với PostgreSQL theo bếp; DEMO không thay đổi.
5. Giám sát bước 1: chỉ đọc/sử dụng lô có sự kiện `ISSUED` đúng trường–ngày–bữa.

## Giai đoạn 2 — Bổ sung trước nghiệm thu vận hành

- Cập nhật/khóa nhà cung cấp đã ngừng hoạt động và quản lý hồ sơ minh chứng/đính kèm.
- Quy trình kiểm đếm, phân loại lô, cách ly/hủy hàng, trả nhà cung cấp.
- Nhập/xuất phiếu nhiều dòng, mã chứng từ, chỉnh sửa phiếu nháp; không được sửa số liệu sau khi xác nhận mà không ghi bút toán điều chỉnh.
- Chuyển kho giữa bếp, nếu được phê duyệt; tồn kho theo từng thời điểm và quy đổi đơn vị chuẩn.
- Kiểm tra chứng từ nguồn gốc và thông tin nhận hàng trước khi BGH xác nhận.
- Phân quyền/kiểm thử phạm vi đa phường, hiệu năng số lượng lớn và chuyển dữ liệu lịch sử có xác minh.

## Kiểm thử tối thiểu theo thứ tự

1. Bếp Long Hoa đăng nhập: thấy duy nhất kho bếp của mình; BGH và UBND không có nút ghi.
2. Tạo nhà cung cấp thật; kiểm tra tải lại trang vẫn còn và cùng mã không được tạo trùng.
3. Mở Nhập kho, chọn nguyên liệu từ danh mục chung, nhập lô có hạn dùng, số lượng dương.
4. Mở Tồn & lô hàng: số tồn đúng; xuất một phần cho TH Phạm Hùng, đúng ngày và bữa sáng.
5. Kiểm tra tồn giảm và Nhật ký có sự kiện ISSUED, có ngữ cảnh trường/ngày/bữa.
6. Sang Giám sát & an toàn của đúng trường/ngày/bữa: bước 1 chọn được lô vừa xuất. Bữa khác không thấy lô ấy.
7. Đổi sang bếp khác: không đọc/sửa được dữ liệu Bếp Long Hoa (HTTP 403).
8. Thử xuất vượt tồn, lô hết hạn, mã nhà cung cấp trùng, trường không được phân công: phải bị chặn.
9. BGH xác nhận kiểm thực, UBND chỉ giám sát đọc; lịch sử không mất sau khi đăng nhập lại.

## Cổng nghiệm thu

- `npx prisma validate`, `npx prisma generate`, `npm run build` backend.
- `npm run build` frontend.
- Migration thành công trên PostgreSQL thử nghiệm và kiểm tra số lượng bản ghi cũ không đổi.
- Smoke test qua UI với một tài khoản Bếp Long Hoa, một BGH và một UBND.
- Chưa gọi là hoàn thiện toàn bộ phân hệ cho đến khi Giai đoạn 2 và các kiểm thử liên quan thành công.
