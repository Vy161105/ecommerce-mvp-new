# KIỂM THỬ PROMPT 3

## Đối chiếu yêu cầu

Tệp `docs/test-cases.csv` ghi nguyên văn 25 mã TC từ `25_TestCases_5_BoundedContexts.xlsx` thầy cung cấp (5 nhóm, mỗi nhóm 5). Script `tests/e2e.cjs` chạy đúng 25 mã, có ghi PASS/FAIL, chỉ trả exit 0 khi đủ 25 PASS. Không tự nhận PASS khi chưa chạy bằng Docker thực tế.

## Lệnh chạy

```bash
npm run env:setup
npm ci
npm run check     # cú pháp + 5 proto
npm test          # 42 unit tests logic domain; KHÔNG cần Docker
docker compose up -d --build --wait --wait-timeout 600
npm run test:e2e  # 25 case thật qua HTTP, Kafka và Mongo
```

Đọc kết quả từng case trên terminal hoặc tại `test-results/e2e.json`. Lệnh `test:e2e` tạo các tài khoản, sản phẩm, Order kiểm thử với ID mới, không xóa dữ liệu cũ. Câu **TC-SHP-02** gửi một sự kiện thiếu `oid` vào Kafka và kiểm tra `RejectedEvent` trong Shipment DB. Câu **TC-SHP-05** phát trùng sự kiện rồi đối chiếu rằng chỉ có một Shipment cùng `oid`. Cần có công cụ `docker compose`, Node.js 24 và cổng Kafka `19092` truy cập được từ Mac.

Một bài kiểm tra bổ sung tùy chọn:

```bash
npm run test:stock-integration
```

Lệnh này khởi chạy MongoDB tạm qua `mongodb-memory-server-core`, có thể cần tải binary khi chạy lần đầu; không phải 1 trong 25 TC.

## Mức độ đã xác nhận

- Kiểm tra **tại môi trường tạo bản sửa**: 42/42 unit test PASS; 5 file proto nạp được; `npm run check` PASS và đã kiểm tra cú pháp script E2E/demo.
- **Chưa xác nhận trong môi trường tạo bản sửa**: Docker Compose healthy, 25/25 E2E, demo gọi API thật và MongoDB integration (môi trường không có Docker). Phải chạy các lệnh Docker trên Mac và căn cứ kết quả thực tế trước khi báo cáo với thầy.
- Nếu gặp FAIL, kiểm tra `docker compose ps -a`, `docker compose logs --tail=100 api-gateway order-service shipment-service` và URL `http://localhost:3002/api/health`.
