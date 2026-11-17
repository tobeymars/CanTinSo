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
- School 1—N MealPlan; Kitchen 1—N MealPlan; MealPlan 1—N MealPlanItem. Mỗi MealPlan do đúng một bếp lập đề xuất cho đúng một trường.
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

- MealPlan: thuộc một School, chỉ rõ Kitchen lập đề xuất/chuẩn bị, ngày phục vụ, trạng thái và người lập. Bếp là bên khởi tạo và gửi đề xuất; trường là bên xem xét và phê duyệt. Quy tắc này áp dụng như nhau cho Kitchen.type=CENTRAL và Kitchen.type=SCHOOL.
- Ràng buộc tạo/sửa: tại ngày phục vụ, bếp phải có phân công hiệu lực với trường hoặc là bếp tại trường của trường đó. Backend xác thực quan hệ này.
- Không dùng một thực đơn chung cho nhiều trường. Cùng bếp/cùng món vẫn tạo các MealPlan độc lập.
- Mỗi trường chỉ có một MealPlan chính cho một serviceDate + mealType: unique (schoolId, serviceDate, mealType). Không bổ sung MealSession/ServingShift ở giai đoạn này. Nhiều nhóm tuổi, định lượng khác nhau và nhiều đợt giao nhận được biểu diễn ở các dòng khẩu phần/giao nhận, không tạo MealPlan thứ hai.
- MealPlanItem: tham chiếu DishVersion cụ thể; số suất, nhóm tuổi, hệ số khẩu phần/định lượng áp dụng và snapshot tên món/công thức/dinh dưỡng cần thiết để bảo toàn lịch sử.
- AgeGroup: danh mục nhóm tuổi/khối lớp. Một công thức chuẩn có thể dùng cho nhiều nhóm tuổi; hệ số khẩu phần và số suất đặt ở dòng thực đơn theo nhóm tuổi, không nhân bản DishVersion chỉ vì tuổi khác nhau.
- Giữ unique (schoolId, serviceDate, mealType): mỗi trường chỉ có một thực đơn chính cho mỗi loại bữa trong ngày. Revision lưu lịch sử các lần gửi/sửa của cùng thực đơn; không tạo MealPlan mới cho từng lần chỉnh sửa hoặc từng đợt giao nhận.
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
| MealPlan | Có schoolId, date, mealType, servings, status String; chưa có kitchenId, submit/approval history | Giữ school ownership; thêm kitchenId lập đề xuất, enum status, người lập/gửi, actor/timestamps, revision và approval history; unique schoolId + serviceDate + mealType |
| MealPlanItem | Chỉ có dishId + servings; unique plan + dish | Tham chiếu DishVersion, AgeGroup, portionFactor và snapshot; unique theo plan + version + ageGroup/session phù hợp |
| TraceEvent | Gắn InventoryLot; metadata JSON | Giữ, bổ sung liên kết optional đến stock movement, production batch, delivery và actor có FK |
| FoodSafetyCheck | Gắn School | Giữ phạm vi trường; các kiểm tra tại bếp có thể cần kitchenId hoặc thực thể KitchenInspection riêng |

## 5. Các điểm rủi ro phải xử lý trước migration

1. **Backfill Supplier:** một Supplier cũ gắn với School. Cần xác định bếp phục vụ trường ở thời điểm dữ liệu được tạo; không tự gán tất cả nhà cung cấp của trường cho bếp trung tâm hiện tại nếu lịch sử phân công không chứng minh được.
2. **Backfill InventoryLot:** phải ánh xạ schoolId → kitchenId và kho nhận. Trường hợp không xác định được bếp lịch sử phải đưa vào báo cáo ngoại lệ để xử lý thủ công, không đoán.
3. **Dish.recipe JSON:** cần kiểm tra shape dữ liệu thực tế ở DB và localStorage/demo. Chỉ chuyển tự động khi ánh xạ được nguyên liệu/đơn vị; phần không khớp đưa vào danh sách cần rà soát.
4. **MealPlan hiện tại:** status là String; chuẩn hóa enum phải có bảng mapping giá trị cũ. MealPlanItem.dishId hiện trỏ Dish global; cần xác định kitchen owner sau khi thêm kitchenId.
5. **Uniqueness của MealPlan:** giữ unique (schoolId, serviceDate, mealType) theo nghiệp vụ đã chốt. Revision và các đợt giao nhận là bản ghi con, không phải MealPlan khác.
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
7. Xây MealPlan + MealPlanItem + approval/revision: bếp trung tâm hoặc bếp tại trường lập và gửi đề xuất; BGH/người được ủy quyền ở trường duyệt.
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


