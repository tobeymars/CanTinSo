# UI audit — KIDO ADMIN MBH

Ngày kiểm kê: 26/10/2026 (Asia/Ho_Chi_Minh)

## Phạm vi và nguồn bằng chứng

| Nguồn | Trạng thái | Ghi chú |
|---|---|---|
| Workspace `/var/www/school-food-safety` | VERIFIED | React 19, TypeScript, Vite 8; sản phẩm **Bữa ăn học đường — An toàn thực phẩm**, không phải KIDO ERP. |
| `phuocyota/FE_Kido_MBH`, branch `main` | SOURCE_CONFIRMED | Commit `1e81db4428e772b20673e9ca60032c1a43baad69`, thời điểm commit 21/10/2026 17:08:57 +07:00. |
| `https://fe.admin.kidocanteen.kidoedu.vn/report-employee` | UNKNOWN | Không truy cập được bằng phiên công khai. Không thử vượt đăng nhập và không dùng tài khoản production. |
| Backend KIDO | UNKNOWN | Không có OpenAPI, database schema, tài khoản staging hay response mẫu đã xác thực trong workspace. |

Phân loại dùng trong bộ tài liệu:

- `VERIFIED`: đã chạy được trong môi trường kiểm kê.
- `SOURCE_CONFIRMED`: xác định từ mã nguồn nhưng chưa đối chiếu production.
- `MOCK`: dữ liệu giả/hardcode/fallback.
- `INCOMPLETE`: có code nhưng thiếu một phần cần thiết để nghiệm thu.
- `UNKNOWN`: chưa đủ bằng chứng.

## Kết luận điều hành

Repo tham chiếu là một ứng dụng JavaScript riêng biệt với 37 page, 127 component JSX, 29 module API, 7 hook và 19 file fixture. Repo hiện tại là một ứng dụng TypeScript có domain, vai trò và navigation khác. Việc chép trực tiếp hoặc thay `src/` sẽ phá các luồng an toàn thực phẩm, test và quy tắc phân quyền hiện có.

Khuyến nghị kiến trúc: không ghép KIDO ERP vào `src/` hiện tại. Chọn một trong hai hướng trước Phase 2:

1. Tái thiết trong chính repo `FE_Kido_MBH` — ít rủi ro nhất, giữ contract API và lịch sử sản phẩm.
2. Nếu bắt buộc dùng workspace này, chuyển thành monorepo có `apps/school-food-safety` và `apps/kido-admin`; chỉ chia sẻ package UI/token có chủ đích.

Chưa thực hiện hướng nào vì đây là thay đổi cấu trúc lớn và cần quyết định phạm vi rõ ràng.

## Kiểm tra kỹ thuật repo tham chiếu

| Kiểm tra | Kết quả | Phân loại |
|---|---|---|
| Checkout branch/commit | `main` / `1e81db4…` | VERIFIED |
| Dependency lock | Không có `package-lock.json` | INCOMPLETE |
| `npm ci` | Thất bại do thiếu lockfile | VERIFIED |
| Cài tạm `npm install --ignore-scripts` | Thành công trong `/tmp`, không ảnh hưởng workspace | VERIFIED |
| `npm run build` | Thành công | VERIFIED |
| Node tests | 20/20 đạt | VERIFIED |
| `npm run lint` | 78 lỗi, 9 cảnh báo | INCOMPLETE |
| Bundle chính | 2.874 MB, gzip 832.69 KB | INCOMPLETE |
| CSS bundle | 418.27 KB, gzip 97.57 KB | INCOMPLETE |
| E2E route/CRUD/report | Không có Playwright/Cypress suite trong repo tham chiếu | INCOMPLETE |

Các test hiện có chỉ bao phủ in nhãn QR lô, truy xuất sản phẩm theo đơn, cảnh báo giá vốn công thức và quy đổi đơn vị kho. Không có bằng chứng tự động cho đăng nhập, navigation, CRUD chính, báo cáo, mobile hoặc accessibility.

## Kiểm kê layout và navigation

### Header

- Thanh ngang xanh dương, 8 nhóm chính: Tổng quan, Hàng hóa, Nhà cung cấp, Khách hàng, Đơn hàng, Bán trú, Nhân viên, Báo cáo.
- Desktop mở submenu bằng hover; tablet dùng click; mobile dùng drawer.
- Header đọc `window.innerWidth` trực tiếp trong render để phân biệt tablet, không subscribe resize. Trạng thái có thể sai sau khi đổi kích thước.
- Nhiều mục điều hướng là `div` có `onClick`, không phải link/button semantic; keyboard navigation và screen reader chưa đạt.
- Chưa thấy focus management/roving focus/Escape hoàn chỉnh cho menu nhiều cấp.
- Active state dùng `startsWith`, có nguy cơ active sai với route có prefix trùng.

### Tài khoản và thông báo

- Tài khoản lấy từ `localStorage`, có menu account/store/logout.
- Thông báo công thức bếp gọi API và đánh dấu đã đọc.
- Chưa thấy notification route/history tập trung; dropdown thuộc Header.
- Không có bằng chứng production về quyền nhận thông báo hoặc scope chi nhánh.

### Route protection

- `PrivateRoute` chỉ kiểm tra token tồn tại/chưa hết hạn.
- Không có ma trận quyền route/action ở frontend.
- Không có xử lý 401/403 toàn cục trong response interceptor.
- Route không khớp không có trang 404 rõ ràng; shell có thể render trống.

