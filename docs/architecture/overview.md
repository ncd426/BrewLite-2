# BrewLite - Architecture Overview (Assignment 2, Task 3.1)

**Owner:** Danh (A2-13)
**Reviewer:** Khoa
**Status:** Proposed for Task 3 review; implementation alignment updated 14/11/2026, pending team approval.
**Baseline:** BrewLite documentation snapshot from 2026-11-05. Confirm file and implementation changes on the latest `origin/main` before merging.

## 1. Purpose and boundaries

BrewLite is a mobile-first coffee ordering application. Its core flow is: browse menu -> select options -> manage cart -> authenticate -> create order -> complete VNPay Sandbox checkout -> track order. The architecture keeps the **Next.js web client**, **NestJS REST API**, and **PostgreSQL** separate while developing and versioning them in one repository. **Prisma** is the API's database access and migration layer.

The current checkout implementation uses **VNPay Sandbox** and a signed server-side IPN endpoint. It is **not** evidence of real-money settlement or a provider refund process. The original MOMO/CARD mock is preserved in historical ADR-003; proposed ADR-004 records the current design. Admin/staff features may share the backend but do not turn the frontend into a trusted source for prices, stock, or authorization.

**Scope of this document:** logical architecture, responsibilities, data flow, operational principles, alternatives and trade-offs. The repository includes GHCR/Render CD configuration and historical HTTPS evidence; verify the actual production release/configuration at final acceptance rather than inferring deployment success from these architecture notes.

## 2. Container view

```mermaid
flowchart LR
    C[Customer / staff browser] -->|HTTPS in production| W[Next.js web - apps/web]
    W -->|REST/JSON, JWT| A[NestJS API - apps/api]
    A -->|Prisma ORM + transactions| D[(PostgreSQL)]
    W -->|Signed checkout URL| G[VNPay Sandbox]
    G -->|Signed IPN| A
    A -->|Payment + order status| D
```

**Repository boundaries:** `apps/web` owns UI and client interaction; `apps/api` owns business rules and API; Prisma schema/migrations define persisted data; `docs` contains SRS, UML and architecture evidence. Docker Compose provides local orchestration for `frontend`, `backend` and `db` as described in `docs/deployment.md`.

| Layer | Responsibility | Explicit non-responsibility |
| --- | --- | --- |
| Next.js web (mobile-first, PWA target) | Menu, product options, cart, login flows, VNPay Sandbox QR/redirect, order history, responsive/loading/empty/error states | Does not decide the trusted order total, decrement stock, or set `PAID` directly |
| NestJS REST API | JWT authentication/authorization, products, orders, stock validation, promotions, loyalty calculations, signed VNPay IPN, status transitions | Does not rely on browser-supplied final prices or payment success flags |
| Prisma + PostgreSQL | Durable users, products, orders/items, payment attempts and domain state; migration history; transactional consistency | Does not implement UI or actual external payment settlement |
| VNPay integration in API | Creates HMAC-signed Sandbox checkout URLs, validates signed IPNs, enforces ownership/idempotency and settles payment/order/loyalty in a DB transaction | Does not claim real-money reconciliation, automatic provider refunds or browser-return settlement |
| Operational boundary | Runtime configuration, health endpoint, logs and CI/CD checks | Does not store secrets in the repository or expose a production database publicly |

> PWA is an architectural **target** from the assignment; installability, service worker and offline behavior must be checked in code/tests before being claimed as implemented.

## 3. Logical NestJS boundaries

These are **responsibility groups**, not a claim that every name is already an individual `*.module.ts` file:

- **Auth/Users:** registration, bcrypt password hashes, JWT authentication, customer profile and role checks.
- **Products/Catalog:** menu, details, sizes, toppings; inventory-related product and ingredient reads.
- **Orders/Inventory:** server-side pricing, promotion validation, available-ingredient checks, transactional stock adjustment and initial `PENDING` order creation.
- **Payments:** authenticated VNPay checkout session, signed provider callback validation, idempotency-key handling, payment expiration and atomic payment/order/loyalty status changes.
- **Promotions/Loyalty:** discounts and points rules; redeem/award only on successful payment, with no duplicate award.
- **Staff/Admin:** protected order operations and product/inventory management, where implemented.

Order status is controlled by the API: `PENDING`, `PAID`, `PAYMENT_FAILED`, `PREPARING`, `READY`, `COMPLETED` and `CANCELLED` are the statuses described by the SRS/domain UML. Valid transitions and role permissions belong to the backend. `LoyaltyTransaction` is conceptual in the domain diagram and is **not** currently a persisted Prisma model in the reviewed snapshot; do not document it as an existing database table.

## 4. Checkout sequence and consistency