## 9. Quy trình lập và duyệt thực đơn (xác nhận ngày 17/11/2026)

### Quy tắc chung cho cả hai mô hình bếp

1. **Bên lập đề xuất:** tài khoản thuộc Kitchen được quyền lập MealPlan cho trường mà bếp đang phục vụ. Với bếp trung tâm, phải có KitchenSchoolAssignment hiệu lực tại serviceDate. Với bếp tại trường, Kitchen.schoolId phải đúng School.id.
2. **Gửi duyệt:** người lập gửi bản đề xuất (revision) sang trường; nội dung revision đã gửi phải được lưu bất biến.
3. **Bên duyệt:** SCHOOL_ADMIN hoặc người dùng được trường ủy quyền có quyền xem xét. Người duyệt có thể APPROVE hoặc RETURN yêu cầu chỉnh sửa kèm nhận xét/lý do. Nhân viên tiếp nhận suất ăn không mặc nhiên có quyền duyệt.
4. **Chỉnh sửa:** khi trường trả lại, bếp chỉnh sửa và gửi revision mới của cùng MealPlan; giữ nguyên revision cũ và lịch sử thao tác.
5. **Sau phê duyệt:** revision được duyệt là căn cứ cho sản xuất. Nếu cần thay đổi nội dung đã duyệt, phải tạo revision thay thế và đi qua luồng duyệt lại; không sửa đè snapshot đã duyệt.
6. **Phạm vi:** bếp chỉ thấy/lập thực đơn cho các trường được phân công; trường chỉ xem/duyệt thực đơn thuộc chính schoolId của mình. Backend phải kiểm tra scope, không tin schoolId/kitchenId do client tự gửi.
7. **Một thực đơn chính:** unique (schoolId, serviceDate, mealType). Nhiều nhóm tuổi và khẩu phần nằm ở MealPlanItem/portion allocation; giao nhiều đợt nằm ở Delivery/DeliveryItem.

### Phân biệt nhân sự bếp trường và nhân viên tiếp nhận tại trường

- Nhân sự làm việc cho **bếp tại trường** là người dùng thuộc Kitchen.schoolId và phải được scope bằng kitchenId để lập thực đơn, quản lý công thức/kho/sản xuất theo quyền được cấp. Không nhầm nhóm này với nhân viên trường đang nhận suất ăn.
- Nhân viên **tiếp nhận suất ăn phía trường** tiếp tục thuộc schoolId (role hiện tại SCHOOL_KITCHEN); được xem thực đơn đã gửi/được duyệt và xác nhận giao nhận, ghi nhận sự cố. Không có quyền lập thực đơn với tư cách bếp, quản lý kho bếp hoặc duyệt thực đơn.
- Với bếp trung tâm, nhân sự bếp thuộc kitchenId như quy tắc đã chốt. Role cụ thể và quyền chi tiết phải được rà soát toàn bộ enum/guards/frontend trước khi đổi tên hoặc tái sử dụng role hiện có.

### Ma trận quyền bổ sung

| Nghiệp vụ | Nhân sự bếp trung tâm | Nhân sự bếp tại trường | BGH/người được ủy quyền | Nhân viên tiếp nhận tại trường |
|---|---|---|---|---|
| Lập MealPlan đề xuất | Có, trường được phân công | Có, trường sở hữu bếp | Không mặc định | Không |
| Sửa đề xuất bị trả lại | Có, trong scope | Có, trong scope | Không | Không |
| Gửi revision để duyệt | Có | Có | Không | Không |
| Xem và duyệt/trả lại | Không duyệt thay trường | Không duyệt thay trường | Có, trong school scope | Không mặc định |
| Quản lý công thức/kho/sản xuất | Có, kitchen scope | Có, kitchen scope và quyền được cấp | Không mặc định | Không |
| Xác nhận giao nhận tại trường | Không xác nhận thay bên nhận | Không xác nhận thay bên nhận nếu chính bếp là bên giao | Có thể giám sát | Có, school scope |

Quyền tạo thực đơn cho bếp trường cần gắn với tài khoản thực sự thuộc Kitchen (kitchenId), không cấp cho mọi User có schoolId. Không thay đổi enum role hiện tại cho đến khi có thiết kế role/scope và kế hoạch chuyển đổi riêng.

