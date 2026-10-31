# Data Model: Daily Frontend & Engineering News Report

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

All timestamps are ISO 8601 with offset; dates (`YYYY-MM-DD`) are in the user's time zone.
Schemas are implemented with zod; JSON forms of the report draft are in
[contracts/report-draft.schema.json](./contracts/report-draft.schema.json).

## Enumerations

- **Tier**: `1` primary · `2` technical analysis · `3` discovery/community · `4` learning resource
- **Domain**: `frontend` · `system-design` · `security` · `ai-llm`
- **SourceType**: `rss` · `youtube` · `hn` · `github-advisories` · `web`
- **Category** (FR-009): `breaking` · `release` · `ecosystem-change` · `security-advisory` ·
  `research` · `community-opinion` · `update`
- **ClaimType** (FR-004a): `version` · `release-status` · `date` · `security` · `breaking-change` ·
  `performance`
- **VerificationStatus**: `verified` · `unverified` · `vendor-reported` (FR-006d)

## Source _(config/sources.yml)_

| Field                                                               | Type       | Rules                                                         |
| ------------------------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| id                                                                  | string     | unique, kebab-case                                            |
| name                                                                | string     | required                                                      |
| type                                                                | SourceType | required                                                      |
| url                                                                 | URL        | feed/API/page URL; for `youtube` the `@handle` URL            |
| channelId                                                           | string?    | `youtube` only; filled by `fp sources resolve`                |
| tier                                                                | Tier       | required                                                      |
| domains                                                             | Domain[]   | ≥1                                                            |
| purpose, updateFrequency, reliability, limitations, failureBehavior | string     | all required (constitution Extensibility)                     |
| enabled                                                             | boolean    | default `true`                                                |
| params                                                              | object?    | adapter options (e.g., HN `minPoints`, advisories `severity`) |

Runtime status (per run, not config): `ok` · `unavailable` (with error message).

## InterestProfile _(config/interests.yml)_

| Field                | Type     | Rules                                 |
| -------------------- | -------- | ------------------------------------- |
| priorityTechnologies | string[] | ordered; earlier = higher weight (R7) |
| ignoredTopics        | string[] | may be empty                          |
| updatedAt            | date     | set on edit                           |

Never modified by the system (FR-013a).

## ScheduleSettings _(config/settings.yml)_

| Field          | Type      | Rules                                                     |
| -------------- | --------- | --------------------------------------------------------- |
| enabled        | boolean   | `true` only after task registration is confirmed (FR-019) |
| generationTime | `HH:mm`   | default `08:00`                                           |
| timeZone       | IANA zone | default system zone                                       |

## Candidate _(data/runs/<runId>/candidates.json — output of `fp collect`)_

| Field              | Type                                                                                              | Rules                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| candidateId        | string                                                                                            | `sha1(canonicalUrl)` first 12 chars                   |
| title              | string                                                                                            | original title, untranslated                          |
| url / canonicalUrl | URL                                                                                               | required                                              |
| sourceId           | string                                                                                            | → Source                                              |
| tier, domains      | Tier, Domain[]                                                                                    | from source                                           |
| publishedAt        | timestamp \| null                                                                                 | `null` ⇒ "publication date unknown"; never `breaking` |
| discoveredAt       | timestamp                                                                                         | collection time                                       |
| excerpt            | string                                                                                            | ≤ 2,000 chars, untrusted                              |
| supporting         | {sourceId, url, tier}[]                                                                           | merged duplicates (FR-007)                            |
| possibleUpdateOf   | itemId?                                                                                           | history match (FR-008), decided by skill              |
| score              | number                                                                                            | R7 ranking                                            |
| video              | {channel, transcript: {status: `ok`\|`unavailable`, language?, segments?: {t: seconds, text}[]}}? | `youtube` only; transcript ≤ 20,000 chars             |

Run envelope: `{runId, window: {start, end, catchUp}, sources: {id, status, error?}[], toVisit:
Source[] (type web), candidates: Candidate[], droppedAsDuplicate: number, droppedAsOld: number}`.

## NewsItem _(part of DailyReport; also appended to data/index/items.jsonl)_

