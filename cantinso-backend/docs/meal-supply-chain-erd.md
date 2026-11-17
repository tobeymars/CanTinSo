# CanTinSo — ERD nghiệp vụ chuỗi cung ứng bữa ăn

> Trạng thái: thiết kế mục tiêu, chưa triển khai schema/migration  
> Nhánh tham chiếu: feature/ubnd-ward-school-access  
> Prisma schema tham chiếu: cantinso-backend/prisma/schema.prisma tại commit 7285c6a

## 1. Quy tắc nghiệp vụ đã chốt

1. **Công thức thuộc bếp tạo món.** Một bếp trung tâm có thể dùng cùng món/công thức cho nhiều trường đang được phân công; bếp tại trường chỉ sở hữu công thức của chính bếp đó.
2. **Thực đơn thuộc từng trường.** Mỗi trường có lịch thực đơn, số suất, trạng thái gửi duyệt và lịch sử duyệt độc lập; mỗi thực đơn chỉ rõ bếp chịu trách nhiệm chuẩn bị.
3. **Duyệt món theo trường (school).** Món/công thức dùng chung không đồng nghĩa tự động được mọi trường chấp nhận. Mỗi trường duyệt phiên bản món mà trường đó cho phép sử dụng. Việc này tách biệt với duyệt thực đơn.
4. **Công thức dùng chung giữa nhóm tuổi (same).** Một phiên bản công thức chuẩn dùng chung; định lượng khẩu phần và số suất có thể điều chỉnh theo nhóm tuổi ở dòng thực đơn/kế hoạch phục vụ. Không nhân bản công thức chỉ vì khác nhóm tuổi.
5. **Kho bếp trung tâm quản lý tập trung (central).** Mỗi bếp là một đơn vị tồn kho độc lập; kho trung tâm không chia tồn vật lý thành các kho con theo trường. Khi xuất dùng/giao hàng phải ghi rõ trường/đợt sản xuất nhận phần nguyên liệu hoặc suất ăn. Bếp tại trường, nếu có, có kho riêng.
6. Công thức tham chiếu danh mục nguyên liệu chuẩn, **không tham chiếu lô tồn kho**. Lô chỉ được chọn khi nhập/xuất/sản xuất thực tế.
7. Dữ liệu lịch sử không bị ghi đè: phiên bản công thức, bản thực đơn đã gửi/duyệt, phiếu kho và lô đã dùng phải truy xuất được.
8. Mọi phạm vi dữ liệu và quyền được kiểm tra ở backend; frontend không phải ranh giới bảo mật.

## 2. ERD mục tiêu — quan hệ chính

- Ward 1—N School; Ward 1—N Kitchen trung tâm.
- School 1—0..1 Kitchen tại trường.
- Kitchen N—N School thông qua KitchenSchoolAssignment có startsAt/endsAt/isActive.
- Kitchen 1—N User, Dish, InventoryLocation, StockReceipt, StockMovement, MealPlan (vai trò bếp chuẩn bị).
- Supplier N—N Kitchen qua SupplierKitchen.
- Ingredient 1—N IngredientNutrition; Ingredient N—N Allergen qua IngredientAllergen.
- Kitchen 1—N InventoryLocation; InventoryLocation 1—N InventoryLot.
- StockReceipt 1—N StockReceiptItem; StockReceiptItem có thể tạo một InventoryLot.
- InventoryLot 1—N StockMovementItem; StockMovement 1—N StockMovementItem.
- Kitchen 1—N Dish; Dish 1—N DishVersion; DishVersion 1—N DishIngredient.
- DishIngredient N—1 Ingredient; DishVersion 1—N DishApproval; School 1—N DishApproval.
- School 1—N MealPlan; Kitchen 1—N MealPlan; MealPlan 1—N MealPlanItem.
- MealPlanItem N—1 DishVersion và N—1 AgeGroup; MealPlan 1—N MealPlanApproval và 1—N MealPlanRevision.
- MealPlan/revision 1—N ProductionBatch; ProductionBatch liên kết các giao dịch xuất kho và Delivery.
- InventoryLot 1—N TraceEvent; TraceEvent có thể tham chiếu StockMovement, ProductionBatch hoặc Delivery.

## 3. Nhóm model mục tiêu và trách nhiệm

### 3.1 Tổ chức, phân công và người dùng

Giữ Ward, School, Kitchen, KitchenSchoolAssignment, User.

