# Local Compose database and health evidence

Captured: 2026-11-10

Scope: local Docker Compose development stack only. No production database or
production credentials were accessed.

## Results

- PostgreSQL service: healthy; database `brewlite`.
- Backend service: healthy.
- Frontend service: running.
- Prisma query from the backend container: `SELECT current_database(), 1` returned `brewlite`, `1`.
- `GET http://localhost:4000/health`: HTTP 200, `{"status":"ok"}`.
- Migrations: 9 found; no pending migrations.
- Seed: completed successfully; all fixtures already existed, so 0 rows were created or updated. The seed reports that it is safe to rerun.
- Database host port: local development mapping `5433:5432`. This Compose stack uses the local `brewlite` database; no production endpoint or credentials were accessed.
- A loopback-only binding was attempted, but Windows rejected `127.0.0.1:5433` because that port is reserved on the host. The original mapping was restored so the local database can run.

## Captured command output

```text
Datasource "db": PostgreSQL database "brewlite", schema "public" at "db:5432"
9 migrations found in prisma/migrations
No pending migrations to apply.

Seeding BrewLite local database (existing rows will not be replaced)...
Products: 8 fixtures, 0 created, 0 images updated
Inventory: 22 ingredients, 0 created, 0 initialized; 43 recipes, 0 created
Promotions: 5 fixtures, 0 created
Users: 3 demo accounts, 0 created
Orders/payments: 7 fixture pairs, 0 pairs created
Safe to rerun. Accounts use your SEED_DEMO_PASSWORD only when first created.

NAME                  SERVICE    STATUS
brewlite-backend-1    backend    Up (healthy)
brewlite-db-1         db         Up (healthy)
brewlite-frontend-1   frontend   Up

GET /health
{"status":"ok"}

Prisma query from backend
[{"db":"brewlite","connected":1}]
```
