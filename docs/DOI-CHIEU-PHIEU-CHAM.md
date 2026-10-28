# PROMPT 3 — DEMO 8 CÂU (theo phiếu chấm)

**Chạy ở thư mục gốc `ecommerce-microservices` trên Mac.** Trước tiên mở Docker Desktop, tạo `.env` từ `.env.example`, rồi:

```bash
npm ci
npm run check
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 600
docker compose ps -a
curl http://localhost:3002/api/health
npm run demo:setup
```

Kết quả health cần `status: UP`. `product-rs-init`, `kafka-permissions`, `kafka-topic-init` thoát mã 0 (Exited 0) là bình thường. Script setup in ra `uid`, `mid`, `pid` thực tế; không cần đoán ID.

## 1. Giải thích Proto, kiến trúc

**Chỉ file**: `proto/auth.proto`, `proto/order.proto`; các thư mục `services/auth-service`, `customer-service`, `product-service`, `order-service`, `shipment-service`, `api-gateway`.

**Nói (khoảng 30 giây):** “File `.proto` định nghĩa cách các service trao đổi dữ liệu qua gRPC; `service` là dịch vụ, `rpc` là phương thức gọi và `message` là dữ liệu gửi nhận. Bài em chia thành Auth, Customer, Product, Order, Shipment và API Gateway. Mỗi service phụ trách một nghiệp vụ và có database riêng; các service trao đổi nội bộ qua gRPC, còn Order phát sự kiện để Shipment nhận qua Kafka.”

## 2. Chạy Compose, liệt kê container

```bash
docker compose up -d --build
docker compose ps -a
```

**Nói:** “Docker Compose khởi chạy Gateway, năm service, cơ sở dữ liệu riêng, Kafka và Redis. Lệnh `docker compose ps -a` liệt kê toàn bộ container đúng thiết kế, bao gồm các container init đã hoàn thành.”

## 3. Kafka — kiểm tra và giải thích

```bash
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list
```

**Nói:** “Kafka là hệ thống trung gian truyền sự kiện giữa các service. Trong bài em, Order phát sự kiện `OrderCreated` vào topic `order-created`; Shipment nhận sự kiện để tạo giao hàng bất đồng bộ.”

## 4. TC-PRO-01: Lấy danh sách Product

```bash
npm run demo:cham -- 4
```

Tương đương Postman **GET `http://localhost:3002/api/products`**, Authorization **Bearer Token admin** → 200 OK, JSON có `items`.

## 5. TC-CUS-04: Lấy Membership

```bash
npm run demo:cham -- 5
```

Lấy `uid` từ setup, GET `/api/customers/UID` dùng token admin; đọc `mid` trả về và GET `/api/memberships/MID` → `mname`, `score`. **Không gắn cứng** `/customers/1` hay `/memberships/1`.

## 6. TC-CUS-05: Customer không có token

```bash
npm run demo:cham -- 6
```

GET `/api/customers/UID`, Postman Authorization chọn **No Auth** → **401 Unauthorized**.

## 7. TC-ORD-04: Discount theo score

```bash
npm run demo:cham -- 7
```

POST `/api/orders`, Body JSON `{"items":[{"pid": PID,"qty":2}]}`, **Bearer Token của user vừa đăng ký**, không dùng token admin thay cho user. Product demo giá 100, score 10. Với `DISCOUNT_PER_POINT=1`: subtotal 200, discount 10, total 190. **Giảm 10 đơn vị tiền, không phải giảm 10%.** Sau đó GET `/api/orders/OID` để đối chiếu OrderDetail.

## 8. TC-ORD-05: OrderCreated, Kafka và Shipment

**Mở Terminal Kafka trước khi tạo đơn:**

```bash
docker compose exec kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic order-created
```

**Terminal khác:**

```bash
npm run demo:cham -- 8
```

Script tạo Order mới, kiểm tra bản ghi Outbox đã publish và truy vấn Shipment theo OID mới. Đối chiếu sự kiện hiển thị ở Kafka consumer và JSON `Shipment` có trạng thái `PENDING`. Nếu gọi GET ngay khi chưa có Shipment, gọi lại vì consumer xử lý bất đồng bộ.

**Lưu ý**: Mục 1–3 phải thao tác/giải thích trực tiếp; script chỉ tự động hóa mục 4–8. `npm run demo:all` vừa setup vừa chạy 4–8.
