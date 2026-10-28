# PROMPT 3 — E-commerce Microservices (BẢN ĐÃ SỬA)

Dự án theo đề `3. Prompt_microservice.doc` và bảng **25 Test Cases — 5 Bounded Contexts** thầy cung cấp. Công nghệ: Node.js 24, REST API Gateway, gRPC, PostgreSQL/Prisma, MongoDB, Redis, Kafka, Docker Compose.

## 1. Chạy trên MacBook

Mở **Docker Desktop**. Giải nén ZIP, vào thư mục `ecommerce-microservices` và chạy:

```bash
cd ~/Documents/ecommerce-microservices  # thay bằng đường dẫn thực tế
cp .env.example .env                     # CHỈ lần đầu, nếu chưa có .env
npm ci
npm run check
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 600
docker compose ps -a
curl http://localhost:3002/api/health
```

- Nếu đã có `.env` đang dùng với volume cũ, **không ghi đè**. Mật khẩu PostgreSQL trong volume hiện có không tự thay đổi theo `.env` mới.
- Nếu muốn giữ dữ liệu, **không chạy** `docker compose down -v`; dùng `docker compose down` khi dừng.
- Health đúng: HTTP 200 + `status: UP` cùng dependencies UP. Ba container khởi tạo Kafka/replica set có thể có trạng thái `Exited (0)` bình thường.
- Tài khoản mặc định trên database **mới**: `demo_admin` / `DemoAdmin123!` (admin), `demo_staff` / `DemoStaff123!` (shipment_staff). Nếu đã dùng database cũ, seed **không** đổi mật khẩu cũ.
- Port REST: `3002`. Thay `TEST_BASE_URL` nếu Gateway dùng port khác. Root `.env` là file local, không đóng gói và bị `.gitignore` bỏ qua.

## 2. Demo 8 câu theo phiếu chấm

```bash
npm run demo:setup   # tạo User normal, Customer, Product mới; in UID/MID/PID thực tế
npm run demo:cham -- 4
npm run demo:cham -- 5
npm run demo:cham -- 6
npm run demo:cham -- 7
npm run demo:cham -- 8
```

Hoặc chạy cùng lúc `npm run demo:all`. Câu 1–3 vẫn cần mở file Proto, chạy Docker Compose và Kafka CLI để giải thích với thầy; chi tiết và lời nói 30 giây ở **`docs/DOI-CHIEU-PHIEU-CHAM.md`**. Đối với Order, **dùng JWT của user normal mới đăng ký**, không cố định UID, PID hay OID.

Nếu dùng Postman: Import **`docs/postman_collection.json`**, chạy request từ số 00 đến 12. Collection tự lưu token và UID/MID/PID/OID/shipid. Ở bước Shipment, nếu mới tạo Order mà GET trả 404, thực hiện lại sau khi Kafka Consumer xử lý.

## 3. Kiểm thử theo đề thầy

```bash
npm test                        # 42 unit tests logic domain, không cần Docker
npm run check                   # 5 .proto + kiểm tra cú pháp JavaScript
npm run test:e2e                # 25 test case trên HTTP + Kafka + database; cần Docker
npm run test:stock-integration  # tùy chọn; MongoDB tạm, có thể tải binary
```

Bảng TC gốc được chép dưới dạng `docs/test-cases.csv`. File `tests/e2e.cjs` ghi kết quả **thực tế** tại `test-results/e2e.json`. Nếu Docker chưa khởi động, test E2E không tự nhận đạt. Đọc thêm **`docs/KIEM-THU.md`**.

## 4. Những sửa đổi ở bản này

1. **Gateway**: cho phép GET/HEAD/DELETE không cần JSON body; sửa vấn đề API GET Customer/Product/Membership trả 400.
2. **Khôi phục script demo** `scripts/demo-phieu-cham.cjs` và các lệnh `demo:setup`, `demo:cham`, `demo:all` có thật.
3. **Tạo bộ kiểm thử**: 42 unit tests (`tests/unit.test.cjs`), 25 E2E (`tests/e2e.cjs`) theo Excel thầy, kèm bài Mongo integration tùy chọn.
4. **Thêm `.gitignore`, `.dockerignore`, `.env.example`**; loại bỏ `node_modules`, `.git`, `.env` và file rác macOS khỏi ZIP nộp.
5. **Bổ sung Postman collection**, tài liệu API, kiến trúc, cách demo 8 câu và đối chiếu 25 TC.

## 5. Phạm vi và kết quả kiểm tra

Đã kiểm chứng trong môi trường tạo bản sửa: **42/42 unit tests PASS**, nạp được 5 file `.proto`, `npm run check` PASS. **Chưa chạy toàn bộ Docker Compose và 25 E2E** tại đây (môi trường không có Docker); bạn cần chạy các lệnh trên Mac và chỉ báo 25/25 PASS nếu màn hình thực sự trả kết quả đó.

## 6. Cấu trúc

```text
proto/                 # hợp đồng gRPC: Auth, Customer, Product, Order, Shipment
services/              # 5 service nghiệp vụ + API Gateway
shared/                # gRPC helpers
scripts/               # health, demo, kiểm tra cấu trúc
 tests/                # unit, E2E 25 TC, Mongo integration
 docs/                 # API, Postman, report, test cases, hướng dẫn demo
 docker-compose.yml    # Kafka, Redis, 3 PostgreSQL, 2 MongoDB, các service
```

**Lưu ý bảo mật:** `.env.example` chỉ có thông tin demo local, không dùng mật khẩu/JWT secret này khi triển khai công khai.
