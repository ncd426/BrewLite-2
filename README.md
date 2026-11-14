# BrewLite

BrewLite là ứng dụng đặt đồ uống, gồm frontend Next.js, backend NestJS và
PostgreSQL. Prisma quản lý schema, migration và dữ liệu mẫu.

## Yêu cầu

- Docker Desktop đang chạy và Docker Compose v2; hoặc Node.js 24, npm và
  PostgreSQL 16 nếu chạy trực tiếp. Hai ứng dụng cài dependency riêng bằng
  lockfile trong `apps/api` và `apps/web`; root không có script test/build.
- CI dùng Node 24 cho API, Node 20 cho web; Dockerfile dùng Node 22 cho cả hai.
- Dung lượng đĩa đủ cho image Docker và dữ liệu PostgreSQL.

## Chức năng

- Xem danh sách sản phẩm, chi tiết, giá, ảnh và tồn kho.
- Chọn kích cỡ, topping; quản lý giỏ hàng và đặt hàng.
- Đăng ký, đăng nhập, xem hồ sơ và lịch sử đơn hàng.
- Áp dụng mã khuyến mãi theo điều kiện, xem trước tiền giảm ngay tại Checkout.
- Tích và sử dụng điểm thưởng: 1 điểm đổi 1.000đ; mỗi 10.000đ thực trả được 1 điểm sau khi đơn PAID.
- Checkout online qua VNPay Sandbox bằng QR/link; chỉ xác nhận thanh toán sau khi API kiểm tra IPN hợp lệ. Bán hàng tại quầy sử dụng xác nhận CASH/CARD mô phỏng.
- Xác nhận đơn hàng, lịch sử mua hàng và số tiền thực trả.
- Order State Machine, Idempotency-Key; transaction và trừ nguyên liệu có điều
  kiện để bảo vệ tồn kho. Kiểm chứng cạnh tranh DB hiện còn lỗi, xem báo cáo test.

## Chạy bằng Docker Compose

Tại thư mục gốc repository, tạo file cấu hình trong lần chạy đầu:

```powershell
Copy-Item .env.example .env
```

Mở `.env`, đặt `SEED_DEMO_PASSWORD` dài ít nhất 12 ký tự và thay
`JWT_SECRET` bằng giá trị riêng cho môi trường local. Sau đó chạy:

```powershell
docker compose up -d --build
```

Compose mặc định khởi động ba service: PostgreSQL, backend và frontend
(`db-test` chỉ bật qua profile `test`). Backend chờ
database sẵn sàng, áp dụng các migration bằng `prisma migrate deploy`, rồi chạy
seed trước khi phục vụ API. Các địa chỉ mặc định:

- Web: <http://localhost:3000>
- API: <http://localhost:4000>
- PostgreSQL: `localhost:5433`

Với DB local **mới/disposable**, khởi tạo số dư nguyên liệu sau khi backend
đã sẵn sàng:

```powershell
docker compose exec -T backend npm run seed:inventory
```

Seed khởi động không tự đặt lại số dư kho; nếu chưa khởi tạo, menu có thể
hiển thị hết hàng. Không chạy bước này trên kho đang sử dụng vì có thay đổi
số dư nguyên liệu.