1. Web loads customer/cart information; protected actions require a valid JWT. Invalid or expired authentication redirects the user to login without silently placing an order.
2. Web optionally previews promotion and points. API must recompute pricing and validate conditions from server-side data.
3. `POST /orders` validates items and availability, then creates order/items with initial `PENDING` status and adjusts ingredient stock within a DB transaction; an out-of-stock failure rolls back order creation.
4. Web opens `/checkout/qr` and requests `POST /payments` with a stable `Idempotency-Key`. API validates ownership, amount/status and replay constraints, persists `Payment=PENDING`, and returns a signed VNPay Sandbox checkout URL with an expiration.
5. Customer follows the provider URL. VNPay sends a signed IPN to `GET /payments/webhooks/vnpay`; the API verifies signature, merchant, reference and amount before settling the attempt in PostgreSQL. **Browser return parameters do not mark the order paid.**
6. On verified success, persist `Payment=SUCCESS`, transition order to `PAID`, redeem/award loyalty once, and allow web polling to detect success, remove the purchased cart lines and show the success page. A provider failure persists `Payment=FAILED` and transitions the pending order to `PAYMENT_FAILED`; explicit retry preserves unrelated cart lines.
7. Customers may cancel only their own unpaid online orders (`PENDING` or `PAYMENT_FAILED`). Staff may cancel an unpaid order or a paid order before preparation starts. A successful payment remains recorded; a paid cancellation requires a manual refund outside the application.
8. A cancellation atomically transitions the order, fails any pending payment sessions, and restores the reserved required ingredients once. Payment expiry also cancels the order and restores its reservation.

**Cancellation constraint:** inventory restoration uses the current required recipe for each order item. Paid-order refunds are not automated or verified against a payment provider; staff must handle them manually.

**Route verification:** the checkout specification names `/checkout/success`; verify the current Next.js route before claiming the code uses the same URL.

## 5. Operations, security and deployment constraints

| Concern | Design / verification point |
| --- | --- |
| Local environment | Docker Compose for `frontend`, `backend`, `db`; PostgreSQL persistent volume; backend waits for DB health; Prisma migrations before serving. Check actual Compose behavior before demo. |
| Database changes | Commit `schema.prisma` and migration SQL together; use `prisma migrate deploy` for shared/prod environments; do not reset non-empty databases. |
| Secrets | `.env.example` documents variable names; runtime credentials/JWT secret supplied through private environment or CI secrets. Do not commit `.env`, log JWTs, passwords or payment headers. |
| Access control | bcrypt for stored passwords; JWT and resource ownership/role checks for private APIs; backend computes totals; production HTTPS. |
| Payment trust boundary | Only a validated signed VNPay IPN may settle an online payment; never trust the browser return query for `PAID`. Verify sandbox credentials/URLs at deployment; simulated IPN tests are not real provider certification. |
| Logging | Prefer consistent level, timestamp, route, status, latency, request/correlation ID (when implemented); avoid credentials/PII in logs. **Verify logging implementation** before claiming structured logs are deployed. |
| Health | Expose/probe an API health endpoint (e.g. `GET /health`) and check DB readiness. Verify actual route and live behavior before acceptance. |
| Resilience | Use transactions for stock/order and payment/order/points consistency; idempotency for payment retry; persist DB volumes; define deployment rollback with A2-14/A2-15. |
| CI/CD | PR checks should cover install, lint, tests, builds. Image registry, HTTPS hosting, release/rollback policy and public endpoints depend on actual deployment decisions. |

### PWA and production verification

The assignment requests mobile-first/PWA and a production-accessible HTTPS deployment. These are **acceptance targets**, not evidence of a completed production deployment. Record the real host, registry, service topology and probes after A2-14/A2-15 have selected and verified them.

The [deployment diagram](../diagrams/deployment.svg) now reflects the recorded GitHub Actions -> GHCR -> Render topology. Its editable source is [deployment.puml](../diagrams/deployment.puml). This is architecture alignment, **not proof that the latest uncommitted local changes have been deployed**; re-verify the release SHA, database access, backups and live HTTPS checks.

## 6. Decision trade-offs

| Decision | Benefit | Cost / limitation | Reference |
| --- | --- | --- | --- |
| Monorepo + separate Next.js/NestJS applications | Simple team coordination, consistent docs/CI, independent UI and API boundaries | Changes may affect shared build/CI; one repo does not imply one deployable | [ADR-001](adr/001-monorepo-separate-web-api.md) |
| PostgreSQL + Prisma + migrations | Relational consistency and transaction support for order, stock and payment state | Schema migrations and concurrency handling require care | [ADR-002](adr/002-postgresql-prisma-transactions.md) |
| Historical internal MOMO/CARD mock | Simpler original MVP without an external provider | Superseded by current code; kept for decision history | [ADR-003](adr/003-internal-mock-payment.md) |
| VNPay Sandbox + server-verified IPN | Tests redirect/notification boundary and transactional state settlement | Sandbox, callbacks, retries and secrets require operational checks; real settlement/refunds unproven | [ADR-004 - proposed](adr/004-vnpay-sandbox-signed-ipn.md) |

## 7. Traceability and review checklist

- FR-01 to FR-04: catalog/cart/auth -> Next.js and Auth/Products API.
- FR-05: create order, stock check -> Orders/Inventory and PostgreSQL transaction.
- FR-06, FR-08: VNPay Sandbox payment/IPN signature/status/idempotency -> Payments API and PostgreSQL transaction.
- FR-07, FR-09, FR-10: history, promotions, loyalty -> Orders/Promotions/Users API.
- NFR-02, NFR-04: JWT/roles/secrets/HTTPS; Compose, migrations and configuration.
- UML references: `docs/diagrams/activity-checkout.puml`, `sequence-checkout.puml`, `class-domain.puml` and `docs/requirements/use-case-checkout.md`.

**Before final architecture approval:** compare with the current main branch, approve or revise proposed ADR-004 and the mock-to-VNPay scope change, verify the IPN trust boundary and update activity/sequence UML. Historic SRS/REQ-006 inconsistencies must be reconciled by the team, not silently assumed resolved. Production deployment/rollback evidence is checked separately.
