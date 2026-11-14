# BrewLite — local, production và rollback

Kết quả thực chạy và baseline tương ứng nằm trong
[kiểm tra hệ thống](evidence/sprint-2/system-verification-2026-11-14.md).
[Hồ sơ CI/CD](evidence/sprint-2/a2-25-ci-cd-production.md) đã ghi nhận GHCR/Render,
thay cho mô tả hosting chưa chọn của bản cũ. [Deployment UML](diagrams/deployment.puml)
và SVG còn ghi production TBD; cần cập nhật cả nguồn và hình trong PR thiết kế.

## Local bằng Docker Compose

Từ root, tạo cấu hình nếu chưa có, sửa password/secrets local rồi chạy:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose config --quiet
docker compose up -d --build
docker compose ps
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4000/products
```

Ba service mặc định: `db`, `backend`, `frontend`; `db-test` thuộc profile `test`
ở cổng 5434. Cổng host mặc định: DB local 5433, API 4000, web 3000. Backend chờ
DB healthy, chạy toàn bộ `prisma migrate deploy`, seed demo rồi phục vụ API.
Backend container dùng hostname `db`; API trên host dùng `localhost:<POSTGRES_PORT>`.
Web nhúng `NEXT_PUBLIC_API_URL` lúc build, cần build lại khi đổi origin.

DB mới/disposable cần khởi tạo số dư nguyên liệu để menu có hàng:

```powershell
docker compose exec -T backend npm run seed:inventory
```

Lệnh inventory có thay đổi số dư kho; chỉ dùng để khởi tạo kho demo.
`GET /health` kiểm tra DB bằng `SELECT 1` qua Prisma trên mỗi request. Thành
công trả HTTP 200 với `{"status":"ok","database":"up"}`; lỗi kết nối/query
trả HTTP 503 với `{"status":"error","database":"down"}`, không lộ connection
URL hoặc chi tiết lỗi nội bộ. Endpoint là readiness của API/DB, chưa kiểm tra
schema/migration hoặc nghiệp vụ. Kiểm tra thêm `/products` là JSON list và
menu có hàng. HTTP 200 của web chưa chứng minh checkout.
Xem lỗi bằng `docker compose logs --tail 100 backend frontend`. Dừng bằng
`docker compose down` để giữ volume dữ liệu. DB có sẵn cần đối chiếu
[migration guide](database-migrations.md) trước nếu lịch sử chưa khớp.

Chạy API/web trực tiếp: `npm ci` từng app, cấu hình `apps/api/.env` và
`apps/web/.env.local`, migrate/seed rồi dev server theo [README](../README.md).
Root `.env` không tự trở thành cấu hình của API trên host; password mẫu giữa
root/API khác nhau, cần đồng bộ trước khi kết nối Compose DB.

## VNPay Sandbox

Cấu hình API: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAY_URL`,
`PAYMENT_API_PUBLIC_URL`, `PAYMENT_WEB_PUBLIC_URL`, `PAYMENT_TTL_MINUTES`
(mặc định 15 phút, giới hạn 1–60). Merchant sandbox cần IPN
`GET {PAYMENT_API_PUBLIC_URL}/payments/webhooks/vnpay`. API phải có HTTPS công
khai để nhận IPN; local cần tunnel phù hợp. Browser return đưa khách về web;
chỉ IPN hợp lệ sau kiểm tra chữ ký, tham chiếu và số tiền mới quyết toán đơn.
Kiểm tra riêng nhánh thành công, thất bại, hết hạn và retry trên Sandbox.

## Production và release

