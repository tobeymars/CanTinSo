# Route inventory — KIDO ADMIN MBH

Nguồn: `src/App.jsx` của repo tham chiếu tại commit `1e81db4428e772b20673e9ca60032c1a43baad69`.

## Route đã đăng ký

| Route | Page/component | Nhóm menu | Bảo vệ | Trạng thái |
|---|---|---|---|---|
| `/login` | `Login` | Tài khoản | Public | SOURCE_CONFIRMED |
| `/boarding-orders/demo` | `BoardingOrderDemo` | Ẩn | Token demo riêng | SOURCE_CONFIRMED |
| `/` | `Home` | Tổng quan | Token | SOURCE_CONFIRMED |
| `/products` | `Products` | Hàng hóa → Danh mục | Token | SOURCE_CONFIRMED |
| `/meal-items` | `MealItems` | Không có trong Header | Token | SOURCE_CONFIRMED |
| `/price-book` | `PriceBook` | Hàng hóa → Thiết lập giá | Token | SOURCE_CONFIRMED |
| `/stock-takes` | Redirect `/warehouse/inventory` | Route tương thích cũ | Token | SOURCE_CONFIRMED |
| `/account` | `Account` | Menu tài khoản | Token | SOURCE_CONFIRMED |
| `/store-info` | `StoreInfo` | Menu tài khoản | Token | MOCK/INCOMPLETE |
| `/report-end-day` | `ReportEndDay` | Báo cáo → Cuối ngày | Token | SOURCE_CONFIRMED |
| `/report-product` | `ReportProduct` | Báo cáo → Hàng hóa | Token | SOURCE_CONFIRMED |
| `/report-boarding` | `ReportBoarding` | Báo cáo → Bán trú | Token | SOURCE_CONFIRMED |
| `/report-employee` | `ReportEmployee` | Báo cáo → Nhân viên | Token | SOURCE_CONFIRMED |
| `/employees` | `ListEmployee` | Nhân viên → Danh sách | Token | SOURCE_CONFIRMED |
| `/time-sheet` | `TimeSheet` | Nhân viên → Lịch làm việc | Token | SOURCE_CONFIRMED |
| `/time-keeping` | `TimeKeeping` | Nhân viên → Chấm công | Token | MOCK |
| `/pay-sheet` | `Paysheet` | Nhân viên → Bảng lương | Token | SOURCE_CONFIRMED |
| `/suppliers` | `Suppliers` | Nhà cung cấp | Token | SOURCE_CONFIRMED |
| `/customers` | `Customers` | Khách hàng → Danh sách | Token | SOURCE_CONFIRMED |
| `/wallet-transactions` | `WalletTransactions` | Khách hàng → Lịch sử ví | Token | SOURCE_CONFIRMED |
| `/orders` | `Orders` | Đơn hàng | Token | SOURCE_CONFIRMED |
| `/boarding-orders` | `BoardingOrder` | Bán trú | Token | SOURCE_CONFIRMED |
| `/warehouse` | `WarehouseOverview` | Hàng hóa → Kho | Token | SOURCE_CONFIRMED |
| `/warehouse/inventory` | `WarehouseInventory` | Điều hướng nội bộ kho | Token | SOURCE_CONFIRMED |
| `/warehouse/trace` | `WarehouseTrace` | Điều hướng nội bộ kho | Token | SOURCE_CONFIRMED |
| `/stock-lots` | `StockLots` | Điều hướng nội bộ kho | Token | SOURCE_CONFIRMED |
| `/stock-in` | `StockInList` | Điều hướng nội bộ kho | Token | SOURCE_CONFIRMED |
| `/stock-in/create` | `StockInCreate` | CTA từ danh sách | Token | SOURCE_CONFIRMED |
| `/stock-out` | `StockOutList` | Điều hướng nội bộ kho | Token | SOURCE_CONFIRMED |
| `/stock-out/create` | `StockOutCreate` | CTA từ danh sách | Token | SOURCE_CONFIRMED |
| `/stock-sale` | `StockOutList saleMode` | Điều hướng nội bộ kho | Token | SOURCE_CONFIRMED |
| `/stock-sale/create` | `StockOutCreate saleMode` | CTA từ danh sách | Token | SOURCE_CONFIRMED |
| `/stock-transfer` | `StockTransferList` | Điều hướng nội bộ kho | Token | SOURCE_CONFIRMED |
| `/stock-transfer/create` | `StockTransfer` | CTA từ danh sách | Token | SOURCE_CONFIRMED |
| `/cash-management` | `CashManagement` | Hàng hóa → Thu chi | Token | SOURCE_CONFIRMED |
| `/cash-management/payment-vouchers` | `PaymentVoucher` | Điều hướng nội bộ thu chi | Token | SOURCE_CONFIRMED |