- Kitchen.type=CENTRAL: bắt buộc có wardId, không có schoolId.
- Kitchen.type=SCHOOL: bắt buộc có schoolId, không có wardId.
- Một trường chỉ có một đơn vị bếp phục vụ đang hiệu lực tại một thời điểm (bếp trung tâm được phân công hoặc bếp tại trường). Quy tắc exclusivity đang được DB trigger bảo vệ.
- Phân công cần giữ lịch sử bằng startsAt, endsAt, isActive; không xóa bản ghi cũ khi đổi bếp.
- Người dùng bếp gắn kitchenId; BGH gắn schoolId; UBND gắn wardId.

### 3.2 Danh mục nguyên liệu, đơn vị, dinh dưỡng

- Ingredient: danh mục chuẩn dùng chung toàn hệ thống; mã nguyên liệu ổn định, tên, nhóm, đơn vị cơ sở, trạng thái.
- Unit và IngredientUnitConversion: chuẩn hóa đơn vị (g, kg, ml, l, cái...) và quy đổi có kiểm soát. Không dùng chuỗi đơn vị tự do ở từng giao dịch.
- IngredientNutrition: giá trị dinh dưỡng theo 100g/100ml hoặc đơn vị tham chiếu xác định; lưu nguồn dữ liệu, ngày hiệu lực và phiên bản. Không coi giá trị ước tính là kết quả kiểm nghiệm.
- Allergen và IngredientAllergen: quan hệ nhiều-nhiều; công thức kế thừa cảnh báo dị ứng từ nguyên liệu.

### 3.3 Nhà cung cấp và kho

- Supplier: hồ sơ nhà cung cấp độc lập, không thuộc riêng một trường.
- SupplierKitchen: phạm vi bếp được phép mua từ nhà cung cấp; có trạng thái và thời gian hiệu lực. Việc được liên kết không thay thế kiểm tra hồ sơ/hợp đồng.
- InventoryLocation: vị trí/kho thuộc đúng một Kitchen. Tối thiểu mỗi bếp có một kho chính.
- StockReceipt / StockReceiptItem: chứng từ nhập, nhà cung cấp, bếp nhận, ngày nhận, chứng từ, người xác nhận, mặt hàng, số lượng, đơn vị, giá và thông tin lô/hạn dùng.
- InventoryLot: lô thực tế của một nguyên liệu tại một bếp/vị trí; gồm mã lô, nhà sản xuất, ngày sản xuất/hạn dùng, số lượng nhập và trạng thái kiểm tra. Ràng buộc duy nhất mã lô theo bếp (hoặc theo bếp + nguyên liệu nếu nghiệp vụ cho phép trùng mã nhà sản xuất).
- StockMovement / StockMovementItem: sổ cái nhập/xuất/điều chỉnh/chuyển vị trí/hoàn trả. Giao dịch đã ghi sổ không được sửa/xóa; sai sót được đảo bằng giao dịch đối ứng.
- Số tồn hiện tại có thể lưu cache trên lô để đọc nhanh, nhưng phải đối chiếu được từ ledger. Không được cập nhật tồn tùy tiện ngoài giao dịch kho.
- Với bếp trung tâm, tồn kho thuộc bếp trung tâm. Việc phân bổ nhu cầu cho Trường A/B/C là dữ liệu kế hoạch hoặc xuất dùng theo đợt/trường, không tạo ba bản tồn độc lập giả tạo.

### 3.4 Món, phiên bản công thức và duyệt món theo trường

- Dish: danh tính món thuộc một Kitchen (kitchenId), mã duy nhất trong phạm vi bếp, tên, nhóm bữa, trạng thái.
- DishVersion: phiên bản bất biến của công thức: số phiên bản, khẩu phần chuẩn, hướng dẫn chế biến, hiệu lực, người tạo. Chỉnh sửa công thức đã phát hành phải tạo phiên bản mới.
- DishIngredient: thành phần của một phiên bản, tham chiếu Ingredient, số lượng và đơn vị chuẩn, hao hụt/sơ chế nếu cần. Không chứa inventoryLotId.
- DishNutrition: snapshot kết quả tính dinh dưỡng của phiên bản từ dữ liệu nguyên liệu; ghi phương pháp/nguồn và thời điểm tính.
- DishApproval: trạng thái chấp thuận theo từng trường và từng phiên bản (PENDING/APPROVED/REJECTED/WITHDRAWN), người duyệt, thời gian, lý do. Bếp trung tâm tạo món một lần; mỗi trường được phân công phải duyệt món/phiên bản trước khi đưa vào thực đơn của trường đó.
- Nếu phiên bản mới được tạo, không tự động kế thừa APPROVED từ phiên bản cũ; trường cần duyệt phiên bản mới. Có thể hiển thị phiên bản cũ đang được duyệt trong khi phiên bản mới chờ duyệt.