## 10. Đối chiếu phân quyền backend và frontend (rà soát ngày 17/11/2026)

### 10.1. Nguyên tắc thiết kế

- Role xác định nhóm nghiệp vụ; scope xác định phạm vi dữ liệu. Không xem role là bằng chứng đủ để truy cập mọi bản ghi.
- Mỗi request phải lấy danh tính và scope từ phiên đã xác thực ở backend. Không tin `schoolId`, `wardId`, `kitchenId` do frontend gửi lên để quyết định quyền.
- `SCHOOL_KITCHEN` hiện được giữ cho nhân viên tiếp nhận suất ăn tại trường (school receiver), có `schoolId`, không mặc định là nhân sự vận hành Kitchen.
- Nhân sự vận hành bếp trường phải gắn với `kitchenId` của bản ghi `Kitchen.type = SCHOOL`; nhân sự bếp trung tâm phải gắn với `kitchenId` của `Kitchen.type = CENTRAL`.
- Các role nghiệp vụ bếp dùng chung cho hai loại bếp (quản lý, dinh dưỡng, kho) chỉ được phép hoạt động trong đúng kitchen scope. Loại bếp quyết định những nghiệp vụ được phép thực hiện.
- BGH hoặc người được trường ủy quyền là bên duyệt thực đơn. Nhân viên tiếp nhận suất ăn không có quyền lập/duyệt thực đơn chỉ vì đang có `schoolId`.

### 10.2. Ma trận role và scope mục tiêu

| Backend role | Scope bắt buộc | Quyền chính | Không được mặc định |
|---|---|---|---|
| `SUPER_ADMIN` | Toàn hệ thống | Quản trị và giám sát toàn hệ thống; thao tác theo đơn vị được chọn có kiểm tra rõ ràng | Không được bỏ qua kiểm tra tính hợp lệ của đơn vị mục tiêu |
| `UBND_ADMIN` | `wardId` | Quản lý bếp trung tâm thuộc phường; phân công bếp cho trường trong phường; xem giám sát trong địa bàn | Không xem/sửa dữ liệu phường khác |
| `SCHOOL_ADMIN` | `schoolId` | Quản trị trường; quản lý nhân sự thuộc trường; duyệt/trả lại phiên bản thực đơn; giám sát giao nhận | Không sửa kho/công thức của bếp trung tâm |
| `CENTRAL_KITCHEN` | `kitchenId`, Kitchen.type=CENTRAL | Tài khoản quản trị/đầu mối bếp trung tâm; quản lý bếp trong phạm vi được cấp; lập đề xuất thực đơn cho trường đang được phân công | Không thao tác bếp trung tâm khác hoặc trường ngoài assignment |
| `KITCHEN_MANAGER` | `kitchenId` | Điều hành bếp, phân công công việc và nghiệp vụ bếp được cấp | Không truy cập bếp khác |
| `NUTRITIONIST` | `kitchenId` | Công thức, định lượng, dinh dưỡng và đề xuất thực đơn | Không tự duyệt thực đơn thay trường |
| `WAREHOUSE_STAFF` | `kitchenId` | Nhập, xuất, kiểm kê, lô hàng và tồn kho của bếp | Không thao tác kho của bếp khác |
| `SCHOOL_KITCHEN` | `schoolId` | Tiếp nhận suất ăn, kiểm đếm, kiểm tra chất lượng, xác nhận giao nhận, báo cáo sự cố | Không quản lý công thức, nhà cung cấp, mua hàng, tồn kho hoặc sản xuất của bếp |
| `SCHOOL_STAFF` | `schoolId` | Nghiệp vụ trường học được phân quyền cụ thể | Không mặc định có quyền quản trị học sinh hoặc bếp |
| `PARENT` | Liên kết tài khoản-phụ huynh-học sinh | Xem dữ liệu được phép của học sinh được liên kết | Không truy cập dữ liệu học sinh khác |

Ghi chú: `CENTRAL_KITCHEN` là role đầu mối hiện hữu được tạo cùng hồ sơ bếp trung tâm. `KITCHEN_MANAGER`, `NUTRITIONIST`, `WAREHOUSE_STAFF` là role nhân sự bếp hiện hữu trong enum. Chưa đổi enum hoặc tạo role mới trong bước thiết kế này. Việc phân tách quyền theo loại bếp và quyền tác vụ cần được hiện thực bằng policy/service guard sau khi thống nhất.

