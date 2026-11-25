# CanTinSo — Từ thực đơn đã duyệt đến dự trù và xuất kho

## Quy tắc vận hành
1. Bếp lập thực đơn theo trường, ngày, bữa và nhóm tuổi; BGH duyệt một phiên bản thực đơn.
2. Mở **Quản lý kho → Xuất kho**: dữ liệu dự trù được **tự động tính khi truy cập** từ phiên bản APPROVED mới nhất của trường/ngày/bữa, không cần bếp gõ lại công thức. Đây là dự trù động, không phải phiếu xuất đã ghi sổ.
3. Dự trù lấy DishIngredient.quantity / unitCode × số suất dự kiến × portionFactor (nếu có), cộng theo nguyên liệu và ghi lại danh sách phiên bản món tham gia. Chỉ tính món isDefault; món thay thế không được tự nhân đôi.
4. Hệ thống hiển thị lượng dự trù, đã xuất ròng (ISSUE trừ RETURN), tồn khả dụng (lô AVAILABLE chưa hết hạn tại ngày sử dụng), thiếu hụt và cảnh báo không thể quy đổi đơn vị.
5. Người bếp chọn nguyên liệu, hệ thống gợi ý lô theo hạn dùng gần nhất đủ điều kiện (FEFO). Nếu lô đầu không đủ, xuất từng lô trong từng phiếu; không tự gộp hoặc tự trừ âm.
6. Người kiểm xuất phải cân lại và điền **số lượng thực xuất**, mã phiếu, người kiểm, người nhận, giờ, điều kiện và 2 ảnh bắt buộc (ảnh hàng, ảnh cân). Dự trù KHÔNG tự thay thế số cân.
7. Khi xác nhận: backend kiểm tra bếp/trường/ngày/bữa, phiên bản APPROVED **mới nhất**, nguyên liệu có trong món mặc định, lô cùng nguyên liệu; trừ kho và ghi chứng từ, SHA-256 ảnh và dấu vết thực đơn trong cùng transaction.
8. Ra món không trừ kho thêm lần nữa. Phần nguyên liệu chưa dùng và còn an toàn được nhập hoàn theo quy trình RETURN có tham chiếu phiếu xuất gốc. Vật liệu sơ chế loại bỏ không hoàn kho.

## Giới hạn cần công khai
- Chưa có hệ số phần ăn được và biến đổi nấu riêng cho toàn bộ nguyên liệu, do đó KHÔNG tự cộng hao hụt. Định lượng từ công thức được xem là cơ sở dự trù, cần kiểm nhận và cân thực tế.
- Đơn vị không thể quy đổi an toàn (ví dụ hộp → kg khi thiếu quy cách) sẽ cảnh báo thay vì tự đoán.
- Dự trù được tính lại theo phiên bản đã duyệt và sổ xuất/hoàn; không phát sinh bản ghi dự trù lưu riêng trong DB và không cần migration.
- Giao diện cho phép xuất thủ công với lý do/chứng từ rõ ràng; cần đối soát các phiếu đó với nhu cầu bữa ăn. Chưa có phiếu xuất nhiều dòng và phân bổ nhiều lô trong một transaction.
- Không có bút toán trừ kho nào khi lập thực đơn, duyệt thực đơn hoặc chỉ xem dự trù.

## Kiểm thử
`npm run test:stock-forecast` kiểm tra: công thức × số suất, đã xuất ròng sau nhập hoàn, bỏ món thay thế, từ chối công thức không quy đổi được và không tạo dự trù cho phiên bản chưa duyệt.

Chạy `check-supply-build.ps1` (12 bước) sau khi pull. Thay đổi này không có migration mới.