## Kiểm kê design system

### Thành phần đã có thể tái sử dụng

- `PageHeader`, `CustomSelect`, `ToolbarFilterDropdown`.
- Nhóm component kho khá hoàn chỉnh: header, filter panel, product picker, FEFO picker, document table, pagination, empty state cục bộ.
- Nhóm report có action export/print và filter/content tách riêng.
- Các modal nghiệp vụ lớn đã tồn tại cho hàng hóa, công thức, khách hàng, nhân viên, lịch làm việc, bán trú.

### Khoảng trống

- Không có token TypeScript/JS trung tâm; màu/radius/spacing chủ yếu nằm trong Tailwind class và CSS rời.
- Button, modal, table, status badge, pagination và error state có nhiều biến thể cục bộ.
- Một số trang dùng `alert`, một số dùng toast, một số hiển thị message inline.
- Modal chưa dùng chung focus trap, cảnh báo dirty form và confirm destructive action.
- Loading/empty/error không có API component thống nhất.
- Typography và mật độ dữ liệu không nhất quán giữa module cũ và module kho mới.
- Dark mode không được xác nhận trong repo tham chiếu.

## Phân loại dữ liệu giả và phần chưa hoàn thiện

| Khu vực | Bằng chứng | Trạng thái |
|---|---|---|
| Chấm công | `MOCK_CHECKINS` hardcode ngay trong `TimeKeeping.jsx` | MOCK |
| Thông tin gian hàng | Tên, hotline, địa chỉ, website hardcode | MOCK |
| Phiếu nhập/xuất chi tiết | API adapter có fallback sang `datas/stockInListData` và `datas/stockOutListData` | MOCK/INCOMPLETE |
| Báo cáo cuối ngày | mapper/API thật có tồn tại, cần runtime backend để xác nhận toàn bộ nhánh | SOURCE_CONFIRMED |
| Bán trú demo | Token demo riêng, route công khai `/boarding-orders/demo` | SOURCE_CONFIRMED |
| Các file `src/datas/*` | 19 fixture; phải kiểm tra từng import trước khi loại bỏ | MOCK |
| Import supplier | Nút hiện diện nhưng chưa tìm thấy luồng import hoàn chỉnh trong page audit | INCOMPLETE |
| Store info update | Chỉ hiển thị, không có API/form lưu | INCOMPLETE |
| Chấm công API | Không có service tương ứng | INCOMPLETE |
| RBAC | Role được lưu nhưng không chặn route/action theo ma trận | INCOMPLETE/UNKNOWN backend |

## Rủi ro bảo mật và toàn vẹn

1. Access token được lưu dài hạn trong `localStorage`; cần threat model XSS và xác nhận lại contract auth trước khi đổi.
2. Axios response interceptor không tự logout/redirect khi 401 hoặc phân biệt 403.
3. Request interceptor tự loại chuỗi rỗng/null khỏi payload; có thể làm sai nghiệp vụ “xóa giá trị” khi backend dùng `null` hoặc `""`.
4. Không thấy lớp schema validation response; page/component đọc trực tiếp shape API.
5. Một số dữ liệu mock có thể xuất hiện cùng UI API thật; cần adapter và nhãn môi trường rõ ràng.
6. `.env` được commit trong repo tham chiếu. Audit chỉ đọc tên biến, không sao chép hoặc ghi giá trị vào tài liệu.
7. Frontend không thể thay backend authorization; mọi mutation cần xác nhận scope/quyền phía server.

## Responsive và accessibility

- Có nhiều Tailwind breakpoint và bố cục mobile, nhưng chưa có test tự động ở 390/768/1024/1440.
- Navigation dùng phần tử không semantic và phụ thuộc hover ở desktop.
- Chưa có audit axe; modal/drawer chưa được xác minh focus trap và restore focus.
- Một số bảng có fixed/min width hợp lý, nhưng cần kiểm tra toàn trang không tràn ngang.
- Touch target, label, error association và reduced motion chưa có bằng chứng đầy đủ.

## Baseline thiết kế đề xuất

Giữ xanh dương hiện hữu; chuẩn hóa token dùng chung:

| Token | Giá trị khởi đầu |
|---|---|
| `brand.primary` | `#2563EB` |
| `brand.hover` | `#1D4ED8` |
| `brand.soft` | `#EFF6FF` |
| `canvas` | `#F5F7FB` |
| `surface` | `#FFFFFF` |
| `text.primary` | `#0F172A` |
| `text.secondary` | `#64748B` |
| `border` | `#E2E8F0` |
| `success` | `#059669` |
| `warning` | `#B56B10` |
| `danger` | `#C93434` |

Trước khi đổi CSS toàn cục phải có screenshot baseline của từng nhóm route và visual regression tối thiểu desktop/mobile.

## Những gì chưa thể xác minh

- Giao diện và hành vi production sau đăng nhập.
- Response thực tế, lỗi nghiệp vụ, pagination và permission của backend.
- Công thức KPI/doanh thu/lợi nhuận/bảng lương.
- Vai trò nào được dùng action tài chính, kho, nhân sự và báo cáo.
- Tính pháp lý/độ chính xác của quy trình bán trú và tài chính.
- Khả năng trình duyệt/runtime mục tiêu và chính sách phiên production.

