# Báo cáo ngắn Prompt 3 — Backend E-commerce MVP

## Kiến trúc

- REST: `api-gateway` Node.js/Express, JWT validation, phân quyền, Redis cache/rate limiting và logging.
- Bên trong: 5 bounded contexts `auth`, `customer`, `product`, `order`, `shipment`; trao đổi đồng bộ bằng gRPC theo file `.proto`.
- Database-per-Service: Auth/Customer/Order dùng PostgreSQL qua Prisma; Product/Shipment dùng MongoDB riêng; dữ liệu không dùng chung một schema.
- Giao tiếp bất đồng bộ: Order ghi Order + OrderDetail + Outbox; worker Order publish `OrderCreated` vào Kafka topic `order-created`; Shipment Consumer xử lý sự kiện và tạo Shipment. Event trùng được kiểm tra để tránh tạo Shipment trùng.
- Quản lý trạng thái Shipment từ `PENDING` đến `SHIPPING`, `DELIVERED` hoặc `CANCELLED` theo ràng buộc nghiệp vụ.

## DDD

Các service sắp xếp theo các thư mục `domain` (quy tắc/kiểm tra), `application` (use case), `infrastructure` (lưu trữ, kết nối dữ liệu), `interfaces` (gRPC handlers). API Gateway là lớp gọi gRPC bên ngoài, không phải một bounded context nghiệp vụ riêng.

## Luồng trọng tâm của thầy

1. Register → lưu User ở Auth, tạo Customer ở Customer và gắn Membership normal score 10.
2. Login → JWT; Gateway xác thực JWT và kiểm tra role trước khi gọi gRPC.
3. GET Product → Service Product → MongoDB; Redis cache ở Gateway.
4. Create Order → reserve stock Product → truy vấn Customer score → `discount = min(subtotal, score × DISCOUNT_PER_POINT)` (mặc định hệ số 1) → lưu Order, OrderDetail, Outbox.
5. Order worker publish `OrderCreated` vào Kafka → Shipment Consumer tạo Shipment; GET Shipment trả kết quả sau khi xử lý bất đồng bộ.

## Phạm vi kiểm thử

Đối chiếu `docs/test-cases.csv`, chạy `npm test` và `npm run test:e2e`, không gọi đây là 25/25 PASS khi chưa chạy thực tế trên Mac. Các script demo nằm tại `scripts/demo-phieu-cham.cjs`.
