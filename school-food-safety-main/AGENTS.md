# AGENTS.md — HỆ THỐNG AN TOÀN THỰC PHẨM HỌC ĐƯỜNG

> Hướng dẫn bắt buộc cho AI coding agents (Codex, Claude Code, Cursor). Xây dựng hệ thống vận hành thực tế, không chỉ giao diện demo. Ngôn ngữ sản phẩm: tiếng Việt. Mục tiêu thẩm mỹ: sự tinh tế, rõ ràng, mượt mà và có hệ thống của Apple — lấy cảm hứng, không sao chép nhãn hiệu hoặc giao diện độc quyền.

## 0. Vai trò và nguyên tắc làm việc

Bạn là nhóm Product Designer, UX Researcher, Principal Frontend Engineer, Backend Architect, Security Engineer và QA Engineer. Hãy chủ động rà soát repository trước khi sửa code; giữ nguyên kiến trúc đang hoạt động nếu hợp lý, không tự ý thay đổi công nghệ hoặc phá API hiện hữu. Nếu dự án trắng, sử dụng stack đề xuất ở mục 2.

**Ưu tiên:** đúng nghiệp vụ > an toàn và tính toàn vẹn dữ liệu > khả năng truy xuất và kiểm toán > dễ sử dụng > thẩm mỹ và hiệu năng. Thiết kế giao diện phải đẹp ngay từ phiên bản đầu tiên, không để phần UI trở thành việc làm sau cùng.

**Quy tắc thực thi:**
- Đọc code, cấu hình, migration, API, tests và conventions hiện có trước khi thay đổi.
- Đề xuất kế hoạch ngắn, chia theo đợt có thể chạy được; triển khai end-to-end từng luồng (DB → API → UI → test).
- Không tạo nút bấm giả, số liệu giả được trình bày như dữ liệu thật, workflow bế tắc hoặc các màn hình chỉ là placeholder. Dữ liệu mẫu phải gắn nhãn **DEMO**.
- Viết TypeScript strict, module nhỏ, DTO có validation, xử lý lỗi rõ ràng, không dùng `any` tùy tiện.
- Không tự động triển khai production, gửi thông báo thật, xuất bản dữ liệu công khai, hoặc thay đổi/xóa dữ liệu thật khi chưa được phê duyệt cụ thể.
- Sau mỗi giai đoạn: báo cáo file đã sửa, API/migration thay đổi, test đã chạy, cách chạy, điểm còn tồn tại.

## 1. Bối cảnh và mục tiêu

Xây dựng nền tảng **Bữa Ăn Học Đường — An Toàn Thực Phẩm** phục vụ quản lý theo xã/phường, trường học, bếp/căng tin, đơn vị cung cấp, đoàn kiểm tra và phụ huynh. Cung cấp trải nghiệm **mobile-first** cho Zalo Mini App và web quản trị responsive, cùng backend quản lý tập trung.

Mục tiêu:
1. Theo dõi hồ sơ, điều kiện và hiệu lực giấy tờ an toàn thực phẩm của các cơ sở.
2. Công khai có kiểm soát thực đơn, số suất ăn và ảnh bữa ăn thực tế.
3. Truy xuất lô nguyên liệu qua QR và chứng từ kèm theo.
4. Ghi nhận kiểm thực ba bước, lưu mẫu, người phụ trách và nhật ký sửa đổi.
5. Quản lý kiểm tra chính thức, yêu cầu khắc phục và kết quả xử lý.
6. Tiếp nhận phản ánh phụ huynh, trả lời và theo dõi trạng thái bằng mã hồ sơ.
7. Phát hiện thiếu hồ sơ, quá hạn, lô hàng bị thu hồi, nguy cơ an toàn thực phẩm.
8. Dashboard đa trường, đa đơn vị và xuất báo cáo có lọc quyền.

Không tuyên bố một đơn vị “đạt chuẩn”, một món ăn “an toàn” hoặc một kiểm tra “chính thức” nếu thiếu cơ sở dữ liệu được xác nhận bởi người/cơ quan có thẩm quyền.

## 2. Công nghệ và cấu trúc

**Nếu là repository mới:**
- Frontend Mini App: React + TypeScript + Vite; Zalo Mini App SDK và các thành phần tương thích runtime Zalo; React Router; TanStack Query; Zustand cho state giao diện; React Hook Form + Zod; Tailwind CSS + hệ token riêng; Lucide React.
- Admin Web: React + TypeScript + Vite, dùng chung design system, API client và domain types trong monorepo.
- Backend: NestJS + PostgreSQL + TypeORM migrations (hoặc ORM sẵn có của repo), REST OpenAPI/Swagger, JWT/refresh token hoặc phiên xác thực phù hợp, RBAC và kiểm soát phạm vi dữ liệu ở cấp bản ghi.
- Storage: S3-compatible private bucket, signed URL ngắn hạn, antivirus/loại file/kích thước giới hạn và kiểm soát ảnh công khai.
- Async jobs: queue có retry/idempotency cho cảnh báo, xuất báo cáo, xử lý ảnh. Redis/BullMQ chỉ bổ sung khi thực sự cần.
- Tests: Vitest + React Testing Library, Supertest cho API, Playwright cho E2E, axe cho accessibility.

Cấu trúc tham khảo:
```text
apps/
  miniapp/             # phụ huynh và giao diện di động theo quyền
  admin/               # trường, nhà cung cấp, cơ quan quản lý, kiểm tra
  api/                 # NestJS modules
packages/
  ui/                  # design system và primitives
  domain/              # enums, types, schemas, chính sách quyền
  api-client/          # typed API client
  config/              # eslint, tsconfig, tokens
infra/                 # cấu hình triển khai, mẫu .env, backup
```

**Quan trọng:** Zalo Mini App phải được kiểm thử trên môi trường Zalo thực tế; không giả định mọi Web API, thông báo đẩy, quyền camera, đăng nhập hoặc deep-link đều chạy giống trình duyệt. Mọi quyền truy cập hồ sơ phải do backend xác nhận; dữ liệu nhận từ SDK chỉ là input, không là bằng chứng phân quyền.

## 3. Người dùng, tổ chức và phân quyền

