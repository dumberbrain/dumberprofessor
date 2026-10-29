# Quickstart & Validation: Daily Frontend & Engineering News Report

Validation guide proving the feature end to end. Commands: [contracts/cli.md](./contracts/cli.md).
Data shapes: [data-model.md](./data-model.md).

## Prerequisites

- Windows 10/11, Node.js 22 LTS, npm, Git, Claude Code CLI (`claude`) — all present.
- Optional, for video transcripts: `winget install yt-dlp` (without it videos are reported as
  "not analyzed", which is valid behavior).
- Optional: `GITHUB_TOKEN` in the environment for higher advisory API limits.

## Setup

```powershell
npm install
npm run fp -- sources resolve      # fills YouTube channel IDs
npm run fp -- sources check        # every source: ok, or disabled with error
npm test                           # unit + integration + contract suites, no network
```

Expected: `sources check` lists all sources including the ten YouTube channels; `npm test` green.

## Scenario 1 — On-demand report (Story 1, SC-001/002/004)

1. In Claude Code: `/daily-report`.
2. Expected within 5 minutes: `data/reports/<today>.json` and `.md` exist; chat shows the report
   in Azerbaijani with original English titles.
3. Check: `npm run fp -- show today --format json` — every item has `primarySource.url`,
   `publishedAt` key, `discoveredAt`, one `category`; every `verified` claim has a Tier 1
   `evidenceUrl`; every `unverified` claim has a `reason`.
4. Exactly one knowledge-check question; 3–7 items or a `fewItemsNote`.

## Scenario 2 — Validation guards (FR-004, FR-012, FR-021)

1. Copy `tests/fixtures/drafts/invalid-*.json` drafts and run
   `npm run fp -- save-report <file>` for each.
2. Expected: exit `1` with JSON-path errors for: item without source, verified claim without
   evidence, `update` without `updateOf`, `breaking` with unknown date, unknown `candidateId`.
3. Run `save-report` twice for the same valid draft: second run exits `3` (immutability).

## Scenario 3 — Same-day second request (edge case)

1. Run `/daily-report` again on the same day.
2. Expected: original report unchanged; new items, if any, stored as `<today>.addendum-1.json`
   and shown as late additions; otherwise the existing report is shown.

## Scenario 4 — Catch-up window (FR-010a/b)

1. `npm run fp -- collect --now <iso 3 days after last report> --json`.
2. Expected: `window.catchUp = true`, `window.start` = last report's `generatedAt`.
3. With `--now` 10 days later: `window.start` = now − 7 days.

## Scenario 5 — Scheduling and in-chat display (Story 2, FR-018–020, SC-005)

1. `npm run fp -- schedule enable --time <now + 3 min>` → `schedule status` shows the task as
   registered (observed via `schtasks /Query`).
2. Close Claude Code; wait past the time; open a new session in the repo.
3. Expected: the `SessionStart` hook shows the unread report without asking.
4. Failure path: temporarily rename `config/sources.yml`, let the task run, restore it, open a
   session. Expected: the failure is reported and an on-demand report is offered.
5. `npm run fp -- schedule disable`.

## Scenario 6 — History, follow-ups, feedback (Stories 3–4, FR-022/024)

1. `npm run fp -- search --q "React" --from <date> --to <date>` → matching items with report dates.
2. `/news-history yesterday` → the stored report, unchanged.
3. `npm run fp -- followup list --status open` → open follow-ups; `followup dismiss <id>` removes
   it from the next report.
4. `npm run fp -- rate today 5 --comment "faydalı"` → stored; re-rating replaces it.

## Scenario 7 — Untrusted content and videos (FR-006, FR-006a–d)

1. Integration test `tests/integration/injection.test.ts` feeds a fixture item whose excerpt
   contains "ignore previous instructions"; expected: candidate stored as data, no behavior change.
2. With `yt-dlp` uninstalled, a fixture video yields `transcript.status = "unavailable"` and
   `save-report` rejects a draft that does not set `video.notAnalyzed: true`.
3. A fixture AI-model release with vendor benchmarks must carry `vendor-reported` claims.

## Performance notes (T071, 2026-10-29)

- Live `fp collect` over all 38 sources (yt-dlp absent): **20.3 s** — target ≤ 60 s. 75
  candidates, 3 duplicates merged, 0 sources unavailable.
- `fp search` (`searchItems`) over a generated 3,000-item index: **181 ms** — target ≤ 1 s.
- `fp sources check`: 38/38 sources ok; all 10 YouTube channel ids resolved.

## Weekly spot check (SC-007)

Pick 10 items from the last 7 reports; open each `primarySource.url`; confirm the item exists and
its claims match. Record the result with `fp rate` comments or in the run log.