Dừng service bằng `docker compose down`. Dữ liệu database
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
| `GET` | `/health` | Không | Readiness DB: chạy `SELECT 1` qua Prisma mỗi request; HTTP 200 khi query thành công, HTTP 503 khi DB/query lỗi. |
| `GET` | `/products` | Không | Danh sách sản phẩm. |
| `GET` | `/products/:id` | Không | Chi tiết sản phẩm. |
| `POST` | `/auth/register` | Không | Đăng ký với `name`, `email`, `password`. |
| `POST` | `/auth/login` | Không | Đăng nhập với `email`, `password`; trả về `accessToken`. |
| `GET` | `/users/me` | Có | Hồ sơ người dùng hiện tại. |
| `POST` | `/orders` | Có | Tạo đơn hàng từ `items` và `promotionCode` tùy chọn; kiểm tra lại giá, mã và tồn kho ở Backend. |
| `POST` | `/orders/promotion-preview` | Có | Xem trước khuyến mãi với `items`, `promotionCode`; không tạo đơn, không giữ/trừ tồn kho. |
| `GET` | `/orders/me` | Có | Lịch sử đơn hàng của người dùng hiện tại. |
| `GET` | `/orders/:id` | Có | Chi tiết đơn thuộc người dùng hiện tại. |
| `POST` | `/orders/:id/cancel` | Có | Hủy đơn còn được phép hủy, hoàn tồn kho theo trạng thái. |
| `POST` | `/payments` | Có | Tạo phiên thanh toán VNPay Sandbox, trả `checkoutUrl` để khách mở cổng thanh toán. |
| `GET` | `/payments/webhooks/vnpay` | Không dùng JWT; kiểm tra chữ ký IPN | Nhận và xác thực phản hồi VNPay trước khi cập nhật trạng thái thanh toán. |

Health check trả `{"status":"ok","database":"up"}` khi kết nối/query DB
thành công; khi lỗi trả HTTP 503 với `{"status":"error","database":"down"}`.
Phản hồi lỗi không chứa connection URL hoặc chi tiết lỗi nội bộ. Query này
kiểm tra DB phản hồi, chưa xác nhận schema/migration hay luồng nghiệp vụ.

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

Trong **mỗi terminal**, mở PowerShell tại thư mục gốc repository. Tạo các file
cấu hình trong lần đầu; giữ file đang có ở những lần chạy sau. Sửa
`apps/api/.env` để `DATABASE_URL` trỏ tới cùng DB, user,
password và cổng trong `.env` root. API nạp `.env` tại `apps/api`, Compose nạp
`.env` root. Giá trị mẫu password ở hai file **khác nhau**, cần đồng bộ trước
khi kết nối. Khi API chạy trên host, dùng `localhost:5433`, hoặc cổng
`POSTGRES_PORT` đã chọn; hostname `db` dành cho mạng Compose.

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Đặt `JWT_SECRET`, `SEED_DEMO_PASSWORD` tối thiểu 12 ký tự và cấu hình VNPay nếu
cần demo thanh toán. Nếu đang chạy cả stack Compose, dùng
`docker compose stop backend frontend` trước để tránh trùng cổng. Khởi động DB:

```powershell
docker compose up -d db
```

**Terminal 1 — Backend:**

```powershell
cd apps/api
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Với DB local mới/disposable, chạy `npm run seed -- --initialize-inventory`
sau migration và trước `npm run start:dev` để có dữ liệu demo và tồn kho.

**Terminal 2 — Frontend:** Mở tại thư mục gốc BrewLite. `apps/web/.env.local` cần có
`NEXT_PUBLIC_API_URL=http://localhost:4000` (đây là cấu hình local).

```powershell
cd apps/web
npm ci
npm run dev
```

**Terminal 3 — Prisma Studio:** Dùng cùng `apps/api/.env` với backend:

```powershell
cd apps/api
npx prisma studio
```

