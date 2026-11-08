# BrewLite

BrewLite là ứng dụng đặt đồ uống, gồm frontend Next.js, backend NestJS và
PostgreSQL. Prisma quản lý schema, migration và dữ liệu mẫu.

## Yêu cầu

- Docker Desktop và Docker Compose (cách chạy khuyến nghị); hoặc Node.js 22+,
  npm và PostgreSQL 16+ nếu chạy trực tiếp.
- Dung lượng đĩa đủ cho image Docker và dữ liệu PostgreSQL.

## Chức năng

- Xem danh sách sản phẩm, chi tiết, giá, ảnh và tồn kho.
- Chọn kích cỡ, topping; quản lý giỏ hàng và đặt hàng.
- Đăng ký, đăng nhập, xem hồ sơ và lịch sử đơn hàng.
- Áp dụng mã khuyến mãi theo điều kiện, xem trước tiền giảm ngay tại Checkout.
- Tích và sử dụng điểm thưởng: 1 điểm đổi 1.000đ; mỗi 10.000đ thực trả được 1 điểm sau khi đơn PAID.
- Checkout online qua VNPay Sandbox bằng QR/link; chỉ xác nhận thanh toán sau khi API kiểm tra IPN hợp lệ. Bán hàng tại quầy sử dụng xác nhận CASH/CARD mô phỏng.
- Xác nhận đơn hàng, lịch sử mua hàng và số tiền thực trả.
- Order State Machine, Idempotency-Key, đặt đồng thời không vượt tồn kho (transaction + optimistic locking).

## Chạy bằng Docker Compose

Tại thư mục gốc repository, tạo file cấu hình rồi khởi động:

```powershell
Copy-Item .env.example .env
```

Mở `.env`, đặt `SEED_DEMO_PASSWORD` dài ít nhất 12 ký tự và thay
`JWT_SECRET` bằng giá trị riêng cho môi trường local. Sau đó chạy:

```powershell
docker compose up --build
```

Compose khởi động ba service: PostgreSQL, backend và frontend. Backend chờ
database sẵn sàng, áp dụng các migration bằng `prisma migrate deploy`, rồi chạy
seed trước khi phục vụ API. Các địa chỉ mặc định:

- Web: <http://localhost:3000>
- API: <http://localhost:4000>
- PostgreSQL: `localhost:5433`

Dừng service bằng `Ctrl+C`, hoặc chạy `docker compose down`. Dữ liệu database
được giữ trong volume; chỉ dùng `docker compose down --volumes` nếu chủ ý xóa
dữ liệu local.

> Nếu database đã được tạo bằng `prisma db push` hoặc chưa có lịch sử migration
> tương ứng, cần đối chiếu schema và baseline migration trước khi chạy. Không
> dùng `migrate reset` trên database có dữ liệu cần giữ.

## Biến môi trường

| Biến | Mặc định trong `.env.example` | Mục đích |
| --- | --- | --- |
| `POSTGRES_DB` | `brewlite` | Tên database trong Compose. |
| `POSTGRES_USER` | `postgres` | Tài khoản PostgreSQL. |
| `POSTGRES_PASSWORD` | `brewlite-local-only` | Mật khẩu PostgreSQL local; hãy thay nếu cần. |
| `POSTGRES_PORT` | `5433` | Cổng PostgreSQL trên máy host. |
| `DATABASE_URL` | URL tới `localhost:5433` | Kết nối API chạy trực tiếp trên host. Compose tự đặt URL nội bộ trỏ tới service `db`. |
| `JWT_SECRET` | Giá trị mẫu local | Secret ký JWT; thay bằng giá trị riêng. |
| `SEED_DEMO_PASSWORD` | Giá trị mẫu local | Mật khẩu được đặt cho tài khoản demo khi tạo lần đầu; tối thiểu 12 ký tự. Seed không đổi mật khẩu của tài khoản đã tồn tại. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | URL API frontend gọi tới; được nhúng vào frontend lúc build. |
| `API_PORT` | `4000` | Cổng API trên máy host. |
| `WEB_PORT` | `3000` | Cổng web trên máy host. |
| `PAYMENT_TTL_MINUTES` | `15` | Thời hạn phiên thanh toán (phút). |
| `PAYMENT_API_PUBLIC_URL` | URL mẫu | URL API công khai để VNPay truy cập callback; cần HTTPS khi dùng sandbox. |
| `PAYMENT_WEB_PUBLIC_URL` | `http://localhost:3000` | URL web dùng để quay lại sau thanh toán. |
| `VNPAY_TMN_CODE` | Để trống | Mã merchant VNPay Sandbox, cấu hình riêng ở `.env`. |
| `VNPAY_HASH_SECRET` | Để trống | Khóa ký VNPay Sandbox, không commit lên Git. |
| `VNPAY_PAY_URL` | Sandbox URL | URL cổng thanh toán VNPay Sandbox. |