### 3.5 Thực đơn, nhóm tuổi và duyệt thực đơn

- MealPlan: thuộc một School, chỉ rõ Kitchen chuẩn bị, ngày phục vụ, trạng thái và người lập. Trường là chủ thể của thực đơn; bếp là đơn vị thực hiện.
- Ràng buộc tạo/sửa: tại ngày phục vụ, bếp phải có phân công hiệu lực với trường hoặc là bếp tại trường của trường đó. Backend xác thực quan hệ này.
- Không dùng một thực đơn chung cho nhiều trường. Cùng bếp/cùng món vẫn tạo các MealPlan độc lập.
- MealPlanItem: tham chiếu DishVersion cụ thể; số suất, nhóm tuổi, hệ số khẩu phần/định lượng áp dụng và snapshot tên món/công thức/dinh dưỡng cần thiết để bảo toàn lịch sử.
- AgeGroup: danh mục nhóm tuổi/khối lớp. Một công thức chuẩn có thể dùng cho nhiều nhóm tuổi; hệ số khẩu phần và số suất đặt ở dòng thực đơn theo nhóm tuổi, không nhân bản DishVersion chỉ vì tuổi khác nhau.
- Cần bỏ giả định hiện tại mỗi trường/ngày/bữa chỉ có đúng một bản ghi nếu nghiệp vụ cho phép nhiều đợt/ca hoặc nhiều thực đơn phiên bản. Đề xuất khóa nghiệp vụ gồm trường + ngày + bữa + ca/mealSession (nếu có), kết hợp revision; không đặt unique quá chặt trước khi chốt ca ăn.
- MealPlanApproval: lịch sử SUBMITTED/APPROVED/RETURNED/REJECTED, người thao tác, thời điểm, nhận xét/lý do. Duyệt món và duyệt thực đơn là hai luồng riêng.
- MealPlanRevision: snapshot từng lần gửi duyệt; khi Bếp sửa sau khi bị trả lại, tạo revision mới. Không sửa nội dung revision đã duyệt.
- Chỉ revision đã được BGH duyệt mới đủ điều kiện công khai. Công khai là trạng thái/record có thời điểm và người thực hiện, không suy ra chỉ từ việc bản ghi tồn tại.

### 3.6 Sản xuất, giao nhận và truy xuất

- ProductionBatch: thực tế chế biến cho một trường/đợt phục vụ, liên kết MealPlan/revision, bếp, số suất và thời điểm.
- IngredientRequirement: nhu cầu dự kiến được tính từ DishVersion + hệ số nhóm tuổi + số suất; là số liệu kế hoạch, chưa trừ tồn.
- Xuất kho thực tế ghi StockMovement loại ISSUE và liên kết ProductionBatch/đích sử dụng; chọn lô theo FEFO khi phù hợp, nhưng người vận hành có thể ghi nhận ngoại lệ có lý do.
- Delivery / DeliveryItem: giao suất ăn từ bếp đến trường, số lượng, thời gian, người giao/nhận, tình trạng và niêm phong nếu có.
- TraceEvent cần gắn lô và tham chiếu giao dịch/đợt sản xuất/giao nhận phù hợp; không chỉ lưu metadata JSON không có khóa nghiệp vụ.

## 4. Đối chiếu Prisma schema hiện tại

