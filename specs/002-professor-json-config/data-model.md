# Data Model: User-Editable Professor Configuration

Validation is by zod (`src/schemas/professor.ts`, `src/schemas/learning.ts`); the JSON Schema for
editors is generated from it (research R5). "Baseline" = already implemented.

## ProfessorConfig — `config/professor.json`

| Field                              | Type                                                  | Default                      | Rules                                                                 |
| ---------------------------------- | ----------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| `$schema`                          | string                                                | —                            | `./professor.schema.json`                                             |
| `language.output`                  | string                                                | `az`                         | answer language                                                       |
| `language.keepTermsInEnglish`      | boolean                                               | `true`                       |                                                                       |
| `focus`                            | DomainId[]                                            | `[]`                         | each id configured; order = priority; empty = no focus (Principle IX) |
| `domains`                          | Domain[]                                              | —                            | ≥ 1; unique ids                                                       |
| `sources`                          | Source[]                                              | `[]`                         | unique ids; every domain id configured                                |
| `ranking.priorityTechnologies`     | string[]                                              | `[]`                         | **new**; from `interests.yml`; order = weight                         |
| `ranking.ignoredTopics`            | string[]                                              | `[]`                         | **new**; security advisories never dropped                            |
| `extraSources.allowed`             | `never` \| `ask` \| `always`                          | `ask`                        | baseline                                                              |
| `extraSources.maxFetchesPerAnswer` | int 0–10                                              | `3`                          | baseline                                                              |
| `sessionStart.mode`                | `ask` \| `actions` \| `off`                           | `ask`                        | FR-020, FR-037                                                        |
| `sessionStart.actions[]`           | `{type: news\|lesson\|review\|english, enabled=true}` | `[]`                         | ask: menu · actions: run order                                        |
| `lesson.quizQuestions`             | int 0–10                                              | `3`                          | FR-025                                                                |
| `lesson.questionTypes`             | QuestionType[] ≥ 1                                    | `[conceptual, code-reading]` | filtered per domain kind                                              |
| `lesson.revealAnswersAfterAttempt` | boolean                                               | `true`                       | FR-026                                                                |
| `lesson.style`                     | `concise` \| `detailed`                               | `concise`                    | FR-040                                                                |
| `schedule.enabled`                 | boolean                                               | `false`                      | **new**; set only by `fp schedule enable`                             |
| `schedule.generationTime`          | `HH:mm`                                               | `08:00`                      | **new**                                                               |
| `schedule.timeZone`                | IANA zone                                             | system zone                  | **new**                                                               |

Unknown fields are errors (`strict`), reported with field path.

### Domain

| Field                 | Type                                                   | Default        | Rules                 |
| --------------------- | ------------------------------------------------------ | -------------- | --------------------- |
| `id`                  | DomainId (kebab-case)                                  | —              | unique                |
| `name`, `description` | string                                                 | —              | non-empty             |
| `kind`                | `technical` \| `language` \| `general`                 | `technical`    |                       |
| `depth`               | `beginner` \| `intermediate` \| `advanced` \| `expert` | `intermediate` | FR-018                |
| `level`               | CEFR `A1`…`C2`                                         | —              | language domains      |
| `priorityTopics`      | string[]                                               | `[]`           |                       |
| `curriculum`          | string[]                                               | `[]`           | ordered lesson topics |

### Source (unified, research R1)

| Field                                                                         | Type                                                                                                              | Default         | Rules                                                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| `id`                                                                          | kebab-case                                                                                                        | —               | unique                                                                                        |
| `kind`                                                                        | `rss`, `web`, `hn`, `github-advisories`, `youtube-channel`, `docs`, `github`, `youtube-video`, `youtube-playlist` | —               |                                                                                               |
| `url`                                                                         | URL                                                                                                               | —               |                                                                                               |
| `tier`                                                                        | 1–4                                                                                                               | —               | constitution Source Governance                                                                |
| `domains`                                                                     | DomainId[] ≥ 1                                                                                                    | —               | configured ids                                                                                |
| `use`                                                                         | (`news` \| `lessons`)[] ≥ 1                                                                                       | `["lessons"]`   | `news` only for collectable kinds: `rss`, `web`, `hn`, `github-advisories`, `youtube-channel` |
| `name`                                                                        | string                                                                                                            | id              | display name                                                                                  |
| `enabled`                                                                     | boolean                                                                                                           | `true`          |                                                                                               |
| `channelId`                                                                   | string \| null                                                                                                    | —               | `youtube-channel` (resolved by `fp sources resolve`)                                          |
| `params`                                                                      | object                                                                                                            | —               | adapter options (unchanged from 001)                                                          |
| `purpose`, `updateFrequency`, `reliability`, `limitations`, `failureBehavior` | string                                                                                                            | `"unspecified"` | Extensibility; `fp sources check` warns when unspecified on `news` sources                    |
| `note`                                                                        | string                                                                                                            | —               | free text                                                                                     |

## Learning record — `data/learning/record.json` (baseline)

`{ entries: LearningEntry[] }`, key = (`domain`, case-insensitive `topic`).

| Field                                   | Type                                       | Notes                                                         |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| `domain`, `topic`                       | string                                     | domain may later be removed from config; entry stays readable |
| `status`                                | `in-progress` → `learning` ⇄ `mastered`    | see transitions                                               |
| `startedAt`, `lastReview`, `nextReview` | YYYY-MM-DD                                 |                                                               |
| `streak`, `intervalDays`                | int                                        |                                                               |
| `confidence`                            | `low` \| `medium` \| `high`                | streak 0 / 1–2 / ≥ 3                                          |
| `prerequisites`, `objectives`           | string[]                                   | **new**, set by `fp learn start`                              |
| `strengths`, `misconceptions`           | string[]                                   | misconceptions replaced when given                            |
| `attempts[]`                            | `{at, kind: lesson\|review, score, total}` |                                                               |

Transitions (`applyAssessment`): `start` → `in-progress` (mastered stays mastered).
Assessment with ratio r: r ≥ 0.8 → streak+1, interval = INTERVALS[streak] (1, 3, 7, 14, 30, 60);
r < 0.6 → streak 0, interval 1; otherwise interval kept (≥ 1); total 0 → interval 1, no streak.
`mastered` iff streak ≥ 3 and passes on ≥ 2 distinct days; else `learning`.

## Run envelope / report (feature 001, extended)

| Entity                           | New field                                                   | Notes                                      |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| RunEnvelope (`candidates.json`)  | `focus: string[]`, `depthByDomain: Record<DomainId, Depth>` | snapshot at collection time                |
| Candidate                        | `outsideFocus?: boolean`                                    | set by ranking when focus non-empty        |
| ReportDraft / Report             | `focus: string[]`                                           | must equal the run's focus                 |
| ReportItem                       | `outsideFocus?: boolean`                                    | rendered "(fokusdan kənar)"                |
| Candidate / ReportItem `domains` | DomainId[] (string)                                         | was enum; draft domains must be configured |

Stored reports written before this feature have no `focus`; readers treat it as "no focus".

## Legacy files

`config/sources.yml`, `config/interests.yml`, `config/settings.yml` → moved to `config/legacy/`
after migration; never read again.
