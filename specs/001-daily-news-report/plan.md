# Implementation Plan: Daily Frontend & Engineering News Report

**Branch**: `001-daily-news-report` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-daily-news-report/spec.md`

## Summary

A daily, in-chat news report covering frontend engineering, system design, security, and AI/LLM
developments, written in Azerbaijani with original English terms. A TypeScript CLI (`fp`)
collects items from configured feeds, APIs and ten YouTube channels, computes the reporting
window (since the last report, capped at 7 days), dedupes, matches history, ranks by an explicit
interest profile, and stores immutable, searchable reports. A Claude Code skill verifies
verifiable claims against Tier 1 sources, decides categories and meaningful updates, writes the
prose, and submits a draft that the CLI validates against a strict schema before storing.
Windows Task Scheduler runs the skill headless; a `SessionStart` hook shows unread reports and
failures at the next session. Details: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict) on Node.js 22 LTS, run via `tsx`

**Primary Dependencies**: `zod`, `fast-xml-parser`, `yaml`; dev: `vitest`, `tsx`, `typescript`;
optional external tool `yt-dlp` for transcripts; Claude Code (skills, headless `claude -p`,
hooks)

**Storage**: Local files under `data/` — immutable JSON + Markdown per report, JSONL item index,
JSON state files ([data-model.md](./data-model.md))

**Testing**: Vitest — unit, integration (fixture feeds, stubbed `fetch`), contract (schemas)

**Target Platform**: Windows 10/11 desktop (user machine); Task Scheduler for automation

**Project Type**: CLI + Claude Code skills (single project)

**Performance Goals**: On-demand report ready ≤ 5 min (SC-004); `fp collect` ≤ 60 s for ~40
sources; search ≤ 1 s over ≥ 1 year of reports (SC-006)

**Constraints**: No fabricated items — every reported item must map to a collected candidate;
untrusted content never executed; least-privilege tool allowlist for headless runs; works without
`yt-dlp` (degraded, honest); no external delivery channel

**Scale/Scope**: Single user; ~40 sources; ≤ 7 items/day (~2,600/year)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.1.0. Status after Phase 1 design: **PASS** (no violations).

| Principle / Section | Gate | Design evidence | Status |
|---|---|---|---|
| I. Accuracy over speed | Unverifiable claims are never presented as fact | Claim `status` required; `unverified` needs `reason`; skill verifies via Tier 1 WebFetch | ✅ |
| II. Sources over unsupported claims | Every item has source link + publication date | Schema-required `primarySource.url`, `publishedAt`, `discoveredAt`; `candidateId` must exist in run | ✅ |
| III. Understanding over memorization | Report includes an applied element | Required `knowledgeCheck`; recommendations include experiments | ✅ |
| IV. Evidence over hype | Popularity ≠ merit; vendor claims labeled | Tier 3 discovery-only; `vendor-reported` claim status; old-but-popular dropped (window rule) | ✅ |
| V. Personalization | Ranking adapts to the user | Explicit `interests.yml` drives scoring (R7) | ✅ |
| VI. Continuity | Links to earlier items and follow-ups | `possibleUpdateOf` → `updateOf`; follow-up lifecycle; catch-up window | ✅ |
| VII. Transparency | Facts vs interpretation vs predictions; stored vs verified | Separate `facts`/`interpretation`/`predictions`; `verified` only with evidence; "not analyzed" videos | ✅ |
| VIII. Practical engineering | Implications for real work | Required `implicationsAz` per item | ✅ |
| Mission & Scope (extended domains) | Frontend, system design, security, AI/LLM covered | `domains` enum and source groups per domain | ✅ |
| Source Governance | Tiers assigned; Tier 3 not sole evidence | `tier` required per source; `verified` evidence must be Tier 1 | ✅ |
| News Research Protocol | 10-step cycle, 7 categories, no "old as new" | `collect` (steps 1–4, 6), skill (5, 7–10); category enum; window rule | ✅ |
| Daily & Scheduled Intelligence | Report sections; no quota padding; real scheduler; searchable history | Schema sections; `fewItemsNote`; `schtasks` confirmation; `fp search` | ✅ |
| Daily & Scheduled — weekly reports (SHOULD) | — | Out of scope for this feature (spec Assumptions); data model supports it | ✅ deferred by spec |
| GitHub Intelligence | Stars not quality evidence | Trending is Tier 3 discovery only | ✅ |
| YouTube & Educational Materials | Transcript-based, opinions separated, timestamps, no pretending | `transcript.status`; `notAnalyzed`; `keyPoints[].t` | ✅ |
| Knowledge Base & Memory | Provenance metadata; stored vs verified | Item index keeps source, dates, tier, verification | ✅ |
| Output Standards | Links, dates, uncertainty | Schema + rendered Markdown template | ✅ |
| Security & Trust | Untrusted data, no secrets, least privilege | R9: data-only fields, transcript cap, tool allowlist, token redaction | ✅ |
| Continuous Improvement | Measurable outcomes | `quality` signals per report; feedback ratings | ✅ |
| Extensibility | Sources via config with full metadata; separation of concerns | `sources.yml` requires purpose/access/frequency/reliability/limitations/failure; `config/` · `src/` · `data/` · `.claude/` · `scripts/schedule/` separated | ✅ |
| Governance | Compliance recorded | This table | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/001-daily-news-report/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── cli.md                    # fp commands + skills
│   ├── config.md                 # config/*.yml
│   └── report-draft.schema.json  # draft accepted by fp save-report
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json                 # "fp" script → tsx src/cli/index.ts
tsconfig.json
vitest.config.ts
config/
├── sources.yml
├── interests.yml
└── settings.yml
src/
├── cli/                     # command parsing, one file per command group
├── config/                  # YAML loading + zod validation
├── schemas/                 # zod schemas (Candidate, NewsItem, DailyReport, draft, ...)
├── collect/
│   ├── adapters/            # rss.ts, youtube.ts, hn.ts, github-advisories.ts, web.ts
│   ├── transcript.ts        # yt-dlp wrapper + VTT parsing
│   └── collect.ts           # orchestrates a run
├── pipeline/
│   ├── window.ts            # FR-010a/b
│   ├── canonical-url.ts
│   ├── dedupe.ts            # FR-007
│   ├── history-match.ts     # FR-008
│   └── rank.ts              # FR-013/013a
├── store/                   # reports, index, follow-ups, feedback, runs, state (immutability)
├── report/
│   ├── validate.ts          # semantic rules of save-report
│   └── render-md.ts         # Markdown output
└── schedule/                # schtasks wrapper, status
scripts/schedule/
└── run-scheduled.ps1        # headless claude run + failure recording + retry
.claude/
├── settings.json            # SessionStart hook → fp unread --hook; permissions allowlist
└── skills/
    ├── daily-report/SKILL.md
    └── news-history/SKILL.md
data/                        # git-ignored by default (personal data)
├── reports/  index/  runs/
└── followups.json feedback.json state.json
tests/
├── fixtures/                # feeds, YouTube Atom, HN, advisories, VTT, drafts
├── unit/
├── integration/
└── contract/
```

**Structure Decision**: Single project. Deterministic logic in `src/` (testable, no LLM),
judgement in `.claude/skills/`, user-editable configuration in `config/`, personal state in
`data/`, OS automation in `scripts/schedule/` — the separation the constitution's Extensibility
section requires.

## Complexity Tracking

No constitution violations; section intentionally empty.
