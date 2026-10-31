# Quickstart: validate feature 003

Contracts: [commands.md](./contracts/commands.md). Commands from the repo root (Git Bash).

## 1. Baseline (SC-003)

```bash
npm install                 # prepare → husky sets core.hooksPath
npm run format:check        # 0 files
npm run lint                # 0 errors
npm run typecheck && npm test
git ls-files --eol | grep -c 'w/crlf'   # 0
```

## 2. Pre-commit (US3, SC-001, SC-006)

```bash
git checkout -b feat/tmp-check
printf 'export const x = "a"\n' > src/tmp.ts && git add src/tmp.ts
git commit -m 'feat: tmp'            # refused at prettier step, src/tmp.ts unchanged
npm run format && git add src/tmp.ts
printf 'import { readFile } from "node:fs";\n' >> src/tmp.ts && npm run format && git add src/tmp.ts
git commit -m 'feat: tmp'            # refused at lint (unused import)
```

Check: each step shows `[n/N] … ok <time>`; total time < 5 s; `git status` shows no new
modifications made by the hook.

## 3. Branch and message (US3)

```bash
git checkout -b wip-thing && git commit --allow-empty -m 'feat: x'   # refused: branch name
git checkout -b feat/msg && git commit --allow-empty -m 'wip'        # refused: message
git commit --allow-empty -m 'feat(hooks): ok'                        # accepted
git checkout main 2>/dev/null; git merge --no-ff feat/msg            # "Merge …" accepted
```

## 4. Pre-push and manual sweep (US3, US4, SC-002)

```bash
npm run check     # [1/5] format … [5/5] version, < 60 s, same as pre-push
```

## 5. fp writes stay clean (SC-005)

```bash
npm run fp -- focus set security && npm run fp -- focus clear && npm run fp -- config schema
npm run format:check   # still 0
```

## 6. CI (US5, SC-007)

Push a branch with a lint error using `--no-verify` → the GitHub Actions run fails at "Lint";
fix and push → all steps green. Delete the throwaway branches afterwards.
