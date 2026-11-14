# A2-29 — Kiểm tra hệ thống BrewLite ngày 14/11/2026

**Baseline:** `506eaeba414f5c9d1f70b45dd933b1781430c786`, branch khi bắt đầu
`main`. Kết quả chạy trên code baseline; A2-29 chỉ sửa tài liệu. Ngày theo
Asia/Saigon. Không sửa source để làm test xanh.

**Kết luận:** lint/build, E2E API và stack Compose đạt; full DB suite còn
**10 test FAIL**. Chưa đủ điều kiện kết luận toàn hệ thống/Gate Task 5 đạt.
[Ma trận](../../traceability-matrix.md) ghi phạm vi AC và các gap;
[Review/Retro](../../team/sprint-review-retrospective.md) ghi đóng góp và phần
sự kiện thực tế chờ nhóm xác nhận.

## Môi trường và cách cô lập

- Windows PowerShell; Node `24.21.0`, npm `11.19.0`, Python `3.15.0`.
- Docker Engine `29.8.2`, PostgreSQL `16-alpine`; Dockerfile API/Web Node 22.
  Docker daemon ban đầu chưa chạy; đã mở Docker Desktop để kiểm tra.
- DB suite dùng container mới `brewlite-a229-check-20261114`, cổng
  `127.0.0.1:5434`, hai DB `brewlite_test` và `brewlite_task10_a229_20261114`.
  Không dùng DB/volume local của nhóm. Container/anonymous volumes và file
  `apps/api/.env.test` do lượt kiểm tra tạo đã được xóa sau khi chạy xong.
- Stack smoke dùng project Compose riêng `brewlite-a229-check`, DB
  `brewlite_a229_check`, cổng web/API/DB `13000/14000/15433`. Không reset DB
  `brewlite` hoặc thay dịch vụ production. Env test không đưa vào Git.

## Kết quả chạy lại

Lệnh API chạy tại `apps/api`, web tại `apps/web`, Python/Compose tại root.
Dependencies đã có trên máy; Docker build thực hiện `npm ci` theo Dockerfile.

| Kiểm tra | Lệnh / thao tác | Kết quả |
| --- | --- | --- |
| API lint | `npm run lint` | PASS, exit 0; 4 warnings. |
| API mặc định | `npm test -- --runInBand`, không bật DB flag | PASS: 19 suites/143 tests; skip 6 suites/18 tests, tổng 25 suites/161 tests; 53,564 giây. |
| API đầy đủ PostgreSQL | `$env:RUN_DB_INTEGRATION='1'`, `npm test -- --runInBand` trên DB riêng đã migrate | **FAIL**, exit 1: 20 suites PASS/5 FAIL; 151 tests PASS/10 FAIL; 68,348 giây. |
| Rerun cạnh tranh đặt hàng | Jest `--runInBand src/orders/orders.concurrency.int.spec.ts`, cùng DB riêng | **FAIL**: 1/1 test; P2028/9 HTTP 500 tái hiện; 7,962 giây. |
| Prisma schema | `npx prisma validate` | PASS, schema valid. |
| Tạo DB/E2E seed | `npm run test:db:setup` | PASS: 9 migrations, 8 products, 22 ingredients, 43 recipes, 3 users, 7 orders mẫu. |
| Migrate DB integration trắng | `npx prisma migrate deploy`, DB `brewlite_task10_a229_20261114` | PASS, 9 migrations. |
| E2E API/PostgreSQL | `npm run test:e2e` | PASS: 3 suites/3 tests; 17,884 giây. |
| Seed fixtures | `node --test apps/api/prisma/seed-data.test.mjs` | PASS: 8/8 tests. |
| API build | `npm run build` | PASS, exit 0. |
| Web typecheck | `npx tsc --noEmit --incremental false` | PASS, exit 0. |
| Web lint | `npm run lint` | PASS, exit 0; 6 warnings. |
| Web build | `npm run build` | PASS sau chuyển cache `.next` cũ khỏi thư mục build; 15 trang được generate. |
| CD adapter offline | `python -m unittest discover -s scripts/cd -p test_render_release.py` | PASS: 9/9 tests, provider giả lập, không gọi deploy. |
| Compose config | `docker compose config --quiet` | PASS, exit 0; chỉ kiểm tra cấu hình. |
| Docker/Compose runtime | Build API/Web và `up -d` project disposable | PASS: DB/backend healthy, frontend chạy; HTTP smoke bên dưới. |

