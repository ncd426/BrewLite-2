BrewLite - MVP Sprint 1 evidence
Captured: 2026-11-07

RESULTS
- API tests: 16 suites passed, 6 skipped; 125 tests passed, 18 skipped.
- API build: PASS.
- Web production build: PASS.
- Docker Compose image build: PASS for brewlite-2-backend and brewlite-2-frontend.
- Docker Compose runtime: PostgreSQL and API healthy; frontend running.
- GET /products: 8 products returned; all 8 available after inventory initialization.
- GET /products/1: 200 and product details returned.
- GET /products/999999: 404.
- GET /products/not-a-number: 400.
- Menu: 8 products visible; sample product images return 200.
- Seed fixtures tests: 8/8 passed. Seed log is included in docker-compose.log.

INVENTORY INITIALIZATION
Command: docker compose exec -T backend npm run seed:inventory
Initial run: initialized 22 empty ingredients; retained 8 products and 43 recipes.
Repeat run: 0 ingredients initialized because the inventory had already been initialized. Safe to rerun.

PR STATUS
No Sprint 1 PR was identified in the GitHub PR search. Existing PR #41 is for the deployment diagram, not Sprint 1. This bundle contains local test/demo evidence; it does not create or claim a Sprint 1 PR.

FILES
- api-tests.txt: full API unit/integration test output.
- api-smoke-results.json: endpoint, availability, and sample image checks.
- docker-compose.log: backend, database, and frontend logs including startup and seed.
- docker-compose-status.txt: Compose service status.
- docker-images.txt: Compose image list.
- docker-build.log: Docker Compose image build output.
- inventory-seed-command.txt: inventory seed command and result.
- menu-demo.png: screenshot of the running menu.
- screenshot-capture.log: browser screenshot capture output.
