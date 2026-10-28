# Các endpoint dùng trong bài Prompt 3

Gateway ở `http://localhost:3002`. Mặc định tất cả endpoint ngoài health/register/login đều yêu cầu `Authorization: Bearer <token>`.

| Method | Endpoint | Vai trò | Mô tả |
|---|---|---|---|
| GET | /api/health | public | Health các service và Redis |
| POST | /api/auth/register | public | Đăng ký (role normal) |
| POST | /api/auth/login | public | JWT |
| GET | /api/customers/:uid | chính chủ/admin | Thông tin Customer và Membership |
| PUT | /api/customers/:uid | chính chủ/admin | Cập nhật fullname; chỉ admin được đổi mid |
| GET | /api/memberships/:mid | JWT | Xem mname, score |
| POST | /api/memberships | admin | Thêm hạng thành viên |
| PUT | /api/memberships/:mid | admin | Cập nhật hạng |
| GET | /api/products | JWT | Danh sách sản phẩm |
| GET | /api/products/:pid | JWT | Chi tiết sản phẩm |
| POST | /api/products | admin | Tạo sản phẩm |
| PUT | /api/products/:pid | admin | Sửa sản phẩm/tồn kho |
| DELETE | /api/products/:pid | admin | Xóa mềm sản phẩm |
| POST | /api/orders | JWT | Tạo đơn, trừ tồn kho, tính discount |
| GET | /api/orders | JWT | Liệt kê đơn của mình |
| GET | /api/orders/:oid | chủ đơn/admin | Chi tiết đơn, Shipment nếu có |
| GET | /api/shipments/by-order/:oid | chủ đơn/admin/staff | Giao hàng theo đơn (staff được truy cập nếu phân quyền service cho phép) |
| GET | /api/shipments/:shipid | chủ đơn/admin/staff | Xem giao hàng |
| PATCH | /api/shipments/:shipid/status | admin/staff | Cập nhật PENDING→SHIPPING→DELIVERED |

Tạo đơn mẫu: `{"items":[{"pid":1,"qty":2}]}`. Không điền `uid` hoặc `discount` trong body; hệ thống lấy uid từ JWT và tính discount qua Membership. OID/PID/UID chỉ là ví dụ, hãy lấy ID hiện có từ API.

HTTP thường gặp: 200 (GET), 201 (tạo), 400 (body sai), 401 (thiếu/sai JWT), 403 (không đủ quyền), 404 (không tồn tại), 409 (trùng/tồn kho/trạng thái), 429 (quá nhiều request), 503/504 (phụ thuộc dịch vụ chậm/hỏng).
