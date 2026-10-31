# Implementation Plan: User-Editable Professor Configuration

**Branch**: `002-professor-json-config` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-professor-json-config/spec.md`

## Summary

One hand-edited `config/professor.json` (with a generated JSON Schema for editor help) drives the
Professor: user-defined domains (any field, incl. languages), focus, depth, learning and news
sources (incl. YouTube videos/playlists), extra-source policy and fetch budget, session-start
behaviour (ask by default), lesson/quiz settings, ranking preferences and schedule. The `fp` CLI
does the deterministic work — validation with field paths and suggestions, migration from the
three YAML files, focus writes that keep the user's content, learning record with spaced
repetition, compact context output for skills. Six Claude Code skills (`professor`, `learn`,
`review`, `english`, `research`, `focus`) do the teaching and judgement. The news pipeline of
feature 001 switches from a hardcoded domain enum to configured domains and applies the focus.
A baseline slice (config, learning record, CLI, skills) already exists; this plan completes the
rest. Details: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (strict) on Node.js 22, run via `tsx`

**Primary Dependencies**: `zod` v4 (validation + `z.toJSONSchema`), `fast-xml-parser`, `yaml`
(only for one-time migration); dev: `vitest`, `tsx`, `typescript`; optional `yt-dlp`; Claude Code
skills and SessionStart hook

**Storage**: `config/professor.json` (user-owned, hand-edited); `data/learning/record.json`;
existing `data/` layout from 001; `config/legacy/` for migrated YAML

**Testing**: Vitest — unit (schema, learning schedule, ranking with focus), integration (CLI with
temp `FP_CONFIG_DIR`/`FP_DATA_DIR`, migration from fixture YAML), contract (generated schema equals
committed file; report draft schema with `focus`)

**Target Platform**: Windows 10/11 desktop; Claude Code CLI

**Project Type**: CLI + Claude Code skills (single project)

**Performance Goals**: every `fp` config/learning command < 1 s; session-start hook < 2 s and
< 400 characters of context; `learn context` ≤ ~20 lines

**Constraints**: never change focus/domains/depth without explicit user action; invalid config →
no automatic actions; fetched content is untrusted; secrets stay in env vars; feature 001
guarantees unchanged; token economy (FR-040)

**Scale/Scope**: single user; ~10 domains, ~100 sources, a few hundred learning entries

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution v2.0.0. Status before Phase 0: **PASS**. After Phase 1 design: **PASS**
(no violations).

| Principle / Section                       | Gate                                                       | Design evidence                                                                                                         | Status |
| ----------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Accuracy over speed                    | Unverified content not presented as fact                   | `research`/`learn` skills mark "mənbəsiz"; transcript `unavailable` → "not analyzed"; 001 verification unchanged        | ✅     |
| II. Sources                               | Version-specific claims cite link + date                   | skills contract; sources carry tier; 001 schema unchanged                                                               | ✅     |
| III. Understanding                        | Lessons end with applied tasks                             | `learn` exercise + quiz of configured types                                                                             | ✅     |
| IV. Evidence over hype                    | Vendor claims labeled; Tier 3 not evidence                 | `research` skill rule; `validate.ts` non-evidence hosts kept                                                            | ✅     |
| V. Personalization                        | Per-domain skill level from evidence                       | depth per domain; learning record per domain+topic; level suggestions only                                              | ✅     |
| VI. Continuity                            | Links to earlier lessons; carry-over                       | `in-progress` lessons offered; misconceptions carried into reviews; 001 follow-ups unchanged                            | ✅     |
| VII. Transparency                         | Stored vs verified; facts vs interpretation                | `research` skill; report states focus/depth                                                                             | ✅     |
| VIII. Practical application               | Real-world practice per domain                             | depth definitions; `general` domains use real-world practice; language practice modes                                   | ✅     |
| IX. User-directed focus                   | Only user changes focus/domains/depth; output states focus | `fp focus` + `updateProfessor` only on command; skills forbidden to change; report `focus`; lesson context prints focus | ✅     |
| Source Governance                         | Tiers on every source                                      | `tier` required on unified `Source`                                                                                     | ✅     |
| Teaching Protocol / Learning Verification | 10-step sequence; no mastery from one quiz; record fields  | `learn` skill; `applyAssessment` mastery rule (tested); prerequisites/objectives fields                                 | ✅     |
| Security and Trust                        | Untrusted content, no secrets                              | skills contract; tokens only via env; config holds no secrets                                                           | ✅     |
| Extensibility                             | Domains/sources via config; no hardcoded domains           | `Domain` enum removed (R2); integration fields kept (defaults + warning)                                                | ✅     |
| Scheduled intelligence                    | Real scheduler                                             | `fp schedule` unchanged mechanism, renamed task, legacy cleanup                                                         | ✅     |

## Project Structure

### Documentation (this feature)

```text
specs/002-professor-json-config/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli.md
│   └── skills.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
config/
├── professor.json              # user file (baseline)
├── professor.schema.json       # generated (R5)
└── legacy/                     # migrated YAML (R3)

src/
├── cli/
│   ├── professor.ts            # config, focus, learn, session-start, transcript (baseline + migrate/schema/init)
│   ├── schedule.ts             # → professor.json schedule (R7)
│   ├── sources.ts              # → professor.json news sources
│   ├── history.ts              # --domain any configured/stored id
│   └── unread.ts               # rename strings
├── config/
│   ├── professor.ts            # load/update (baseline) + migrate, init, auto-migrate
│   ├── default-professor.json  # default template (R3)
│   └── load.ts                 # loadSources/loadInterests/loadSettings read professor.json
├── schemas/
│   ├── professor.ts            # unified Source, ranking, schedule, meta descriptions
│   ├── learning.ts             # + prerequisites, objectives
│   ├── enums.ts                # Domain enum → DomainId string
│   ├── candidate.ts, report.ts # focus, outsideFocus, depthByDomain
│   └── config.ts               # legacy YAML schemas (migration input only)
├── pipeline/rank.ts            # focus bonus, outsideFocus
├── report/validate.ts, render-md.ts   # focus checks, render
├── schedule/schtasks.ts        # Professor-DailyReport + legacy cleanup
└── lib/http.ts                 # user agent

.claude/skills/                 # professor, learn, review, english, research, focus (baseline); daily-report, news-history updated
tests/unit, tests/integration, tests/contract, tests/fixtures/config-yaml/
```

**Structure Decision**: single project, same layout as feature 001; new code in the existing
`cli`, `config`, `schemas`, `store`, `pipeline` folders.

## Complexity Tracking

No constitution violations.
