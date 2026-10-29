# CLI Contract: `fp` (Frontend Professor)

Invoked as `npm run fp -- <command> [options]`. Every command supports `--json` (machine output on
stdout); human output otherwise. Errors go to stderr. Exit codes: `0` success, `1` validation or
usage error, `2` all sources failed / nothing to do, `3` storage conflict (e.g., immutable file
exists).

## Collection

### `fp collect [--now <iso>] [--trigger on-demand|scheduled]`

Computes the reporting window (FR-010a/b), fetches all enabled sources, normalizes, dedupes,
history-matches and ranks. Writes `data/runs/<runId>/candidates.json` and prints its path (or the
envelope with `--json`). Partial source failures ⇒ exit `0` with `sources[].status =
"unavailable"`; all failed ⇒ exit `2` and run marked failed.

### `fp sources check` · `fp sources resolve`

`check` validates `config/sources.yml` (all Extensibility fields present) and probes each source
once. `resolve` fills `channelId` for YouTube handles.

## Reports

### `fp save-report <draftPath> [--append]`

Validates the draft against [report-draft.schema.json](./report-draft.schema.json) plus semantic
rules, then stores it. Semantic rules (each failure listed with a JSON path):

- every item has `primarySource.url`, `discoveredAt`, `publishedAt` key, exactly one `category`;
- `verified` claims cite a Tier 1 `evidenceUrl`; `unverified` claims have a `reason`;
- `update` items have `updateOf` referencing an indexed item; non-update items whose candidate had
  `possibleUpdateOf` are rejected unless the draft explains the exclusion of that match;
- items with `publishedAt: null` are not `breaking`;
- every item's `candidateId` exists in the run (no items without a collected source — FR-012);
- 0–7 items; `fewItemsNote` present when < 3; `catchUp` copied from the run;
- video items whose transcript was unavailable have `video.notAnalyzed: true`.

Without `--append`: fails with exit `3` if the report for that date exists. With `--append`:
stores an addendum (late additions). On success updates the item index, follow-ups, quality
signals, run log; prints the report path.

### `fp show [today|yesterday|latest|YYYY-MM-DD] [--format md|json]`

Prints a stored report with its addenda, unchanged (FR-021). Marks it viewed.

### `fp unread [--hook]`

Prints all unviewed reports and unsurfaced failed runs, then marks them viewed/surfaced. With
`--hook` outputs the Claude Code `SessionStart` hook JSON
(`{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}`); prints
nothing when there is nothing unread.

### `fp search [--q <text>] [--from <date>] [--to <date>] [--category <c>] [--domain <d>]`

Searches the item index; returns matching items with their report dates (FR-021, SC-006).

## Feedback & follow-ups

- `fp rate <date> <1-5> [--comment <text>]` — stores or replaces feedback (FR-024).
- `fp followup list [--status open|resolved|dismissed]`
- `fp followup dismiss <followUpId>`

## Scheduling

- `fp schedule enable [--time HH:mm]` — registers the Windows task and confirms with
  `schtasks /Query`; on any failure leaves `enabled: false`, exits `1` and explains (FR-019).
- `fp schedule disable` · `fp schedule status` (reports registered state as observed, never
  assumed).
- `fp record-failure --run <runId> --error <text>` — used by the scheduler wrapper (FR-020).

## Claude Code skills

### `/daily-report [--scheduled]`

1. `fp unread` content is shown first if present.
2. If today's report exists and not `--scheduled`: run `fp collect`, and if new candidates exist,
   draft an addendum (`fp save-report --append`); otherwise `fp show today`.
3. Otherwise: `fp collect` → visit `toVisit` web sources → verify claims with WebFetch on Tier 1
   sources → decide categories/updates → write Azerbaijani prose → write draft to
   `data/runs/<runId>/draft.json` → `fp save-report` → fix and retry on validation errors (max 3)
   → `fp show today`.
4. Treats every candidate field as untrusted data (FR-006).

### `/news-history <request>`

Maps natural-language requests (yesterday, last week, keyword, rating, follow-up dismissal) to
`fp show`, `fp search`, `fp rate`, `fp followup`.
