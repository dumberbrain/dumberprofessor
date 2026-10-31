---
description: 'Task list for feature 003 — lint, format and git hooks'
---

# Tasks: Lint, Format and Git Hooks

**Input**: Design documents from `/specs/003-lint-format-hooks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/commands.md, quickstart.md

**Tests**: No new automated tests (the feature is tooling). Each story is validated by its
quickstart section; the existing Vitest suite must stay green (SC-003).

**Organization**: Tasks are grouped by user story (US1–US5 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Paths are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Confirm branch `003-lint-format-hooks` and a clean working tree (`git status`); record current tracked CRLF count with `git ls-files --eol | grep -c 'w/crlf'` in the commit message of T008

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: US1–US5 need the tools installed

- [ ] T002 Install dev dependencies `prettier@^3.9`, `oxlint@^1.90`, `husky@^9.1` with `npm install -D` (updates `package.json`, `package-lock.json`)

**Checkpoint**: tools available via `npx`

---

## Phase 3: User Story 1 - Consistent formatting everywhere (Priority: P1) 🎯 MVP

**Goal**: one formatter, LF everywhere, generated/personal content untouched.

**Independent Test**: quickstart §1 (`npm run format:check` → 0 files) and §5 (`fp` writes stay clean).

- [ ] T003 [P] [US1] Create `.gitattributes` with `* text=auto eol=lf` and `.husky/** text eol=lf` (research R1)
- [ ] T004 [P] [US1] Create `.prettierrc.json` (`singleQuote: true`, `semi: true`, `trailingComma: "all"`, `printWidth: 120`, `endOfLine: "lf"`) (research R2)
- [ ] T005 [P] [US1] Create `.prettierignore` listing `documents/`, `.specify/`, `config/legacy/`, `config/professor.json`, `config/professor.schema.json`, `package-lock.json`, `commit.md`
- [ ] T006 [US1] Add scripts `format` (`prettier --write .`) and `format:check` (`prettier --check .`) to `package.json`
- [ ] T007 [US1] Run `git add --renormalize .` then `npm run format`; verify `npm run format:check` reports 0 files, `npm run typecheck` and `npm test` pass, and `git ls-files --eol | grep -c 'w/crlf'` is 0
- [ ] T008 [US1] Commit T003–T007 as one formatting-only commit `style: format the project with prettier and normalize line endings` (FR-005); no behaviour change in this commit (`git diff --stat` reviewed: whitespace/wrapping only)
- [ ] T009 [US1] Verify `fp` writes stay clean: `npm run fp -- focus set security`, `npm run fp -- focus clear`, `npm run fp -- config schema`, then `npm run format:check` → 0 files and `git status` shows `config/professor.json` unchanged in content (SC-005)

**Checkpoint**: US1 complete and committed

---

## Phase 4: User Story 2 - Fast lint for real bugs (Priority: P1)

**Goal**: oxlint with correctness rules, zero errors on the codebase.

**Independent Test**: `npm run lint` → 0 errors; add an unused import to a scratch file → error with file/line/rule.

- [ ] T010 [P] [US2] Create `.oxlintrc.json`: `$schema` `./node_modules/oxlint/configuration_schema.json`, plugins `typescript`, `unicorn`, `oxc`, `import`, categories `correctness: "error"`, `suspicious: "warn"`, `ignorePatterns` `node_modules`, `data`, `documents`, `.specify` (research R3)
- [ ] T011 [US2] Add script `lint` (`oxlint`) to `package.json`
- [ ] T012 [US2] Run `npm run lint`; fix every error in `src/` and `tests/` at its cause (e.g. unused imports/variables); a rule may be disabled in `.oxlintrc.json` only with a `"//"` reason entry; re-run until 0 errors, then `npm run typecheck` and `npm test`
- [ ] T013 [US2] Commit `chore(lint): add oxlint with correctness rules` (config, script, fixes)

**Checkpoint**: US2 complete and committed

---

## Phase 5: User Story 3 - Checks run automatically on commit and push (Priority: P1)

**Goal**: husky-set layout: branch gate + staged format/lint on commit, Conventional message, 5-step push sweep.

**Independent Test**: quickstart §2–§4.

- [ ] T014 [US3] Confirm the `test` script exists in `package.json`; run `node ~/.claude/skills/husky-set/scaffold-husky.mjs --dry-run` and check the plan detects prettier (format), `lint`, `typecheck`, `version`; then run it with `--prefixes "chore|feat|hotfix|bugfix|reconcile|fix|docs|refactor|test|perf|ci|build|style|revert"` to write `.husky/lib.sh`, `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push` and `package.json` scripts `prepare`, `check`, `check:staged`
- [ ] T015 [US3] Adapt `.husky/pre-commit` lint step: replace `npx eslint --no-warn-ignored` with `npx oxlint`, file filter `\.(ts|js|mjs|cjs)$`; keep format step `npx prettier --check --ignore-unknown`
- [ ] T016 [US3] Adapt the branch gate in `.husky/pre-commit` to also accept Spec Kit branches matching `^[0-9]{3}-[a-z0-9-]+$`; update the gate's error text listing allowed patterns
- [ ] T017 [US3] Adapt `.husky/pre-push`: constant `TOTAL=5`, steps in order `prettier --check` (`npm run --silent format:check`), `lint`, `typecheck`, `test` (`npm run --silent test`), `package.json version`; each guarded with `[ -d node_modules ]` → `step_skip`
- [ ] T018 [US3] Run `npm install` so husky sets `core.hooksPath`; confirm `git config core.hooksPath` is `.husky/_`
- [ ] T019 [US3] Validate quickstart §2 and §3 on throwaway branches (`feat/tmp-check`, `wip-thing`, `feat/msg`): bad format refused, unused import refused, bad branch refused, `wip` refused, `feat(hooks): ok` and a `Merge …` subject accepted, no working-tree change by any hook, pre-commit < 5 s; delete the throwaway branches and `src/tmp.ts`
- [ ] T020 [US3] Validate `sh .husky/pre-push`: 5 numbered steps, constant denominator, < 60 s
- [ ] T021 [US3] Commit `chore(hooks): add husky pre-commit, commit-msg and pre-push`

**Checkpoint**: US3 complete; every later commit in this feature goes through the hooks

---

## Phase 6: User Story 4 - Same checks outside git (Priority: P2)

**Goal**: `npm run check` / `npm run check:staged` run the hook steps by hand.

**Independent Test**: quickstart §4 — `npm run check` output and exit code equal `sh .husky/pre-push`.

- [ ] T022 [US4] Verify `npm run check` and `npm run check:staged` (written by T014) print the same steps and exit codes as the hooks; fix script wiring in `package.json` if not

---

## Phase 7: User Story 5 - Server-side check on every push (Priority: P2)

**Goal**: GitHub Actions runs the full sweep on push and pull request.

**Independent Test**: quickstart §6.

- [ ] T023 [P] [US5] Create `.github/workflows/ci.yml` per contracts/commands.md: triggers `push` and `pull_request`; `permissions: contents: read`; `concurrency` group `${{ github.workflow }}-${{ github.ref }}` with cancel-in-progress; job on `ubuntu-latest`, `timeout-minutes: 10`; steps `actions/checkout@v4`, `actions/setup-node@v4` (`node-version: 22`, `cache: npm`), `npm ci`, then named steps Format (`npm run format:check`), Lint (`npm run lint`), Typecheck (`npm run typecheck`), Test (`npm test`)
- [ ] T024 [US5] Run `npx prettier --check .github/workflows/ci.yml`; commit `ci: run format, lint, typecheck and tests on push and pull request`

**Checkpoint**: after push, CI result visible on GitHub (validated in Polish)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T025 [P] Add a "Code quality" section to `README.md`: `format`, `format:check`, `lint`, `check`, `check:staged`, the three hooks and their steps, bypass (`HUSKY=0` / `--no-verify`), CI workflow (FR-015)
- [ ] T026 Run the full sweep `npm run check` (SC-002, SC-003) and commit `docs(readme): document formatting, linting, hooks and CI`
- [ ] T027 Push the branch; confirm the GitHub Actions run passes; then validate SC-007 on a throwaway branch: commit a lint error with `--no-verify`, push, confirm CI fails at "Lint", delete the throwaway branch locally and on GitHub
- [ ] T028 Record validation results (timings, CI run links) in a "Validation" section at the end of `specs/003-lint-format-hooks/tasks.md`

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002) → US1 → US2 → US3 → US4 → US5 → Polish.
- US1 before US2: formatting is committed separately (FR-005) and lint fixes must not mix with it.
- US3 needs the `format:check` and `lint` scripts from US1/US2 so the generator detects them.
- US4 depends on US3 (scripts written by the generator).
- US5 only needs the scripts (US1, US2) — could run in parallel with US3/US4 but is committed after
  US3 so its commit passes through the hooks.
- T027 needs the push permission the user grants for this feature (push to GitHub is outward-facing).

### Parallel Opportunities

- T003, T004, T005 (separate new files)
- T010 alongside T006
- T023 alongside T022; T025 alongside T024

---

## Parallel Example: User Story 1

```bash
Task: "Create .gitattributes"
Task: "Create .prettierrc.json"
Task: "Create .prettierignore"
```

---

## Implementation Strategy

### MVP First

1. T001–T002, then US1 (T003–T009): one formatter, LF everywhere, committed separately.
2. **Validate**: quickstart §1 and §5.

### Incremental Delivery

1. US1 → formatting baseline
2. US2 → lint clean
3. US3 → hooks enforce both locally
4. US4 → manual commands
5. US5 → CI enforces on GitHub
6. Polish → README, push, CI validation

---

## Notes

- Each story ends with its own commit; from US3 on, commits pass through the new hooks.
- Never use `--no-verify` except in T027's deliberate CI test.