Các vai trò:
- **Quản trị hệ thống (system_admin):** cấu hình, tổ chức, vai trò, log và chính sách công khai; không tự động có quyền thay đổi kết quả kiểm tra chính thức.
- **Cán bộ xã/phường (ward_admin):** xem và điều phối đúng địa bàn được giao; duyệt thông tin thuộc thẩm quyền; dashboard và báo cáo.
- **Quản trị nhà trường (school_admin):** hồ sơ trường, đơn vị phục vụ, thực đơn, phân công nhân sự, xử lý phản ánh.
- **Nhân viên bếp/căng tin (kitchen_staff):** phiếu nhập, kiểm thực, lưu mẫu, suất ăn, ảnh bữa ăn theo quyền giao.
- **Nhà cung cấp (supplier):** hồ sơ của mình, nguồn gốc, lô hàng, hóa đơn/chứng từ; không sửa kết quả kiểm tra.
- **Đơn vị kiểm tra (inspector):** lịch kiểm tra, biên bản, bằng chứng, kết luận và yêu cầu khắc phục theo thẩm quyền.
- **Phụ huynh (parent):** xem phần đã công khai, thực đơn, tra cứu nguồn gốc phù hợp, tạo/theo dõi phản ánh của mình.

Thiết kế tổ chức phân cấp: tỉnh/thành → xã/phường → trường → bếp/căng tin. Trường, nhà cung cấp và nhân sự có thể liên kết nhiều đối tượng theo bảng quan hệ rõ ràng. Tài khoản có thể kiêm nhiều vai trò theo scope.

Tạo **permissions matrix** cho từng resource/action: `read`, `create`, `update`, `submit`, `verify`, `approve`, `publish`, `export`, `delete`. Áp dụng **RBAC + scope ABAC** tại backend và cả lọc query dữ liệu; UI chỉ ẩn/hiện thao tác để cải thiện UX, không thay thế phân quyền. Chống IDOR bằng kiểm tra tenant/địa bàn/trường với mọi ID nhận từ client.

## 4. Tám phân hệ nghiệp vụ bắt buộc

### M01 — Hồ sơ ATTP từng trường
- Danh bạ trường; mô hình tổ chức bữa ăn; bếp tại chỗ/đơn vị cung cấp suất ăn; người phụ trách; năng lực phục vụ; bếp/căng tin và nhà cung cấp liên quan.
- Giấy tờ: loại, số, cơ quan cấp, ngày cấp, ngày hết hiệu lực, tình trạng, file đính kèm, người xác minh, lịch sử thay đổi.
- Trạng thái tách bạch: `draft`, `submitted`, `under_review`, `verified`, `needs_update`, `expired`; không đồng nhất hồ sơ tải lên với hồ sơ đã xác minh.
- Chế độ xem công khai chỉ hiển thị danh mục và kết quả được phép công khai, tránh lộ thông tin cá nhân và tài liệu nhạy cảm.

### M02 — Thực đơn và bữa ăn hằng ngày
- Lịch theo ngày/tuần, bữa sáng/trưa/xế, tên món, nguyên liệu liên quan, khẩu phần/suất, số suất dự kiến/thực tế, thời điểm chế biến/phục vụ, ảnh món thực tế.
- Dinh dưỡng/định lượng chỉ hiển thị là **đã xác nhận** nếu có nguồn xác nhận phù hợp; còn lại ghi rõ “ước tính” hoặc “chưa xác minh”.
- Workflow: soạn → gửi duyệt → duyệt → công khai → cập nhật phiên bản; công khai ghi thời gian và đơn vị chịu trách nhiệm.
- Phụ huynh xem theo trường, ngày và tình trạng cập nhật; hỗ trợ lịch sử.

### M03 — Truy xuất QR theo lô
- Quản lý nguyên liệu, nhà cung cấp, lô, nguồn gốc, ngày sản xuất/hạn dùng (nếu có), thời điểm nhập, nhiệt độ/điều kiện nhận (nếu áp dụng), hóa đơn, chứng từ và kiểm tra đầu vào.
- Liên kết `meal ↔ ingredient ↔ batch ↔ supplier ↔ receiving record`, cho phép nhiều lô trong một món.
- Mã QR sử dụng public opaque token/URL, **không chứa PII, thông tin nội bộ hoặc đường dẫn file private**; có khả năng thu hồi/hủy công khai.
- Trang quét QR trên mobile hiển thị chuỗi truy xuất, thông tin công khai đã xác minh, cảnh báo thu hồi và trạng thái thiếu dữ liệu.

### M04 — Kiểm thực ba bước và lưu mẫu
- Biểu mẫu kiểm thực theo từng bước, checklist, thời điểm thực hiện, nhận xét, ảnh minh chứng, người chịu trách nhiệm; áp dụng biểu mẫu theo yêu cầu chuyên môn hiện hành đã được nghiệp vụ phê duyệt.
- Quản lý mẫu lưu: món/mẫu, mã mẫu, lượng mẫu, thời điểm lấy, thời gian lưu, điều kiện/nhiệt độ khi cần, vị trí lưu, người lấy, người bàn giao và thời gian hủy theo quy trình được phê duyệt.
- Ký/xác nhận điện tử nội bộ kèm danh tính, timestamp server, dấu vết thiết bị/phiên; **không mặc định tương đương chữ ký số có giá trị pháp lý**.
- Không sửa đè log đã xác nhận: mỗi chỉnh sửa tạo phiên bản/audit record, lý do sửa; bản cũ vẫn tra cứu được.

### M05 — Kiểm tra, giám sát và khắc phục
- Lịch kiểm tra; đoàn/người kiểm tra; đối tượng; biên bản; tệp bằng chứng; nội dung phát hiện; kết luận; yêu cầu khắc phục; hạn chót; phản hồi và xác nhận hoàn tất.
- Phân biệt **kết quả kiểm tra chính thức** do người có thẩm quyền ký/xác nhận và **dữ liệu nhà trường tự khai báo**.
- Trạng thái: `scheduled`, `in_progress`, `pending_signoff`, `finalized`; khắc phục: `open`, `in_progress`, `submitted`, `verified`, `overdue`.
- Bản kiểm tra đã chốt không thể bị sửa âm thầm; bổ sung bằng phụ lục hoặc phiên bản có audit log.

