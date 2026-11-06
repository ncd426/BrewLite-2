# ADR-002: PostgreSQL and Prisma for transactional order state

- **Status:** Accepted in the existing technology stack; runtime transaction guarantees require tests.
- **Context:** Orders, line items, payments, inventory and loyalty must remain consistent on validation failures and concurrent requests; the assignment requires PostgreSQL.
- **Decision:** Use PostgreSQL as durable storage accessed through Prisma in NestJS. Version the Prisma schema and migrations. Perform order creation and ingredient-stock adjustments in a transaction; persist payment results and status/points updates transactionally where the implementation supports it. Use a unique payment idempotency key to prevent duplicate processing.
- **Alternatives considered:** In-memory maps (cannot guarantee durability or shared state); unversioned `db push` in shared/prod environments (schema drift risk); NoSQL persistence (mismatched with assigned PostgreSQL and relational workflow).
- **Advantages:** Referential integrity, migration history, consistent multi-record writes and recovery via persistent volumes/backups.
- **Trade-offs/risks:** Concurrent inventory changes still need correct optimistic locking/conditional updates; migration and rollback procedures need testing. Transactions do not automatically imply stock is restored after payment failure.
- **Verification:** `schema.prisma`, migration SQL and Compose settings; tests for failed stock validation, concurrent order creation, idempotent replay and order/points consistency.
- **Related:** FR-05, FR-06, FR-08, NFR-04; `docs/database-migrations.md`.
