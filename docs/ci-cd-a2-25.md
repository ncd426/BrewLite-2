# A2-25: CD workflow, container registry and release evidence

**Owner:** Danh | **Reviewer:** Bảo | **Snapshot reviewed:** `origin/main` at `419f698` (2026-11-10).

## Current status and scope

- `ci.yml` already checks API install, Prisma client, lint, unit tests, build; Web install, lint and build. Keep its existing PR checks and branch protection.
- `cd.yml` checks quality plus Dockerfile builds on PR (without publishing). On `main`/version tags it now **publishes the API image first**, even when the public API URL is not yet known. The Web image is published **only after** `PROD_API_PUBLIC_URL` is configured, because the URL is embedded at build time.
- The Web image embeds `NEXT_PUBLIC_API_URL` at **build time**. Publishing a supposed production image with a `localhost` API URL would be incorrect; therefore, publishing is skipped until a real HTTPS API origin is known.
- CD does **not** deploy a production service yet. In the reviewed snapshot, there are no configured GitHub Environments or recorded Deployments; `docs/deployment.md` says production hosting is not selected. Bảo's A2-26 must identify the host and HTTPS URLs. Khoa's A2-27 must verify production migrations, database safety and rollback. **Do not mark A2-25 Done from a GHCR publish alone.**

## Configuration (after A2-26 confirms production API)

In GitHub repo **Settings -> Secrets and variables -> Actions -> Variables**, add:

- `PROD_API_PUBLIC_URL`: **public HTTPS API origin**, e.g. `https://api.your-real-domain.example` (replace with the actual verified service, not localhost or a temporary ngrok URL).

Do not place `VNPAY_HASH_SECRET`, database credentials, JWT secrets or ngrok Authtokens in this variable or in commits. Production runtime secrets belong to the chosen hosting provider's secure configuration.

## Pipeline and permissions

1. Trigger: PR to `main` (quality + Docker build **without registry push**), `push` to `main`, version tag `v*`, or manual `workflow_dispatch`.
2. `CD / API quality` and `CD / Web quality` (isolated jobs, `contents: read`).
3. On PR, `CD / Dockerfiles build check (PR)` validates both Dockerfiles without publishing. `CD / Release configuration` warns when production API URL is missing.
4. `CD / GHCR publish (SHA)`: not allowed on PR; API publication requires quality jobs PASS but does not require a Web URL. If `PROD_API_PUBLIC_URL` exists, validate it as HTTPS before publishing Web. Version tag must reference a commit already on `main`; `packages: write` is limited to the publish job.
5. `docker/build-push-action` publishes one API image first (bootstrap), later both images once API HTTPS URL is known. The Actions **job summary** records actual digests; a skipped Web image is explicitly marked as not published.

Image names (repository path is lowercase):

- `ghcr.io/ncd426/brewlite-2-api:sha-<first-12-hex-of-commit>`
- `ghcr.io/ncd426/brewlite-2-web:sha-<first-12-hex-of-commit>`

For a version tag like `v1.0.0`, the images additionally get `:v1.0.0`. Do not use an untracked mutable `latest` for production rollback. Record the actual image **digest** `@sha256:...` from the run summary.

The GitHub-provided `GITHUB_TOKEN` is used for registry publishing; no personal token is required in the workflow. GHCR packages may be private by default, so the eventual runtime host needs approved **read-only** pull access. Prefer a separate short-lived/deployment-scoped credential rather than a personal token with write access.

## Bootstrap sequence with Render (API first)

1. Merge this follow-up PR into `main`. Run `gh workflow run cd.yml -R ncd426/BrewLite-2 --ref main` and verify **API image and digest** exist in GHCR. Web image will be skipped until an API URL exists.
2. Khoa (A2-27) provisions a **separate, private production PostgreSQL** and approves safe Prisma migration procedure. Do not use local Compose DB or run demo seed against production. The API container Dockerfile **does not perform migrations on startup**, unlike local Compose.
3. Bao (A2-26) creates the Render API **image-backed Web Service**, pulling `ghcr.io/ncd426/brewlite-2-api:sha-<short-SHA>`, and configures `PORT=4000`, `NODE_ENV=production`, a private `DATABASE_URL` and strong runtime secrets. The current NestJS entrypoint listens on port 4000 rather than reading Render's default `$PORT` (10000). Use the actual matched port; do not commit secrets. For private GHCR packages, Render requires appropriately scoped read-only package credentials.
4. After the public API HTTPS origin and `/health` work, Danh configures the repository Action Variable `PROD_API_PUBLIC_URL` to that **real API origin**, then manually runs CD again. This time both API and Web images are published with the same commit-SHA tags.
5. Bao creates the image-backed Render Web service from `ghcr.io/ncd426/brewlite-2-web:sha-<short-SHA>` and configures `PORT=3000`, checking Next.js browser API access and allowed CORS origins.
6. After service URLs are confirmed, Danh adds guarded Render deploy hooks targeting **the exact SHA/digest**, a wait-for-success stage, health and smoke probes, then verifies a rollback with Khoa. A successful deploy-hook HTTP response alone does not prove deployment succeeded.

Render's **image-backed** services do not redeploy merely because the registry tag changes. For an exact release use the deploy hook with URL-encoded `imgURL=<full-image-reference>`; its base repository URL must match the image assigned to that service. Hook URLs are secrets, stored in GitHub Actions Secrets, never in the repository. Do not assume `preDeployCommand` exists on Render's free web-service plan.

## Deploy and rollback integration: pending A2-26/A2-27

**Deployment platform not established in snapshot.** After Bảo chooses and configures a real host, add a separate guarded `deploy-production` job/adapter (or a follow-up reusable workflow) with:

1. Protected `production` environment/approval, read-only registry pull credentials and provider secrets; never log secret values.
2. Pull the **exact published SHA/digest** for API and Web, not a floating `main`/`latest` image.
3. Run migration policy approved by Khoa (`prisma migrate deploy` on production DB) with backup/compatibility plan. Do **not** run demo seed or `docker compose down -v` on production.
4. Start/replace services; wait for health; run smoke checks against actual HTTPS origins:

   ```powershell
   .\scripts\cd\Smoke-A2-25-Production.ps1 -WebUrl 'https://ACTUAL-WEB-URL' -ApiUrl 'https://ACTUAL-API-URL'
   ```

5. **Fail deployment** if health or smoke fails. Preserve the previous deployment digest and restore the previous image revision; repeat smoke. Do not claim automatic rollback without an implemented/tested provider adapter.
6. Record GitHub Actions workflow URL, package image digests, production HTTPS URLs, deployment history, smoke CSV, rollback test log, reviewer approval.

A `200` on `/health` and `/products` checks service reachability, not VNPay production webhook correctness or an entire checkout E2E. Those tests must be run separately in the authorized environment.

## Evidence and acceptance

| Item | Evidence | Status at snapshot |
| --- | --- | --- |
| Existing CI PASS | GitHub Actions run for `419f698` | Confirmed from review pack |
| CD workflow PR and review | PR link, Bảo approval | Pending |
| Docker builds and GHCR publish | CD run, two SHA tags/digests | Pending runtime verification |
| Provider chosen and HTTPS host available | A2-26 production URLs | Not provided |
| Deploy exact image SHA/digest | Provider log and deployment record | Pending |
| Health/smoke after deploy | `scripts/cd/Smoke-A2-25-Production.ps1` CSV | Pending |
| Rollback exercised | A2-27 procedure and measured evidence | Pending |

All generated local artifacts/test logs should stay under `work/A2-25/` (gitignored); only reviewed documentation and CD source belong in tracked folders.
