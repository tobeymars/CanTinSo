# CanTinSo — Đối chiếu chức năng DEMO và dữ liệu thật

Mục tiêu: mỗi màn hình sản phẩm đã xuất hiện trong DEMO phải được đối chiếu trước khi thay thế bằng bản PostgreSQL. **Không coi phiên bản thật hoàn thành chỉ vì CRUD cơ bản hoạt động.**

## Nhà cung cấp

| DEMO đã có | Bản PostgreSQL hiện tại | Quy tắc |
|---|---|---|
| Dashboard tổng NCC / đang hoạt động | Có | Đếm dữ liệu thật theo bếp |
| Dashboard nợ cần trả, tổng mua | Có, mở rộng tổng mua / đã trả / còn nợ | Nợ tính từ phiếu nhập có giá trừ thanh toán chưa hủy |
| Bảng NCC, tìm kiếm, lọc còn nợ, phân trang | Có | Không tự coi lô chưa có giá là 0đ |
| Thêm, sửa, ngừng dùng NCC | Có | Ngừng dùng thay vì xóa bản ghi đã phát sinh giao dịch |
| Import danh sách NCC | Có, JSON danh tính/liên hệ | Không nhập nợ hoặc tổng mua DEMO |
| Export | Có, CSV NCC và đối chiếu công nợ | Không xuất tệp đính kèm tự động |
| Hồ sơ pháp lý, ngày cấp/hết hạn, tệp minh chứng | Có, PDF/JPG/PNG/WEBP <=2 MB | Chưa tự xác minh hiệu lực; chỉ nhà bếp được sửa |
| Chứng từ gắn phiếu nhập | Có | Tệp có thể liên kết đúng phiếu và NCC |
| Lịch sử thanh toán | Có | Hủy bút toán có lý do, không xóa dữ liệu |
| Hóa đơn/đơn hàng mua độc lập và phân bổ thuế/chiết khấu | **Chưa** | Không suy diễn từ số hóa đơn của phiếu nhập |

## Kho

| DEMO đã có | Bản PostgreSQL hiện tại | Quy tắc |
|---|---|---|
| Dashboard tồn, tồn thấp, hạn dùng, giá trị kho | Có | Ngưỡng theo từng bếp và giá vốn của phiếu nhập đã định giá |
| Tổng tồn nguyên liệu theo đơn vị | Có | Không cộng kg với lít hoặc chai |
| Phiếu nhập nhiều dòng có đơn giá và thành tiền | Có | Ghi kho và tài chính trong một transaction |
| Phiếu xuất theo trường / ngày / bữa | Có | Giảm tồn atomically, ghi sự kiện ISSUED |
| Lô hàng, hạn dùng, tìm kiếm, tra cứu | Có | Không xuất lô quá hạn / cách ly |
| Cách ly / mở cách ly | Có | Bảo toàn lịch sử thay đổi |
| Chuyển vị trí trong bếp | Có | Chuyển nguyên lô; không giả làm chuyển giữa bếp |
| Truy xuất nhật ký nhập/xuất/chuyển/cách ly | Có | 200 sự kiện mới nhất trên UI |
| Xuất CSV tồn kho / nhập / nhật ký | Có | Dữ liệu thật |
| Chuyển kho giữa các bếp hoặc kho độc lập, phân lô một phần | **Chưa** | Cần chứng từ xuất/nhận hai đầu và kiểm soát quyền |
| Phiếu nhập nháp/chỉnh sửa trước duyệt, chứng từ nhiều loại | **Chưa** | Không chỉnh phiếu đã ghi nhận mà mất dấu vết |
| Quy đổi đơn vị mua sang tồn chuẩn | **Chưa** | Mỗi lô hiện dùng đơn vị chuẩn của nguyên liệu |
| Quản lý serial/QR lô chính thức | **Chưa** | Không phát hành QR DEMO thành QR chính thức |
| Trả NCC, điều chỉnh/chênh lệch kiểm kê | **Chưa** | Cần bút toán đảo và kiểm đếm có người duyệt |

## An toàn dữ liệu và phân quyền

- Bếp trung tâm có một kho theo kitchenId, không nhân bản một kho cho mỗi trường.
- Chỉ lô có nhật ký xuất đúng trường/ngày/bữa mới được chọn ở kiểm thực bước 1.
- BGH/UBND không mặc nhiên truy cập sổ thanh toán của bếp trung tâm phục vụ nhiều trường.
- Lô cũ chưa có phiếu nhập định giá không được tự gán công nợ 0đ.
- Bằng chứng pháp lý được quản lý và phân quyền nhưng không tự đánh dấu đã xác minh.

## Nghiệm thu bắt buộc

1. Prisma validate + generate, backend Nest build, frontend Vite build.
2. 3 migrations mới áp dụng theo thứ tự: `20261121140000_supplier_purchases_payments`, `20261121150000_supplier_documents`, `20261121160000_kitchen_stock_minimums`.
3. Bếp Long Hoa: nhập phiếu hai dòng nguyên liệu, cùng một NCC. Xem phiếu, tồn 2 lô, số nợ đúng.
4. Trả từng phần bằng hai phiếu chi; nợ giảm. Hủy một phiếu với lý do: nợ tăng lại; lịch sử còn.
5. Gắn chứng từ PDF/JPG vào NCC và đúng phiếu nhập; xem, tải; đưa vào lưu trữ.
6. Cấu hình tồn tối thiểu cho nguyên liệu, cảnh báo tồn thấp đúng; cách ly một lô để chặn xuất.
7. Xuất một lô cho TH Phạm Hùng, ngày và bữa; bước 1 giám sát chỉ thấy lô được cấp.
8. Đăng nhập BGH/UBND: không có thao tác ghi kho và không thấy sổ công nợ toàn bếp.
9. Đổi bếp: phải không truy cập dữ liệu NCC, kho, phiếu, tệp của bếp khác (403).
10. Đối chiếu bảng DEMO để ghi nhận các chức năng ở trạng thái **Chưa** trước khi tuyên bố đạt feature parity.

> Chưa có kết quả build hoặc nghiệm thu trên máy PostgreSQL của người sử dụng cho đợt thay đổi này. Không được báo thành công vận hành khi chưa chạy các cổng kiểm thử.
