# ADR-004: VNPay Sandbox checkout with server-verified IPN

- **Status:** Proposed for team/reviewer approval (14/11/2026). The code implements this design, but this ADR does not certify that the change to the original Assignment 1 mock-payment scope was approved.
- **Supersedes in implementation:** [ADR-003](003-internal-mock-payment.md), which documented an internal MOMO/CARD mock and remains as historical decision context.
- **Context:** The current NestJS and Next.js implementation uses VNPay Sandbox instead of the earlier MOMO/CARD confirmation simulation. The backend must not treat browser return parameters or client assertions as evidence of successful payment.

## Decision and trust boundaries

1. `POST /orders` persists an order in `PENDING` with backend-validated pricing, promotion and ingredient reservation.
2. An authenticated customer starts a `VNPAY` attempt through `POST /payments` with `Idempotency-Key`; `PaymentsController` enforces the customer role and the service checks order ownership, amount, payable status and loyalty-point availability. The `Payment` is initially `PENDING` and has a configured expiration (default 15 minutes, bounded 1–60).
3. The API generates a signed VNPay Sandbox checkout URL using `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, SHA-512 HMAC and the payment ID as transaction reference. The browser opens the provider URL; its redirect to `/checkout/qr` is **not** a payment confirmation.
4. The provider callback is `GET /payments/webhooks/vnpay`. The backend verifies the signed `vnp_` parameters, merchant code, persisted payment reference and amount before attempting settlement. Invalid signatures/amounts do not settle a payment.
5. A valid IPN settles a still-pending payment in a PostgreSQL transaction. A successful response leads to `Payment=SUCCESS`, `Order=PAID` and a once-only loyalty award/point debit where applicable. A failed provider response leads to `Payment=FAILED`, `Order=PAYMENT_FAILED`. Repeated notifications must not award points repeatedly. Expired sessions are marked failed and eligible unpaid orders can be cancelled with reserved stock restored.
6. The Next.js `/checkout/qr` view polls the authenticated order status (currently every 3 seconds) and only navigates to `/checkout/success` after the API reports a paid status. It offers an explicit retry after a failed payment rather than silently creating a new attempt.

## Alternatives and consequences

- **Earlier internal MOMO/CARD simulation:** fewer external dependencies, but it did not exercise a signed provider callback or actual sandbox redirect. Preserved in ADR-003 as a historical choice.
- **Real-money provider settlement:** out of scope of these tests. A simulated signed IPN or a Sandbox flow is **not** proof of bank reconciliation, refunds or production payment certification.
- **Operational risks:** sandbox availability; mismatched callback/return URLs; missing environment variables; expired transactions; replay and concurrent IPNs; privacy of checkout links; payment amount/loyalty consistency. API secrets must be provided in private environment settings, never committed.
- **Current limitations to review:** full browser/mobile verification and provider-hosted Sandbox round-trip remain separate; no automatic provider refund for a paid order that staff subsequently cancels. A traceability review also flags after-`PAID` idempotency semantics (AC-06.3) for separate resolution.

## Verification and traceability

- Source: `apps/api/src/payments/payments.controller.ts`, `payments.service.ts`, `payments-webhook.controller.ts`, `payment-gateways.ts`, `apps/web/app/checkout/qr/page.tsx`.
- Automated: payment unit tests (signature, amount, expiry, replay); isolated PostgreSQL payment integration; `tests/e2e/checkout-vnpay-paid.e2e-spec.ts` exercises register -> menu -> order -> **simulated signed IPN** -> `PAID`.
- Evidence provenance: [14/11 retest log summary](../../evidence/sprint-2/a2-29-retests-2026-11-14.md); still require a full-DB regression run, real browser/PWA demo and team approval.
- Requirements: FR-05/06/07/08/10, UC-CHECKOUT, US-09/10/15/18; reconcile original REQ-006 before the final gate. Sequence/activity UML must be reviewed against the implemented IPN workflow.