Các giá trị mẫu chỉ dành cho phát triển local; không sử dụng nguyên trạng ở
môi trường production. Seed từ chối chạy khi `NODE_ENV=production`.

## API

Base URL mặc định: `http://localhost:4000`. Endpoint cần xác thực nhận JWT qua
header `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Xác thực | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/products` | Không | Danh sách sản phẩm. |
| `GET` | `/products/:id` | Không | Chi tiết sản phẩm. |
| `POST` | `/auth/register` | Không | Đăng ký với `name`, `email`, `password`. |
| `POST` | `/auth/login` | Không | Đăng nhập với `email`, `password`; trả về `accessToken`. |
| `GET` | `/users/me` | Có | Hồ sơ người dùng hiện tại. |
| `POST` | `/orders` | Có | Tạo đơn hàng từ `items` và `promotionCode` tùy chọn; kiểm tra lại giá, mã và tồn kho ở Backend. |
| `POST` | `/orders/promotion-preview` | Có | Xem trước khuyến mãi với `items`, `promotionCode`; không tạo đơn, không giữ/trừ tồn kho. |
| `GET` | `/orders/me` | Có | Lịch sử đơn hàng của người dùng hiện tại. |
| `GET` | `/orders/:id` | Có | Chi tiết đơn thuộc người dùng hiện tại. |
| `POST` | `/payments` | Có | Tạo phiên thanh toán VNPay Sandbox, trả `checkoutUrl` để khách mở cổng thanh toán. |
| `GET` | `/payments/webhooks/vnpay` | Không dùng JWT; kiểm tra chữ ký IPN | Nhận và xác thực phản hồi VNPay trước khi cập nhật trạng thái thanh toán. |

Thanh toán online yêu cầu header `Idempotency-Key` và body gồm `orderId`,
`method: "VNPAY"`; có thể gửi `pointsToRedeem` (số điểm nguyên không âm).
`POST /payments` tạo phiên VNPay Sandbox chứ không đánh dấu đơn `PAID` ngay.
Chỉ IPN hợp lệ (đúng chữ ký, số tiền, mã giao dịch) mới được xử lý kết quả.
Backend kiểm tra JWT, quyền sở hữu, số tiền và chống tạo phiên trùng khi gửi lại key.

### Quy tắc số tiền trong database

| Trường | Ý nghĩa |
| --- | --- |
| `Order.discountAmount` | Tiền giảm do **mã khuyến mãi**. |
| `Order.total` | Giá trị đơn **sau khuyến mãi, trước khi đổi điểm thưởng**. |
| `Payment.pointsUsed` | Số điểm đã dùng cho lần thanh toán. |
| `Payment.amount` | **Số tiền thực trả**, đã trừ giảm giá từ điểm. |
| `User.loyaltyPoints` | Số dư điểm còn lại sau khi trừ và cộng điểm thành công. |

Ví dụ: tiền hàng 39.000đ, giảm mã 10% = 3.900đ, đổi 10 điểm = 10.000đ;
`Order.total` = 35.100đ, `Payment.amount` = 25.100đ. Đây là **thiết kế
có chủ đích**, không phải chênh lệch sai.

### Giới hạn của VNPay Sandbox

- Trang `/checkout/qr` hiển thị QR/link tới URL thanh toán VNPay Sandbox. Kết quả
  chỉ được cập nhật sau khi API nhận và xác thực IPN từ VNPay; trình duyệt quay về
  trang checkout không tự động chứng minh giao dịch thành công.
- Cần cấu hình `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` và URL API công khai có HTTPS
  để VNPay gọi webhook. URL `localhost` không nhận được IPN từ Internet nếu
  chưa cấu hình tunnel/callback thích hợp.
