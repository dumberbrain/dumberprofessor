# Contract: commands, hooks and CI

## npm scripts

| Script                 | Does                                           | Exit                                      |
| ---------------------- | ---------------------------------------------- | ----------------------------------------- |
| `npm run format`       | `prettier --write .`                           | 0                                         |
| `npm run format:check` | `prettier --check .`; lists files to format    | 0 clean · 1 files differ                  |
| `npm run lint`         | `oxlint` on the repo; `file:line rule message` | 0 no errors (warnings allowed) · 1 errors |
| `npm run typecheck`    | `tsc --noEmit` (existing)                      | 0/1                                       |
| `npm test`             | `vitest run` (existing)                        | 0/1                                       |
| `npm run check`        | `sh .husky/pre-push`                           | as pre-push                               |
| `npm run check:staged` | `sh .husky/pre-commit`                         | as pre-commit                             |

## Hook output

```text
  branch 003-lint-format-hooks · staged 3 files · 2 checks

[1/2] prettier --check · 3 files … ok 0.6s
[2/2] lint · 2 files … ok 0.1s
```

- Each step line is printed before the work (no newline), completed with `ok <time>`, `skip
(<reason>)` or a failure message on its own line; timing omitted when no clock is available.
- `pre-push` total is constant (5) — skipped steps keep their number.
- Branch gate failure: names the branch and the allowed patterns, exit 1, before any step.
- `commit-msg` failure: shows the subject, the pattern `type(scope): subject`, the allowed types and
  two examples, exit 1.
- Bypass: `HUSKY=0 git commit …` or `git commit --no-verify` (documented in each hook header).
- No hook writes to the working tree or the index.

## CI (`.github/workflows/ci.yml`)

Triggers: `push` (any branch), `pull_request`. Steps (each reported separately): checkout →
setup Node 22 (npm cache) → `npm ci` → `npm run format:check` → `npm run lint` →
`npm run typecheck` → `npm test`. `permissions: contents: read`; no secrets.
