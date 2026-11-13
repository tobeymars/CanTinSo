# Nhập học sinh hàng loạt và đồng bộ Hikvision

## Chuẩn bị ZIP

1. Vào Quản lý học sinh, bấm **Tải Excel mẫu**.
2. Điền Excel. Các cột bắt buộc: Mã học sinh, Họ và tên, Lớp.
3. Các cột khác: Giới tính (Nam/Nữ/Khác), Ngày sinh (YYYY-MM-DD), Người giám hộ, Số điện thoại, Trạng thái (Đang học/Tạm nghỉ/Đã chuyển trường).
4. Tạo thư mục `images`, đặt mỗi ảnh JPEG theo mã học sinh: `HS001.jpg`, `HS002.jpg`.
5. Nén file Excel và thư mục `images` thành một ZIP rồi chọn **Nhập Excel + ảnh (ZIP)**.

Ví dụ:
```
danh-sach-hoc-sinh.zip
├── students.xlsx
└── images/
    ├── HS001.jpg
    └── HS002.jpg
```

## Quy tắc an toàn

- Mã học sinh được dùng làm employeeNo trên Hikvision; mã chỉ nhận chữ, số, gạch dưới và gạch ngang.
- Mỗi ảnh phải là JPEG, tối đa 200 KB, tên file trùng mã học sinh.
- ZIP tối đa 30 MB; tổng dữ liệu sau giải nén tối đa 60 MB; mỗi lần tối đa 1.500 học sinh.
- Nếu employeeNo đã có trên thiết bị mà CanTinSo không có dấu vết đăng ký do hệ thống tạo, bản ghi được bỏ qua; tuyệt đối không ghi đè người dùng hoặc ảnh.
- Người dùng và ảnh được đồng bộ tuần tự. Lỗi tải ảnh không tự tạo lại người dùng ở lần nhập kế tiếp; trạng thái được lưu để thử lại.
- Nếu học sinh đã tồn tại trong PostgreSQL nhưng chưa đăng ký trên thiết bị, hệ thống có thể tiếp tục đồng bộ người dùng và ảnh.

## Cấu hình thiết bị

Giữ các biến HIK_DEVICE_URL, HIK_DEVICE_USERNAME, HIK_DEVICE_PASSWORD, HIK_DEVICE_ID và HIK_SCHOOL_ID hiện có. Có thể cấu hình thêm:
- `HIK_FACE_FDID=1`
- `HIK_FACE_LIB_TYPE=blackFD`

Đảm bảo máy và backend cùng mạng LAN, tài khoản thiết bị có quyền quản lý người dùng và thư viện khuôn mặt. Endpoint/khả năng FDLib có thể phụ thuộc firmware; kết quả mỗi học sinh sẽ hiển thị lỗi trả về từ thiết bị.
