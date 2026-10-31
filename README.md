# dumberprofessor — Professor

A personal, multi-domain researcher and mentor. You choose the domains (any field, including
English), the sources, the depth and the focus in [`config/professor.json`](config/professor.json).
It teaches lessons with an end-of-lesson quiz, runs spaced-repetition reviews, answers questions
from your sources, and produces a **daily, verified news report** — in Azerbaijani (technical terms
and titles stay in English), in Claude Code chat.

Governing principles: [`.specify/memory/constitution.md`](.specify/memory/constitution.md).
Specs: [`specs/001-daily-news-report/`](specs/001-daily-news-report/),
[`specs/002-professor-json-config/`](specs/002-professor-json-config/).

## How it works

```text
fp collect ─► candidates.json ─► /daily-report skill ─► draft.json ─► fp save-report ─► data/reports/
 (feeds, APIs, YouTube,          (verify on Tier 1 sources,           (schema + semantic
  window, dedupe, ranking)        categorize, write Azerbaijani)       validation, immutable)
```

- **`fp` CLI** (TypeScript) does everything deterministic: collection from the news sources configured in `config/professor.json`
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

| You say                                          | What happens                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `/professor` (or automatically at session start) | asks what you want and routes: lesson, review, news, English, a question                 |
| `/learn [domain] [topic]`                        | lesson from your sources at the configured depth, quiz at the end, progress recorded     |
| `/review`                                        | spaced-repetition questions on due topics                                                |
| `/english`                                       | mini lesson, writing correction, translation or conversation practice at your CEFR level |
| `/research <question>`                           | answer from your sources first, extra sources per `extraSources`, with citations         |
| `/focus`                                         | show or change focus, domains, depth, sources (only when you ask)                        |
| `/daily-report`                                  | today's report (or late additions if it already exists)                                  |
| `/news-history yesterday`                        | the stored report, unchanged                                                             |
| `/news-history React keçən həftə`                | matching items with dates and sources                                                    |

CLI:

```powershell
npm run fp -- collect                      # one collection run → data/runs/<runId>/candidates.json
npm run fp -- show [today|yesterday|latest|YYYY-MM-DD] [--format md|json]
npm run fp -- search --q "<text>" [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--category c] [--domain d]
npm run fp -- rate <date> <1-5> [--comment "<text>"]
npm run fp -- followup list [--status open|resolved|dismissed]
npm run fp -- followup dismiss <followUpId>
npm run fp -- unread [--hook]
npm run fp -- session-start [--hook]       # a few lines for the SessionStart hook
npm run fp -- config check                 # validate config/professor.json
npm run fp -- focus [show|set <id...>|clear]
npm run fp -- learn context [--domain id]  # everything a lesson needs, compact
npm run fp -- learn start --domain id --topic "<topic>"
npm run fp -- learn record --domain id --topic "<topic>" --score n --total n [--kind review] [--misconceptions "a; b"]
npm run fp -- learn due|status [--domain id]
npm run fp -- transcript <youtubeUrl> [--max chars]   # needs yt-dlp
```

All commands accept `--json`. Exit codes: 0 ok · 1 invalid input · 2 nothing to do / all sources
failed · 3 would overwrite an immutable report.

## Daily schedule

```powershell
npm run fp -- schedule enable --time 08:00   # registers Task Scheduler task Professor-DailyReport (removes the old FrontendProfessor-DailyReport)
npm run fp -- schedule status                # what Task Scheduler actually reports
npm run fp -- schedule disable
```

The task runs [`scripts/schedule/run-scheduled.ps1`](scripts/schedule/run-scheduled.ps1), which
calls `claude -p "/daily-report --scheduled"` with a minimal tool allowlist, retries once after
10 minutes, and records failures. Missed runs (computer off) start when the computer is next on,
and the report covers everything since the previous one. The report is shown at your next session
(needs the `SessionStart` hook above).

## Configuration

- [`config/professor.json`](config/professor.json) — edited by hand (schema with descriptions:
  [`config/professor.schema.json`](config/professor.schema.json)): domains, focus, depth, CEFR
  level, curriculum, sources (`use: ["news"]` for the daily report, `["lessons"]` for teaching —
  docs, web, GitHub, RSS, Hacker News, advisories, YouTube channels/videos/playlists; news sources
  declare tier, purpose, update frequency, reliability, limitations and failure behavior), news
  ranking priorities and ignored topics, extra-source policy and fetch budget, session-start
  behaviour (`ask` / `actions` / `off`), lesson and quiz settings, daily schedule.
  Check with `npm run fp -- config check`; regenerate the schema with `npm run fp -- config schema`.
- `config/legacy/` — the pre-002 YAML files (`sources.yml`, `interests.yml`, `settings.yml`),
  migrated automatically into `professor.json` (`npm run fp -- config migrate`) and no longer read.

## Documents (your library)

Everything you learn and research is collected as Markdown in [`documents/`](documents/README.md)
(committed to git; turn off with `documents.autoSave: false`):

```text
documents/
├── README.md                          # generated index: by domain, then lessons / research; news
├── <domain>/lessons/<date>-<topic>.md # each lesson as a tutorial: explanation, example, quiz, result, sources
├── <domain>/research/<date>-<title>.md
└── news/<date>.md                     # copy of each daily report (written by fp save-report)
```

Every file starts with front matter (`title`, `type`, `domain`, `date`, `sources`).

```powershell
npm run fp -- doc list [--domain id] [--type lesson|research|news] [--q text]
npm run fp -- doc save --type lesson|research --domain id --title "<title>" [--sources "a; b"] <draft.md>
npm run fp -- doc news [today|yesterday|YYYY-MM-DD]   # copy a stored report again
npm run fp -- doc index                               # rebuild documents/README.md
```

## Data

Personal data lives in `data/` (git-ignored): `reports/` (immutable JSON + Markdown per day,
addenda for late additions), `index/items.jsonl` (search and history), `runs/` (collection runs and
scheduled-run logs), `followups.json`, `feedback.json`, `state.json`.

## Code quality

Prettier formats, oxlint finds bugs, husky runs both on every commit, and CI runs everything on
GitHub. Line endings are LF everywhere (`.gitattributes`).

```bash
npm run format          # prettier --write .
npm run format:check    # what CI checks
npm run lint            # oxlint: correctness = error, suspicious = warning (.oxlintrc.json)
npm run check:staged    # the pre-commit checks, by hand
npm run check           # the pre-push sweep, by hand
```

| Hook         | Checks                                                                                                                                | Typical time |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `pre-commit` | branch name (`feat/…`, `fix-…`, Spec Kit `NNN-name`; `main` exempt), then staged files only: prettier, oxlint, `package.json` version | 1–3 s        |
| `commit-msg` | Conventional Commits subject: `type(scope): subject`; merge/revert/fixup subjects pass                                                | instant      |
| `pre-push`   | `[1/5]` format · `[2/5]` lint · `[3/5]` typecheck · `[4/5]` tests · `[5/5]` version                                                   | ~15 s        |

Types and branch prefixes: `chore feat hotfix bugfix reconcile fix docs refactor test perf ci build style revert`.
Hooks never change your files; a failing step prints its output. Bypass in an emergency with
`HUSKY=0` or `--no-verify` — CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) still runs
format, lint, typecheck and tests on every push and pull request.

Prettier skips generated and vendored files: `documents/`, `config/professor.json` and
`config/professor.schema.json` (written by `fp`), `.specify/`, `config/legacy/`.
