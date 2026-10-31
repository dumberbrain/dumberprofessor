# Research: User-Editable Professor Configuration

All Technical Context unknowns are resolved below. Format: Decision · Rationale · Alternatives.

## Baseline (already in the working tree, 2026-10-31)

A first slice was built before this plan, at the user's request, so the skills could work:
`config/professor.json` + hand-written `config/professor.schema.json`; zod schema
`src/schemas/professor.ts`; loader/writer `src/config/professor.ts`; learning record
`src/schemas/learning.ts`, `src/store/learning.ts`; CLI `src/cli/professor.ts`
(`config check`, `focus`, `learn context|start|record|due|status`, `session-start`, `transcript`);
skills `professor`, `learn`, `review`, `english`, `research`, `focus`; tests
`tests/unit/learning.test.ts`, `tests/unit/professor-cli.test.ts`. This plan keeps that design and
completes the spec around it (one file, migration, dynamic domains in the news pipeline, focus in
ranking, schedule, rename).

## R1 — One file for everything, including news sources

**Decision**: `config/professor.json` holds learning _and_ news sources in one `sources` array.
A source gets `use: ["news" | "lessons"]` (default `["lessons"]`; migrated news sources get
`["news"]`). The `kind` enum is the union of both worlds:
`rss`, `web`, `hn`, `github-advisories`, `youtube-channel` (= old `youtube`), `docs`, `github`,
`youtube-video`, `youtube-playlist`. News collection only accepts kinds that have a collection
adapter (`rss`, `web`, `hn`, `github-advisories`, `youtube-channel`); a `news` source of another
kind is a config error. Old news-only fields (`name`, `channelId`, `params`, `enabled`, and the
Extensibility fields `purpose`, `updateFrequency`, `reliability`, `limitations`,
`failureBehavior`) become optional on every source; for `news` sources missing Extensibility
fields default to `"unspecified"` and `fp sources check` warns.

**Rationale**: FR-001 (one file); the user asked to list sources by hand in one place. Keeping
adapters unchanged avoids risk to feature 001.

**Alternatives**: two arrays (`newsSources`, `learningSources`) — rejected: the same YouTube
channel or blog would be duplicated. Keeping `sources.yml` — rejected by FR-001/FR-006.

## R2 — Domains as data, not an enum

**Decision**: `Domain` in `src/schemas/enums.ts` becomes a kebab-case string
(`DomainId = z.string().regex(...)`). Membership is checked where configuration is known:
config load (sources, focus), `fp save-report` semantic validation (draft item domains must be
configured), `fp search --domain` (accepts any id present in config **or** in stored items, so
reports with removed domains stay searchable — FR-035). Stored reports are never re-validated
against the current config.

**Rationale**: FR-009, constitution Extensibility ("code MUST NOT hardcode the set of domains").

**Alternatives**: build a zod enum at runtime from config — rejected: schemas are module-level and
used by tests and the contract schema; string + semantic checks is simpler.

## R3 — Migration from YAML

**Decision**: `fp config migrate` (also run automatically by `loadProfessor()` when
`professor.json` lacks the migrated sections and any of `sources.yml`, `interests.yml`,
`settings.yml` exists). Mapping:

| From                                                    | To                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `sources.yml` `sources[]`                               | `sources[]` with `use: ["news"]`, `type: youtube` → `kind: youtube-channel`, other fields copied |
| `interests.yml` `priorityTechnologies`, `ignoredTopics` | `ranking.priorityTechnologies`, `ranking.ignoredTopics` (order kept)                             |
| `settings.yml` `schedule`                               | `schedule` (`enabled`, `generationTime`, `timeZone`)                                             |

An existing learning source with the same id or the same canonical URL is merged (`use` becomes
both). A domain referenced by a YAML source but missing from `professor.json` is added (id as
name, description "added by migration") so no source is lost and the result stays valid. After a successful write the YAML files move to `config/legacy/` with a `README` line saying
they are no longer read. Migration is idempotent (second run: "nothing to migrate"). A count check
(sources, priorities, ignored topics, schedule fields) is printed and asserted in tests (SC-002).

**Missing file** (FR-005): if neither `professor.json` nor YAML exists, write the default file
(the current `config/professor.json` content is the default template, kept as
`src/config/default-professor.json`).

**Alternatives**: keep reading YAML as fallback — rejected (FR-006 "stop reading").

## R4 — Writing the user's file safely