### 10.3. Đối chiếu frontend hiện tại

| Backend role / nhóm | Ánh xạ frontend hiện tại | Kết quả rà soát |
|---|---|---|
| `SUPER_ADMIN` | `school_board` | Đang dùng chung không gian BGH; cần tách quyền quản trị toàn hệ thống khỏi giao diện trường |
| `SCHOOL_ADMIN` | `school_board` | Phù hợp không gian BGH |
| `UBND_ADMIN` | `culture_social_office` | Có giao diện quản lý bếp trung tâm khi tài khoản là UBND |
| `CENTRAL_KITCHEN` | `central_kitchen` | Có workspace bếp trung tâm |
| `SCHOOL_KITCHEN` | `school_kitchen` | Sai với nghiệp vụ đã chốt: tài khoản hiện hữu là nhân viên tiếp nhận tại trường, không mặc định là nhân sự bếp |
| `KITCHEN_MANAGER`, `NUTRITIONIST`, `WAREHOUSE_STAFF` | Chưa ánh xạ | AuthGate không tìm thấy workspace và từ chối hiển thị ứng dụng |
| `SCHOOL_STAFF` | Chưa ánh xạ | AuthGate không tìm thấy workspace |
| `PARENT` | `parent` | Có workspace, nhưng cần hoàn thiện kiểm tra quan hệ phụ huynh-học sinh ở backend |

Frontend hiện có các view legacy `school_receiver` và `meal_service_staff`, nhưng chúng không thuộc tập `ActiveViewRole`; bộ chọn demo hiện chỉ có năm workspace. View demo và localStorage không phải cơ chế phân quyền bảo mật. Các thao tác thật phải được backend xác thực và kiểm tra scope.

### 10.4. Các sai lệch backend đã xác định

1. `RolesGuard` hiện chỉ kiểm tra danh sách role từ decorator, không kiểm tra `schoolId`, `wardId`, `kitchenId`. Scope hiện được kiểm tra rải rác trong từng service; cần policy thống nhất và kiểm thử truy cập chéo đơn vị.
2. `UsersService.create`: BGH tạo `SCHOOL_KITCHEN` hoặc `SCHOOL_STAFF` bằng cách gán `schoolId`; chưa có luồng tạo user vận hành bếp trường gắn `kitchenId`.
3. DTO tạo user chưa nhận `kitchenId`; DTO cập nhật cũng chưa có trường này. Không bổ sung trường này theo cách cho client tự chọn kitchenId; backend phải suy ra hoặc xác minh từ quyền quản trị và quan hệ Kitchen-School.
4. `SCHOOL_KITCHEN` hiện nằm trong nhóm role có school scope; cần giữ điều này cho nhân viên tiếp nhận, không chuyển các tài khoản hiện hữu sang kitchen scope.
5. `CENTRAL_KITCHEN` được tạo cùng hồ sơ bếp và gắn kitchenId. Tuy nhiên các role nhân sự bếp khác chưa có luồng tạo/gán/quản lý tài khoản gắn cùng kitchen.
6. `StudentsController` và `AttendanceController` khai báo SUPER_ADMIN có quyền, nhưng các service hiện yêu cầu user có schoolId. Cần quy định rõ SUPER_ADMIN phải chọn school scope hợp lệ cho từng thao tác; không tự ý bỏ điều kiện scope.
7. `AttendanceController` không cho UBND truy cập dữ liệu giám sát điểm danh; đây không phải mặc định là lỗi, cần tách rõ dữ liệu điểm danh học sinh khỏi báo cáo giám sát bữa ăn.
8. `StudentBulkImportController` khai báo SUPER_ADMIN, nhưng import service chỉ làm việc với schoolId từ user; cần một cơ chế chọn trường được backend kiểm tra nếu tiếp tục cho SUPER_ADMIN sử dụng.
9. Tài khoản PARENT có workspace frontend nhưng chưa thấy quan hệ user-parent-student trong schema hiện tại; chưa đủ cơ sở để mở API dữ liệu riêng tư cho phụ huynh.
10. Một số nghiệp vụ frontend hiện còn dùng dữ liệu DEMO/localStorage (ví dụ danh mục món trong KitchenDishCatalog); không được xem thao tác trên giao diện demo là luồng nghiệp vụ backend đã hoàn tất.

