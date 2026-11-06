# ADR-003: Internal mock MOMO/CARD checkout for the MVP

- **Status:** Accepted for the student MVP; no production payment provider is selected.
- **Context:** BrewLite must demonstrate the entire checkout workflow without collecting real money or requiring provider credentials. The current use-case specification has QR and card confirmation inside BrewLite.
- **Decision:** Expose MOMO and CARD as simulated payment methods. Create an order in `PENDING`, then show the internal QR/card confirmation page; send `POST /payments` only after customer confirmation. Handle payment state, order state, ownership and `Idempotency-Key` inside the NestJS API. No calls to external MOMO/VNPay gateways or webhooks.
- **Success path:** Persist payment `SUCCESS` and order `PAID`; redeem/award loyalty points once; update the paid items in the web cart; show order confirmation.
- **Failure path:** Persist payment `FAILED` and order `PAYMENT_FAILED`; preserve the cart. Current checkout does **not** automatically return ingredient stock, which is a documented limitation, not a feature to assume.
- **Alternatives considered:** Real payment integration (out of assignment MVP scope; credentials, regulatory, webhook/security work); client-side success-only simulation (cannot reliably enforce ownership, amount, status or replay rules).
- **Advantages:** Testable flows, safe demonstration, no real money movement, fewer external dependencies.
- **Trade-offs/risks:** Does not validate real settlement/reconciliation; simulation failure modes are not equal to real gateway behavior. A developer-only forced-failure flag must not be exposed in production.
- **Verification:** Check `POST /payments` handler and frontend QR/CARD confirmation routes; test success/failure/replay; confirm production rejects `simulateFailure`. Record the SRS NFR-02.4 wording conflict as a review note rather than silently editing SRS.
- **Related:** FR-05, FR-06, FR-08, FR-10; `docs/requirements/use-case-checkout.md`.