### M06 — Phản ánh phụ huynh
- Gửi phản ánh kèm loại vấn đề (bữa ăn, vệ sinh, nghi ngờ thực phẩm, khác), nội dung, tối đa số ảnh/tệp phù hợp, trường liên quan và kênh liên hệ tùy chọn.
- Sinh mã hồ sơ không tuần tự, khó đoán; trạng thái `received`, `triaging`, `in_progress`, `resolved`, `closed`, `reopened`; SLA cấu hình theo mức độ.
- Tra cứu riêng theo tài khoản hoặc token xác thực, **không chỉ dựa vào mã hồ sơ** để xem thông tin nhạy cảm.
- Có trao đổi hai chiều, lịch sử xử lý, thông báo trạng thái, chính sách chống spam/lạm dụng và bảo vệ danh tính phụ huynh.
- Trường hợp nguy cơ khẩn cấp: hiển thị hướng dẫn liên hệ cơ quan có thẩm quyền; không dùng AI để tự kết luận mức độ an toàn.

### M07 — Cảnh báo và thông báo
- Tác nhân: hồ sơ hết hạn/sắp hết hạn, thiếu nhật ký, lưu mẫu chưa hoàn thành, lô hàng thu hồi, phản ánh quá hạn, sự cố an toàn thực phẩm.
- Tách `event → rule → recipient → channel → delivery`, có deduplication/idempotency, retry giới hạn, trạng thái gửi, audit.
- Thông báo trong ứng dụng theo vai trò và phạm vi; Zalo notification chỉ thực hiện khi đáp ứng chính sách nền tảng và người dùng đã đủ điều kiện nhận.
- Mức độ: `info`, `warning`, `critical`; cảnh báo quan trọng có quy trình xác nhận xử lý/escalation.

### M08 — Dashboard xã/phường và báo cáo
- Các thẻ tổng quan: số trường, bếp/căng tin, nhà cung cấp, hồ sơ cần bổ sung, phản ánh chưa xử lý, lịch kiểm tra, hạng mục quá hạn.
- Biểu đồ xu hướng theo tuần/tháng, phân nhóm theo địa bàn/trường/trạng thái; drill-down từ KPI về đúng danh sách nguồn.
- Xuất Excel/PDF theo quyền, bộ lọc, thời gian, scope; ghi audit người xuất và tránh lộ PII.
- Mỗi KPI phải định nghĩa công thức, thời điểm cập nhật, empty states và chi tiết nguồn; tuyệt đối không hardcode số liệu lên dashboard production.

## 5. Design direction — Apple-inspired Premium UI

**Ý tưởng:** “Calm confidence”. Sang trọng nhờ bố cục thoáng, font sắc nét, màu tiết chế, thứ bậc rõ, chuyển động có mục đích. Tránh dashboard kiểu template SaaS nhiều gradient, neon, shadow dày, thẻ chi chít hoặc icon đầy màu.

### 5.1. Màu sắc và tokens
- Primary: xanh ngọc sâu `#087F6D` (chủ đề sức khỏe / an toàn), dùng làm điểm nhấn, không phủ xanh toàn bộ màn hình.
- Accent darker `#075E53`; background light `#F5F5F7`; surface `#FFFFFF`; surface-alt `#F8F9FA`.
- Text chính `#1D1D1F`; secondary `#6E6E73`; tertiary `#8E8E93`; border `#E5E5EA`.
- Semantic: success `#248A5B`, warning `#B56B10`, danger `#C93434`, info `#276BD1`; luôn kèm text/icon, không truyền trạng thái chỉ bằng màu.
- Dark mode thật: dark canvas `#0B0D0E`, surface `#1C1C1E`, foreground `#F5F5F7`, border `#38383A`; kiểm tra độ tương phản WCAG AA.
- Token hóa trong một file chung (`colors`, `radii`, `spacing`, `type`, `elevation`, `motion`); không rải giá trị ngẫu nhiên khắp app.