### 10.5. Lộ trình triển khai sau khi chốt thiết kế

1. Giữ nguyên các role và dữ liệu tài khoản hiện có; không đổi role `SCHOOL_KITCHEN` hiện hữu.
2. Thống nhất ma trận permission theo tác vụ (read/create/update/submit/approve/receive/issue stock), phân biệt theo Kitchen.type và scope.
3. Thiết kế luồng quản trị nhân sự bếp: UBND/SUPER_ADMIN quản lý đầu mối bếp trung tâm; đầu mối/quản lý bếp tạo nhân sự bếp trong cùng kitchen; BGH quản lý nhân viên trường và nhân viên tiếp nhận.
4. Thiết kế backend scope policy dùng lại được; mọi truy vấn và mutation phải ràng buộc scope tại service/database query, có kiểm thử IDOR/truy cập chéo trường, phường và bếp.
5. Sửa AuthGate để ánh xạ `SCHOOL_KITCHEN` sang workspace tiếp nhận tại trường; ánh xạ các role bếp theo kitchen scope; không cấp quyền chỉ bằng cách đổi view role.
6. Tách workspace SUPER_ADMIN khỏi SCHOOL_ADMIN; bổ sung cơ chế chọn đơn vị mục tiêu có kiểm tra ở backend.
7. Hoàn thiện quan hệ phụ huynh-học sinh trước khi cấp dữ liệu cá nhân cho PARENT.
8. Sau khi permission matrix, API contract và test cases được duyệt mới triển khai code; sau đó mới đánh giá thay đổi Prisma schema/migration. Không tạo migration trong giai đoạn thiết kế.

### 10.6. Kiểm thử phân quyền bắt buộc

- UBND phường A không đọc/ghi được trường, bếp hoặc user thuộc phường B.
- Bếp trung tâm A không đọc/ghi công thức, kho, lô hàng, sản xuất hoặc đề xuất thực đơn của bếp B.
- Bếp trung tâm chỉ lập đề xuất cho trường có assignment hiệu lực tại ngày phục vụ.
- Bếp trường chỉ thao tác dữ liệu của Kitchen.type=SCHOOL gắn với chính tài khoản; không dùng schoolId đơn thuần để cấp quyền vận hành bếp.
- Nhân viên tiếp nhận `SCHOOL_KITCHEN` chỉ thao tác tiếp nhận/giao nhận của trường mình; không truy cập API kho, công thức, mua hàng, sản xuất.
- BGH chỉ duyệt thực đơn của trường mình; không duyệt thực đơn trường khác.
- SUPER_ADMIN khi thao tác nghiệp vụ có đối tượng trường/bếp phải chỉ định đối tượng hợp lệ; API không được bỏ lọc chỉ vì role toàn cục.
- Tài khoản không hoạt động bị từ chối; tài khoản bị đổi scope phải có hiệu lực ngay ở request tiếp theo.
- PARENT chỉ xem học sinh đã được liên kết và được người giám hộ xác minh.


## 11. Ma trận phân quyền theo tài nguyên và hành động (đề xuất ngày 17/11/2026)

> Đây là ma trận nghiệp vụ mục tiêu để chốt API/policy. Các module thực đơn, món, kho, sản xuất, giao nhận và kiểm thực chưa được đăng ký trong `AppModule` ở phiên bản backend được rà soát; các quyền bên dưới không có nghĩa API đã tồn tại.

### 11.1. Quy ước

- **Đọc (R):** xem danh sách/chi tiết trong scope.
- **Tạo (C):** tạo bản nháp hoặc chứng từ mới.
- **Sửa (U):** sửa bản nháp/chưa ghi sổ; dữ liệu đã gửi duyệt/đã duyệt/đã ghi sổ phải theo quy trình revision hoặc giao dịch đảo.
- **Gửi (S):** gửi revision thực đơn hoặc hồ sơ sang bước duyệt.
- **Duyệt/trả (A):** chỉ chủ thể phê duyệt độc lập theo scope trường.
- **Thực hiện (X):** xác nhận nghiệp vụ thực tế như nhận hàng, xuất kho, sản xuất, giao/nhận.
- Ký hiệu **Có** luôn có nghĩa là có trong đúng scope và đúng trạng thái nghiệp vụ; không phải quyền toàn hệ thống.
- SUPER_ADMIN có quyền quản trị nền tảng và giám sát toàn cục. Với mutation nghiệp vụ có schoolId/kitchenId, vẫn phải chỉ định và xác thực đối tượng đích; không dùng truy vấn không lọc scope.
- Quyền của các vai trò nhân sự bếp (CENTRAL_KITCHEN, KITCHEN_MANAGER, NUTRITIONIST, WAREHOUSE_STAFF) cần gắn với kitchenId. Quyền theo tác vụ có thể tiếp tục được tách nhỏ; không suy ra rằng mọi nhân viên bếp đều được ghi sổ kho hoặc phát hành công thức.

