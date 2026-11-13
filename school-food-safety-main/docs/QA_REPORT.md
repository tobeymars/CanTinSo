# Báo cáo QA frontend

## Cập nhật 26/10/2026 — xác nhận phạm vi frontend và tối ưu tải trang

- Giữ đúng phạm vi frontend-only: không thêm API, backend, database, migration hoặc xác thực thật; form và thao tác tiếp tục lưu DEMO trên trình duyệt.
- Tách tải theo nhu cầu cho form phản ánh, thực đơn tuần, gallery, trang truy xuất QR và module quản trị. Bundle chính giảm từ khoảng 693 KB xuống 387 KB trước gzip; build không còn cảnh báo chunk vượt 500 KB.
- Thay animation số liệu phụ thuộc Motion bằng phiên bản `requestAnimationFrame` nhỏ gọn, vẫn tôn trọng `prefers-reduced-motion` và giữ định dạng số hiện tại.
- Sửa toàn bộ 4 cảnh báo React về ref trong render, state đồng bộ trong effect và thời gian không thuần khi render.
- `npm run lint`: đạt, 0 lỗi/0 cảnh báo.
- `npm run build`: đạt.
- `npm test`: 22/22 đạt.
- `npm run test:e2e`: 34/34 đạt, bao gồm popup phản ánh lazy-load, responsive, dark mode, axe, vai trò DEMO, thực đơn, QR, kho và nhà cung cấp.

## Cập nhật 24/10/2026 — quản lý kho và nhà cung cấp

- Thêm trang **Nhà cung cấp** với 6 bản ghi DEMO, KPI công nợ, lọc, phân trang, CRUD, xác nhận xóa, import JSON và export CSV. Chỉnh sửa giữ nguyên vị trí dòng; dữ liệu lưu localStorage.
- Thêm trang **Quản lý kho** gồm 7 tab và tab phụ Serial: 31 mặt hàng, 16 lô, cảnh báo dưới định mức/hết hạn, KPI, biểu đồ, tồn kho, phiếu nhập/xuất/chuyển và truy xuất lô.
- BGH, bếp trung tâm và bếp tại trường có thao tác frontend; Phòng VH–XH chỉ đọc; vai trò ngoài phạm vi nhận trạng thái không có quyền nếu truy cập URL trực tiếp.
- Visual QA đạt ở desktop 1440px và mobile 390px; bảng rộng cuộn trong vùng bảng, toàn trang không tràn ngang. Ảnh: `suppliers-ward-readonly-1440.png`, `suppliers-mobile-390.png`, `warehouse-trace-desktop.png`, `warehouse-trace-mobile.png`.
- `npm run build`: đạt; còn cảnh báo bundle chính trên 500 kB. `npm run lint`: đạt, còn 4 cảnh báo React hiện hữu.
- `npm test`: 19/19 đạt. `npm run test:e2e`: 31/31 đạt; bài mới kiểm tra CRUD nhà cung cấp, phân quyền chỉ đọc, 7 tab kho, tạo phiếu nhập, serial, truy xuất, axe và responsive.
- Không có API, migration hoặc database thay đổi; toàn bộ là frontend DEMO và không dùng cho dữ liệu thật.

## Cập nhật 24/10/2026 — ảnh chỉ tại mốc Sẵn sàng phục vụ

- Quy tắc domain và UI đã đổi đồng bộ: `DISPATCHED`, `ARRIVED`, `PLATED` không yêu cầu/không nhận ảnh; `READY` bắt buộc ít nhất một ảnh hợp lệ.
- Ảnh bữa ăn do người dùng cung cấp được tối ưu thành `public/meal-ready-demo.webp`, gắn duy nhất với `READY` trong dữ liệu DEMO và chỉ công khai sau xác nhận BGH trong luồng thao tác.
- Các không gian Bếp trung tâm, Tiếp nhận tại trường, Nhân viên ra món/Bếp trường, BGH, Phòng VH–XH và Phụ huynh dùng chung quy tắc; dữ liệu localStorage cũ được loại ảnh khỏi các mốc trước khi đọc.
- `npm run build`: đạt; Vite còn cảnh báo bundle chính trên 500 kB.
- `npm test`: 19/19 đạt.
- `npm run test:e2e`: 28/28 đạt, gồm kiểm tra các mốc trước không có input ảnh, `READY` có ảnh, BGH xác nhận và phụ huynh xem ảnh.
- `npm run lint`: đạt, còn 4 cảnh báo React hiện hữu; không có lỗi lint.
- Visual QA: ảnh chỉ xuất hiện ở mốc cuối trong `docs/screenshots/meal-progress-roles-1280.png`, bản phụ huynh ở `docs/screenshots/home-390.png`; không ghi nhận tràn ngang hoặc lỗi tương phản tự động trong các bài axe hiện có.