Truy cập: [Frontend](http://localhost:3000),
[Backend API](http://localhost:4000/products),
[Prisma Studio](http://localhost:5555).

Nếu cổng 3000/4000 đang được sử dụng, dừng service hoặc dev server cũ trước
khi chạy. Với database đang có dữ liệu, xem [hướng dẫn migration](docs/database-migrations.md).

## Kiểm thử và build

### Unit/HTTP test và build

Sau `npm ci` của từng ứng dụng, chạy từ root:

```powershell
npm --prefix apps/api test -- --runInBand
npm --prefix apps/api run build
npm --prefix apps/web run build
```

API cần Prisma Client đã generate theo bước cài đặt ở trên. Test mặc định
không chạy DB integration. Mỗi nhóm test bên dưới dùng một terminal riêng.

### E2E API với DB riêng

Tạo `apps/api/.env.test` (đã gitignore) với nội dung **chỉ dành cho test**:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/brewlite_test
JWT_SECRET=isolated-test-only-secret
SEED_DEMO_PASSWORD=isolated-test-only-password
NODE_ENV=test
```

Từ root chạy:

```powershell
docker compose --profile test up -d db-test
cd apps/api
npm run test:db:setup
npm run test:e2e
```

`test:db:setup` **reset toàn bộ DB test** trước khi chạy 9 migration và seed
inventory. Guard của script chỉ cho phép `localhost`/`127.0.0.1:5434/brewlite_test`.
Không dùng cổng này cho DB cần giữ. E2E ở `tests/e2e/` có 3 test với
NestJS + PostgreSQL thật: đăng ký/JWT → menu → tạo đơn → chi tiết/lịch sử. Các
test dừng ở đơn `PENDING`; chưa tự động chạy trình duyệt hoặc VNPay tới `PAID`.

### DB integration: cạnh tranh, idempotency, promotion, loyalty

Nhóm test này yêu cầu tên DB `brewlite_task10_*`. Dùng DB thứ hai trên service
`db-test`; không bật `RUN_DB_INTEGRATION=1` qua `test:isolated` vì guard của hai
nhóm yêu cầu tên DB khác nhau. Tạo DB test một lần từ root:

```powershell
docker compose --profile test exec -T db-test createdb -U postgres brewlite_task10_local
```

Trong terminal riêng, chạy:

```powershell
cd apps/api
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5434/brewlite_task10_local'
$env:JWT_SECRET = 'isolated-integration-test-secret'
$env:RUN_DB_INTEGRATION = '1'
npx prisma migrate deploy
npm test -- --runInBand
```

Đóng terminal này khi kết thúc để các biến môi trường test không ảnh hưởng
đến lần chạy khác. Kết quả kiểm thử, giới hạn bao phủ và lỗi còn mở được ghi
trong [biên bản kiểm tra hệ thống](docs/evidence/sprint-2/system-verification-2026-11-14.md).
Khi Windows/OneDrive báo `EINVAL readlink` ở `.next`, dừng dev server, chuyển
cache build cũ sang thư mục tạm rồi build lại; giữ source và file `.env`.

## Deploy và rollback trên Render

Hai URL được ghi nhận trong [minh chứng CI/CD](docs/evidence/sprint-2/a2-25-ci-cd-production.md):

- Web: <https://brewlite-2-web.onrender.com>
- API: <https://brewlite-api-49rx.onrender.com> (`/health`, `/products`).

CD thực tế nằm trong [`.github/workflows/cd.yml`](.github/workflows/cd.yml):
lint/test/build → GHCR image tag `sha-<12 ký tự SHA>` → deploy Render bằng digest
→ đợi deploy ID `live` → smoke API/Web. Pull request chỉ kiểm tra và build image,
không publish/deploy. Image web nhúng `PROD_API_PUBLIC_URL` lúc build.

Trước mỗi release, người phụ trách DB đối chiếu migration/backup và xác nhận **đúng full SHA**
trong `A2_27_MIGRATION_APPROVED_SHA`; người vận hành kiểm tra Render service IDs,
public URLs, secret `RENDER_API_KEY` và môi trường `production`. Sau khi được
nhóm chấp thuận release, bật `RENDER_DEPLOY_ENABLED=true` rồi dispatch:

```powershell
gh workflow run cd.yml -R ncd426/BrewLite-2 --ref main
```

Chỉ kết luận deploy thành công khi job `Render deploy by digest + smoke` đạt và
artifact `a2-25-render-release-evidence` có hai deploy IDs/digests, smoke JSON.
Theo minh chứng hiện có, nhóm đặt lại `RENDER_DEPLOY_ENABLED=false` sau release;
cần kiểm tra giá trị thật trước khi vận hành. API container không tự migration
hoặc seed; cấu hình `NODE_ENV=production`, API `PORT=4000`, web `PORT=3000`.

**Rollback ứng dụng:** giữ digest API/Web của release thành công trước đó trong
GHCR. Khi release lỗi, dừng phát hành tiếp, chọn Render service → Deploys →
deployment thành công trước → Rollback cho service bị ảnh hưởng. Chờ deployment
mới `Live`, thực hiện smoke theo [runbook triển khai](docs/deployment.md),
ghi SHA/digest, deploy ID và kết quả.

Rollback image không đảo migration hoặc dữ liệu. Nếu schema mới không tương
thích image cũ, người phụ trách DB xử lý theo backup/forward fix trước khi phục hồi ứng dụng.
Adapter hiện dừng khi lỗi, rollback được thực hiện thủ công. Chi tiết release,
backup/restore và xác nhận sau rollback: [runbook triển khai](docs/deployment.md)
và [migration](docs/database-migrations.md).


## Tài liệu

- [Triển khai local, production và rollback](docs/deployment.md)
- [Hướng dẫn migration database](docs/database-migrations.md)
- [Yêu cầu chức năng](docs/requirements/requirements.md)
- [Ma trận truy vết](docs/traceability-matrix.md)
- [SRS FR/NFR và acceptance criteria](docs/requirements/srs.md)
- [Sprint Review & Retrospective; đóng góp 3 thành viên](docs/team/sprint-review-retrospective.md)
- [Kiểm tra hệ thống](docs/evidence/sprint-2/system-verification-2026-11-14.md)
- [Nội dung PR A2-29](docs/pr-a2-29.md)


### Kiểm thử hiệu năng API

**Số liệu lưu từ README cũ**, chưa có log thô gắn SHA/ngày đo và chưa được chạy
lại trong lần bàn giao này. Không dùng bảng này để tự kết luận NFR hiệu năng
toàn hệ thống đạt. Mốc dưới **500 ms** là mục tiêu lưu trong README cũ.
[SRS NFR-01 hiện tại](docs/requirements/srs.md) yêu cầu 100 người dùng đồng
thời trong 10 phút, p95 GET không quá 2 giây, tạo đơn/thanh toán không quá
3 giây và tỷ lệ HTTP 5xx dưới 1%; cần bài đo riêng theo tiêu chí này.

**Môi trường và phương pháp kiểm thử:**

- Backend: NestJS tại `http://localhost:4000`.
- Cơ sở dữ liệu: PostgreSQL (môi trường local).
- Công cụ: `curl` chạy bằng PowerShell.
- Mỗi API được gọi 5 lần khởi động (warm-up, không tính vào kết quả), sau đó đo 50 lần.

| API | Số lượt đo | Trung bình | P95 | Lâu nhất | Lỗi HTTP | Kết quả |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `GET /products` | 50 | 3,23 ms | 4,46 ms | 4,81 ms | 0 | PASS |
| `GET /products/1` | 50 | 3,15 ms | 3,60 ms | 3,72 ms | 0 | PASS |

**Kết quả lưu trước đây:** hai API đều dưới 500 ms trong 100 lượt đo được mô tả
ở trên. Cần log tái lập với môi trường, dữ liệu và commit cụ thể để nghiệm thu.

**Giới hạn:** Kết quả chỉ phản ánh hai API được đo tại máy phát triển, không đại diện cho toàn bộ API hoặc hiệu năng khi triển khai thực tế.

### Đối chiếu yêu cầu bàn giao

Đồ án sử dụng NestJS, Next.js, PostgreSQL/Prisma, Docker Compose và Git. Phạm
vi MVP có checkout online qua **VNPay Sandbox** và bán tại quầy dùng xác
nhận mô phỏng. Sau khi build và test, nhóm cần tạo Pull
Request, review/merge và chuẩn bị Sprint Review/Retrospective theo quy trình
Scrum; các bước quy trình này không được tự động hoàn thành bởi việc test PASS.