### 11.2. Ma trận quyền mục tiêu theo nghiệp vụ

| Tài nguyên / hành động | SUPER_ADMIN | UBND_ADMIN | SCHOOL_ADMIN / người được ủy quyền | CENTRAL_KITCHEN / KITCHEN_MANAGER | NUTRITIONIST | WAREHOUSE_STAFF | SCHOOL_KITCHEN (tiếp nhận) |
|---|---|---|---|---|---|---|---|
| Danh sách trường | Toàn hệ thống | R trong wardId | R trường mình | Chỉ trường được phân công | Chỉ trường được phân công khi cần lập món/thực đơn | Chỉ trường liên quan đến nghiệp vụ kho | R trường mình |
| Hồ sơ bếp / phân công bếp-trường | C/R/U toàn cục có audit | C/R/U trong wardId | R bếp phục vụ trường mình | R assignment của bếp mình | R assignment của bếp mình | R assignment của bếp mình | R thông tin bếp giao suất cho trường |
| Quản lý tài khoản | Quản trị toàn cục | Quản lý đầu mối bếp thuộc ward theo chính sách | C/R/U nhân viên trường và tiếp nhận thuộc schoolId | C/R/U nhân sự cùng kitchen nếu được giao quyền quản lý | Không mặc định | Không mặc định | Không |
| Danh mục Ingredient/Unit/Allergen chuẩn | C/R/U toàn cục | R | R | R | C/R/U đề xuất; phát hành theo quản trị danh mục | R | R thông tin dị ứng cần cho tiếp nhận |
| Supplier và SupplierKitchen | Quản trị toàn cục | R/giám sát bếp trong ward; không tự xác nhận giao dịch mua | R thông tin nhà cung cấp phục vụ trường nếu cần giám sát | C/R/U nhà cung cấp được phép của kitchen | R | R; tạo hồ sơ mua/nhận theo phân công | Không |
| Dish / DishVersion / DishIngredient | Quản trị/khôi phục có audit | R giám sát trong ward | R món được đề xuất cho trường | C/R/U bản nháp món thuộc kitchen | C/R/U công thức, định lượng, dinh dưỡng trong kitchen | R hướng dẫn/nguyên liệu cần chuẩn bị | R món đã được duyệt và phục vụ tại trường |
| Gửi phiên bản món cho trường duyệt | Không thay bên gửi | R giám sát | Không | S cho trường đang được phân công | S nếu được giao quyền | Không mặc định | Không |
| Duyệt DishVersion theo trường | Chỉ can thiệp quản trị có audit, không thay phê duyệt thường lệ | R trạng thái trong ward | A cho schoolId mình | Không | Không | Không | Không |
| MealPlan / MealPlanItem | R toàn cục; sửa chỉ qua thao tác quản trị có audit | R giám sát trong ward | R trường mình; không tạo mặc định | C/R/U bản nháp cho trường được phân công | C/R/U nội dung dinh dưỡng nếu được phân công | R nhu cầu chuẩn bị | R thực đơn đã gửi/đã duyệt của trường |
| Gửi revision thực đơn | Không | Không | Không | S cho trường được phân công | S nếu được giao quyền lập kế hoạch | Không | Không |
| Duyệt / trả revision thực đơn | Không thay BGH trong quy trình thường lệ | R giám sát | A cho schoolId mình | Không duyệt đề xuất của chính bếp | Không | Không | Không |
| StockReceipt / nhập kho / InventoryLot | R có audit | R giám sát bếp trong ward | R báo cáo liên quan trường; không ghi sổ kho bếp trung tâm | C/R theo quyền quản lý kho | R | C/R/X trong kitchen | Không |
| StockMovement / xuất kho / điều chỉnh / kiểm kê | R có audit | R giám sát | R báo cáo tổng hợp liên quan trường | Phê duyệt/điều phối theo phân quyền kitchen | R | C/R/X; giao dịch đã ghi sổ không sửa/xóa | Không |
| ProductionBatch / xác nhận sản xuất | R có audit | R tiến độ trong ward | R tiến độ suất ăn trường mình | C/R/X trong kitchen | R; xác nhận chất lượng công thức theo phân quyền | X chuẩn bị/xuất nguyên liệu | R thông tin lô/đợt liên quan giao nhận |
| Delivery / giao hàng | R có audit | R giám sát trong ward | R trường mình | C/R/X phía giao | R khi cần truy xuất | R | R; không xác nhận thay người nhận |
| DeliveryReceipt / xác nhận nhận tại trường | R có audit | R giám sát | R; xử lý ngoại lệ/giám sát | R kết quả; không xác nhận thay trường | R | R | C/R/X tại schoolId mình |
| FoodSafetyCheck / kiểm thực tại trường | R toàn cục có audit | R giám sát trong ward | C/R/U trong schoolId theo vai trò được giao | R phần liên quan giao hàng; không ghi thay kiểm tra tại trường | R/chuyên môn theo phân công | R phần liên quan lô/kho | C/R/X kiểm tra tiếp nhận và ghi sự cố theo biểu mẫu |
| TraceEvent / truy xuất | R toàn cục có audit | R trong ward | R trường mình | C/R trong kitchen và lô/đợt liên quan | R | C/R sự kiện kho | C/R sự kiện tiếp nhận của trường |
| Student / Attendance | Theo school scope được chọn và xác thực | Không mặc định | C/R/U trong schoolId | Không | Không | Không | Không mặc định; chỉ khi có nhiệm vụ được cấp riêng |
| Parent/student private data | Chỉ quản trị có căn cứ và audit | Không | Trong phạm vi trách nhiệm trường, theo chính sách dữ liệu | Không | Không | Không | Không |

