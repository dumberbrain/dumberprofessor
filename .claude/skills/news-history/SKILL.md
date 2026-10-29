---
name: news-history
description: Retrieve, search and rate past daily news reports. Use when the user asks for yesterday's or an earlier report, last week's news, news about a topic in a period, wants to rate a report, or manage follow-ups ("dünənki hesabat", "keçən həftə React haqqında nə var idi", "hesabatı qiymətləndir").
---

# News history

All data comes from the `fp` CLI. Stored reports are immutable: show them **unchanged** — do not
re-summarize, re-verify or "update" an old report unless the user explicitly asks; if they do,
say clearly that the new text is today's interpretation, not the stored report (constitution VII:
stored ≠ verified recently). Answer in Azerbaijani; keep titles and technical terms in English.

## Requests → commands

| Request | Command |
|---|---|
| today / yesterday / a date / latest | `npm run -s fp -- show <today\|yesterday\|YYYY-MM-DD\|latest>` |
| last week, a period | `npm run -s fp -- search --from <YYYY-MM-DD> --to <YYYY-MM-DD>` |
| a topic, optionally in a period | `npm run -s fp -- search --q "<keyword>" [--from …] [--to …]` |
| only one kind | add `--category <breaking\|release\|ecosystem-change\|security-advisory\|research\|community-opinion\|update>` or `--domain <frontend\|system-design\|security\|ai-llm>` |
| rate a report | `npm run -s fp -- rate <date> <1-5> [--comment "<text>"]` |
| open follow-ups | `npm run -s fp -- followup list --status open` |
| stop following a topic | `npm run -s fp -- followup dismiss <followUpId>` |

Resolve relative dates yourself ("last week" = the 7 days before today) and pass explicit
`--from`/`--to`. Use `--json` when you need fields for further processing.

## Presenting results

- For a whole report: print the `show` output as is.
- For search results: group by report date (newest first); for each item give the title, category,
  the one-line Azerbaijani summary from the stored item, and the primary source link with its
  publication date.
- No results: say so plainly; never fill the gap with items from memory or the web.
- Ratings: confirm what was stored ("2026-10-29 hesabatı: 4/5").
