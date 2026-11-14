# BrewLite — Prisma migration, seed và phục hồi DB

Đối chiếu ngày 14/11/2026 tại `506eaeb`, Prisma 6/PostgreSQL 16. Runbook này
thay hướng dẫn patch Product.version hai migration cũ. Giữ schema và toàn bộ
SQL cùng release trong Git.

## Chín migration hiện tại

| Migration | Thay đổi chính / tương thích |
| --- | --- |
| `20261017120000_baseline_existing_schema` | Năm bảng core và enum trạng thái. Không chạy CREATE TABLE lên DB đã có các bảng này. |
| `20261017120100_add_product_version` | Thêm version cho Product tại thời điểm đó. |
| `20261017173000_add_promotions_order_options` | Promotion và thông tin options/giảm giá trên đơn. |
| `20261021150000_add_user_name` | Tên người dùng. |
| `20261031170000_loyalty_redemption` | Payment.pointsUsed và constraint không âm. |
| `20261102100000_ingredient_inventory_recipes` | Ingredient/ProductIngredient; **bỏ Product.stock và Product.version**, image cũ có thể không tương thích. |
| `20261104150000_add_user_roles` | CUSTOMER/STAFF/ADMIN, user cũ mặc định CUSTOMER. |
| `20261104160000_add_order_channel` | ONLINE/COUNTER, đơn cũ mặc định ONLINE. |
| `20261105120000_payment_gateway_expiry` | Tham chiếu provider, checkout URL, expiry và unique indexes. |

Nguồn: [schema.prisma](../apps/api/prisma/schema.prisma) và
[migrations](../apps/api/prisma/migrations). Không giả định mọi migration đều
additive hoặc đảo được tự động. Tồn kho hiện dựa trên công thức nguyên liệu;
Product.version không còn trong schema hiện tại.

## DB mới, local hoặc disposable

Cấu hình `apps/api/.env`, kiểm tra host/port/tên DB. API trên host dùng
`localhost:5433` mặc định; container dùng `db`. Nếu dùng Compose DB, đồng bộ
password root `.env` với API `.env`.

```powershell
cd apps/api
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
```

DB mới phải áp dụng cả 9 migration. `generate` chỉ tạo client. Sau khi xác
nhận DB local mới/disposable, khởi tạo demo và kho bằng:

```powershell
npm run seed -- --initialize-inventory
```

Seed tạo users/menu/promotions/orders/recipes. `SEED_DEMO_PASSWORD` >=12 ký tự
chỉ đặt khi tạo user; password cũ được giữ. `--initialize-inventory` có thể đặt
lại số dư kho, chỉ dùng lúc khởi tạo demo. `npm run seed` không cờ giữ số dư
kho hiện có, vẫn có thể tạo dữ liệu mẫu còn thiếu và cập nhật ảnh theo fixture.
Seed từ chối `NODE_ENV=production`.

## DB có dữ liệu hoặc tạo bằng db push

1. Sao lưu, ghi SHA đang chạy và thử restore trên DB riêng.
2. Chạy `prisma migrate status`, đối chiếu `_prisma_migrations`, schema thật và
   toàn bộ SQL của release. Status kiểm tra lịch sử, không thay kiểm tra drift.
3. Nếu lịch sử/SQL không khớp, dừng để điều tra. Không dùng `migrate reset`,
   `db push --force-reset` hoặc resolve hàng loạt để bỏ qua sai khác.
4. Chỉ khi schema DB khớp chính xác baseline đầu tiên và chưa có lịch sử xung
   đột, người phụ trách mới baseline:

   ```powershell
   npx prisma migrate resolve --applied 20261017120000_baseline_existing_schema
   npx prisma migrate deploy
   npx prisma migrate status
   ```

   Resolve ghi lịch sử, không chạy SQL. Deploy áp dụng **mọi migration còn
   thiếu**, không chỉ migration thứ hai. DB đã chứa thay đổi mới hơn từ
   `db push` cần kế hoạch baseline riêng theo schema thật.
