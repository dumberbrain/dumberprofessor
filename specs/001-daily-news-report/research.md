# Research: Daily Frontend & Engineering News Report

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-29

Each entry resolves an unknown from the plan's Technical Context.

## R1. Overall architecture

- **Decision**: Hybrid. A TypeScript CLI (`fp`) does all deterministic work — source collection,
  reporting-window calculation, normalization, deduplication, history matching, interest scoring,
  storage, search, rendering, feedback. A Claude Code skill does the judgement work — claim
  verification against Tier 1 sources, categorization, meaningful-update decisions, Azerbaijani
  prose, implications, knowledge-check question — and hands a structured draft back to the CLI.
- **Rationale**: Constitution I/II/VII demand guarantees (every item has URL + dates, no
  fabrication, stored ≠ verified) that are enforceable by schema validation in code, not by prompt
  alone. Deterministic parts become unit-testable (Vitest). The LLM is used only where judgement
  is required, which keeps runs fast (SC-004) and cheap. Matches the in-chat delivery decision.
- **Alternatives considered**: Skill-only (no code) — dedupe and date rules would rely on the
  model and be untestable; rejected. Standalone app calling the Claude API with its own UI —
  largest scope, separate API key and billing, moves away from in-chat delivery; rejected for v1.

## R2. Language, runtime, dependencies

- **Decision**: TypeScript 5.x (strict) on Node.js 22 LTS (installed: 22.21.1), executed with
  `tsx` (no build step). Runtime deps: `zod` (schemas and validation), `fast-xml-parser`
  (RSS/Atom), `yaml` (human-editable config). Native `fetch` for HTTP.
- **Rationale**: Matches the user's frontend/TypeScript background; zod schemas double as the
  draft-report contract enforced by `fp save-report`. Minimal dependency surface (constitution
  security: least privilege, small supply chain).
- **Alternatives considered**: Python — weaker fit with user's stack. `rss-parser` — heavier, less
  control over Atom/YouTube namespaces. JSON config — less pleasant to hand-edit than YAML.

## R3. Storage and search

- **Decision**: Plain files under `data/`: one immutable JSON + rendered Markdown per report,
  an append-only JSONL item index for history matching and search, JSON files for follow-ups,
  feedback, schedule state, and run logs. Search is an in-memory scan of the index.
- **Rationale**: Single user, at most ~7 items/day ⇒ ~2,600 items/year; a linear scan is far below
  the 30 s target (SC-006). Files are diffable, backup-friendly, readable by Claude directly, and
  need no native modules on Windows. Immutability (FR-021) is enforced by refusing overwrites.
- **Alternatives considered**: `node:sqlite` — still flagged experimental on Node 22; unnecessary
  at this scale. `better-sqlite3` — native build on Windows. Revisit if the index exceeds ~50k
  items.

## R4. Source access per domain

| Source kind                                                                                                                                                 | Access method                                                                                                 | Notes                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Official blogs / release notes (React, Next.js, Vue, Angular, Svelte, TypeScript, Chrome, Firefox, Safari, Node.js), model-provider news, engineering blogs | RSS/Atom feed (`type: rss`)                                                                                   | Feed URLs kept in config; each verified on first `fp sources check`.                          |
| Sources without a feed                                                                                                                                      | `type: web` — listed in candidates as "to visit"; the skill reads them with WebFetch                          | Keeps the CLI free of fragile HTML scraping.                                                  |
| GitHub releases of tracked repos                                                                                                                            | Repo release Atom feed `https://github.com/<owner>/<repo>/releases.atom` (`type: rss`)                        | No token needed.                                                                              |
| Security advisories                                                                                                                                         | GitHub Advisory Database REST API, `GET https://api.github.com/advisories?ecosystem=npm&severity=<high        | critical>&published=>=<since>` (`type: github-advisories`)                                    | 60 req/h unauthenticated is ample; optional `GITHUB_TOKEN` read from env, never logged. |
| Hacker News                                                                                                                                                 | Algolia HN Search API `search_by_date` with `numericFilters=created_at_i>=<since>,points>=<min>` (`type: hn`) | Tier 3: discovery only (FR-005).                                                              |
| GitHub Trending                                                                                                                                             | `type: web` (no official API)                                                                                 | Tier 3; skill visits page; never used as quality evidence (constitution GitHub Intelligence). |
| YouTube channels                                                                                                                                            | See R5 (`type: youtube`)                                                                                      | Tier 4.                                                                                       |

- **Decision**: one adapter per `type` (`rss`, `youtube`, `hn`, `github-advisories`, `web`), all
  returning the same normalized `Candidate` shape. Each source in config declares purpose, access
  method, update frequency, reliability, limitations and failure behavior (constitution
  Extensibility).
- **Rationale**: Feeds and documented APIs are stable and carry publication dates (FR-002).
- **Alternatives considered**: Scraping every site — fragile, dates often missing; rejected.

## R5. YouTube channels and transcripts

