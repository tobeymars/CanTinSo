# CanTinSo — chuẩn kiểm soát nhập / xuất kho có minh chứng

> Đặc tả và checklist nghiệm thu kỹ thuật. Không phải chứng nhận pháp lý, không thay thế kiểm thực ba bước / chứng từ gốc. Áp dụng phân hệ tài khoản thật; DEMO giữ nguyên.

## 1. Nguyên tắc đã chốt
- Tồn kho thuộc **bếp (kitchenId)**, không nhân kho cho từng trường khi bếp trung tâm phục vụ nhiều trường.
- Dự trù từ công thức, định lượng và tỷ lệ ăn được là **số liệu kế hoạch**, không phát sinh trừ kho.
- Khi xác nhận **phiếu xuất nguyên liệu thực tế**, giảm tồn lô đúng một lần. Khi ra món không trừ kho lần nữa.
- Ghi rõ mã phiếu, người nhập/xuất, người giao/nhận, thời điểm, địa điểm, lô và chứng từ.
- Ảnh, giấy tờ dạng PDF/JPG/PNG/WEBP kiểm tra signature, giới hạn 2 MB/tệp, 8 MB/phiếu; lưu SHA-256 để kiểm tra toàn vẹn khi tải.
- Phiếu đã ghi sổ là **bất biến** (không cung cấp API sửa/xóa). Chỉnh sai phải lập nghiệp vụ điều chỉnh/đảo tương ứng và tham chiếu phiếu gốc, không sửa âm thầm dữ liệu.
- Kết quả không đạt: KHÔNG cho nhập tồn khả dụng hoặc xuất dùng. Quy trình cách ly, từ chối nhận, hủy và điều chỉnh tồn cần được xây tiếp thành luồng riêng.
- Người thuộc bếp và có kitchenId đúng mới được ghi sổ. BGH/UBND chỉ được xem đúng phạm vi. BGH trường nhận thực phẩm chế biến sẵn không nhìn thấy các phiếu nhập kho dùng chung toàn bếp trung tâm.

## 2. Chứng từ và kiểm nhận nhập kho
- Một phiếu nhập nhiều dòng, mã phiếu duy nhất trong bếp.
- Nhà cung cấp ACTIVE; từng dòng có nguyên liệu, mã lô, nguồn gốc, nhà sản xuất/đóng gói, số lượng giao, số lượng chấp nhận, số lượng từ chối tính chênh, ghi chú lý do, đơn vị, giá, vị trí, ngày hạn dùng nếu có.
- Kiểm nhận phiếu: người kiểm, người giao, khu vực, thời điểm, mã chứng từ, bao gói, cảm quan, vận chuyển, số lượng, giấy tờ; nhiệt độ đo khi cần.
- Bắt buộc ít nhất một chứng từ giao hàng/nguồn gốc và một ảnh lô thực tế, cùng phiếu nhập; cho phép thêm tài liệu khác theo loại nguyên liệu.
- Nếu kiểm nhận không đạt, không ghi tồn; cần quy trình từ chối/cách ly riêng. Nếu số lượng giao nhiều hơn lượng nhận, ghi lý do và chỉ nhập lượng chấp nhận.
- Ghi PurchaseReceipt + lines + InventoryLot + TraceEvent + StockVoucher + tệp minh chứng trong một giao dịch cơ sở dữ liệu.

## 3. Chứng từ và kiểm xuất
- Mã phiếu xuất duy nhất trong bếp; chọn lô đủ điều kiện, trường phân công, ngày và bữa sử dụng.
- Cân thực tế, số lượng/đơn vị xuất; kiểm tra lô AVAILABLE, chưa hết hạn, không xuất vượt remainingQty.
- Bắt buộc người kiểm, người nhận, địa điểm, giờ, mã phiếu và ba kiểm tra đạt (lô/bao gói, đối chiếu số lượng, cân).
- Bắt buộc ảnh lô xuất và ảnh cân thực tế.
- Ghi StockVoucher + evidences + TraceEvent(ISSUED) và trừ remainingQty cùng transaction. Unique(kitchenId,number) ngăn xác nhận cùng phiếu nhiều lần.

## 3b. Nhập hoàn nguyên liệu dư từ phiếu xuất
- Chỉ nhập hoàn nguyên liệu **chưa sơ chế hoặc chế biến** và còn đủ điều kiện bảo quản, sử dụng.
- Bắt buộc chọn phiếu xuất gốc của đúng bếp; số lượng hoàn lũy kế không vượt số đã xuất gốc.
- Biên bản nhập hoàn ghi người hoàn, người kiểm, khu vực, giờ cân, đánh giá bao gói, kiểm đếm, bảo quản.
- Bắt buộc ảnh nguyên liệu hoàn và ảnh cân thực tế; lý do hoàn tối thiểu 10 ký tự.
- Tạo StockVoucher(kind RETURN, sourceVoucherId), StockVoucherEvidence và TraceEvent(RETURNED), tăng tồn trong một transaction serializable. Không sửa phiếu xuất gốc.
- Chặn hoàn lô đã cách ly hoặc hết hạn; phiếu hoàn phải truy ngược được đến phiếu xuất.

