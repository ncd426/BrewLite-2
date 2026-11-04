# A2-01 - Git ancestry evidence (2026-11-04)

The command was run locally in the BrewLite2 repository:

```powershell
git merge-base origin/main assignment1/main
```

Observed output:

```text
e61d94deda32dc9e5ae904973d4896866796e37c
```

This proves that the two tracked branches share at least one common ancestor commit. It **does not**, by itself, prove that every Assignment 1 commit or every feature is present in the Assignment 2 main branch.

Other observations already reported locally:

- `origin`: `https://github.com/ncd426/BrewLite-2.git`
- `assignment1`: `https://github.com/ncd426/BrewLite.git`

A2-01 collaboration permissions, Issues/Project, actual kickoff sign-off and PR review remain to be verified separately.