### 5.2. Typography, layout và visual rhythm
- Font: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`/`SF Pro Text` **nếu thiết bị có sẵn**, fallback `Inter`, `Segoe UI`, `sans-serif`; **không bundle/phát tán font Apple khi không có quyền sử dụng**.
- Body 15–16px; secondary 13–14px; headings 22–28px mobile; tiêu đề trang desktop 28–34px; line-height 1.4–1.6.
- Hệ spacing 4/8/12/16/20/24/32/40/48. Lề mobile 16–20px, desktop 24–40px. Nội dung desktop giới hạn chiều rộng hợp lý; dữ liệu bảng được phép rộng hơn.
- Cards bán kính 16–22px, controls 12–14px, pill 999px. Viền 1px mảnh; shadow nhẹ, không xếp chồng 3 lớp đổ bóng.
- Icon nét mảnh đồng nhất 20–24px. Ảnh món ăn thực tế có tỷ lệ 4:3 hoặc 16:10, bo góc 16px, skeleton khi tải; tối ưu kích thước và metadata.
- Khoảng trắng là một phần ngôn ngữ thiết kế. Mỗi màn hình có **một hành động chính**, rõ hierarchy.

### 5.3. Navigation và trải nghiệm
- Mini App: top bar tối giản; tiêu đề lớn khi phù hợp, sticky section nav, bottom tab 4–5 mục tối đa (Trang chủ, Bữa ăn, Truy xuất, Phản ánh, Tài khoản); hỗ trợ safe-area iPhone/Android.
- Tabs phân hệ tại trường: **Bữa ăn | Nguồn gốc | Giám sát**; giữ trạng thái khi đổi tab; có tương tác thực.
- Admin desktop: sidebar gọn, topbar tìm kiếm/thông báo, breadcrumb, dashboard với data cards có khả năng drill-down; mobile admin chuyển sang drawer.
- Form dài dùng progressive disclosure, chia bước rõ và auto-save draft có kiểm soát; select có tìm kiếm, ngày có datepicker tốt, upload có preview/progress/retry.
- Danh sách có search, filter, sort, trạng thái, pagination/infinite scroll phù hợp, empty/error/loading states.
- Hiệu ứng: 150–250ms cho micro-interactions, 250–350ms cho sheets/drawers; easing mượt; skeleton thay spinner toàn màn hình; haptic chỉ khi nền tảng hỗ trợ; tôn trọng `prefers-reduced-motion`.
- Không dùng glassmorphism tràn lan. Blur/translucent material chỉ dùng cho navigation overlay và đảm bảo chữ luôn dễ đọc.

### 5.4. Các màn hình mẫu cần hoàn thiện
1. **Phụ huynh / Trang chủ:** header nền xanh ngọc tiết chế, chọn trường, ngày cập nhật, 3 ô thống kê (*Suất ăn, Nhà cung cấp, Bước ghi nhận*), segmented tab, ảnh bữa trưa thực tế, metadata, QR và nút phản ánh.
2. **Bữa ăn:** calendar tuần, món theo bữa, ảnh thật, nguồn nguyên liệu, số suất, badge “Đã xác nhận/Chưa xác minh” chính xác.
3. **Nguồn gốc:** hành trình nguyên liệu trực quan từ nhà cung cấp → lô → giao nhận → món; mỗi điểm mở drawer chi tiết chứng từ công khai.
4. **Giám sát:** timeline kiểm thực và lưu mẫu, kết quả kiểm tra công khai, phân biệt dữ liệu tự khai và chính thức.
5. **Phản ánh:** form gửi ngắn gọn, ảnh, mức độ, trang theo dõi mã hồ sơ và timeline phản hồi.
6. **Bếp / Trường:** dashboard công việc hôm nay, checklist kiểm thực 3 bước, lưu mẫu, nhập lô, xuất bản thực đơn.
7. **Nhà cung cấp:** lô hàng, chứng từ, điểm giao, cảnh báo thu hồi.
8. **Cán bộ xã/phường:** tổng quan KPI, bộ lọc theo địa bàn/trường, hàng đợi xử lý, biểu đồ, báo cáo.
9. **Đơn vị kiểm tra:** lịch, biểu mẫu, bằng chứng, kết luận và khắc phục.

### 5.5. Tiêu chí kiểm duyệt UI — điều kiện hoàn thành
- Thiết kế riêng cho 375px, 390px, 430px, 768px, 1024px, 1440px; không tràn ngang vô lý, không đè safe-area.
- Tap targets tối thiểu khoảng 44×44px; có keyboard focus, semantic labels, screen-reader support, contrast AA.
- Nội dung tiếng Việt có dấu, số và ngày theo `vi-VN`, format giờ rõ; không cắt chữ khi zoom hệ thống.
- Không có chức năng chỉ hoạt động khi hover; mọi hành động có loading/success/error/retry feedback.
- Review ảnh chụp từng màn trên mobile và desktop; đối chiếu design tokens và sửa những phần chưa đồng nhất.
- Mục tiêu Lighthouse mobile ≥90 cho accessibility/best practices ở phạm vi có thể kiểm soát; performance ưu tiên Web Vitals, bundle splitting, lazy images.

## 6. Domain model tối thiểu

Tạo ERD và migrations cho các nhóm entity sau; điều chỉnh theo repository đang có, đặt FK/index/unique hợp lý:

```text
Organization, AdministrativeUnit, School, Kitchen, Canteen,
User, Role, UserRoleScope, Supplier, SchoolSupplierContract,
ComplianceDocument, ComplianceVerification,
Menu, Meal, MealItem, MealPhoto, Ingredient,
ProductBatch, BatchDocument, Delivery, ReceivingInspection,
MealIngredientBatch, QrPublicToken,
FoodSafetyChecklist, ThreeStepInspection, FoodSample, SampleEvent,
OfficialInspection, InspectionFinding, CorrectiveAction,
FeedbackCase, FeedbackAttachment, FeedbackMessage, FeedbackStatusHistory,
AlertRule, AlertEvent, Notification, NotificationDelivery,
AuditLog, FileAsset, PublicationRecord, ExportJob
```

Mọi entity nghiệp vụ cần `id` (UUID/ULID), `createdAt`, `updatedAt`, `createdBy`, và scope phù hợp. Dữ liệu đã xác nhận/chốt phải có `version`, `verifiedBy`/`approvedBy`, thời điểm server, lý do sửa, audit log append-only. Dùng soft delete khi phù hợp nhưng không xóa dấu vết pháp lý. Không lưu tài liệu binary trong bảng nghiệp vụ.

## 7. API và workflow chuẩn

Đề xuất REST endpoints `/api/v1/...` với OpenAPI và DTO validation:
- `/auth`, `/me`, `/users`, `/organizations`, `/administrative-units`
- `/schools`, `/kitchens`, `/suppliers`, `/compliance-documents`
- `/menus`, `/meals`, `/meal-photos`
- `/batches`, `/deliveries`, `/receiving-inspections`, `/trace/:publicToken`
- `/three-step-inspections`, `/food-samples`, `/sample-events`
- `/official-inspections`, `/corrective-actions`
- `/feedback-cases`, `/feedback-cases/:id/messages`, `/feedback-cases/:id/history`
- `/alerts`, `/notifications`, `/dashboard/ward`, `/reports`, `/files`

Phân biệt **internal APIs** và **public read APIs**; serialize response theo allowlist, không trả toàn bộ entity ra public. Pagination/filter server-side; transaction cho trạng thái quan trọng; optimistic concurrency bằng version; rate limit cho login, QR và phản ánh; idempotency key cho thao tác tạo/gửi quan trọng.

Mỗi workflow phải có state machine rõ: người nào chuyển trạng thái nào, yêu cầu bằng chứng gì, quyền duyệt, khả năng hoàn tác và lưu vết. Server tính các trường tin cậy, client không được gửi `verifiedBy` hay `publishedAt` tùy ý.

## 8. Security, privacy, integrity

- Tuân thủ các quy định bảo vệ dữ liệu cá nhân hiện hành của Việt Nam, xác định mục đích và căn cứ xử lý trước khi thu thập dữ liệu phụ huynh/trẻ em; tối thiểu hóa dữ liệu, thời hạn lưu giữ và quyền truy cập.
- Không hiển thị tên học sinh, số điện thoại, địa chỉ cá nhân, bằng chứng riêng tư, hóa đơn nhạy cảm lên public QR/trang trường.
- Xác thực Zalo qua cơ chế máy chủ xác minh phù hợp tài liệu hiện hành; không tin `userId` client gửi và không dùng access token lâu dài trong localStorage nếu tránh được.
- File: giới hạn kích thước, kiểm MIME thực, phát hiện file độc hại, tên file an toàn, private-by-default, signed URL có thời hạn.
- Mã hóa TLS; secrets trong environment/secret manager; không commit credentials; DB backup có thử restore; account admin MFA nếu hỗ trợ.
- Logging structured có requestId/actorId/scope/action, không log token/PII; audit với old/new diff đã redacted; cảnh báo thay đổi bất thường.
- Chống CSRF tùy cơ chế auth, XSS, SQL injection, SSRF qua file/URL, mass assignment, brute-force, IDOR; security headers và CORS allowlist.
- Xác nhận với chuyên gia pháp lý/nghiệp vụ những mẫu biểu, thời hạn lưu mẫu, loại giấy tờ và điều kiện công khai trước khi sản phẩm được dùng chính thức. Không tự hardcode một quy định pháp luật khi chưa kiểm chứng hiệu lực.

## 9. Seed data và trải nghiệm demo

Tạo seed demo đầy đủ để có thể đi qua hành trình từ trường đến QR và phản ánh:
- 1 xã/phường minh họa, 3 trường, 2 bếp, 4 nhà cung cấp, menu 7 ngày, 10 lô nguyên liệu có QR demo.
- 1 kiểm thực đủ ba bước, 1 mẫu lưu, 1 kiểm tra chính thức minh họa, 2 việc khắc phục, 3 phản ánh ở trạng thái khác nhau, 4 cảnh báo.
- Header/chi tiết hiển thị rõ `Dữ liệu minh họa` và `Bản demo` xuyên suốt; không dùng số liệu/biên bản demo như dữ liệu chính thức.
- Cho phép reset DB demo bằng command riêng, cấm chạy command này trên production.

## 10. Triển khai theo giai đoạn

**P0 — Foundation**: phân tích repo, lập ERD, role matrix, design tokens, auth, layout, component library, migrations, seed demo, CI và môi trường staging.

**P1 — Parent experience**: chọn trường, thực đơn, bữa ăn, nguồn gốc QR, trạng thái giám sát công khai, form và tra cứu phản ánh. Đây là vertical slice đầu tiên phải chạy thật từ API.

**P2 — School/kitchen/supplier**: dashboard việc hôm nay, hồ sơ, giấy tờ, menu, nhập lô, liên kết nguồn gốc, kiểm thực ba bước, lưu mẫu, workflow duyệt nội dung công khai.

**P3 — Inspector/ward**: lịch kiểm tra, biên bản, khắc phục, phản ánh có SLA, cảnh báo, dashboard và export.

**P4 — Hardening/go-live**: E2E đa vai trò, security review, permission tests, load/performance tests, logging, backup/restore, operational runbooks, nghiệm thu nghiệp vụ, phê duyệt phát hành.

Sau mỗi phase phải có demo usable, migration rollback plan và test/report. Không triển khai P2/P3 bằng cách chỉ dựng UI không nối backend.

## 11. Test scenarios cần có

1. Phụ huynh xem trường A nhưng không xem được nội dung chưa công khai hoặc dữ liệu riêng của trường B.
2. Nhân viên bếp trường A không sửa menu trường B, không tự duyệt nội dung đã gửi.
3. QR lô hết hạn/thu hồi hiển thị trạng thái cảnh báo tương ứng; public endpoint không lộ chứng từ private.
4. Thực đơn đã duyệt cập nhật tạo version mới; nhật ký cũ giữ nguyên.
5. Nhật ký kiểm thực đã xác nhận không thể sửa đè hoặc xóa dấu vết.
6. Người không đủ thẩm quyền không thể chuyển kiểm tra thành `finalized`.
7. Phụ huynh không đọc được phản ánh riêng của người khác dù biết mã hồ sơ/ID.
8. Cảnh báo lặp không gửi trùng; thất bại gửi được retry có giới hạn.
9. Báo cáo xã/phường chỉ tính dữ liệu trong scope được cấp, drill-down khớp số tổng.
10. Ảnh lỗi, mạng yếu, Zalo SDK không sẵn, session hết hạn và dark mode vẫn có UX phù hợp.

## 12. Definition of Done / Tiêu chí nghiệm thu

Mỗi chức năng chỉ được coi là hoàn thành khi đáp ứng tất cả:
- UI theo design system premium, responsive, accessibility và các trạng thái đầy đủ.
- Dữ liệu thực qua API và persisted DB; không có hardcoded mock trong production path.
- Validation cả FE/BE, kiểm tra quyền và scope, audit cho thay đổi quan trọng.
- Có unit/integration/E2E cho happy path và ít nhất một đường lỗi/không có quyền.
- Có trạng thái loading/empty/error, hướng dẫn người dùng và log lỗi hữu ích.
- Tài liệu cập nhật: OpenAPI, migration notes, `.env.example`, README setup, screenshot màn hình, checklist bảo mật.
- Production rollout chỉ sau khi có quyết định go-live rõ ràng và kiểm tra rollback.

## 13. Chỉ thị bắt đầu dành cho coding agent

**Bắt đầu ngay bằng việc** kiểm tra codebase và trả lời ngắn:
1. Stack/code đã tồn tại và cấu trúc thư mục.
2. Những module có thể tái sử dụng và gap so với M01–M08.
3. ERD/role matrix sơ bộ và đề xuất kiến trúc không phá hệ thống hiện tại.
4. Kế hoạch P0/P1 kèm danh sách màn hình, API, migrations và tests cụ thể.

Sau đó **triển khai P0 và vertical slice P1** (nếu người dùng đã cho phép tác động repo), ưu tiên tạo trải nghiệm màn hình phụ huynh giống tinh thần bản minh họa: header xanh ngọc sang trọng, chọn trường, ba chỉ số, segmented tabs, card bữa ăn, nguồn gốc và giám sát; nhưng hoàn thiện ở chuẩn sản phẩm Apple-inspired, không sao chép ảnh minh họa một cách máy móc. Báo cáo các phần chưa có dữ liệu hoặc yêu cầu quyết định, không bịa thông tin.

---

## 12. BỔ SUNG NGHIỆP VỤ BẮT BUỘC — SUẤT ĂN BÁN TRÚ VÀ TÀI KHOẢN CHUYÊN BIỆT (17/10/2026)

> Mục này là yêu cầu nghiệp vụ bổ sung, **ưu tiên áp dụng khi có khác biệt** với mô tả vai trò và phân hệ M01/M02/M06 trước đó. Triển khai xuyên suốt database → API → giao diện → kiểm thử. Không chỉ thêm label hoặc màn hình giả. Hệ thống phải hỗ trợ nhiều trường thuộc một xã/phường, một bếp trung tâm phục vụ nhiều trường, một trường có thể thay đổi mô hình cung cấp theo thời gian nhưng mỗi ca/bữa phải chốt chính xác một mô hình vận hành.

### 12.1. Hai hình thức tổ chức suất ăn bán trú

Trường chọn **đúng một hình thức theo từng ngày/ca/bữa** (không chỉ một trường cố định vĩnh viễn):

1. **NẤU TẠI TRƯỜNG (`ON_SITE`)** — trường tổ chức nấu, ra món và phục vụ tại trường. Quy trình trạng thái bắt buộc:
   - `PREPARING` — Đang chuẩn bị/chế biến (nội bộ, nếu cần).
   - `PLATED` — **RA MÓN**: đã bày/ra món, đính kèm **ít nhất một ảnh báo cáo thực tế** và thời gian ghi nhận.
   - `READY` — **MÓN ĂN ĐÃ SẴN SÀNG**: sẵn sàng phục vụ, đính kèm **ít nhất một ảnh báo cáo thực tế** khác gắn với sự kiện chuyển trạng thái.
   - BGH xác nhận theo phân quyền trước khi trạng thái được hiển thị là **Đã xác nhận**; hiển thị riêng thông tin người thực hiện và người xác nhận.
2. **NẤU TẠI BẾP TRUNG TÂM (`CENTRAL_KITCHEN`)** — bếp trung tâm chế biến, xuất bếp và giao trường. Quy trình trạng thái bắt buộc:
   - `PREPARING` — Đang chuẩn bị/chế biến (nội bộ, nếu cần).
   - `DISPATCHED` — **XUẤT BẾP TẠI BẾP TRUNG TÂM**: ghi thời gian, người phụ trách, bếp nguồn, số suất xuất, phương tiện/chuyến giao (nếu có) và **ảnh minh chứng**.
   - `ARRIVED` — **ĐẾN TRƯỜNG**: trường xác nhận nhận hàng, giờ đến, số suất nhận, sai lệch nếu có và **ảnh minh chứng**.
   - `PLATED` — **RA MÓN**: trường ghi nhận ra món, có **ảnh minh chứng**.
   - `READY` — **MÓN ĂN SẴN SÀNG**: trường ghi nhận sẵn sàng phục vụ, có **ảnh minh chứng**.
   - Chỉ bếp được gán cho đơn giao được quyền thao tác xuất bếp; chỉ trường nhận có quyền xác nhận đến trường/ra món/sẵn sàng; BGH xác nhận theo ma trận quyền. Một bếp trung tâm có thể tạo nhiều chuyến/đợt cho các trường khác nhau.

**Quy tắc cốt lõi cho cả hai:**
- Mỗi bữa/ca có `serviceMode`, `schoolId`, `serviceDate`, `mealType`, `expectedServings`, `actualServings`, menu liên quan, đơn vị chuẩn bị, và trạng thái hiện tại tính từ event hợp lệ.
- **Mỗi lần chuyển trạng thái chính bắt buộc tải ít nhất 1 ảnh thật** (không chấp nhận ảnh placeholder, ảnh của trạng thái khác, hoặc chỉ nhập URL tùy ý); hỗ trợ nhiều ảnh, preview, dung lượng/định dạng giới hạn, retry và upload mạng yếu; backend xác minh quyền sở hữu file và ràng buộc ảnh với đúng event.
- Lưu `actorId`, `occurredAt` (giờ thực tế được khai báo), `recordedAt` (giờ server), `photoIds`, `note`, `confirmedBy`, `confirmedAt`, `status`, `location` (tùy chọn và theo quyền riêng tư), `version` và nhật ký append-only.
- Trình tự phải hợp lệ theo state machine; không được `READY` nếu chưa `PLATED`, không được `ARRIVED` nếu chưa `DISPATCHED`. Chặn gửi trùng/replay bằng idempotency key, concurrency control; không sửa/xóa âm thầm lịch sử đã gửi. Sai sót phải được điều chỉnh bằng sự kiện có lý do, để lại phiên bản cũ.
- Hai lớp trạng thái **đã báo cáo** (tác nghiệp) và **đã xác nhận** (BGH) phải khác nhau. Chưa có xác nhận không hiển thị như kết quả chính thức. Cảnh báo khi bữa ăn chậm, bỏ bước, thiếu ảnh hoặc chênh lệch số suất. Không tuyên bố “an toàn thực phẩm” chỉ vì quy trình ảnh đầy đủ.
- Trang công khai cho phụ huynh hiển thị timeline theo mô hình tương ứng, thời gian, ảnh được duyệt công khai, nhãn `Đã báo cáo/Đã xác nhận/Chưa cập nhật`. Tài liệu nội bộ và ảnh có thông tin nhạy cảm không công khai mặc định.

### 12.2. Các tài khoản và quyền nghiệp vụ

| Vai trò | Phạm vi và tác vụ |
|---|---|
| **Phòng Văn hóa – Xã hội xã/phường (`culture_social_office`)** | Xem **tất cả hoạt động thuộc địa bàn được phân công**: trường, bếp trung tâm, hồ sơ giấy phép, thực đơn, tình trạng suất ăn, ảnh báo cáo, nhật ký xác nhận, nguồn cung và lịch sử; nhận và xem toàn bộ phản ánh phụ huynh trong phạm vi, theo dõi tiến độ xử lý, dashboard, báo cáo và cảnh báo. Không được tùy ý sửa hồ sơ tác nghiệp hoặc đóng phản ánh thay BGH nếu chưa có quy trình phân quyền riêng. Việc xem tất cả vẫn tuân thủ phạm vi và bảo vệ dữ liệu cá nhân. |
| **BGH nhà trường (`school_board`)** | Quản lý hồ sơ VSATTP/ATTP và GPKD/giấy tờ điều kiện **theo loại giấy tờ áp dụng thực tế**; nếu nấu tại trường: kê khai toàn bộ nhà cung cấp nguyên liệu đầu vào và giấy phép/chứng từ NCC; nếu dùng bếp trung tâm: kê khai bếp đối tác, GPKD, giấy chứng nhận đủ điều kiện ATTP (nếu thuộc diện phải có), hồ sơ PCCC áp dụng; lên/gửi duyệt/công khai thực đơn; xác nhận các mốc vận hành của suất ăn; nhận, phân công, trả lời và xử lý phản ánh của phụ huynh. |
| **Bếp trung tâm (`central_kitchen`)** | Tài khoản của đơn vị bếp: cập nhật thông tin/giấy tờ thuộc trách nhiệm; quản lý thực đơn phối hợp với trường theo quyền duyệt, hồ sơ nguồn cung, chế biến, các đợt xuất bếp, số suất và ảnh chứng minh; xem dữ liệu liên quan các trường được ký hợp đồng/phân công. **Được xem phản ánh liên quan bếp mình (thông tin tối thiểu cần thiết), KHÔNG được xử lý, trả lời chính thức, đổi trạng thái, phân công hoặc đóng phản ánh.** Không được xác nhận hộ BGH các mốc tại trường. |
| **Phụ huynh học sinh (`parent`)** | Xem thực đơn theo trường/ngày/bữa, ảnh bữa ăn và timeline các mốc được phép công khai; **góp ý thực đơn** (loại riêng), **phản ánh chất lượng bữa ăn** có nội dung/ảnh; xem trạng thái và phản hồi của chính mình; không truy cập hồ sơ nội bộ, thông tin của phụ huynh khác hay dữ liệu học sinh không liên quan. |

- Vai trò `school_board` là phân hệ cụ thể của `school_admin` trước đây; `culture_social_office` là vai trò nghiệp vụ cụ thể của `ward_admin`; `central_kitchen` khác `kitchen_staff` và khác `supplier`. Hỗ trợ mapping/di trú role cũ thay vì cấp quyền mặc định quá rộng.
- Một tài khoản có nhiều liên kết role–scope phải chọn scope hiệu lực rõ ràng; backend luôn kiểm tra phạm vi theo `wardId`, `schoolId`, `centralKitchenId` và hợp đồng/điều phối còn hiệu lực; chặn IDOR ở cả upload, ảnh, báo cáo và phản ánh.
- Phản ánh gửi BGH trường liên quan **đồng thời** xuất hiện trong hộp tiếp nhận của Phòng Văn hóa – Xã hội; phản ánh liên quan bếp trung tâm hiển thị read-only cho bếp đó, không lộ thông tin định danh phụ huynh nếu không cần thiết. Hỗ trợ thông báo realtime/push khi được cấu hình và đã được cấp phép; có log giao nhận thông báo.

### 12.3. Quy trình giấy tờ và thực đơn

- **BGH — nấu tại trường:** tải và quản lý danh sách giấy tờ ATTP áp dụng, thông tin bếp trường; toàn bộ NCC đầu vào theo kỳ hiệu lực, GPKD/giấy tờ đủ điều kiện của NCC áp dụng, chứng từ và thông tin lô theo khả năng truy xuất. Có ngày cấp/hết hạn, nơi cấp, file đính kèm, trạng thái xác minh và cảnh báo hết hạn.
- **BGH — bếp trung tâm:** chọn bếp đối tác còn liên kết; hiển thị thông tin GPKD, giấy chứng nhận ATTP và giấy tờ PCCC **khi pháp luật và loại hình cơ sở yêu cầu**. Phải thể hiện `chưa cung cấp`, `đã tải lên`, `đang xác minh`, `đã xác minh`, `hết hiệu lực`, không tự kết luận đủ điều kiện khi thiếu dữ liệu.
- **Thực đơn:** BGH có quyền tạo, chỉnh sửa, duyệt và công khai; bếp trung tâm được đề xuất/cập nhật bản nháp theo phân công nhưng **BGH chốt bản công khai của trường**. Lưu version, thay món có lý do, thời gian, ai cập nhật và ảnh món thực tế. Một thực đơn có thể phục vụ nhiều trường nhưng bản phê duyệt và điều chỉnh theo trường phải độc lập.
- **Góp ý thực đơn** của phụ huynh khác với **phản ánh chất lượng**: `MENU_SUGGESTION` để tiếp nhận đề xuất món/khẩu phần/dinh dưỡng; `MEAL_QUALITY_REPORT` để tiếp nhận sự cố/chất lượng, có thể gắn bữa/ngày/mốc/ảnh. BGH là đầu mối trả lời và xử lý; Phòng Văn hóa – Xã hội xem và giám sát; bếp trung tâm chỉ xem phản ánh có liên quan, không cập nhật tiến độ/không gửi câu trả lời chính thức.
- Nếu phát sinh phản ánh nghiêm trọng, có nút đánh dấu ưu tiên/chuyển cấp cho người có thẩm quyền, không tự đưa ra kết luận chuyên môn. Ghi log ai tiếp nhận, giao xử lý, phản hồi, kết thúc và thời hạn.

### 12.4. Bảng quyền tối thiểu (phải test ở backend)

| Hành động | Phòng VH-XH | BGH | Bếp trung tâm | Phụ huynh |
|---|---|---|---|---|
| Xem hoạt động trong scope | Toàn địa bàn | Trường mình | Bếp mình và đơn giao liên quan | Bản công khai trường đã chọn |
| Tạo/cập nhật hồ sơ trường & NCC đầu vào | Chỉ xem/giám sát | Có | Chỉ hồ sơ bếp của mình | Không |
| Quản lý giấy tờ bếp trung tâm | Xem | Xem, liên kết/đề nghị bổ sung | Cập nhật giấy tờ của bếp mình | Chỉ dữ liệu được công khai |
| Tạo/chốt thực đơn trường | Xem | Tạo, duyệt, công khai | Đề xuất theo phân công | Xem và góp ý |
| Báo mốc `DISPATCHED` | Xem | Xem/xác nhận theo quy trình | Có, cho đơn của bếp mình | Xem công khai |
| Báo mốc `ARRIVED`/`PLATED`/`READY` | Xem | Có, trường mình; được xác nhận | Không báo hộ trường | Xem công khai |
| Xem phản ánh | Tất cả trong địa bàn | Trường mình | Chỉ phản ánh liên quan, read-only | Chỉ của mình |
| Trả lời/chuyển trạng thái/đóng phản ánh | Theo quy trình giám sát riêng, mặc định không | Có | **Không** | Bổ sung thông tin/mở lại hồ sơ của mình khi được phép |
| Xuất báo cáo tổng hợp | Có, theo địa bàn | Có, theo trường | Báo cáo hoạt động bếp mình | Không |

### 12.5. Cập nhật mô hình dữ liệu và API

Thêm entity/bảng hoặc mở rộng entity hiện có (không tạo hai nguồn sự thật độc lập):

```text
CentralKitchen, CentralKitchenSchoolAssignment,
MealService (schoolId, menuId, serviceMode, serviceDate, mealType,
             centralKitchenId?, expectedServings, actualServings, currentStatus, version),
