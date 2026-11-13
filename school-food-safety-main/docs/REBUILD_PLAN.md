# Rebuild plan — KIDO ADMIN MBH

## Quyết định kiến trúc cần chốt

Workspace hiện tại và repo KIDO là hai sản phẩm khác nhau. Không thể coi việc thay toàn bộ `src/` là refactor an toàn.

### Phương án A — làm trong repo KIDO (khuyến nghị)

- Checkout một branch từ `phuocyota/FE_Kido_MBH`.
- Giữ route/API hiện tại, bổ sung lockfile, test và TypeScript theo lát cắt.
- Không ảnh hưởng ứng dụng an toàn thực phẩm trong workspace này.

### Phương án B — monorepo hai ứng dụng

```text
apps/
  school-food-safety/   # ứng dụng hiện tại
  kido-admin/           # ứng dụng KIDO
packages/
  ui/                   # primitive thật sự dùng chung
  config/
```

Phương án B cần phê duyệt vì sẽ thay package scripts, hosting, CI, import path và deployment artifact.

## Nguyên tắc triển khai

- Không import `.env` hoặc credential từ repo tham chiếu.
- Không nối production backend để tạo/sửa/xóa dữ liệu trong QA.
- Mọi adapter mock phải có nhãn `MOCK` và không fallback im lặng.
- Giữ endpoint và state transition cho đến khi có contract xác nhận.
- Mỗi phase hoàn thiện theo vertical slice: adapter → state/query → UI → test.
- Không dựng route placeholder để đánh dấu hoàn thành.

## Phase 1 — Foundation

### Deliverable audit đã hoàn thành

- `UI_AUDIT.md`
- `ROUTE_INVENTORY.md`
- `FUNCTION_MATRIX.md`
- `API_MAPPING.md`
- `REBUILD_PLAN.md`

### Công việc code sau khi chốt repo đích

1. Commit lockfile và chuẩn hóa Node/npm version.
2. Tạo catalog route có metadata: title, group, icon, permission, breadcrumb.
3. Tạo design tokens; chưa đổi toàn bộ class trong một lần.
4. Chuẩn hóa `AppLayout`, navigation semantic, mobile drawer và account/notification menus.
5. Bổ sung `ErrorBoundary`, 404, 403, session-expired flow.
6. Chuẩn hóa HTTP adapter, error type, pagination và AbortSignal.
7. Viết smoke E2E cho login + mọi route + desktop/mobile navigation.
8. Chụp baseline 390/768/1024/1440.

Điều kiện hoàn thành: build/lint sạch, route smoke đạt, không mất route ẩn, không đổi contract API.

## Phase 2 — Dashboard và danh mục

### Route

- `/`
- `/products`
- `/meal-items`
- `/price-book`
- `/suppliers`
- `/customers`

### Vertical slice

- Dashboard KPI/report với mapper có schema và định nghĩa công thức.
- Product/category/image/recipe/cost warning.
- Price editing/bulk mutation với dirty state và confirm.
- Supplier/customer CRUD, debt detail, pagination.

### Test

- Filter race/abort, loading/empty/error/retry.
- CRUD validation, duplicate/error response.
- Permission denied.
- Image failure.
- Dashboard total và drill-down đồng nhất.

## Phase 3 — Vận hành

### Route

- `/orders`
- `/boarding-orders`
- `/boarding-orders/demo`
- `/wallet-transactions`
- `/cash-management`
- `/cash-management/payment-vouchers`

### Trọng tâm

- State machine order lấy từ backend.
- Cancel/cash actions có confirm và audit UI.
- Bán trú giữ giới hạn 3 món; transaction nhiều ngày phải có idempotency/rollback.
- Wallet không mở action điều chỉnh nếu backend/permission chưa xác nhận.
- Receipt/payment tách rõ và không dùng `alert`.

## Phase 4 — Kho

### Route

- `/warehouse`, `/warehouse/inventory`, `/warehouse/trace`
- `/stock-lots`
- `/stock-in`, `/stock-in/create`
- `/stock-out`, `/stock-out/create`
- `/stock-sale`, `/stock-sale/create`
- `/stock-transfer`, `/stock-transfer/create`

### Trọng tâm

- Gỡ fallback fixture khỏi production adapter.
- Unit conversion và price/quantity integrity.
- Lot/expiry/serial/QR/FEFO.
- Stock availability và transaction complete.
- Excel phải dùng toàn bộ dataset theo filter server.

## Phase 5 — Nhân sự

### Route

- `/employees`
- `/time-sheet`
- `/time-keeping`
- `/pay-sheet`

### Blocker

`/time-keeping` chưa có API; chỉ được triển khai production sau khi có contract. Có thể giữ mock adapter với nhãn DEMO cho UX review.

### Test

- Employee PII/permission.
- Schedule overlap và weekly repeat.
- Attendance timezone.
- Payroll lifecycle/permission; không tự suy diễn công thức.

## Phase 6 — Báo cáo

### Route

- `/report-end-day`
- `/report-product`
- `/report-employee`
- `/report-boarding`

### Trọng tâm

- Một filter state duy nhất cấp dữ liệu cho chart, table, export và print.
- VN timezone/currency/date.
- Empty/error/loading không làm nhảy layout.
- Zoom/fullscreen/reduced motion.
- A4 portrait/landscape snapshot tests.

## Phase 7 — Hardening

- E2E đa vai trò và permission matrix.
- Axe WCAG A/AA và keyboard-only.
- Visual regression tại 390/768/1024/1440.
- Bundle splitting: report/PDF/XLSX/AG Grid/luckysheet lazy-loaded.
- Security review: token storage, XSS, upload, error/log redaction.
- Staging smoke với dữ liệu riêng; không dùng production mutation.
- Runbook rollback và release checklist.

## Thứ tự ưu tiên kỹ thuật

1. Chọn repo đích.
2. Khóa dependency reproducible.
3. Route catalog + auth/RBAC boundary.
4. HTTP/schema/query layer.
5. Shared UI primitives.
6. Từng vertical slice nghiệp vụ.
7. Báo cáo và tối ưu bundle sau khi dữ liệu ổn định.

## Definition of Done cho mỗi màn

- Không còn action giả.
- Adapter production hoặc mock được gắn nhãn rõ.
- Loading/empty/error/retry.
- Validation và chống submit trùng.
- Permission và branch scope được server xác nhận.
- Responsive 390/768/1024/1440.
- Keyboard/axe cơ bản đạt.
- Unit/integration/E2E cho happy path và lỗi/quyền.
- Build/lint sạch và tài liệu mapping cập nhật.

## Trạng thái hiện tại

Phase 1 audit: hoàn thành ở mức source. Đối chiếu production và mọi phase code còn `BLOCKED BY TARGET-REPO DECISION` cùng access staging/API contract.