| Model hiện tại | Hiện trạng trong schema | Hướng mục tiêu |
|---|---|---|
| Ward, School, Kitchen, KitchenSchoolAssignment, User | Đã có quan hệ phường/trường/bếp; bếp trung tâm thuộc ward, bếp trường thuộc school; phân công có lịch sử | Giữ nền tảng. Bổ sung ràng buộc/kiểm tra ngày hiệu lực ở service và test; không tạo lại |
| Supplier | Bắt buộc schoolId, unique theo school + code | Bỏ sở hữu trực tiếp bởi School; chuyển sang Supplier toàn hệ thống + SupplierKitchen. Cần backfill từ schoolId hiện có qua bếp đang phục vụ trường tại thời điểm chuyển |
| Ingredient | Danh mục global, có unit dạng String và category String | Giữ ý tưởng global; chuẩn hóa Unit, conversion, nutrition, allergen và trạng thái |
| InventoryLot | Bắt buộc schoolId, có supplier/ingredient, quantity/remainingQty; không có kitchen/location/receipt/ledger | Chuyển scope sang Kitchen + InventoryLocation; thêm chứng từ nhập và ledger. Giữ lot cũ, backfill school → kitchen theo lịch phân công tại thời điểm nhận |
| Dish | Global, code unique toàn hệ thống, recipe JSON | Thêm kitchenId; chuyển recipe thành DishVersion + DishIngredient; code unique theo bếp; cần chuyển JSON recipe có cấu trúc thành dòng nguyên liệu |
| MealPlan | Có schoolId, date, mealType, servings, status String; chưa có kitchenId, submit/approval history | Giữ school ownership; thêm kitchenId, enum status, session/revision, actor/timestamps; approval history riêng |
| MealPlanItem | Chỉ có dishId + servings; unique plan + dish | Tham chiếu DishVersion, AgeGroup, portionFactor và snapshot; unique theo plan + version + ageGroup/session phù hợp |
| TraceEvent | Gắn InventoryLot; metadata JSON | Giữ, bổ sung liên kết optional đến stock movement, production batch, delivery và actor có FK |
| FoodSafetyCheck | Gắn School | Giữ phạm vi trường; các kiểm tra tại bếp có thể cần kitchenId hoặc thực thể KitchenInspection riêng |

## 5. Các điểm rủi ro phải xử lý trước migration

1. **Backfill Supplier:** một Supplier cũ gắn với School. Cần xác định bếp phục vụ trường ở thời điểm dữ liệu được tạo; không tự gán tất cả nhà cung cấp của trường cho bếp trung tâm hiện tại nếu lịch sử phân công không chứng minh được.
2. **Backfill InventoryLot:** phải ánh xạ schoolId → kitchenId và kho nhận. Trường hợp không xác định được bếp lịch sử phải đưa vào báo cáo ngoại lệ để xử lý thủ công, không đoán.
3. **Dish.recipe JSON:** cần kiểm tra shape dữ liệu thực tế ở DB và localStorage/demo. Chỉ chuyển tự động khi ánh xạ được nguyên liệu/đơn vị; phần không khớp đưa vào danh sách cần rà soát.
4. **MealPlan hiện tại:** status là String; chuẩn hóa enum phải có bảng mapping giá trị cũ. MealPlanItem.dishId hiện trỏ Dish global; cần xác định kitchen owner sau khi thêm kitchenId.
5. **Uniqueness của MealPlan:** unique hiện tại (schoolId, serviceDate, mealType) có thể cản trở ca ăn hoặc revision. Không drop trước khi xác định dữ liệu trùng và quy tắc nhiều ca.
6. **Tính tồn:** remainingQty hiện là số dư ghi trực tiếp; khi thêm ledger cần đối chiếu tổng nhập - xuất ± điều chỉnh với remainingQty trước khi chuyển nguồn sự thật.
7. **Phân công bếp:** một trường chỉ có một bếp hiệu lực; mọi meal plan phải kiểm tra bếp đúng với assignment có hiệu lực ở serviceDate. Dữ liệu lịch sử phải giữ kitchenId cũ.
8. **Duyệt món:** approval là theo School + DishVersion; không đặt một cờ approved chung trên Dish vì sẽ làm một trường duyệt thay cho trường khác.

## 6. Lộ trình triển khai sau khi ERD được duyệt

1. Chạy báo cáo dữ liệu hiện có (supplier, lots, dishes.recipe, meal plans/items) và lập mapping/backfill; chưa ghi dữ liệu.
2. Chốt physical schema: tên model, enum, khóa unique, delete policy, indexes, trạng thái và snapshot.
3. Thiết kế migration mở rộng theo hướng additive trước: thêm bảng/cột nullable, backfill, kiểm tra đối chiếu; chỉ sau đó mới đổi bắt buộc/drop cột cũ.
4. Xây danh mục nguyên liệu/đơn vị/dinh dưỡng.
5. Xây Supplier + SupplierKitchen và quy trình nhập kho/lot/ledger theo Kitchen.
6. Xây Dish + DishVersion + DishIngredient + DishApproval.
7. Xây MealPlan + MealPlanItem + approval/revision theo School và Kitchen.
8. Xây sản xuất, xuất kho, giao nhận và truy xuất.
9. Sau mỗi giai đoạn chạy Prisma validate/generate, backend build, migration status, test phân quyền và đối chiếu dữ liệu.