| Field                                | Type                                                       | Rules                                                            |
| ------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| itemId                               | string                                                     | `<reportDate>-<n>`                                               |
| candidateId                          | string                                                     | → Candidate                                                      |
| title                                | string                                                     | original title                                                   |
| summaryAz                            | string                                                     | Azerbaijani prose (FR-015)                                       |
| whyItMattersAz                       | string                                                     | required                                                         |
| implicationsAz                       | string                                                     | required (FR-013)                                                |
| category                             | Category                                                   | exactly one (FR-009)                                             |
| domains, technologies                | Domain[], string[]                                         | technologies ≥1                                                  |
| primarySource                        | {url, name, tier}                                          | required (FR-003)                                                |
| supportingSources                    | {url, name, tier, role: `commentary`\|`analysis`}[]        |                                                                  |
| publishedAt                          | timestamp \| null                                          | required key (FR-002)                                            |
| discoveredAt                         | timestamp                                                  | required                                                         |
| claims                               | Claim[]                                                    | every verifiable claim (FR-004a)                                 |
| facts / interpretation / predictions | string[]                                                   | distinguish (FR-014); facts may cite claims                      |
| updateOf                             | itemId?                                                    | required iff category = `update`; must reference an indexed item |
| video                                | {notAnalyzed: boolean, keyPoints: {t: seconds, textAz}[]}? | FR-006a/b                                                        |
| rank                                 | integer                                                    | 1-based order in report                                          |

## Claim

| Field       | Type               | Rules                                             |
| ----------- | ------------------ | ------------------------------------------------- |
| type        | ClaimType          | required                                          |
| text        | string             | the claim as stated                               |
| status      | VerificationStatus | required                                          |
| evidenceUrl | URL?               | required when `verified`; must be a Tier 1 source |
| reason      | string?            | required when `unverified` (FR-004)               |

## DailyReport _(data/reports/YYYY-MM-DD.json + .md, immutable)_

| Field              | Type                                           | Rules                                                                                 |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| reportDate         | date                                           | unique; file never overwritten (FR-021)                                               |
| generatedAt        | timestamp                                      | becomes next window start                                                             |
| trigger            | `on-demand` \| `scheduled`                     |                                                                                       |
| coveredPeriod      | {start, end}                                   | from run window                                                                       |
| catchUp            | boolean                                        | `true` ⇒ summary states covered period (FR-010b)                                      |
| executiveSummaryAz | string                                         | required                                                                              |
| fewItemsNote       | string?                                        | required when items < 3 (FR-012)                                                      |
| items              | NewsItem[]                                     | 0–7                                                                                   |
| recommendationsAz  | {title, url?, kind: `reading`\|`experiment`}[] |                                                                                       |
| followUps          | FollowUp refs                                  | open items carried forward (FR-022)                                                   |
| knowledgeCheck     | {questionAz, relatedItemId}                    | exactly one                                                                           |
| unavailableSources | string[]                                       | from run                                                                              |
| quality            | QualitySignals                                 | FR-023                                                                                |
| addenda            | Addendum[]                                     | late additions (same-day second request)                                              |
| viewedAt           | timestamp?                                     | set by `fp show` / `fp unread` (stored in data/state.json, not in the immutable file) |

**Addendum**: `{addedAt, items: NewsItem[]}` stored as `YYYY-MM-DD.addendum-<n>.json`; the base file
is untouched.

**QualitySignals**: `{itemCount, verifiedShare, duplicatesRemoved, droppedAsOld,
unavailableSourceCount, vendorReportedCount, notAnalyzedVideos}`.

## FollowUp _(data/followups.json)_

| Field        | Type                              | Rules                            |
| ------------ | --------------------------------- | -------------------------------- |
| followUpId   | string                            | unique                           |
| originItemId | itemId                            | required                         |
| reasonAz     | string                            | e.g., "beta → stable gözlənilir" |
| status       | `open` · `resolved` · `dismissed` |                                  |
| resolvedBy   | itemId?                           | required when `resolved`         |
| updatedAt    | timestamp                         |                                  |

State transitions: `open → resolved` (an `update` item references `originItemId`) ·
`open → dismissed` (user via `fp followup dismiss`). No transitions out of `resolved`/`dismissed`.

## Feedback _(data/feedback.json)_

`{reportDate, rating: 1–5, comment?: string ≤ 500 chars, ratedAt}` — one per report; re-rating
replaces the previous entry. Rating ≥ 4 counts as useful (SC-008).

## RunLog _(data/runs/<runId>/run.json)_

`{runId, trigger, startedAt, finishedAt?, status: running|succeeded|failed, error?,
reportDate?, surfacedAt?}` — failed runs with no `surfacedAt` are shown by `fp unread`
(FR-020) and then marked surfaced.

## Report lifecycle

```text
collect → candidates (run: running)
        → skill drafts → fp save-report validates
             ├─ invalid → rejected with errors (skill fixes, retries)
             └─ valid   → report stored (immutable), items indexed, follow-ups updated,
                          run: succeeded, viewedAt unset
fp show / fp unread → viewedAt set
any step fails → run: failed → surfaced at next session
```