## 4. Kiểm tra thẩm định nội bộ
1. Nhập hợp lệ: phiếu + tệp + tồn tăng đúng, truy ngược theo lô.
2. Thiếu ảnh, chứng từ hoặc dữ liệu kiểm nhận: báo 400, tồn không thay đổi.
3. Tệp giả MIME, quá 2 MB hoặc nội dung hỏng: từ chối, không ghi bất kỳ phần nào.
4. Nhập trùng mã phiếu hoặc mã lô: từ chối; không nhân đôi tồn.
5. Có lô không đạt cảm quan/bao gói: từ chối ghi vào tồn khả dụng.
6. Giao 10kg nhận 8kg: ghi 2kg không nhận, bắt buộc lý do; tồn chỉ tăng 8kg.
7. Xuất vượt tồn, lô cách ly/hết hạn, trường không được phân công: từ chối; tồn không giảm.
8. Xuất trùng số phiếu: từ chối; transaction rollback, không trừ tồn lần hai.
9. Xuất thành công: tồn lô giảm đúng lượng, nhật ký và tệp minh chứng hiển thị.
10. BGH trường A không tải được chứng từ phiếu xuất cho trường B; UBND không được ghi sổ.
11. Mỗi minh chứng tải về xác minh SHA-256; không có API thay thế tệp đã lưu.
12. Sự kiện nhập/xuất vẫn truy xuất được khi nhà cung cấp bị ngừng hoạt động.
13. Nhập hoàn có ảnh cân, nguyên liệu an toàn và phiếu xuất gốc hợp lệ; số lượng hoàn lũy kế không vượt lượng đã xuất.
14. Nhập hoàn nhiều giao dịch đồng thời không làm vượt tồn lô hoặc số lượng xuất gốc.

## 5. Những phần chưa triển khai trọn vẹn (không gọi là nghiệm thu)
- Phiếu nháp lưu DB, xác nhận nhiều người, chữ ký số/điện tử kiểm chứng, chính sách xác thực danh tính.
- Phiếu từ chối/cách ly, phiếu trả nhà cung cấp, hủy hàng, bút toán điều chỉnh/đảo (nhập hoàn nguyên liệu đủ điều kiện đã được bổ sung).
- Xuất kho nhiều dòng trong một phiếu, FEFO tự động, kiểm kê đối chiếu kế toán kho.
- Tự tạo dự trù từ công thức theo tỷ lệ ăn được; ProductionBatch và đối soát hao hụt thực tế.
- Mẫu chuẩn theo từng loại thực phẩm/tuyến pháp lý, quy định lưu trữ và số hóa hồ sơ, quyền giám sát khi thay đổi phân công.
- Kiểm thử tích hợp thật PostgreSQL, concurrency, phân quyền nhiều bếp/trường, chứng từ và ứng dụng chạy trên máy vận hành.

## 6. Cấu trúc dữ liệu mới
- StockVoucher (posted): bếp, số phiếu, kind RECEIPT/ISSUE/RETURN, inspection snapshot, người ghi sổ, thời điểm, liên kết phiếu mua, lô xuất hoặc phiếu xuất gốc để nhập hoàn.
- StockVoucherEvidence: loại chứng từ, tên, mime, dung lượng, SHA-256, dữ liệu gốc, người/timestamp. Không thay thế/sửa.
- Phiếu nhập còn lưu dữ liệu mua hàng và công nợ ở PurchaseReceipt. TraceEvent vẫn là nhật ký biến động lô và gắn voucherId qua metadata.
- Migration `20261125090000_stock_vouchers_evidence` additive: không sửa các giao dịch cũ; chúng sẽ không tự có chứng từ theo chuẩn mới.

## 7. Chạy thử
- `git pull origin feature/ubnd-ward-school-access`
- `./check-supply-build.ps1` để validate/generate/test/build, không tự migrate.
- `cd cantinso-backend && npx prisma migrate deploy` **chỉ sau khi xác nhận đang dùng đúng PostgreSQL và đã kiểm soát rủi ro dữ liệu**.
- Đăng nhập nhân viên bếp, kiểm tra phiếu nhập nhiều dòng và xuất lô. Sau đó đăng nhập BGH kiểm tra quyền chỉ đọc.
