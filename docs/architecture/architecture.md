# BrewLite architecture

BrewLite is a single-repository application with separate web and API
applications:

- **Web:** Next.js and TypeScript provide the mobile-first customer experience.
- **API:** NestJS exposes product, authentication, order, user and VNPay Sandbox
  payment functionality with server-side signed IPN validation.
- **Persistence:** Prisma connects the API to PostgreSQL.
- **Tests:** API unit tests remain next to the API; end-to-end tests live under
  the root `tests/e2e/` directory.
- **Local orchestration:** Docker Compose starts PostgreSQL, API, and web
  services together.

The diagram is in [diagrams/architecture.md](../diagrams/architecture.md).
