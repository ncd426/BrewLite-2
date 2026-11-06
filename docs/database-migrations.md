# BrewLite - Prisma Migration Guide (Prisma 6 / PostgreSQL)

This patch was made from the uploaded `api.zip` snapshot. It changes ONLY
`Product.version` in `schema.prisma`: the other four core models and the
`Payment.idempotencyKey @unique` constraint already existed. Do not overwrite
teammates' changes without reviewing the diff.

## Patch contents

- `apps/api/prisma/schema.prisma`: original models + `Product.version Int @default(0)`
- `apps/api/prisma/migrations/20261017120000_baseline_existing_schema/migration.sql`
  is the **pre-version** schema (Product, User, Order, OrderItem, Payment).
- `apps/api/prisma/migrations/20261017120100_add_product_version/migration.sql`
  adds `Product.version` without dropping tables or deleting rows.
- `apps/api/prisma/migrations/migration_lock.toml`: PostgreSQL migration lock.

## First, from the BrewLite repository root

1. Back up important data (for example, using pgAdmin or `pg_dump`).
2. Extract the patch at the repository root. Compare with `git diff`.
3. Verify `apps/api/.env` points to your intended PostgreSQL database.
4. In PowerShell, `cd apps/api` and run:

```powershell
npx prisma migrate status
```

**STOP** if there are existing applied migrations whose SQL/history is not in
this patch, or if the database schema differs from the original schema in the
uploaded ZIP. Do not ignore history mismatches or prompts to reset a database.

## Case A - your PostgreSQL database ALREADY has the five tables

This is the likely case if you previously ran `npx prisma db push` successfully.
It is safe to use **only if** the existing database still matches the original
pre-version `schema.prisma` and has no conflicting migration history.

```powershell
cd "C:\hoc tap\SWE\BrewLite\apps\api"
npx prisma migrate resolve --applied 20261017120000_baseline_existing_schema
npx prisma migrate deploy
npx prisma generate
npx prisma migrate status
```

- `migrate resolve --applied` records the first migration in
  `_prisma_migrations`, **without running** its `CREATE TABLE` statements.
- `migrate deploy` applies only the second migration (adds `version`).
- `migrate status` should report the database schema is up to date.

**Do not** use `migrate reset` or force `migrate dev` if it asks to reset a
non-empty database. That can delete tables/data.

## Case B - a completely EMPTY development database

```powershell
cd "C:\hoc tap\SWE\BrewLite\apps\api"
npx prisma migrate deploy
npx prisma generate
npx prisma migrate status
```

Prisma will apply BOTH migrations in order (create 5 tables, then add version).

## Verify the change

```powershell
npx prisma studio
```

Open http://localhost:5555 and inspect the Product table for the `version`
column. `Payment.idempotencyKey` has the Prisma `@unique` index. The migration
only creates the database structure: it does NOT implement the runtime
concurrency/idempotency logic.

Optional, with a PostgreSQL SQL console (pgAdmin or psql):

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='Product' AND column_name='version';

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename='Payment'
  AND indexname='Payment_idempotencyKey_key';
```

## For every teammate (after merging the patch)

- Pull the same branch/PR; keep `schema.prisma` AND the complete `migrations`
  folder in Git. Do NOT commit `.env`, `node_modules` or `dist`.
- In their own `apps/api` directory: `npm ci` (first time), then apply the
  correct Case A or Case B above for THEIR database, and run `npx prisma generate`.
- For future changes: one teammate edits `schema.prisma`, creates a NEW
  migration with `npx prisma migrate dev --name <change_name>` on an already
  baselined dev database, commits both, and teammates use
  `npx prisma migrate deploy` to apply shared migrations.
- Replace the old `npx prisma db push` instructions in the project README after
  everyone has moved to migrations; mixing `db push` and migration history can
  cause schema drift.

## What still needs backend implementation?

The uploaded `ProductsService` returns a hard-coded in-memory menu;
`UsersService` stores users in a Map. Customer payments create expiring
VNPay provider sessions. The API updates an order to `PAID` or
`PAYMENT_FAILED` only after a provider callback passes signature, reference, and
amount checks. The browser return URL does not settle a payment. Pending QR
payments expire after the configured TTL and are canceled by the API expiry
sweeper. The unique `idempotencyKey` protects retries, and a partial unique
index permits at most one pending payment per order.

## Security note

The uploaded `api.zip` included `.env` and `node_modules`. This patch excludes
both. Do not upload or commit actual credentials. If a sensitive password or
API token has been shared, rotate it as appropriate.

## Status

SQL migration files are prepared, but **not applied to your Windows PostgreSQL
instance**. Running the appropriate commands above and inspecting the outputs
is required before anyone can report "migration succeeded".