## Page tồn tại nhưng không có route trực tiếp

| Page | Cách được dùng | Trạng thái |
|---|---|---|
| `ReceiptVoucher.jsx` | Không tìm thấy route trong `App.jsx`; cần xác nhận CTA hoặc route đã bị bỏ sót | INCOMPLETE |
| `StockSerials.jsx` | Được nhúng trong `WarehouseTrace` | SOURCE_CONFIRMED |
| `UnifiedTrace.jsx` | Được nhúng trong `WarehouseTrace` | SOURCE_CONFIRMED |
| `StockTakes.jsx` | Có page nhưng `/stock-takes` redirect sang inventory | INCOMPLETE/legacy |

## Route không xuất hiện trong menu chính

- `/meal-items`
- `/boarding-orders/demo`
- `/account`
- `/store-info`
- `/warehouse/inventory`
- `/warehouse/trace`
- `/stock-lots`
- `/stock-in`, `/stock-in/create`
- `/stock-out`, `/stock-out/create`
- `/stock-sale`, `/stock-sale/create`
- `/stock-transfer`, `/stock-transfer/create`
- `/cash-management/payment-vouchers`

Các route này phải được giữ khi dựng navigation mới, dù không nằm ở menu cấp một.

## Cây navigation được xác nhận từ source

```text
Tổng quan (/)
Hàng hóa
├── Danh mục (/products)
├── Thiết lập giá (/price-book)
├── Kho (/warehouse)
└── Thu chi (/cash-management)
Nhà cung cấp (/suppliers)
Khách hàng
├── Danh sách khách hàng (/customers)
└── Lịch sử ví thành viên (/wallet-transactions)
Đơn hàng (/orders)
Bán trú (/boarding-orders)
Nhân viên
├── Danh sách nhân viên (/employees)
├── Lịch làm việc (/time-sheet)
├── Bảng chấm công (/time-keeping)
└── Bảng lương (/pay-sheet)
Báo cáo
├── Cuối ngày (/report-end-day)
├── Hàng hóa (/report-product)
├── Nhân viên (/report-employee)
└── Bán trú (/report-boarding)
```

## Hành vi routing và gap

- Tất cả route trừ login/demo đi qua cùng `PrivateRoute`.
- `PrivateRoute` không kiểm tra role/permission hoặc branch scope.
- Không có route 403 và không có catch-all 404.
- Login redirect về `/` sau thành công; chưa có `returnUrl` được xác nhận.
- Header chứa navigation bằng click/hover; chưa đạt keyboard semantics đầy đủ.
- Back/forward và direct URL chưa có E2E trong repo tham chiếu.
- `/boarding-orders/demo` dùng token session riêng và chủ ý không đi qua login thường.

## Đối chiếu với workspace hiện tại

Workspace hiện tại có route cho phụ huynh/an toàn thực phẩm như `/bua-an`, `/nguon-goc`, `/giam-sat`, `/van-hanh`, `/ma-qr-suat-an`, `/quan-ly-kho`, `/nha-cung-cap`, `/xuat-nhap-ton`, `/ho-so`, `/phan-anh`, `/bao-cao`, `/truy-xuat-suat/:token`.

Hai route graph không tương thích về domain, auth và layout. Không được thay route hiện tại bằng route KIDO nếu chưa chọn chiến lược multi-app hoặc repository đích.