MealServiceEvent (mealServiceId, status, actorId, occurredAt, recordedAt,
                  note, confirmedBy?, confirmedAt?, version, previousEventId?),
MealServiceEventPhoto (eventId, fileAssetId, visibility, approvedForPublicAt?),
CentralKitchenDispatch (mealServiceId, kitchenId, destinationSchoolId,
                        dispatchBatchCode?, servingsDispatched, servingsReceived?, deliveredAt?),
SchoolSupplierAssignment, ComplianceDocument (mở rộng loại/scope/chủ sở hữu),
MenuSuggestion (parentId, schoolId, menuId?, content, status),
FeedbackCase (mở rộng kind: MENU_SUGGESTION | MEAL_QUALITY_REPORT,
              mealServiceId?, centralKitchenId?),
FeedbackAssignment, FeedbackVisibilityAudit
```

- Nếu `MenuSuggestion` và `FeedbackCase` trùng nghiệp vụ, **ưu tiên dùng chung FeedbackCase với trường `kind`** thay vì lưu phản ánh hai nơi; lựa chọn phải được ghi rõ trong quyết định kiến trúc. Migration an toàn với dữ liệu cũ; index theo địa bàn/trường/bếp/ngày/trạng thái.
- Endpoint gợi ý (điều chỉnh theo conventions repo):
  - `GET/POST /api/v1/meal-services`, `GET /api/v1/meal-services/:id/timeline`
  - `POST /api/v1/meal-services/:id/events` (kiểm tra state machine và ảnh bắt buộc)
  - `POST /api/v1/meal-services/:id/events/:eventId/confirm` (BGH xác nhận)
  - `GET/POST /api/v1/central-kitchens`, `GET/POST /api/v1/central-kitchens/:id/schools`
  - `GET/POST /api/v1/compliance-documents` (lọc theo subject/scope và loại hình)
  - `GET/POST /api/v1/menus`, `POST /api/v1/menus/:id/approve`, `POST /api/v1/menus/:id/publish`
  - `GET/POST /api/v1/feedback-cases?kind=...`, `POST /api/v1/feedback-cases/:id/respond` (**BGH**) và `PATCH /api/v1/feedback-cases/:id/status` (**BGH**)
  - `GET /api/v1/dashboard/culture-social-office` (scope xã/phường)
- Validate DTO nghiêm ngặt, guard quyền/tenant trên từng endpoint, kiểm soát upload, server timestamps, transaction cho thao tác quan trọng. File tài liệu và ảnh bằng chứng private mặc định; public thumbnails phải được duyệt riêng.

### 12.6. Giao diện Apple-inspired cần bổ sung

- **BGH / Suất ăn hôm nay:** segmented control **Nấu tại trường | Bếp trung tâm**, thẻ tiến trình dạng timeline ngang/dọc tùy viewport, mỗi trạng thái có thumbnail ảnh, người thực hiện, giờ, badge chờ xác nhận/đã xác nhận và nút xác nhận rõ ràng. Với bếp trung tâm có thẻ chuyến giao, bếp nguồn và đối chiếu số suất.
- **Bếp trung tâm / Điều hành:** danh sách trường nhận theo ngày, số suất, tiến độ từng chuyến, nút **Xuất bếp + Chụp ảnh**, hồ sơ giấy phép; khu vực **Phản ánh liên quan** chỉ đọc, không có nút xử lý.
- **Phòng Văn hóa – Xã hội / Giám sát:** dashboard toàn địa bàn (trường, bếp, bữa ăn đang triển khai, mốc trễ, thiếu ảnh, hồ sơ sắp hết hạn, phản ánh mới/chưa xử lý); drill-down theo trường/bếp/ngày; bộ lọc và xuất báo cáo.
- **Phụ huynh / Bữa ăn:** chọn trường và ngày, thực đơn đẹp với hình món ăn, timeline vận hành đúng mô hình, ảnh báo cáo công khai; 2 CTA tách bạch: **Góp ý thực đơn** và **Phản ánh chất lượng**. Sau khi gửi có mã hồ sơ/timeline xử lý riêng tư.
- Thiết kế **rất sang trọng theo tinh thần Apple**: nền sáng ấm `#F5F5F7`, accent xanh ngọc sâu `#087F6D`, chữ đen gần tuyệt đối, font hệ thống, bề mặt trắng, corner radius tinh tế, microanimation 150–250ms, loading skeleton, empty state có hướng dẫn, bottom sheets tối ưu thao tác một tay; không lạm dụng gradient/bóng đậm. Ảnh bữa ăn phải là trọng tâm thị giác, có skeleton/zoom/fullscreen và ghi thời gian/bằng chứng rõ ràng.

