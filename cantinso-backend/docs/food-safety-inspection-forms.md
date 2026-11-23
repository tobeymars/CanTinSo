# CanTinSo — Biểu mẫu kiểm thực ba bước và lưu mẫu thức ăn

**Căn cứ chuyên môn:** Quyết định 1246/QĐ-BYT ngày 31/3/2017, Phụ lục 1 (Mẫu 1–3), Phụ lục 2 (Mẫu 4–5).

## Cấu trúc

- Mỗi phạm vi là **trường, ngày phục vụ, bữa ăn**. Bếp báo cáo, BGH đối chiếu/xác nhận, UBND chỉ xem.
- **Bước 1:** lô đã được xuất từ kho cho đúng trường–ngày–bữa; số lượng thực nhận, nhà cung cấp, hạn dùng, điều kiện bảo quản, nguồn gốc/chứng từ, cảm quan đạt/không đạt, biện pháp xử lý. Bước 1 ghi kiểm tra, **không trừ kho lần thứ hai**.
- **Bước 2:** từ thực đơn được duyệt, mỗi món có nguyên liệu chính, số suất, giờ sơ chế/chế biến xong, đánh giá vệ sinh người/dụng cụ/khu vực và cảm quan, biện pháp xử lý.
- **Bước 3:** từ thực đơn được duyệt, mỗi món có số suất, giờ chia món xong/giờ bắt đầu ăn, tình trạng dụng cụ chia/che đậy/bảo quản, cảm quan, biện pháp xử lý.
- **Lưu mẫu** là nghiệp vụ riêng, không phải bước kiểm thực thứ 4. Nếu bữa từ **30 suất**: từng món phải có mẫu riêng, tên món, số suất, loại đặc/lỏng, ít nhất 100 g hoặc 150 ml, thời gian lấy mẫu, người lấy, mã niêm phong, dụng cụ, vị trí, nhiệt độ 2–8°C, ghi chú chất lượng. Mẫu phải được lấy trước giờ bắt đầu ăn.
- Bữa **1–29 suất** có thể ghi nhận minh bạch trường hợp không bắt buộc lưu mẫu theo ngưỡng của Quyết định 1246; API xác minh số suất từ thực đơn được duyệt và lưu lý do. Có thể chọn lưu mẫu tự nguyện thay vì miễn áp dụng.
- **Xuất bếp trung tâm:** chỉ được báo cáo mốc DISPATCHED khi đã báo cáo kiểm thực bước 2 đạt và có hồ sơ lấy mẫu hợp lệ theo từng món, hoặc hồ sơ miễn lưu mẫu hợp lệ dưới 30 suất. Mỗi mốc lấy mẫu phải **sau khi món nấu xong và trước thời điểm xuất bếp**. **Không chờ 24 giờ** mới được xuất; 24 giờ chỉ là thời gian giữ mẫu tối thiểu trước khi hủy.
- **Hủy mẫu:** sự kiện riêng cho từng món, chỉ nhân viên bếp, ghi người và thời gian thật, sau tối thiểu 24 giờ kể từ lúc lấy. Bắt buộc xác nhận không có nghi ngờ ngộ độc hoặc yêu cầu giữ mẫu. Có **Ghi nhận yêu cầu giữ mẫu**; khi đã giữ mẫu, hệ thống chặn hủy. Mở giữ mẫu cần quy trình thẩm quyền riêng, không tự bỏ chặn chỉ vì hết 24 giờ.

## Kiểm soát quyền và lịch sử

- Backend từ chối thiếu món được duyệt, giá trị kiểm tra chưa chọn, thời gian trái thứ tự, nhiệt độ sai, thiếu thông tin mẫu.
- BGH **không thể xác nhận** nếu bất kỳ tiêu chí đạt/không đạt của bước 1/2/3 mang giá trị **Không đạt**, hoặc hồ sơ mới gửi theo mẫu cũ không đủ trường. BGH yêu cầu bổ sung để bếp ghi lại, lịch sử trước vẫn còn.
- Hồ sơ kiểm thực được lưu trong `SupervisionMeal.checks` + `SupervisionEvent`; sự kiện giữ/hủy mẫu chỉ thêm `SupervisionEvent` để không tự thay đổi chữ ký snapshot của xác nhận tổng thể.
- Áp dụng quy tắc ngày VN trước đây: ngày mai chỉ xem; ngày quá khứ muốn báo cáo/xác nhận phải giải trình. Riêng vòng đời hủy mẫu phải được phép ghi theo thời điểm thật sau ngày phục vụ nên không yêu cầu lý do “báo cáo muộn”, nhưng có ghi chú hủy riêng.