## Cập nhật 24/10/2026 — CTA tiến trình theo vai trò

- Thêm CTA tại tổng quan cho bốn vai trò tác nghiệp: Bếp trung tâm, Nhân viên tiếp nhận tại trường, Nhân viên ra món và Bếp nấu tại trường; liên kết thật tới `/van-hanh`.
- BGH dùng nhãn **Xem & xác nhận tiến trình**; Phòng VH–XH dùng nhãn chỉ đọc **Xem tiến trình suất ăn**; phụ huynh không có CTA này.
- Build đạt; lint không có lỗi và còn 4 cảnh báo React hiện hữu.
- Playwright theo quyền và điều hướng 6 vai trò đạt; kiểm tra responsive/axe tổng quan Phòng VH–XH đạt trên desktop và 390px.

Ngày: 17/10/2026. Phạm vi: frontend minh họa, không backend.

## Kết quả
- `npm.cmd run build`: đạt (TypeScript strict và Vite).
- `npm.cmd test`: 9/9 đạt, quy trình hai mô hình và logic vai trò thuần TypeScript.
- `npm.cmd run test:e2e`: 7/7 đạt trên Edge headless.
- axe WCAG 2 A/AA: không ghi nhận vi phạm tự động ở trang chủ phụ huynh và tổng quan VH–XH trong các bài test.
- Responsive không tràn ngang toàn trang: 375, 390, 430, 768, 1024, 1440px. Bảng dữ liệu quản trị có vùng cuộn ngang riêng.
- Ảnh chụp: `docs/screenshots/home-*.png`, `dark-mobile.png`, `ward-desktop.png`, `ward-mobile.png`.

## Luồng đã kiểm tra
Chọn trường; xem lịch tuần và đổi ngày; tab nguồn gốc/giám sát; drawer di động; dark mode; gửi góp ý và lưu lại sau reload; đổi không gian BGH/bếp/VH–XH; chỉnh thực đơn và số suất phản ánh lại ở view phụ huynh; xuất bếp không ảnh; ảnh tại mốc Sẵn sàng phục vụ; bếp không có nút nhận hàng hộ trường; tải CSV theo chế độ xem.

## Files chính
`src/App.tsx`, `src/Admin.tsx`, `src/lib/data.ts`, `src/lib/store.ts`, `src/index.css`, `src/App.css`, `src/Admin.css`, `packages/domain/policy.ts`, `packages/domain/policy.test.ts`, `tests/*.spec.ts`, `playwright.config.ts`, `vite.config.ts`, `package.json`, `package-lock.json`, `public/meal-demo.jpg`, `public/favicon.svg`, `index.html`, `README.md`, `IMPLEMENTATION_PLAN.md`.

Không có API/migration/database thay đổi còn lại: mã backend và dependencies thử nghiệm đã gỡ theo yêu cầu chỉ frontend.

## Giới hạn
- Bundle chính khoảng 588 KB trước gzip (~185 KB gzip); module quản trị đã lazy load. Vite còn cảnh báo kích thước chunk.
- Chưa kiểm tra Zalo runtime, Lighthouse hoặc máy di động vật lý. axe không thay thế kiểm tra accessibility thủ công đầy đủ.
- Không có xác thực/phân quyền thật. localStorage không phù hợp dữ liệu cá nhân và không đồng bộ giữa thiết bị.
- Upload ảnh là đọc file trên trình duyệt; giấy tờ chỉ lưu tên và metadata. Không có quét mã độc hoặc lưu trữ máy chủ.
- Không tuyên bố bản frontend này hoàn thành toàn bộ nghiệp vụ M01–M08 vận hành thực tế.

## Cập nhật hình ảnh và bảng màu
Đã thêm 9 ảnh phối cảnh do người dùng cung cấp tại `public/images/canteen/`, sử dụng ảnh toàn cảnh ở hero và bộ sưu tập `src/CanteenGallery.tsx`. Ảnh giữ nguyên nội dung và luôn gắn nhãn phối cảnh minh họa. Bảng màu đổi sang cobalt/navy, nền kem và điểm nhấn vàng cam; cập nhật light/dark mode, favicon và theme-color. Các ảnh không được dùng như ảnh bữa ăn hay bằng chứng xác nhận.

Build đạt; 7/7 E2E và axe hiện có đạt sau cập nhật màu. Kiểm tra bổ sung trên trình duyệt: mở bộ sưu tập, ảnh tiếp, phím mũi tên, Escape và không tràn ngang ở 390px. Ảnh chụp `cobalt-gallery-desktop.png`, `cobalt-gallery-mobile.png`.