## 7. Phạm vi tài liệu này

Tài liệu này **không phải migration** và không thay đổi schema.prisma, database hoặc dữ liệu hiện có. Các model/quan hệ trong ERD là thiết kế mục tiêu; trước khi viết migration cần hoàn thành bước kiểm kê dữ liệu thực tế và chốt các chi tiết còn mở ở mục 5.


## 8. Chốt phạm vi tài khoản bếp tại trường (xác nhận ngày 17/11/2026)

Hai tài khoản hiện có role `SCHOOL_KITCHEN` và `schoolId=TH Phạm Hùng` được xác nhận là **nhân viên phía trường**, không phải nhân viên của Bếp Long Hoa. Vì trường đang được bếp trung tâm phục vụ và không có bếp tại chỗ, cần phân biệt rõ vai trò theo nơi làm việc và nhiệm vụ thực tế:

- Nhân viên phía trường: tiếp nhận suất ăn, kiểm đếm, kiểm tra tình trạng/chất lượng khi giao nhận, xác nhận giao nhận và ghi nhận sự cố tại trường. Phạm vi dữ liệu gắn với `schoolId`; không cấp quyền quản lý công thức, kho trung tâm, nhập hàng hoặc xuất kho của Bếp Long Hoa.
- Nhân viên bếp trung tâm: thuộc `kitchenId` của Bếp Long Hoa; quản lý công thức do bếp sở hữu, nguyên liệu, nhà cung cấp trong phạm vi bếp, kho, sản xuất, xuất dùng và giao hàng.
- BGH: thuộc `schoolId`; quản lý thực đơn của trường và luồng duyệt theo thẩm quyền đã phân công.
- UBND: thuộc `wardId`; xem/quản lý phạm vi phường theo chính sách phân quyền.
- SUPER_ADMIN: phạm vi toàn hệ thống, dành cho quản trị nền tảng.

### Quy tắc dữ liệu và phân quyền phát sinh

1. Không chuyển `schoolId` của hai tài khoản `SCHOOL_KITCHEN` sang `kitchenId`; không đổi vai trò chỉ vì tên role có chữ KITCHEN.
2. Các API giao nhận phải xác thực nhân viên trường chỉ thao tác với Delivery/DeliveryItem thuộc trường được gắn trong tài khoản.
3. Nhân viên trường có thể xác nhận số lượng, thời điểm, tình trạng giao nhận và tạo biên bản/sự cố; không được ghi sổ StockMovement của bếp trung tâm.
4. Nhân viên bếp trung tâm chỉ thao tác kho và sản xuất thuộc kitchenId được cấp; việc giao đến trường phải nằm trong KitchenSchoolAssignment có hiệu lực tại thời điểm nghiệp vụ.
5. Cần cân nhắc đổi tên role `SCHOOL_KITCHEN` thành tên phản ánh đúng nhiệm vụ (ví dụ `SCHOOL_MEAL_RECEIVER` hoặc `SCHOOL_FOOD_STAFF`) trong một thay đổi riêng. Chưa đổi enum hoặc dữ liệu role trong giai đoạn thiết kế này; nếu đổi phải có mapping migration và rà soát JWT/guards/frontend.
6. Không mặc định mọi nhân viên trường đều có quyền duyệt món hoặc duyệt thực đơn. Quyền duyệt thuộc vai trò được ủy quyền ở trường (ví dụ SCHOOL_ADMIN hoặc người được phân quyền riêng).

### Ma trận quyền tối thiểu đã chốt

| Nghiệp vụ | Nhân viên trường (hiện role SCHOOL_KITCHEN) | Nhân viên bếp trung tâm |
|---|---|---|
| Xem thực đơn trường được phép | Có | Có, trong phạm vi trường được phân công khi cần thực hiện |
| Xác nhận nhận suất ăn | Có | Không xác nhận thay bên nhận |
| Ghi nhận thiếu/thừa/hư hỏng khi giao | Có | Xem và xử lý phía giao |
| Quản lý công thức của bếp | Không | Có, trong phạm vi bếp |
| Quản lý nhà cung cấp của bếp | Không | Có, trong phạm vi bếp |
| Nhập/xuất/điều chỉnh tồn kho bếp | Không | Có, trong phạm vi bếp và quyền được cấp |
| Tạo/điều phối đợt sản xuất | Không | Có |
| Duyệt món/thực đơn | Không mặc định | Không mặc định; theo vai trò được ủy quyền |