- **Decision**:
  - Resolve each `@handle` to its channel ID once (`fp sources resolve`) by reading the canonical
    `/channel/UC…` URL from the handle page; store the ID in config.
  - List new videos via the public channel feed
    `https://www.youtube.com/feeds/videos.xml?channel_id=<id>` (title, link, published date,
    description; no API key).
  - Transcripts via `yt-dlp` (optional external tool): download subtitles only
    (`--skip-download --write-subs --write-auto-subs --sub-langs "en.*,ru.*,orig" --sub-format vtt`),
    convert VTT to timestamped text.
  - If `yt-dlp` is missing or no subtitles exist, the candidate gets
    `transcript.status = "unavailable"` and the report marks it "not analyzed" (FR-006a).
- **Rationale**: Channel feeds are official and keyless. There is no official keyless transcript
  API for third-party videos; `yt-dlp` is the most actively maintained option, and making it
  optional keeps the system working (and honest) when it breaks. Timestamps from VTT satisfy
  FR-006b.
- **Alternatives considered**: YouTube Data API v3 — needs an API key and still cannot fetch
  captions of other channels without owner OAuth. npm transcript scrapers — break frequently and
  are less maintained than `yt-dlp`.
- **Setup note**: `yt-dlp` is not installed on this machine; install with
  `winget install yt-dlp` (documented in quickstart).

## R6. Reporting window, deduplication, history matching

- **Decision**:
  - Window (FR-010a/b): `start = previous report's generatedAt`, clamped to `now − 7 days`;
    first run uses `now − 24 h`. `catchUp = (now − start) > 24 h`. All in the user's time zone.
  - Items published before `start` are dropped even if popular now (FR-010).
  - Intra-run dedupe (FR-007): group candidates by canonical URL (strip tracking params,
    trailing slashes, `www.`), then by (product, version) extracted from titles, then by title
    token Jaccard similarity ≥ 0.6. Group keeps the highest-tier source as primary; others become
    supporting sources.
  - History match (FR-008): the same keys against the item index of the last 90 days. Matches are
    flagged `possibleUpdateOf: <itemId>` — the CLI never decides; the skill applies FR-008a and
    either drops the candidate or emits it with category "previously reported development with a
    meaningful update".
- **Rationale**: Cheap deterministic keys catch most duplicates; the model only arbitrates the
  ambiguous "is this a real update" question, which the spec defines precisely (FR-008a).
- **Alternatives considered**: Embedding similarity — extra dependency/cost, opaque; not needed at
  this volume.

## R7. Ranking with the interest profile

- **Decision**: Score = tier weight (T1 4, T2 3, T3 2, T4 2) + domain match (+3 frontend, system
  design, security, AI/LLM) + priority-technology match (+5 for the first entry, decreasing by
  position) + security-advisory severity bonus (+4 critical, +2 high). Candidates matching only
  ignored topics are dropped unless they are security advisories (FR-013a). The skill may reorder
  within ±2 positions with a stated reason.
- **Rationale**: Transparent, explainable ranking (constitution VII); deterministic and testable.
- **Alternatives considered**: Pure model ranking — not reproducible; learned weights — rejected by
  clarification (no automatic learning).

## R8. Scheduling and in-chat display

- **Decision**:
  - Windows Task Scheduler task `FrontendProfessor-DailyReport`, daily at the configured time,
    "run as soon as possible after a scheduled start is missed" enabled, retry once after
    10 minutes on failure.
  - The task runs `scripts/schedule/run-scheduled.ps1`, which calls
    `claude -p "/daily-report --scheduled"` headless with an explicit tool allowlist
    (`Read`, `WebFetch`, `Bash(npm run fp *)`, `Write(data/runs/**)`), then on non-zero exit runs
    `fp record-failure`.
  - `fp schedule enable` registers the task and confirms it with `schtasks /Query`; if either step
    fails it refuses and explains (FR-019).
  - A `SessionStart` hook in project `.claude/settings.json` runs `fp unread --hook`, which emits
    any unviewed report and unreported failures as session context, so the report is shown in-chat
    at the next session (FR-018, FR-020).
- **Rationale**: Native to Windows, survives sleep/missed starts (catch-up logic handles gaps),
  no cloud dependency, local files stay local.
- **Alternatives considered**: Claude Code cloud routines — run remotely and cannot read the local
  `data/` directory without pushing it to a remote. Long-running Node daemon — must stay alive;
  Task Scheduler already does this.

## R9. Untrusted content and secrets

- **Decision**: Collected text is stored in candidate files as data fields only; transcripts are
  truncated to 20,000 characters per video. The skill's instructions treat every candidate field
  as untrusted and forbid acting on embedded instructions (FR-006). Headless runs use the tool
  allowlist from R8 (no unrestricted Bash, no edits outside `data/runs/`). Optional `GITHUB_TOKEN`
  is read from the environment and redacted from logs.
- **Rationale**: Constitution Security & Trust; least privilege.

## R10. Testing

- **Decision**: Vitest. Unit tests for window, dedupe, history match, ranking, rendering, schema
  validation; integration tests run adapters against recorded fixture feeds (RSS, YouTube Atom,
  HN JSON, advisories JSON, VTT) with `fetch` stubbed; contract tests validate example drafts and
  CLI JSON output against the schemas in `contracts/`.
- **Rationale**: User's team standard; fast; no network in CI.