**Lưu ý về vai trò bếp:** CENTRAL_KITCHEN là tài khoản đầu mối bếp trung tâm hiện tại. KITCHEN_MANAGER, NUTRITIONIST và WAREHOUSE_STAFF không nên có cùng một bộ quyền ghi/sửa; bảng trên là mức quyền nghiệp vụ tối đa dự kiến, còn quyền cụ thể phải được cấp theo tác vụ. Nếu một người kiêm nhiệm, việc kiêm nhiệm phải được cấp rõ ràng và audit.

### 11.3. Ma trận API đang tồn tại trong backend được rà soát

| API | Role tại Controller | Kiểm tra trong Service | Kết luận |
|---|---|---|---|
| `GET /api/v1/schools` | SUPER_ADMIN, UBND_ADMIN | SUPER_ADMIN toàn hệ thống; UBND lọc wardId | Scope rõ ở service |
| `GET /api/v1/schools/me/overview` | SCHOOL_ADMIN | Bắt buộc schoolId và truy vấn theo schoolId | Scope rõ |
| `GET /api/v1/users` | SUPER_ADMIN, SCHOOL_ADMIN, UBND_ADMIN ở class; service chỉ cho SUPER_ADMIN/SCHOOL_ADMIN | SCHOOL_ADMIN lọc schoolId; SUPER_ADMIN toàn cục | Decorator rộng hơn service; cần thống nhất |
| `POST /api/v1/users` | SUPER_ADMIN, SCHOOL_ADMIN, UBND_ADMIN ở class; service chỉ cho SUPER_ADMIN/SCHOOL_ADMIN | BGH chỉ tạo SCHOOL_KITCHEN/SCHOOL_STAFF trong schoolId; SUPER_ADMIN tạo theo DTO và quy tắc role | Decorator rộng hơn service; UBND không tạo user qua endpoint này |
| `PATCH /api/v1/users/:id` | Như trên | SUPER_ADMIN; BGH trong schoolId và role được phép; UBND quản lý CENTRAL_KITCHEN cùng ward | Cần test scope và trường được phép cập nhật |
| `PATCH /api/v1/users/:id/password` | Như trên | Dùng findManagedUser để kiểm tra target | Có scope theo target |
| `GET /api/v1/users/my-kitchen` | SCHOOL_ADMIN | Dùng schoolId tìm assignment hoặc bếp tại trường | Đúng mục tiêu hiển thị bếp phục vụ trường |
| `GET /api/v1/users/central-kitchens` | SUPER_ADMIN, UBND_ADMIN | UBND lọc Kitchen.wardId | Scope ward có |
| `POST /api/v1/users/central-kitchens` | SUPER_ADMIN, UBND_ADMIN | UBND chỉ tạo trong ward; xác minh trường cùng ward, chưa có bếp khác đang phục vụ | Có kiểm tra scope và xung đột phân công |
| `GET /api/v1/students` | SCHOOL_ADMIN, SCHOOL_STAFF, SUPER_ADMIN | Service bắt buộc user.schoolId và lọc schoolId | SUPER_ADMIN được khai báo ở Controller nhưng không dùng được nếu không có schoolId |
| `POST/PUT/DELETE /api/v1/students` | SCHOOL_ADMIN, SUPER_ADMIN | Service bắt buộc schoolId và thao tác theo schoolId | Cùng mismatch với SUPER_ADMIN |
| `GET /api/v1/attendance` | SCHOOL_ADMIN, SCHOOL_STAFF, SCHOOL_KITCHEN, SUPER_ADMIN | Controller bắt buộc schoolId; service lọc schoolId | SCHOOL_KITCHEN hiện có thể đọc attendance trường mình; cần xem lại tính cần thiết theo nhiệm vụ tiếp nhận |