5. Kiểm tra query menu, recipe inventory, tạo/đọc đơn trên môi trường phù hợp.
   Không chạy demo seed lên production để tạo dữ liệu kinh doanh thật.

## DB kiểm thử

[README](../README.md) tách hai nhóm DB:

- `localhost:5434/brewlite_test`: `test:db:setup` kiểm tra URL rồi reset/migrate/
  seed. `test:isolated` và `test:e2e` nạp `apps/api/.env.test`.
- `brewlite_task10_*`: DB thứ hai cho PostgreSQL test với
  `RUN_DB_INTEGRATION=1`; không bật cờ qua runner bị giới hạn ở `brewlite_test`.

Lượt kiểm tra A2-29 tái tạo DB disposable với 9 migration/seed, chạy test và
cleanup. [Báo cáo ngày 14/11](evidence/sprint-2/system-verification-2026-11-14.md)
ghi kết quả và các test thất bại; bằng chứng local không thay migration production.

## Production, backup và phục hồi

Khoa phụ trách DB/migration, Danh review A2-27 theo backlog. Trước mỗi release
cần ghi SHA, migration đang có/còn thiếu, tương thích image trước/sau, lịch
bảo trì nếu cần, nơi lưu backup, người phục hồi và kết quả restore thử.
API Dockerfile không tự migrate/seed khi chạy.

Dùng private connection của môi trường vận hành để `prisma migrate deploy`,
kiểm tra status rồi mới xác nhận full SHA trong `A2_27_MIGRATION_APPROVED_SHA`.
CD chỉ kiểm tra SHA approval, không tự backup DB hoặc áp dụng migration production.

Ví dụ bằng PostgreSQL client, với `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`
và cơ chế mật khẩu cấu hình ngoài source/log:

```powershell
# PGDATABASE trỏ DB cần backup; giữ file ngoài Git với quyền truy cập riêng.
pg_dump --format=custom --file=brewlite-before-release.dump
pg_restore --list brewlite-before-release.dump
```

Mở terminal khác, đổi `PGHOST`, `PGPORT`, `PGUSER` và cơ chế mật khẩu sang
**cluster restore riêng**, kiểm tra kết nối đích rồi mới tạo DB kiểm chứng.
Không dùng lại connection production của bước backup:

```powershell
# Chỉ chạy sau khi đã xác minh cluster restore riêng trong terminal này.
createdb brewlite_restore_check
pg_restore --exit-on-error --no-owner --no-privileges --dbname=brewlite_restore_check brewlite-before-release.dump
```

Xác minh dữ liệu/query và ứng dụng tương thích trên DB restore mới.
`pg_restore --list` chỉ kiểm tra danh mục, chưa chứng minh restore thành công.
Khi phục hồi production, dừng ghi theo kế hoạch, bảo toàn DB lỗi để điều tra,
xác định dữ liệu phát sinh sau backup có thể mất, chỉ chuyển kết nối sau khi
người phụ trách xác nhận dữ liệu/ứng dụng. Chưa có drill restore production
trong hồ sơ hiện tại.

Rollback Render image không đảo schema/data. Migration nguyên liệu có DROP
COLUMN; không tự viết SQL đảo ngược khi lỗi. Chọn forward fix hoặc khôi phục
backup đã kiểm chứng theo tương thích/phạm vi dữ liệu. Ghi thời gian phục hồi
thực tế trước khi nghiệm thu. Xem [deployment](deployment.md) cho rollback API/Web.

## Thay đổi schema tiếp theo

Tạo migration mới trên DB phát triển riêng bằng `prisma migrate dev --name
<ten_thay_doi>`. Review SQL/schema/code, kiểm tra từ DB trắng và revision trước,
commit cả schema/SQL. Không sửa SQL đã áp dụng hoặc trộn `db push` vào lịch sử
chung. Thành viên khác dùng `migrate deploy`; lưu log không chứa URL/password
và link review vào PR.