**Decision**: all system writes go through `updateProfessor(key, value)`: parse raw JSON, change
one top-level key, validate the whole result, write atomically with 2-space indentation. Unknown
or default fields are not materialized. Formatting is normalized (JSON has no comments, so no
content is lost).

**Rationale**: FR-007; already implemented and tested.

**Alternatives**: a JSON-with-comments format (JSONC) and a format-preserving editor — rejected:
extra dependency; the user asked for JSON; field help comes from the schema instead.

## R5 — JSON Schema stays in sync with zod

**Decision**: generate `config/professor.schema.json` from the zod schema with zod v4's
`z.toJSONSchema()` (descriptions via `.meta({ description })`) through `fp config schema`
(writes the file). A contract test fails if the committed file differs from the generated one.
The hand-written schema from the baseline is replaced.

**Rationale**: FR-002 with a single source of truth; prevents drift.

**Alternatives**: hand-maintained schema — rejected (drift); `zod-to-json-schema` package —
unnecessary with zod v4.

## R6 — Focus and depth in news ranking and the report

**Decision**:

- Ranking (`src/pipeline/rank.ts`): add a focus bonus — first focus domain +4, −1 per position,
  min +1; candidates with no focus domain get 0 and `outsideFocus: true` when a focus is set.
  Security advisories (`severity` present) are never dropped (existing rule) and not marked
  outside focus.
- Report: draft gains report-level `focus: string[]` (copied from the run envelope, which records
  the focus at collection time) and item-level optional `outsideFocus: boolean`; `fp save-report`
  checks `focus` equals the run's focus. Markdown render shows "Fokus: …" in the header and
  "(fokusdan kənar)" on such items.
- Depth: the run envelope records `depthByDomain`; the `daily-report` skill writes each item at
  the depth of its first domain (FR-019). Rendered header lists depths only when they differ from
  `intermediate`.

**Rationale**: FR-017, FR-019, Principle IX ("every report MUST state the focus").

**Alternatives**: filter out non-focus items entirely — rejected: spec allows marked
outside-focus items; security must stay.

## R7 — Schedule settings in JSON

**Decision**: `fp schedule enable|disable` write `schedule` through `updateProfessor`
(replacing YAML `parseDocument` editing). `loadSettings()` reads `professor.json` `schedule`.

## R8 — Rename and the old scheduled task

**Decision**: `TASK_NAME = 'Professor-DailyReport'`, `LEGACY_TASK_NAMES = ['FrontendProfessor-DailyReport']`.
`enable` deletes legacy tasks (ignoring "not found") before creating; `status` reports a legacy
task if one still exists; `disable` removes both. User agent `professor/0.2 (personal learning
companion)`. `package.json` name `professor`, description updated. Strings in `unread.ts`,
skill descriptions (`daily-report`), README updated. `validate.ts` keeps `frontendfoc.us` in the
non-evidence host list (it is a newsletter host, not a project name).

**Rationale**: FR-036; SC-008.

## R9 — Session start and token economy

**Decision** (baseline kept): the SessionStart hook runs `fp session-start --hook`, which emits ≤ 3
lines (mode instruction + state) instead of whole reports; the `professor` skill asks via one
AskUserQuestion and invokes one specialised skill. Skills read state only through compact `fp`
commands (`learn context` ≈ 15 lines), cap fetches by `extraSources.maxFetchesPerAnswer`, cap
transcripts with `fp transcript --max`, and default to `lesson.style: concise`. Test: the hook
context stays < 400 characters.

**Alternatives**: one big skill with all flows — rejected: its whole body would load on every
invocation; split skills load only what is used.

## R10 — Learning record and spaced repetition

**Decision** (baseline kept): `data/learning/record.json`, one entry per domain+topic, intervals
1, 3, 7, 14, 30, 60 days; pass ≥ 80 %, fail < 60 %, in between keeps the interval; mastery needs
streak ≥ 3 with passes on ≥ 2 distinct days; `total = 0` is "not assessed". Prerequisites and
objectives (constitution Learning Verification) are added as optional entry fields written by
`fp learn start --prerequisites "a; b" --objectives "x; y"`.

**Alternatives**: SM-2/FSRS — out of scope (spec Assumptions).

## R11 — Language domains

**Decision**: `kind: "language"` + optional CEFR `level`; question types are filtered by
`QUESTION_KINDS` (code types skipped for language/general domains and vice versa). The `english`
skill handles modes; progress uses the same learning record.
