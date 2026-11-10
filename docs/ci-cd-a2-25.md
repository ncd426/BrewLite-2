# A2-25: CD workflow, container registry and release evidence

**Owner:** Danh | **Reviewer:** Bảo | **Snapshot reviewed:** `origin/main` at `419f698` (2026-11-10).

## Current status and scope

- `ci.yml` already checks API install, Prisma client, lint, unit tests, build; Web install, lint and build. Keep its existing PR checks and branch protection.
- New `cd.yml` checks quality plus Dockerfile builds on PR (without publishing), and on push to `main` and version tags it **publishes both Docker images to GitHub Container Registry (GHCR)** only when `PROD_API_PUBLIC_URL` is configured.
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
4. `CD / GHCR publish (SHA)`: not allowed on PR; only if config exists and quality jobs PASS; validates HTTPS URL, verifies tag commit is on `main`; receives `packages: write` **only in this job**.
5. `docker/build-push-action` publishes two images with immutable commit references and records both digests in the GitHub Actions **job summary**.

Image names (repository path is lowercase):

- `ghcr.io/ncd426/brewlite-2-api:sha-<first-12-hex-of-commit>`
- `ghcr.io/ncd426/brewlite-2-web:sha-<first-12-hex-of-commit>`

For a version tag like `v1.0.0`, the images additionally get `:v1.0.0`. Do not use an untracked mutable `latest` for production rollback. Record the actual image **digest** `@sha256:...` from the run summary.

The GitHub-provided `GITHUB_TOKEN` is used for registry publishing; no personal token is required in the workflow. GHCR packages may be private by default, so the eventual runtime host needs approved **read-only** pull access. Prefer a separate short-lived/deployment-scoped credential rather than a personal token with write access.

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
