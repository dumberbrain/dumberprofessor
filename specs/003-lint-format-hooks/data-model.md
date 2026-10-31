# Data Model: Lint, Format and Git Hooks

No runtime data. The "entities" are repository configuration files.

| File | Purpose | Key content |
|---|---|---|
| `.gitattributes` | line endings | `* text=auto eol=lf`, `.husky/** text eol=lf` |
| `.prettierrc.json` | format style | singleQuote, semi, trailingComma all, printWidth 120, endOfLine lf |
| `.prettierignore` | not formatted | `documents/`, `.specify/`, `config/legacy/`, `config/professor.json`, `config/professor.schema.json`, `package-lock.json`, `commit.md` (+ `.gitignore`) |
| `.oxlintrc.json` | lint rules | plugins typescript/unicorn/oxc/import; correctness error, suspicious warn; ignorePatterns |
| `.husky/lib.sh` | shared step machinery | `fail`, `step`, `step_ok`, `step_skip`, `count`, optional timer |
| `.husky/pre-commit` | staged checks | branch gate → format → lint → version (dynamic total) |
| `.husky/commit-msg` | message rule | Conventional subject; git-generated subjects exempt |
| `.husky/pre-push` | full sweep | `TOTAL=5`: format, lint, typecheck, test, version |
| `.github/workflows/ci.yml` | server-side sweep | npm ci → format:check → lint → typecheck → test |
| `package.json` scripts | entry points | `format`, `format:check`, `lint`, `check`, `check:staged`, `prepare` |

Allowed branch prefixes and commit types (one list, used by both hooks):
`chore|feat|hotfix|bugfix|reconcile|fix|docs|refactor|test|perf|ci|build|style|revert`; branches
may also be `NNN-<name>` (Spec Kit); `main`, `master`, detached HEAD exempt.
