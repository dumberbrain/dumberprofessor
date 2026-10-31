# Research: Lint, Format and Git Hooks

Measured on 2026-10-31: `prettier` 3.9.10, `oxlint` 1.90.0, `husky` 9.1.7 (npm registry); 103
tracked `.ts` files in `src/` and `tests/`, 47 of them checked out with CRLF; 112 lines longer than
120 characters; style today: 2 spaces, single quotes, semicolons, trailing commas.

## R1 — Line endings

**Decision**: add `.gitattributes` with `* text=auto eol=lf` (and `.husky/** text eol=lf` as the
husky-set generator writes), then `git add --renormalize .` in the one-time formatting commit.
Prettier `endOfLine: "lf"`.

**Rationale**: the user's git has `core.autocrlf=true`, so files are checked out with CRLF; Prettier
would then report every such file and `sh` hooks break on CRLF. `eol=lf` makes the working tree LF
on every platform, independent of `autocrlf`.

**Alternatives**: `endOfLine: "auto"` — rejected: hides the mixed endings instead of fixing them and
leaves hooks at risk.

## R2 — Prettier configuration

**Decision**: `.prettierrc.json`: `singleQuote: true`, `semi: true`, `trailingComma: "all"`,
`printWidth: 120`, `endOfLine: "lf"`. `.prettierignore` (Prettier 3 also honours `.gitignore`, so
`data/`, `node_modules/` are already out): `documents/`, `.specify/`, `config/legacy/`,
`config/professor.json`, `config/professor.schema.json`, `package-lock.json`, `commit.md`.
Scripts: `format` (`prettier --write .`), `format:check` (`prettier --check .`).

**Rationale**: matches existing code (FR-001); width 120 rewraps 112 long lines once — acceptable in
the separate formatting commit. The two `config/` JSON files are written by `fp` with
`JSON.stringify(…, 2)`, which differs from Prettier's JSON layout (Prettier collapses short arrays
onto one line), so formatting them would make every `fp focus set` / `fp config schema` fail the
check (FR-004, SC-005). `documents/` is written by `fp doc` (generated).

**Alternatives**: format via Prettier inside `fp` — rejected: a runtime dependency for whitespace;
`printWidth: 140` — fewer rewraps but drifts from the 120 the spec states.

## R3 — oxlint configuration

**Decision**: `.oxlintrc.json` with plugins `typescript`, `unicorn`, `oxc`, `import`;
categories `correctness: "error"`, `suspicious: "warn"`, everything else off; `ignorePatterns`:
`node_modules`, `data`, `documents`, `.specify`. Script `lint`: `oxlint` (whole repo).
Findings on the existing code are fixed; a rule is disabled only with a reason comment field
(`"//"` key) in the config (FR-007).

**Rationale**: correctness = likely bugs (FR-006); style is Prettier's job; oxlint is ~100× faster
than eslint, keeping `pre-commit` under 5 s (SC-001). Warnings are shown but do not block.

**Alternatives**: eslint + typescript-eslint — rejected: user asked for oxlint; slower; needs
config packages.

## R4 — Hooks: the user's husky-set layout

**Decision**: generate with `node ~/.claude/skills/husky-set/scaffold-husky.mjs` (after Prettier,
oxlint and the `lint`/`test` scripts exist so it detects them), then adapt:

| Hook         | Steps                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | branch gate (unnumbered) → `[n] prettier --check` staged → `[n] oxlint` staged (`.ts/.js/.mjs`) → `[n] package.json version` when staged |
| `commit-msg` | Conventional subject                                                                                                                     |
| `pre-push`   | constant `TOTAL=5`: format check · lint · typecheck · test · package.json version                                                        |

Adaptations to the generated files: lint step calls `npx oxlint` instead of eslint (no
`--no-warn-ignored`; oxlint honours `ignorePatterns`); branch gate also accepts Spec Kit branches
`^[0-9]{3}-`; prefix/type set = union of husky-set defaults and FR-010:
`chore|feat|hotfix|bugfix|reconcile|fix|docs|refactor|test|perf|ci|build|style|revert`; add
`format:check` and `test` steps to `pre-push`; `pack` step is not generated (`private: true`).
Scripts: `prepare: "husky || true"`, `check` (= pre-push), `check:staged` (= pre-commit).

**Rationale**: the user's established doctrine (cost-based placement, numbered timed steps, no
extra dependencies, never write to the working tree). Test suite ~8 s → allowed in `pre-push`
(SC-002), never in `pre-commit`.

**Alternatives**: lint-staged + commitlint — rejected by the user's doctrine (extra dependencies).

## R5 — CI

**Decision**: `.github/workflows/ci.yml`: on `push` (all branches) and `pull_request`;
`ubuntu-latest`, `actions/setup-node` Node 22 with npm cache, `npm ci`, then separate steps
`npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`; `permissions:
contents: read`; `concurrency` cancels superseded runs of the same ref; `timeout-minutes: 10`.

**Rationale**: FR-016–FR-018; tests are offline (stubbed fetch), so no secrets. CI ⊇ hooks
(version check is trivially true in CI because `npm ci` validates `package.json`).

**Alternatives**: running `npm run check` (the hook script) in CI — rejected: one opaque step;
separate steps give per-check status on GitHub.

## R6 — Vitest and the new tooling

**Decision**: no Vitest changes; `tests/` are linted and formatted like `src/`.
