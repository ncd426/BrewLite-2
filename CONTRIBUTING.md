# Contributing to BrewLite Assignment 2

> DRAFT for the team to approve in the A2-01 kickoff. Owner: Danh; proposed reviewer: Bao.

## 1. Repositories and integration branch

- Assignment 2: https://github.com/ncd426/BrewLite-2 (Git remote `origin`).
- Assignment 1: https://github.com/ncd426/BrewLite (Git remote `assignment1`).
- Open Pull Requests (PRs) against `origin/main` in BrewLite-2. Do not push A2 changes to the A1 repository.
- Do not commit directly to `main`. Do not force-push shared branches or rewrite published history.

## 2. Branch naming and scope

| Type | Pattern | Example |
| --- | --- | --- |
| Documentation | `docs/a2-XX-topic` | `docs/a2-01-governance` |
| Feature | `feat/a2-XX-topic` | `feat/a2-22-checkout` |
| Fix | `fix/issue-topic` | `fix/auth-http-tests` |
| Test | `test/topic` | `test/checkout-e2e` |
| CI | `ci/topic` | `ci/pull-request-checks` |

Keep each PR scoped to one backlog item or coherent acceptance criteria. Include an A2 issue ID in the PR title and body when available.

## 3. Local checklist before opening a PR

1. Run `git status --short` and review changes; stage only the files relevant to the PR (avoid `git add .` if ZIP/log/snapshot files are present).
2. Run `git diff --cached --check` and inspect `git diff --cached --stat`.
3. Backend code: from `apps/api`, run `npx prisma generate`, `npm test -- --runInBand`, and `npm run build`. If a command cannot run, explain why in the PR.
4. Frontend code: from `apps/web`, run `npm run build`; also run lint/checks configured in the repository.
5. Documentation/diagram changes: verify links; maintain editable `.puml` sources plus `.svg` exports wherever the backlog requires UML.
6. Never commit `.env`, credentials, access tokens, DB dumps, `node_modules`, build output, private user data, or oversized debugging archives.
7. Database changes require reviewed additive migrations. Do not reset/drop a shared database, use `docker compose down -v`, or run `prisma migrate reset` on existing data.

## 4. Pull Requests and reviews

- Use `.github/PULL_REQUEST_TEMPLATE.md`. State the scope, related Issue, acceptance criteria, and real verification output or workflow URL.
- Request review from the **reviewer in the A2 assignment spreadsheet**; the author does not self-approve.
- Merge only after the reviewer has approved, comments are resolved, and required GitHub checks pass (when configured). If the protection rules or checks are not configured yet, record this as an open action; do not claim CI passed without a real run.
- For Task 1 to Task 5, respect the sequence of stage gates in `docs/team/a2-definition-of-done.md`.
- After merge, update the related Issue/Project and the spreadsheet columns for status, evidence URL, and reviewer sign-off.

## 5. Other team documents

- Backlog: [`docs/team/a2-backlog.md`](docs/team/a2-backlog.md)
- Branch/PR details: [`docs/team/a2-git-pr-conventions.md`](docs/team/a2-git-pr-conventions.md)
- Definition of Done: [`docs/team/a2-definition-of-done.md`](docs/team/a2-definition-of-done.md)
- Kickoff minutes (draft): [`docs/team/a2-kickoff.md`](docs/team/a2-kickoff.md)
- Kickoff approval record: [`docs/team/a2-kickoff-confirmation.md`](docs/team/a2-kickoff-confirmation.md)

> This document is a proposed agreement, not evidence that Bao/Khoa have already approved it.
