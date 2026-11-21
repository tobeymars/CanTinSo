# CanTinSo — Quy tắc đơn vị đo dùng thống nhất cho kho, công nợ và kiểm thực

## 1. Phạm vi và nguyên tắc

- Mỗi `Ingredient` hiện có `unit` làm đơn vị tồn kho chuẩn. `InventoryLot.quantity`, `remainingQty`, phiếu xuất và định mức tồn đều ghi bằng chính đơn vị này. Không tự đổi `Ingredient.unit` hoặc các lô tồn đã được ghi.
- Trên biểu mẫu kho, **ưu tiên kg với nhóm khối lượng** và **lít với nhóm thể tích**, nhất là khi đơn vị danh mục đang là g hoặc ml. Người dùng được chọn đơn vị khác trong cùng nhóm. Số liệu lưu về PostgreSQL luôn được quy đổi về đơn vị của lô.
- Với món ăn và công thức dinh dưỡng, lượng thực phẩm theo suất ăn là một nghiệp vụ khác với tồn kho. Dữ liệu `DishIngredient.quantity/unitCode` hiện hữu phải tiếp tục được diễn giải theo đơn vị riêng của công thức; không tự chuyển kho sang gam/suất.
- Không chuyển đổi giữa g và ml bằng giả định 1g=1ml. Không chuyển chai/hộp/gói/cái sang kg/lít khi chưa có quy cách đóng gói được xác minh.
- Những lô lịch sử có đơn vị hoặc số lượng nghi ngờ **giữ nguyên** để đối chiếu chứng từ; không có migration nào nhân/chia số liệu tồn hiện có.

## 2. Bảng quy đổi được phép

| Đơn vị nhập | Đơn vị kho | Quy đổi |
|---|---|---|
| 5 kg | g | 5.000 g |
| 500 g | kg | 0,5 kg |
| 2,5 kg | g | 2.500 g |
| 1,5 lít | ml | 1.500 ml |
| 250 ml | lít | 0,25 lít |
| 12 chai | chai | 12 chai |
| 1 chai | kg | **Từ chối** |
| 1 kg | lít | **Từ chối** |

Khi lưu tồn, giới hạn 3 chữ số thập phân theo đơn vị chuẩn do `DECIMAL(12,3)` của Prisma. Ví dụ nếu đơn vị kho là kg, 1g=0,001kg hợp lệ; 0,1g=0,0001kg không lưu được chính xác và phải bị từ chối. Phiếu nhập có `entered_quantity DECIMAL(15,6)` để nhớ số lượng người dùng nhập, kể cả khi đơn vị khác đơn vị kho.

## 3. Giá tiền khi đổi đơn vị

- `unitPrice` là giá theo **đơn vị nhập mua**, không mặc định là giá/kg hoặc giá/g.
- `amount = round(enteredQuantity × unitPrice, 0)` VND **cho từng dòng**; giá đơn vị có thể là số thập phân tối đa 6 chữ số (`DECIMAL(18,6)`) vì giá/g có thể dưới 1 VND.
- Ví dụ: mua **2 kg × 100.000 VND/kg = 200.000 VND**. Chọn lại g thì phải hiển thị **2.000 g × 100 VND/g = 200.000 VND**. Nếu không bảo toàn thành tiền sau giới hạn độ chính xác, giao diện ngăn chuyển tự động để người dùng kiểm tra.
- Giá trị tồn theo giá nhập được tính từ **thành tiền ÷ lượng nhập sau quy đổi**, nhân lượng tồn chuẩn; không nhân trực tiếp giá/kg với số gam tồn.
- Các phiếu nhập cũ có `enteredQuantity/enteredUnit = NULL` tiếp tục được hiểu theo đơn vị kho chuẩn của thời điểm ghi nhận; không tự ước lượng lại giá.

## 4. Xuất kho và kiểm thực

- Xuất 5kg từ lô lưu g thì trừ 5.000g khỏi tồn. Sự kiện `ISSUED` ghi cả `quantity/unit` đã quy đổi lẫn `enteredQuantity/enteredUnit` thực tế.
- Giám sát bước 1 chỉ nhìn lô đã xuất cho đúng trường–ngày–bữa. Người dùng có thể chọn g hoặc kg, nhưng backend luôn xác thực số lượng quy đổi không vượt lượng đã cấp.
- Kiểm thực không trừ kho lần hai. Hồ sơ lưu đơn vị người dùng chọn và số lượng chuẩn để đối chiếu.
- Định mức tồn có thể nhập theo kg/g hoặc lít/ml nhưng lưu bằng đơn vị của nguyên liệu trong danh mục.

## 5. Nghiệm thu

1. `npm run test:units` ở cả `cantinso-backend` và `school-food-safety-main` phải đạt.
2. Build Prisma/NestJS/Vite thành công; chỉ sau đó chạy `npx prisma migrate deploy` cho `20261121170000_purchase_entered_units`.
3. Thử nhập 5 kg cho nguyên liệu lưu g, đơn giá 50.000 VND/kg. Kiểm tra tồn tăng 5.000 g và công nợ 250.000 VND.
4. Xuất 2 kg cho TH Phạm Hùng, đúng ngày và bữa. Kho giảm 2.000 g; Giám sát có thể ghi 2kg hoặc 2.000g nhưng không quá lượng cấp.
5. Đổi đơn vị kg ↔ g trên biểu mẫu mua: không được thay đổi tổng thành tiền.
6. Thử đổi 1 chai thành kg, hoặc 1kg thành lít: phải bị chặn.
7. Kiểm tra lô cũ và phiếu cũ không bị nhân/chia số liệu sau migration.

## 6. Giới hạn cần mở rộng sau

Quy đổi thùng → chai, hộp → g, chai → ml cần thêm quy cách đóng gói cụ thể theo sản phẩm/lô và khả năng mua theo kiện nhưng xuất theo đơn vị lẻ. Chức năng này chưa được triển khai và không được giả định từ tên đơn vị.