[Hồ sơ triển khai](evidence/sprint-2/a2-25-ci-cd-production.md) ghi Web
`https://brewlite-2-web.onrender.com`, API `https://brewlite-api-49rx.onrender.com`
và CD run [#43549122315](https://github.com/ncd426/BrewLite-2/actions/runs/43549122315)
triển khai `8b9b0607d4b821de169d3a466866d9bdf7a1e8fd`. Đây là bằng chứng của
release đó; không tự chứng minh commit mới đã deploy.

[Workflow CD](../.github/workflows/cd.yml): quality gates → publish GHCR → deploy
Render bằng digest → đợi đúng deploy ID `live` → smoke. Pull request chỉ kiểm
tra/build image, không publish/deploy. Production deploy chỉ chạy trên `main`
và `RENDER_DEPLOY_ENABLED=true`; hồ sơ ghi nhóm đặt lại `false` sau kiểm tra.

| Cấu hình | Nơi lưu / yêu cầu |
| --- | --- |
| `RENDER_API_KEY` | GitHub Actions Secret, không đưa vào source hoặc log. |
| `RENDER_API_SERVICE_ID`, `RENDER_WEB_SERVICE_ID` | GitHub Actions Variables, đúng IDs `srv-...`. |
| `PROD_API_PUBLIC_URL`, `PROD_WEB_PUBLIC_URL` | GitHub Actions Variables; HTTPS origins thật. API origin được nhúng vào image web. |
| `A2_27_MIGRATION_APPROVED_SHA` | Full SHA được người phụ trách DB xác nhận schema/migration tương thích. |
| `RENDER_DEPLOY_ENABLED` | Bật theo đợt phát hành đã thống nhất; tắt khi ngừng deploy tiếp. |
| Environment `production` | Thiết lập reviewers nếu gói repo hỗ trợ; tên environment không tự tạo protection. |
| Render API runtime | `NODE_ENV=production`, `PORT=4000`, private `DATABASE_URL`, `JWT_SECRET` và VNPay. Entrypoint hiện lắng nghe cố định 4000. |
| Render Web runtime | `PORT=3000`; image build với API origin của release. |

DB production cần private networking, backup và quyền truy cập của người vận
hành; source code không chứng minh thiết lập đó đã đạt. Dockerfile API không
tự migrate/seed khi chạy, khác Compose local. Người phụ trách DB áp dụng
migration có kiểm soát trước khi xác nhận SHA; seed demo từ chối `NODE_ENV=production`.

1. Chọn SHA, kiểm tra PR review và quality gates. Full DB suite đang có lỗi
   trong [báo cáo hệ thống](evidence/sprint-2/system-verification-2026-11-14.md),
   cần xử lý trước khi nghiệm thu toàn hệ thống.
2. Lưu release API/Web đang chạy: SHA, hai image digests, deploy IDs, migration
   state. Kiểm tra backup restore được và image cũ còn trong GHCR.
3. Người phụ trách DB kiểm tra migration/schema và tương thích image trước/sau,
   rồi xác nhận full SHA qua `A2_27_MIGRATION_APPROVED_SHA`.
4. Người vận hành kiểm tra biến/secrets, bật deploy theo thỏa thuận rồi dispatch:

   ```powershell
   gh workflow run cd.yml -R ncd426/BrewLite-2 --ref main
   gh run list -R ncd426/BrewLite-2 --workflow cd.yml --limit 3
   ```

5. Chỉ ghi thành công khi job deploy không bị skip, API/Web đúng digest và smoke
   đạt. Tải artifact `a2-25-render-release-evidence`: `render-api-deploy.json`,
   `render-web-deploy.json`, `render-smoke.json`.
6. Kiểm tra nghiệp vụ Sandbox/browser, ghi release evidence. Nếu lỗi, dừng
   phát hành tiếp, giữ log và thực hiện rollback bên dưới.

Chi tiết cấu hình: [ci-cd-a2-25.md](ci-cd-a2-25.md). Các mục pending ở đầu tài
liệu lịch sử cần đọc cùng phần follow-up và evidence mới hơn.

## Rollback ứng dụng

Người vận hành thực hiện rollback trên Render. Adapter hiện báo lỗi và dừng,
chưa tự phục hồi. Dùng khi deploy không `live`, digest không khớp, smoke lỗi
hoặc kiểm tra nghiệp vụ phát hiện regression.

1. Đặt `RENDER_DEPLOY_ENABLED=false` để chặn deploy tiếp, lưu workflow URL/lỗi.
   API/Web deploy tuần tự; có thể chỉ một service đã đổi revision, cần kiểm tra
   cả hai trước khi chọn phạm vi rollback.
2. Người phụ trách DB đối chiếu DB với image cũ. Nếu không tương thích, chọn
   forward fix hoặc khôi phục DB theo kế hoạch riêng; rollback image không tự đảo SQL/data.
3. Render service → **Deploys** → deployment thành công trước → **Rollback**.
   Khôi phục service bị ảnh hưởng về cặp release tương thích; giữ digest cũ
   trong GHCR vì provider cần pull lại image.
4. Chờ deployment rollback mới `Live`, đối chiếu digest, chạy smoke:

   ```powershell
   .\scripts\cd\Smoke-A2-25-Production.ps1 -WebUrl 'https://brewlite-2-web.onrender.com' -ApiUrl 'https://brewlite-api-49rx.onrender.com'
   ```

5. Kiểm tra menu/login/history và checkout Sandbox theo phạm vi release; lưu
   SHA/digest cũ/mới, deploy IDs, thời gian và HTTP results. Chỉ phát hành lại
   sau khi sửa lỗi, test/review và xác nhận lại migration SHA.

Hồ sơ hiện có mô tả rollback **frontend** và deploy lại thành công. Chưa có
bằng chứng drill rollback API + restore DB, chưa nghiệm thu phục hồi toàn hệ
thống. Xem [migration guide](database-migrations.md) cho backup/restore dữ liệu.