### 11.4. Policy backend bắt buộc cho từng request

1. **Resolve actor:** JWT strategy đọc user đang hoạt động từ DB; role và scope lấy từ bản ghi DB, không tin claim scope do client tự gửi.
2. **Resolve resource:** trước khi đọc/sửa một resource theo id, tìm resource kèm điều kiện scope ngay trong truy vấn (ví dụ `where: { id, kitchenId: actor.kitchenId }`), tránh tải theo id trước rồi quên kiểm tra.
3. **Resolve relationship:** với bếp trung tâm → trường, xác thực KitchenSchoolAssignment có hiệu lực tại serviceDate; với bếp trường, xác thực Kitchen.type=SCHOOL và Kitchen.schoolId trùng trường.
4. **Resolve action + state:** ngoài role/scope, kiểm tra trạng thái bản ghi. Ví dụ chỉ bản nháp được sửa; chỉ revision đã gửi mới được duyệt/trả; chỉ giao dịch chưa ghi sổ mới được xác nhận; giao dịch đã ghi sổ chỉ được đảo.
5. **Separate proposer and approver:** người/bếp lập revision không được tự duyệt revision đó; SCHOOL_ADMIN hoặc người được trường ủy quyền mới được duyệt trong schoolId của mình.
6. **Audit:** lưu actorId, action, resourceId, scope, thời điểm, lý do và dữ liệu trước/sau hoặc snapshot phù hợp đối với duyệt, trả lại, ghi sổ, điều chỉnh, đảo và xác nhận giao nhận.
7. **No implicit global bypass:** SUPER_ADMIN phải cung cấp target scope hợp lệ cho nghiệp vụ theo trường/bếp; không được bỏ lọc truy vấn do thiếu schoolId/kitchenId.
8. **No role-name inference:** SCHOOL_KITCHEN hiện tại là nhân viên tiếp nhận trường. Nhân sự vận hành bếp trường phải có kitchenId hợp lệ; không thể chỉ dựa vào role name hoặc schoolId để cấp quyền bếp.
9. **Deny by default:** role không có trong policy hoặc scope null/không hợp lệ thì từ chối; không tự mở quyền chỉ vì frontend hiển thị route.
10. **Cross-scope tests:** mỗi endpoint phải có test actor cùng scope, khác scope, inactive user, missing scope, resource không tồn tại và sai trạng thái.

### 11.5. Các quyết định cần giữ trước khi triển khai

- Giữ nguyên enum và tài khoản hiện hữu trong giai đoạn này; chưa đổi SCHOOL_KITCHEN, chưa thêm role mới.
- Không tạo quyền tự duyệt cho bếp; không để UBND phê duyệt thay trường trong luồng thường lệ.
- Không cho BGH ghi sổ kho của bếp trung tâm; BGH giám sát nhu cầu, thực đơn, giao nhận và kiểm thực thuộc trường.
- Không cho nhân viên tiếp nhận tại trường thao tác kho/sản xuất của bếp.
- Chưa triển khai API nghiệp vụ thực đơn/kho/giao nhận trong bước này. Trước khi code cần chốt API contract, DTO, trạng thái, audit và test matrix.
- Không sửa source code, Prisma schema hoặc migration trong lần cập nhật tài liệu này.
