# dumberprofessor — Frontend Professor

A personal technical researcher and mentor for frontend engineering, system design, security and
AI/LLMs. The first feature is a **daily, verified news report** in Azerbaijani (technical terms and
titles stay in English), shown in Claude Code chat.

Governing principles: [`.specify/memory/constitution.md`](.specify/memory/constitution.md).
Feature spec, plan and tasks: [`specs/001-daily-news-report/`](specs/001-daily-news-report/).

## How it works

```text
fp collect ─► candidates.json ─► /daily-report skill ─► draft.json ─► fp save-report ─► data/reports/
 (feeds, APIs, YouTube,          (verify on Tier 1 sources,           (schema + semantic
  window, dedupe, ranking)        categorize, write Azerbaijani)       validation, immutable)
```

- **`fp` CLI** (TypeScript) does everything deterministic: collection from 38 configured sources
  (official blogs, GitHub Advisory Database, model-provider news, engineering blogs, Hacker News,
  newsletters, 10 YouTube channels), the reporting window (since the last report, max 7 days),
  deduplication, history matching, ranking, storage and search.
- **Claude Code skills** do the judgement: verifying claims against primary sources, categories,
  meaningful-update decisions and the Azerbaijani write-up.
- `fp save-report` rejects any draft item that was not collected, any "verified" claim without
  primary-source evidence, and more — the model cannot invent news.

## Prerequisites

- Windows 10/11, Node.js ≥ 22, npm, Claude Code (`claude`)
- Optional: `winget install yt-dlp` — enables YouTube transcripts. Without it videos are reported
  as "not analyzed" (summarized from title and description only).
- Optional: `GITHUB_TOKEN` environment variable — raises the GitHub advisory API limit. It is sent
  only to `api.github.com` and redacted from all output.

## Setup

```powershell
npm install
npm run fp -- sources resolve   # YouTube @handles → channel ids (already done for the defaults)
npm run fp -- sources check     # probes every source
npm test                        # unit, integration and contract tests (no network)
npm run typecheck
```

To show unread reports automatically when a Claude Code session starts, and to pre-approve the
`fp` commands, copy [`scripts/schedule/claude-settings.example.json`](scripts/schedule/claude-settings.example.json)
to `.claude/settings.json` (review it first — it adds a `SessionStart` hook and permissions).

## Use

In Claude Code:

| You say | What happens |
|---|---|
| `/daily-report` | today's report (or late additions if it already exists) |
| `/news-history yesterday` | the stored report, unchanged |
| `/news-history React keçən həftə` | matching items with dates and sources |

CLI:

```powershell
npm run fp -- collect                      # one collection run → data/runs/<runId>/candidates.json
npm run fp -- show [today|yesterday|latest|YYYY-MM-DD] [--format md|json]
npm run fp -- search --q "<text>" [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--category c] [--domain d]
npm run fp -- rate <date> <1-5> [--comment "<text>"]
npm run fp -- followup list [--status open|resolved|dismissed]
npm run fp -- followup dismiss <followUpId>
npm run fp -- unread [--hook]
```

All commands accept `--json`. Exit codes: 0 ok · 1 invalid input · 2 nothing to do / all sources
failed · 3 would overwrite an immutable report.

## Daily schedule

```powershell
npm run fp -- schedule enable --time 08:00   # registers Task Scheduler task FrontendProfessor-DailyReport
npm run fp -- schedule status                # what Task Scheduler actually reports
npm run fp -- schedule disable
```

The task runs [`scripts/schedule/run-scheduled.ps1`](scripts/schedule/run-scheduled.ps1), which
calls `claude -p "/daily-report --scheduled"` with a minimal tool allowlist, retries once after
10 minutes, and records failures. Missed runs (computer off) start when the computer is next on,
and the report covers everything since the previous one. The report is shown at your next session
(needs the `SessionStart` hook above).

## Configuration

- [`config/sources.yml`](config/sources.yml) — sources; each declares tier, domains, purpose,
  update frequency, reliability, limitations and failure behavior.
- [`config/interests.yml`](config/interests.yml) — ranking priorities and ignored topics (never
  changed automatically).
- [`config/settings.yml`](config/settings.yml) — generation time and time zone.

## Data

Personal data lives in `data/` (git-ignored): `reports/` (immutable JSON + Markdown per day,
addenda for late additions), `index/items.jsonl` (search and history), `runs/` (collection runs and
scheduled-run logs), `followups.json`, `feedback.json`, `state.json`.