Web build lần đầu lỗi `EINVAL: invalid argument, readlink` ở cache `.next`
trong OneDrive. Đã chuyển cache cũ sang `work/A2-29/web-next-before-build` rồi
build lại thành công; không sửa code. Cache cũ được giữ để đối chiếu.

Warnings API: biến `roles` và import `ArrayUnique` không dùng, irregular
whitespace trong hai concurrency specs. Warnings web: bốn `<img>` và hai
`useEffect` thiếu dependency. Jest có cảnh báo experimental VM Modules và
MaxListenersExceeded; chúng không làm lượt mặc định thất bại.

## Hai nhóm lỗi cần xử lý

### DB-01 — 9 payment tests bị IPN 404 trong test application

| Suite | Số test lỗi |
| --- | ---: |
| `payments.promotion-loyalty.int.spec.ts` | 2 |
| `payments.idempotency.int.spec.ts` | 3 |
| `payments.concurrent.int.spec.ts` | 2 |
| `payments.loyalty-redemption.int.spec.ts` | 2 |

Các test gọi `/payments/webhooks/vnpay`, mong HTTP 200 nhưng nhận 404.
Fixture `createTestingModule` chỉ khai báo `PaymentsController`, thiếu
`PaymentsWebhookController`. [PaymentsModule runtime](../../../apps/api/src/payments/payments.module.ts)
đã đăng ký cả hai controller; kết quả xác định lỗi fixture, chưa chứng minh
endpoint production bị mất. AC idempotency/loyalty/payment DB vẫn chưa được
xác nhận bởi lượt chạy này. Đề xuất Bảo sửa fixture trong PR test riêng, chạy
lại cả bốn suite và full DB; reviewer đối chiếu FR-06/09/10 trong ma trận.

### DB-02 — transaction không bắt đầu kịp khi 10 người mua tranh tồn

[orders.concurrency.int.spec.ts](../../../apps/api/src/orders/orders.concurrency.int.spec.ts)
kiểm tra “does not oversell when 10 buyers compete for 15 units” thất bại.
Prisma báo `P2028: Unable to start a transaction in the given time`; có 9 HTTP
500 ngoài kết quả nghiệp vụ test chấp nhận. Chạy riêng suite sau khi E2E kết
thúc vẫn tái hiện; không thể chỉ quy cho E2E chạy song song. Cần điều tra
transaction/pool/maxWait tại [OrdersService.create](../../../apps/api/src/orders/orders.service.ts).

Đây là lỗi kiểm chứng FR-05/US-16; chưa kết luận có oversell hoặc chọn bản sửa
timeout khi chưa điều tra. Đề xuất Danh/Bảo xử lý nguyên nhân và hợp đồng lỗi,
chạy lại PostgreSQL concurrency với thông số tài nguyên rõ.

```text
Test Suites: 5 failed, 20 passed, 25 total
Tests:       10 failed, 151 passed, 161 total
```

## Compose smoke và dữ liệu bền

Build cả Dockerfile và khởi động ba service bằng:

```powershell
docker compose -p brewlite-a229-check --env-file work/A2-29/compose-check.env up -d --build db backend frontend
```