- VNPay Sandbox chỉ dùng để thử nghiệm, không chuyển tiền thật. Bán tại quầy
  có luồng xác nhận CASH/CARD mô phỏng riêng, không gọi VNPay.


## Tài khoản demo

Seed tạo các tài khoản local sau:

| Email | Mật khẩu |
| --- | --- |
| `demo@brewlite.test` | Giá trị `SEED_DEMO_PASSWORD` tại lần tạo tài khoản đầu tiên |
| `khach1@brewlite.test` | Giá trị `SEED_DEMO_PASSWORD` tại lần tạo tài khoản đầu tiên |
| `khach2@brewlite.test` | Giá trị `SEED_DEMO_PASSWORD` tại lần tạo tài khoản đầu tiên |

Seed không ghi đè password của tài khoản đã có. Nếu đã seed từ trước, hãy dùng
mật khẩu đã được thiết lập lúc tạo tài khoản đó.

**Mã giảm giá demo:** Các bản ghi `Promotion` phụ thuộc database hiện tại.
Không giả định `GIAM10` hoặc `GIAM20K` luôn tồn tại/đang hoạt động sau khi
clone. `npm run seed` (và lệnh Docker Compose khởi động backend) có thể **tạo
lại mã mẫu còn thiếu** theo `apps/api/prisma/seed-data.mjs`; seed không cần
chạy lại nếu chỉ muốn giữ dữ liệu hiện có. Hãy kiểm tra `Promotion.isActive`,
hạn sử dụng và đơn tối thiểu trước khi demo mã giảm giá.

## Chạy trực tiếp: Backend, Frontend, Prisma Studio (Windows PowerShell)

Đây là cách được nhóm sử dụng để demo trên **database local `brewlite`**.
Trong **mỗi terminal**, mở PowerShell tại thư mục gốc của repository BrewLite
(đường dẫn tùy máy). Khởi động PostgreSQL trong Docker, nhưng chạy NestJS/Next.js
trực tiếp trên host:

```powershell
docker compose stop backend frontend
docker compose up -d db
```

**Terminal 1 — Backend:** Mở tại thư mục gốc BrewLite. Cấu hình `.env` ở root và `apps/api/.env`
(`JWT_SECRET`, `DATABASE_URL`) trước. Khi chạy trên Windows phải kết nối tới
`localhost:<cổng host>`, **không phải** hostname `db` của Docker.

```powershell
$line = Get-Content .env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1
if (-not $line) { throw 'DATABASE_URL missing from root .env' }
$url = ($line -replace '^\s*DATABASE_URL=', '').Trim().Trim('"').Trim("'")
$port = (docker compose port db 5432 | Select-Object -First 1) -replace '^.*:', ''
if ($port -notmatch '^\d+$') { throw 'PostgreSQL port unavailable' }
$env:DATABASE_URL = $url -replace '@(?:db|localhost):\d+/', "@localhost:${port}/"
# Kiểm tra đúng tên DB trước khi chạy migration (ví dụ /brewlite).
cd apps/api
npx prisma generate
npx prisma migrate deploy # Chỉ chạy sau khi kiểm tra DB/backup nếu đang giữ dữ liệu
npm run start:dev
```

**Terminal 2 — Frontend:** Mở tại thư mục gốc BrewLite. `apps/web/.env.local` cần có
`NEXT_PUBLIC_API_URL=http://localhost:4000` (đây là cấu hình local).

```powershell
cd apps/web
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev -- -p 3000
```

**Terminal 3 — Prisma Studio:** Mở tại thư mục gốc BrewLite. Lặp lại đoạn đặt `$env:DATABASE_URL` trong
Terminal 1 từ root repo để trỏ đến **cùng database** Backend đang dùng, rồi:

```powershell
cd apps/api
npx prisma studio --port 5555
```

