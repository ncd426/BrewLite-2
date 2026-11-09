# A2-22 - Reviewer checklist (Khoa)

The report `A2-22_NFR_REPORT_20261109.md` is based on the user's local results, **not** a production acceptance claim.

- [ ] Confirm `fix/a2-22-vnpay-retry` PR, review result, and successful CI checks.
- [ ] Verify cancel/fail returns a clear failure UI and no automatic `processPayment()` retry.
- [ ] Verify retry happens only on explicit click, then VNPay success updates order history.
- [ ] Review order #15 successful, order #17 failed-then-successful, order #18 failed DB evidence.
- [ ] Attach redacted screenshots/video of complete menu -> options -> cart -> auth -> order -> payment -> history flow.
- [ ] Assign 100-VU 10-minute load verification in isolated test environment for NFR-01; do not send load to VNPay Sandbox.
- [ ] Confirm cross-user authorization negative tests, amount tamper/replay tests, and invalid signed IPN without DB mutation for NFR-02.
- [ ] Coordinate recovery, persistent DB and migration/seed checks with Khoa A2-24; do not reset active DB.
- [ ] Capture production monitoring/hardening separately; 99.5% monthly SLA cannot be verified from local tests.
- [ ] Revoke any previously disclosed ngrok authtoken.

**Suggested A2-22 status:** Review requested. Mark Done only after owner/reviewer agree that remaining full-SRS gaps have explicit tracking and are not claimed as PASS.