Env này sinh riêng để kiểm tra, không phải file cần commit. Sau
`seed:inventory` trên DB disposable: menu có **8 sản phẩm/8 có hàng**, đọc
được detail; register → tạo đơn `PENDING` → đọc chi tiết → cancel `CANCELLED`
→ history đều thành công. Web `/` HTTP 200 `text/html`; API `/health` trả
`status=ok`. Local smoke lúc **13:48:50 ngày 14/11/2026, Asia/Saigon**.

Đã restart DB rồi backend/frontend trên project riêng, đợi API trở lại và
so sánh số bản ghi trước/sau: **8 products, 4 users, 8 orders, 2 CANCELLED**;
không đổi sau restart/seed khởi động lại. Đây là kiểm tra persistence local,
không phải drill backup/restore production hoặc bài đo SLA.

Sau kiểm tra, chỉ project Compose disposable và volume của project đó được
dọn; không reset DB/dịch vụ local có sẵn. Docker images/cache được giữ để tái
sử dụng; Docker Desktop vẫn chạy. Kết quả cleanup phải được đối chiếu cùng log.

## HTTPS công khai — chỉ GET

Lượt GET mới ngày 14/11 qua HTTP client; không gửi login/order/payment lên production:

| URL | Kết quả |
| --- | --- |
| `https://brewlite-api-49rx.onrender.com/health` | HTTP 200, JSON `status=ok`. |
| `https://brewlite-api-49rx.onrender.com/products` | HTTP 200, JSON list 8 sản phẩm. |
| `https://brewlite-2-web.onrender.com/` | HTTP 200, HTML. |

Request health/products mất khoảng 31,65 giây, web khoảng 12,85 giây. Đây là
đo đơn lẻ, không phải p95/load test hay bằng chứng NFR-01. Không suy ra deployed
SHA từ HTTP 200; release trong [hồ sơ CI/CD](a2-25-ci-cd-production.md) là bằng
chứng lịch sử riêng.

## Giới hạn và hồ sơ tái kiểm tra

- API E2E có DB thật nhưng dừng ở `PENDING`; chưa kiểm tra browser/cart,
  Sandbox tới PAID, payment fail/cancel/retry trên gateway thật.
- Chưa chạy load 100 VU/10 phút, theo dõi SLA, browser/mobile/a11y, kiểm tra
  private networking/secrets của tài khoản production hoặc restore backup.
- Không dispatch CD, publish registry, rollback Render, tạo tag hay merge PR
  trong lượt kiểm tra. Trạng thái PR/CI của bộ docs theo hồ sơ PR, không suy
  ra từ kết quả local.
- Các gap UML/UC/ADR và hợp đồng options/idempotency nằm trong ma trận;
  test pass từng phần không tự đóng gap.
- Sự kiện Scrum cần ngày/kênh, phản hồi và xác nhận ba thành viên; chưa đánh
  dấu A2-29/Gate Task 5 đạt từ kết quả kỹ thuật này.

Raw logs giữ tại `work/A2-29/` (gitignored): `db-setup.log`,
`db-integration-migrate.log`, `e2e.log`, `api-full-db.log`,
`orders-concurrency-rerun.log`, `cleanup.log`, `compose-build-up.log`,
`compose-inventory-seed.log`, `compose-restart.log`, `compose-cleanup.log`; JSON gồm
`local-smoke.json`, `persistence-result.json`, `public-smoke.json`.
Bản tổng hợp và trích kết quả trên là evidence review trong PR, không phụ
thuộc commit raw log/env/dump. Lệnh tái lập: [README](../../../README.md),
[deployment](../../deployment.md), [migration](../../database-migrations.md).

## Kiểm tra bộ tài liệu

`vexp verify_done` không báo parse error, broken import hoặc dependent còn
thiếu; không liệt kê impacted tests. Đây là kiểm tra cấu trúc index, không
thay kết quả test/AC ở trên. Kiểm tra 179 đích liên kết local trong bảy file
tài liệu không có đích thiếu; `git diff --check` đạt. PR docs giữ các test DB thất bại và các mục cần
xác nhận ở trạng thái mở.