## Hạn chế cần thiết kế trước khi vận hành đại trà

- **Một mẻ chế biến ở bếp trung tâm phục vụ nhiều trường:** hiện kiểm thực bước 2 vẫn lưu theo phạm vi trường–ngày–bữa. Chưa có mô hình mẻ sản xuất dùng chung và liên kết các trường nhận. **Không tự sao chép** hồ sơ của trường này sang trường khác hay tuyên bố đã kiểm thực chung một mẻ.
- Nhãn mẫu là dữ liệu điện tử, chưa có bản in nhãn/mã QR ký số; người lưu/hủy là tên và tác nhân hệ thống, không thay thế chữ ký tay.
- Ghi nhận nhiệt độ và điều kiện vệ sinh là thông tin do người dùng nhập, không tự lấy từ cảm biến hay tuyên bố đã kiểm tra thực tế.
- Với hồ sơ lịch sử đã được xác nhận theo mẫu chung, giữ nguyên dữ liệu. Không âm thầm biến hồ sơ cũ thành biểu mẫu mới; mở điều chỉnh nếu cần bổ sung thực tế.

## Nghiệm thu

1. Phê duyệt thực đơn của TH Phạm Hùng cho một ngày, bữa, đảm bảo `Giám sát & an toàn` thấy món.
2. Xuất lô đúng trường/ngày/bữa, bếp ghi bước 1 đầy đủ chứng từ/cảm quan. Chọn Không đạt => BGH phải yêu cầu bổ sung, không xác nhận đạt.
3. Bước 2: tên món tự hiện từ thực đơn, nhập nguyên liệu chính/số suất/thời gian/vệ sinh/cảm quan. Thiếu trường hoặc không đánh giá => API chặn.
4. Bước 3: kiểm tra số suất, giờ chia, giờ ăn, dụng cụ và cảm quan; không thể ghi giờ chia sau giờ bắt đầu ăn.
5. Lưu mẫu cho bữa >=30 suất: thử 99 g đặc, 149 ml lỏng, 9°C => API chặn; 100g/150ml, 4°C => lưu (nếu các trường khác hợp lệ).
6. Nếu đã ghi bước 3, lấy mẫu sau giờ bắt đầu ăn => API chặn; nếu lưu mẫu trước, bước 3 phải đối chiếu.
7. Sau 24 giờ mới hiện hủy mẫu. Nhân viên bếp ghi người/hồ sơ hủy; mẫu bị đánh dấu đã hủy không được ghi lại; yêu cầu giữ mẫu => chặn hủy.
8. BGH xem chi tiết từng món, xác nhận mục đạt, yêu cầu bổ sung mục không đạt; xác nhận tổng thể sau khi hoàn tất đủ hồ sơ và mốc vận hành.
9. BGH/UBND chỉ xem các lô và chứng từ đúng trường–ngày–bữa theo quyền tài khoản.

## Kiểm tra kỹ thuật

Chạy `powershell -ExecutionPolicy Bypass -File .\check-supply-build.ps1` tại gốc repo. Kiểm thử chuyên môn: `npm run test:supervision-food` tại `cantinso-backend`. Không có migration mới vì dùng JSON và nhật ký sự kiện hiện có.

## Kiểm thử bổ sung: lưu mẫu trước xuất bếp

- Nấu xong 09:10, lấy mẫu 09:15, ghi Xuất bếp 09:20: được phép nếu các điều kiện khác hợp lệ, **không cần đợi sang ngày hôm sau**.
- Không có kiểm thực bước 2 đạt, thiếu hồ sơ mẫu theo món, hoặc mẫu ghi lấy sau Xuất bếp: API từ chối.
- Ghi mẫu có giờ lấy trước thời điểm món nấu xong: API từ chối.
- Hủy mẫu lúc 09:20 cùng ngày: API từ chối, chỉ xem xét hủy sau đủ 24 giờ và không có yêu cầu giữ mẫu.
- Bếp tại trường không có mốc Xuất bếp vận chuyển; quy tắc đặc thù này áp dụng cho tuyến bếp trung tâm.
