# Implementation Plan: Lint, Format and Git Hooks

**Branch**: `003-lint-format-hooks` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-lint-format-hooks/spec.md`

## Summary

Add Prettier (single formatter, style matching today's code, LF everywhere), oxlint (correctness
rules only), husky hooks in the user's husky-set layout (branch gate + staged format/lint on
commit, Conventional Commits message rule, numbered full sweep on push) and a GitHub Actions CI
running the same sweep. A one-time formatting/line-ending commit is kept separate from behaviour
changes; files `fp` writes are excluded from formatting so `fp` never breaks the check. Details:
[research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (strict) on Node.js ≥ 22; POSIX sh for hooks (Git Bash on Windows)

**Primary Dependencies** (dev only): `prettier` ^3.9, `oxlint` ^1.90, `husky` ^9.1; generator
`~/.claude/skills/husky-set/scaffold-husky.mjs`; GitHub Actions (`actions/checkout`,
`actions/setup-node`)

**Storage**: N/A (repository configuration files)

**Testing**: existing Vitest suite unchanged; feature validated by quickstart scenarios and CI

**Target Platform**: Windows 10/11 (Git Bash) locally; `ubuntu-latest` in CI

**Project Type**: CLI + Claude Code skills (single project)

**Performance Goals**: pre-commit < 5 s for 1–10 files; pre-push < 60 s; CI < 5 min

**Constraints**: hooks never install or write to the working tree; no extra hook dependencies
(no lint-staged/commitlint); CI needs no secrets; `fp`-written files stay check-clean

**Scale/Scope**: ~110 TS files, ~180 Markdown/JSON files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v2.0.0. Before Phase 0: **PASS**. After Phase 1: **PASS** (no violations).

| Principle / Section | Gate | Evidence | Status |
|---|---|---|---|
| I. Accuracy over speed | Tooling must not hide failures | Hooks fail loudly with the failing step; CI is authoritative | ✅ |
| IV. Evidence over hype | Tool choice on measured need | Versions and file/line counts measured (research.md) | ✅ |
| VII. Transparency | Clear outcomes | Numbered, timed steps; per-step CI status | ✅ |
| VIII. Practical application | Production practice | Format/lint/typecheck/test gates on commit, push and CI | ✅ |
| IX. User-directed focus | Not touched | No config semantics change | ✅ |
| Security and Trust | Least privilege, no secrets | CI `permissions: contents: read`, no secrets; hooks run nothing downloaded | ✅ |
| Extensibility | Config over code | All rules/ignores in config files; adding a check = one step | ✅ |
| Continuous Improvement | Measurable | Timings printed per step | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/003-lint-format-hooks/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/commands.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
.gitattributes
.prettierrc.json
.prettierignore
.oxlintrc.json
.husky/{lib.sh,pre-commit,commit-msg,pre-push}
.github/workflows/ci.yml
package.json            # scripts + devDependencies
README.md               # tooling section
src/, tests/            # lint fixes; one-time reformat (separate commit)
```

**Structure Decision**: single project; only root config files are added, plus fixes for real lint
findings in `src/` and `tests/`.

## Complexity Tracking

No constitution violations.