Truy cập: [Frontend](http://localhost:3000),
[Backend API](http://localhost:4000/products),
[Prisma Studio](http://localhost:5555).

Nếu báo `EADDRINUSE` ở 3000/4000, xem `docker compose ps` và dừng service
`frontend`/`backend` hoặc các terminal Node cũ; **không dừng tiến trình Docker
Desktop/WSL bằng `Stop-Process`**. Trước khi dùng database đang có dữ liệu, sao
lưu và kiểm tra migration. Không dùng `migrate reset` hoặc tùy chọn `--volumes` của `docker compose down`
nếu muốn giữ dữ liệu.

## Kiểm thử và build

Các file `*.spec.ts` và `*.int.spec.ts` trong `apps/api/src/` là các **file test**
của Task 10: chặn trạng thái sai, thanh toán trùng `Idempotency-Key`, đặt
đồng thời không vượt tồn kho, mã giảm giá và điểm thưởng. Jest mặc định bỏ qua
những DB integration test có điều kiện `RUN_DB_INTEGRATION=1`.

```powershell
cd apps/api
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build

cd ../web
npx tsc --noEmit
npm run build
```

Để chạy **toàn bộ DB integration test** (bao gồm kiểm tra cạnh tranh trên
PostgreSQL), mở PowerShell tại repo root và chỉ dùng database **riêng** có tên `brewlite_task10_*`, không chạy
trên `brewlite` đang có đơn hàng thật:

```powershell
$dbName = "brewlite_task10_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
docker compose exec -T db createdb -U postgres $dbName
$line = Get-Content .env | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1
$url = ($line -replace '^\s*DATABASE_URL=', '').Trim().Trim('"').Trim("'")
$port = (docker compose port db 5432 | Select-Object -First 1) -replace '^.*:', ''
$env:DATABASE_URL = $url -replace '@(?:db|localhost):\d+/[^?]+', "@localhost:${port}/$dbName"
$env:RUN_DB_INTEGRATION = '1'
cd apps/api
npx prisma migrate deploy
npx prisma generate
npm test -- --runInBand
Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
```

Kết quả nghiệm thu local gần nhất (31/10/2026): **17/17 suites, 122/122
Backend tests, 1/1 E2E test PASS**; Backend và Frontend build thành công. Đây là kết
quả đã chạy trên máy phát triển; người nhận bàn giao nên tự chạy lại trong môi
trường của mình. Bài E2E hiện chỉ kiểm tra `GET /`; nghiệp vụ Task 10 được kiểm
tra bằng các HTTP/DB integration test riêng và demo thủ công.


## Tài liệu

- [Triển khai local](docs/deployment.md)
- [Hướng dẫn migration database](docs/database-migrations.md)
- [Yêu cầu chức năng](docs/requirements/requirements.md)
- [Ma trận truy vết](docs/traceability-matrix.md)


### Kiểm thử hiệu năng API

**Yêu cầu phi chức năng:** Thời gian phản hồi API dưới **500 ms** với dữ liệu mẫu.

**Môi trường và phương pháp kiểm thử:**

- Backend: NestJS tại `http://localhost:4000`.
- Cơ sở dữ liệu: PostgreSQL (môi trường local).
- Công cụ: `curl` chạy bằng PowerShell.
- Mỗi API được gọi 5 lần khởi động (warm-up, không tính vào kết quả), sau đó đo 50 lần.

| API | Số lượt đo | Trung bình | P95 | Lâu nhất | Lỗi HTTP | Kết quả |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `GET /products` | 50 | 3,23 ms | 4,46 ms | 4,81 ms | 0 | PASS |
| `GET /products/1` | 50 | 3,15 ms | 3,60 ms | 3,72 ms | 0 | PASS |

**Kết quả:** Cả hai API được kiểm thử đều có thời gian phản hồi dưới **500 ms**, không phát sinh lỗi HTTP trong tổng số **100 lượt đo**. Như vậy, hai API này đáp ứng yêu cầu hiệu năng với dữ liệu mẫu trên môi trường local.

**Giới hạn:** Kết quả chỉ phản ánh hai API được đo tại máy phát triển, không đại diện cho toàn bộ API hoặc hiệu năng khi triển khai thực tế.

### Đối chiếu yêu cầu bàn giao

Đồ án sử dụng NestJS, Next.js, PostgreSQL/Prisma, Docker Compose và Git. Phạm
vi MVP có checkout online qua **VNPay Sandbox** và bán tại quầy dùng xác
nhận mô phỏng. Sau khi build và test, nhóm cần tạo Pull
Request, review/merge và chuẩn bị Sprint Review/Retrospective theo quy trình
Scrum; các bước quy trình này không được tự động hoàn thành bởi việc test PASS.