## Mobile theo giao diện ứng dụng
Đã bổ sung `src/MobileNavigation.tsx` và `src/MobileApp.css`, cập nhật shell trong `src/App.tsx`.
- Thanh tab 5 mục cố định; vai trò quản trị có Vận hành/Thực đơn/Thêm.
- Header sticky, chọn ngày nhanh, thẻ nội dung tối ưu điện thoại, segmented navigation sticky.
- Form/tài khoản/chi tiết mở dạng bottom sheet bằng native dialog; hỗ trợ Escape và focus mặc định của dialog.
- Khoảng đệm đáy, safe-area, input 16px để hạn chế zoom form trên iOS, reduced-motion.
- Desktop giữ bố cục hiện tại; frontend-only, không API/migration.

Kiểm chứng: build đạt; 8/8 Playwright tests đạt, gồm tab mobile, bảng tài khoản bám đáy và footer không bị thanh tab che. Responsive 375–1440px không tràn ngang. axe trên mobile 390px sáng/tối không có vi phạm WCAG A/AA tự động. Chưa kiểm tra thiết bị thật/Zalo runtime. Ảnh mới: `mobile-app-390.png`, `mobile-app-light-390.png`, `mobile-app-dark-390.png`.

## React Bits
Đã tích hợp mã nguồn TypeScript chính thức từ https://reactbits.dev/ và https://github.com/DavidHDev/react-bits:
- CountUp: số liệu phụ huynh/quản trị chuyển số trong 650 ms.
- SpotlightCard: ánh sáng vàng nhẹ trên hero trường, không chạy ambient loop.
- ClickSpark: sáu tia nhỏ khi bấm/chạm thẻ chỉ số; tự dừng khi bật reduced-motion, kể cả thay đổi tùy chọn trong lúc trang mở.

Mã nguồn và giấy phép giữ tại `src/components/react-bits/`, cấu hình giao diện ở `integration.css`. Dùng Motion hiện có, không thêm thư viện hiệu ứng mới. Không đổi backend hoặc dữ liệu.

Kiểm thử: 8/8 E2E hiện có đạt sau tích hợp; kiểm tra bổ sung touch navigation, counter khi đổi trường, dừng/xóa canvas khi chuyển reduced-motion và không có lỗi JavaScript đạt. Build TypeScript/Vite đạt. Bundle chính khoảng 626 KB trước gzip; vẫn có cảnh báo chunk lớn như trước.

## Popup căn giữa
Theo yêu cầu mới, popup mobile (tài khoản, form, ngày, chi tiết, ảnh và quản trị) chuyển từ bottom sheet sang modal căn giữa ngang/dọc. Giữ lề an toàn, giới hạn chiều cao và cuộn nội dung; bỏ thanh kéo ở đầu sheet. Sửa `src/MobileApp.css` và cập nhật kiểm thử vị trí dialog trong `tests/parent.spec.ts`. Build đạt; kiểm thử popup tài khoản mobile kiểm tra tọa độ tâm, điều hướng và khoảng đệm thanh tab.

## Sửa lỗi popup lô nguyên liệu ở góc trái trên
Đã tái hiện desktop 1440px: dialog có x=0, y=0 và margin=0 do reset CSS. Bản sửa trước chỉ căn giữa trong media query mobile. Đã đặt `position: fixed; inset: 0; margin: auto` vào quy tắc dialog chung trong `src/App.css`. Kiểm thử hồi quy đúng popup “Thông tin lô nguyên liệu DEMO” trên 390/768/1440px kiểm tra tâm ngang/dọc và nút đóng. Build đạt.

## Bộ chọn theo phong cách Apple
Thay cả ba select (trường, loại ý kiến, trạng thái suất ăn) bằng `src/components/ui/Select.tsx` và `Select.css`. Menu bo góc, viền mảnh, dấu tích, mô tả phụ, active highlight theo bảng màu và dark mode. Dùng native Popover top layer để không bị hero/card/dialog cắt menu; tự tính vị trí và giới hạn theo viewport. Runtime chưa hỗ trợ Popover dùng select native đã style.

Có combobox/listbox semantics, phím mũi tên/Home/End, Enter/Space, Escape, Tab, tìm bằng gõ ký tự, click ngoài để đóng; tích hợp React Hook Form bằng Controller. Không thay dữ liệu hoặc backend. Đã kiểm tra chọn mục trong dialog, đổi trường/counter, lọc danh sách, menu ở viewport 375px và axe khi menu mở. Bổ sung `tests/select.spec.ts`, cập nhật kiểm thử chọn trường hiện có. Sửa role của loading state để hỗ trợ nhãn accessible.
