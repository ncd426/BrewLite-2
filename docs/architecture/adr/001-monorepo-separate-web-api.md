# ADR-001: Monorepo with separate Next.js and NestJS applications

- **Status:** Accepted in the existing project structure; verify latest `origin/main`.
- **Context:** BrewLite needs a mobile-first web UI, a trusted API and shared documentation/test evidence, with a small student team working through reviewable PRs.
- **Decision:** Keep a single repository with `apps/web` (Next.js/TypeScript), `apps/api` (NestJS) and `docs`. Browser/API communication uses REST/JSON. UI state and presentation stay in the web app; access control, price calculation and transactions stay in the API.
- **Alternatives considered:** Separate repositories (more independent release controls but coordination overhead); all-in-one web backend (simpler initial setup but less clear NestJS API boundary and mismatch with assignment stack).
- **Advantages:** Easier traceability between SRS, UML, code and CI; one team workflow; API can be tested independently.
- **Trade-offs/risks:** Monorepo CI and dependency isolation need care. A shared repository does not require hosting frontend and backend in one container.
- **Verification:** `apps/web`, `apps/api`, and `docs` exist; PR CI builds each application; mobile layout and PWA behavior must be demonstrated separately.
- **Related:** `docs/architecture/overview.md`, Assignment 2 Task 3.1.