### 12.7. Kịch bản nghiệm thu bắt buộc

1. Tạo bữa `ON_SITE`, thử báo `READY` trước `PLATED` ⇒ bị từ chối; báo `PLATED` và `READY` với ảnh khác nhau ⇒ thành công; BGH xác nhận và phụ huynh thấy timeline công khai chính xác.
2. Tạo bữa `CENTRAL_KITCHEN`, bếp báo `DISPATCHED` có ảnh, trường báo `ARRIVED`/`PLATED`/`READY` mỗi mốc có ảnh ⇒ thành công; bếp không thể báo `ARRIVED` thay trường; trường khác không thể sửa.
3. BGH nộp giấy tờ phù hợp theo mô hình: `ON_SITE` hiển thị toàn bộ NCC đầu vào/giấy phép; `CENTRAL_KITCHEN` hiển thị giấy tờ GPKD, ATTP, PCCC theo điều kiện áp dụng; giấy hết hạn có cảnh báo, chưa xác minh không được gắn mác đã duyệt.
4. BGH tạo/duyệt/công khai thực đơn; phụ huynh xem và gửi `MENU_SUGGESTION`; BGH tiếp nhận/giải quyết, Phòng VH-XH xem được theo địa bàn.
5. Phụ huynh gửi `MEAL_QUALITY_REPORT`: BGH nhận và xử lý, Phòng VH-XH nhận để giám sát, bếp liên quan **chỉ xem**; thử gọi API xử lý phản ánh bằng token bếp ⇒ **403**.
6. Kiểm thử mọi API chống truy cập chéo xã/trường/bếp, URL ảnh riêng tư, thay ID, trùng event, upload thiếu ảnh, thay đổi trạng thái đồng thời và race conditions.
7. Visual QA trên iPhone 375/390/430px và desktop 1440px, dark mode, nội dung tiếng Việt dài, kết nối chậm, màn hình thiếu dữ liệu; không có CTA giả.

**Thứ tự ưu tiên khi triển khai:** chốt domain và ma trận quyền → 2 state machine vận hành có ảnh → BGH xác nhận → giấy tờ theo mô hình → menu và góp ý/phản ánh → view giám sát xã/phường → polishing UI và E2E. Không tự deploy production.
