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


---

## 2026-11-11 follow-up: Render release adapter (finish A2-25)

**Observed by Danh:** PRs [#51](https://github.com/ncd426/BrewLite-2/pull/51) and [#52](https://github.com/ncd426/BrewLite-2/pull/52) were merged. [CD run 42947159680](https://github.com/ncd426/BrewLite-2/actions/runs/42947159680) passed and published **both** SHA-tagged Docker images. At the time of the last manual check, Render reported both services Live:

- Public Web: `https://brewlite-2-web.onrender.com`
- Public API: `https://brewlite-api-49rx.onrender.com`
- Database: nine Prisma migrations applied; API `/health` returned `status=ok`, API `/products` returned HTTP 200 with `[]` (empty products; seed/content belongs to A2-24/A2-27 and business acceptance, not CD).

The original analysis earlier in this document describes the 2026-11-10 **snapshot** only; the status above supersedes its provider-pending notes. **Do not claim a successful automated deployment or rollback until new runs prove those steps.**

### What the follow-up code does

The job `CD / Render deploy by digest + smoke` is added to `.github/workflows/cd.yml` and runs **only** on `main`, after the quality gates and GHCR `publish` job. It is off until the owner explicitly sets the GitHub Actions variable `RENDER_DEPLOY_ENABLED=true`.

1. Requires Khoa's **per-release migration approval**, represented by `A2_27_MIGRATION_APPROVED_SHA` matching the **full** GitHub commit SHA. Confirm `prisma migrate status` is up to date for that revision and take a backup if real business data exists. A2-25 does not run migrations using a public production DB URL. If a later version introduces migrations, Khoa must apply/verify them safely before approving that SHA.
2. Uses a Render API key stored as a GitHub **secret**, plus API/Web **service IDs** and public URLs stored as non-secret GitHub **variables**.
3. Asks Render to deploy the **exact immutable GHCR image digest** produced by the same publish job, first API, then Web. No mutable `latest` tag and no manual copy/paste of SHA tags.
4. Polls each newly created **deploy ID** until Render itself reports that deployment `live`, checking the returned image reference equals the requested digest. A previously live service is not enough to pass.
5. Runs `GET /health` (must be JSON `status=ok`), `GET /products` (must be a JSON list), and Web `/` (must return HTML). A `200 []` verifies technical connectivity **only**, not usable menu or E2E checkout.
6. Stores non-secret JSON evidence as a GitHub Actions artifact `a2-25-render-release-evidence`; any failed deploy or smoke step fails the job and writes rollback guidance.

**Do not send Render API keys or deployment secrets in issues, screenshots, chat, source files, or Actions logs.** Render API keys can control production services; use a scoped key when available, rotate promptly if exposed. Rotate previously exposed DB/JWT credentials before treating the demo as a real public environment.

### One-time GitHub configuration

In GitHub **Settings > Secrets and variables > Actions**:

| Type | Exact name | Value / where to find |
| --- | --- | --- |
| Secret | `RENDER_API_KEY` | Render **Account Settings > API Keys**; create one for GitHub Actions, preferably deployment-scoped |
| Variable | `RENDER_API_SERVICE_ID` | API Render service ID, format `srv-...`, from service URL or Settings (**not** a `dep-...` deploy ID) |
| Variable | `RENDER_WEB_SERVICE_ID` | Web Render service ID, format `srv-...` |
| Variable | `PROD_API_PUBLIC_URL` | `https://brewlite-api-49rx.onrender.com` |
| Variable | `PROD_WEB_PUBLIC_URL` | `https://brewlite-2-web.onrender.com` |
| Variable | `A2_27_MIGRATION_APPROVED_SHA` | Full 40-character commit SHA; set **after** Khoa checks the schema/migration state for that exact revision |
| Variable | `RENDER_DEPLOY_ENABLED` | `true` **only after** all configuration above is verified; otherwise omit or set `false` |

Go to GitHub **Settings > Environments** and create `production`. When available for the repository/plan, configure **required reviewers** (Bảo/Khoa). The environment is not automatically protected merely because the workflow references it. The SHA-specific migration gate remains mandatory even if required reviewers cannot be configured.

You can set non-secret variables from PowerShell after verifying values:

```powershell
$repo = 'ncd426/BrewLite-2'
gh variable set PROD_API_PUBLIC_URL -R $repo --body 'https://brewlite-api-49rx.onrender.com'
gh variable set PROD_WEB_PUBLIC_URL -R $repo --body 'https://brewlite-2-web.onrender.com'
# Paste YOUR srv-... IDs below; they are different from deploy IDs.
gh variable set RENDER_API_SERVICE_ID -R $repo --body 'srv-REPLACE_WITH_REAL_API_SERVICE_ID'
gh variable set RENDER_WEB_SERVICE_ID -R $repo --body 'srv-REPLACE_WITH_REAL_WEB_SERVICE_ID'
```

**Do not use those two placeholder service-ID commands until replaced with real values.** Create `RENDER_API_KEY` as a GitHub secret in the GitHub website, not with `--body` on the CLI where a copied command could expose it.

After the follow-up PR is merged and Bảo/Khoa have approved the new revision:

```powershell
$repo = 'ncd426/BrewLite-2'
$sha = gh api "repos/$repo/commits/main" --jq '.sha'
gh variable set A2_27_MIGRATION_APPROVED_SHA -R $repo --body $sha
gh variable set RENDER_DEPLOY_ENABLED -R $repo --body true
gh workflow run cd.yml -R $repo --ref main
gh run list -R $repo --workflow cd.yml --event workflow_dispatch --limit 3
```

Track the new workflow run and confirm `CD / Render deploy by digest + smoke` **PASS**. Check the uploaded evidence for both image digests/deploy IDs and all three HTTP 200 checks. If any release fails, set `RENDER_DEPLOY_ENABLED=false`, inspect the failed deployment and follow the rollback section below.

### Rollback (must be demonstrated and recorded)

1. Keep the immediately previous successful `sha256` image digest in GHCR; Render **re-pulls from the registry** on rollback and cannot restore an image that was deleted. Review GitHub Actions GHCR publication summaries for the prior digest.
2. For a **controlled non-destructive test on a demo release** (no incompatible DB migration): Render > API/Web service > **Deploys** > select the preceding successful deployment > **Rollback**. Do not test destructive recovery on important data.
3. Wait for each selected rollback deploy to become `Live` and run the smoke script: `scripts/cd/Smoke-A2-25-Production.ps1`. Record the old SHA/digest, new rollback deploy ID, UTC timestamps, screenshot and smoke CSV under `work/A2-25/evidence`.
4. To restore the latest release, re-approve its SHA if necessary and run `gh workflow run cd.yml ...` again. Observe both services `Live` on the new digest and run smoke again.
5. A Render application rollback does **not** reverse Prisma migrations or database content; Khoa handles backup/migration compatibility separately. Do not claim automatic rollback: the adapter **fails fast** and the recovery procedure is manual.

### Acceptance evidence needed to close Issue #27

- [x] PR #51/#52 merged; [run 42947159680](https://github.com/ncd426/BrewLite-2/actions/runs/42947159680) published both GHCR image digests.
- [x] Manual Render Web/API deploy reported Live; nine migrations applied; basic API health observed.
- [ ] Follow-up CD PR merged after Bảo's review.
- [ ] Render deployment via GitHub Actions **same digest** PASS, not skipped; retrieve action artifact with two deploy IDs and smoke JSON.
- [ ] Controlled rollback tested and smoke PASS; evidence recorded.
- [ ] Khoa's migration confirmation and Bảo's review recorded.
- [ ] Issue #27 closed and project tracker updated; only after all required proof exists.

Official references: [Render deploy API](https://api-docs.render.com/reference/create-deploy), [retrieve deploy](https://api-docs.render.com/reference/retrieve-deploy), [image-backed services](https://render.com/docs/deploying-an-image), [rollback](https://render.com/docs/rollbacks).
