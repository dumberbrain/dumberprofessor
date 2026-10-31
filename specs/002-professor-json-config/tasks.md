---

description: "Task list for feature 002 — user-editable Professor configuration"
---

# Tasks: User-Editable Professor Configuration

**Input**: Design documents from `/specs/002-professor-json-config/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md, contracts/skills.md, quickstart.md

**Tests**: Included. The spec's success criteria require them (SC-002 migration counts, SC-003
error test set, SC-004 session start, SC-007 existing tests stay green), and the project keeps
Vitest coverage for every `fp` command.

**Organization**: Tasks are grouped by user story. Tasks already completed in the baseline slice
(research.md "Baseline") are checked `[x]` so the remaining work is visible.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US7)
- Paths are relative to the repository root (single project)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fixtures and helpers used by several stories

- [x] T001 Create user config `config/professor.json` with the five seed domains, learning sources, session start, lesson settings
- [x] T002 Create zod config schema in `src/schemas/professor.ts` and loader/writer `loadProfessor`/`updateProfessor` in `src/config/professor.ts`
- [x] T003 [P] Add legacy YAML fixtures (copies of current `config/sources.yml` trimmed to 4 sources incl. one `youtube`, `interests.yml`, `settings.yml`) in `tests/fixtures/config-yaml/`
- [x] T004 [P] Add a test helper `withConfig(value)` that creates a temp `FP_CONFIG_DIR` with `professor.json` (and optional YAML fixtures) and a temp `FP_DATA_DIR` in `tests/helpers.ts`; refactor `tests/unit/professor-cli.test.ts` to use it

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domains become data; the config schema covers everything the YAML files held

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Replace the `Domain` enum with `DomainId = z.string().regex(kebab-case)` (keep exported name `Domain` as alias) in `src/schemas/enums.ts`; fix typings in `src/schemas/candidate.ts`, `src/schemas/report.ts`, `src/schemas/config.ts`, `src/store/search.ts`, `src/cli/history.ts` (history: drop `Domain.parse`, keep the string)
- [x] T006 Extend `ProfessorConfig` in `src/schemas/professor.ts` per data-model.md: unified `Source` (kinds `rss`, `web`, `hn`, `github-advisories`, `youtube-channel`, `docs`, `github`, `youtube-video`, `youtube-playlist`; `use` default `["lessons"]`; optional `name`, `enabled`, `channelId`, `params`, Extensibility fields default `"unspecified"`, `note`), `ranking {priorityTechnologies, ignoredTopics}`, `schedule {enabled, generationTime HH:mm, timeZone?}`; superRefine rejects `use ∋ news` for non-collectable kinds
- [x] T007 Add `.meta({ description })` to every field of `ProfessorConfig` (texts from the current `config/professor.schema.json`) in `src/schemas/professor.ts`
- [x] T008 [P] Add `toCollectorSource(source)` mapping a unified news source to the 001 `Source` shape (`youtube-channel` → `youtube`, `name` default id) in `src/config/professor.ts`
- [x] T009 Unit tests for the extended schema (unified source defaults, news-kind rule, ranking/schedule defaults, unknown field error with path) in `tests/unit/professor-schema.test.ts`
- [x] T010 Run `npm test` and `npm run typecheck`; all 001 tests must still pass (SC-007)

**Checkpoint**: Foundation ready — user stories can start

---

## Phase 3: User Story 1 - Define domains and sources in one hand-editable file (Priority: P1) 🎯 MVP

**Goal**: All domains and sources (news + lessons) live in `config/professor.json`; the YAML files are migrated and no longer read; the news report works from the new file.

**Independent Test**: Add domain `backend` with a feed and a YouTube video source, run `fp collect` / `/daily-report`, see `backend` items; remove `frontend`, it disappears; migrate the YAML fixtures with zero loss (quickstart §2, §3).

### Tests for User Story 1

- [x] T011 [P] [US1] Integration test: `fp config migrate` on `tests/fixtures/config-yaml/` → counts equal (sources, priorities, ignored topics, schedule fields), `youtube` → `youtube-channel`, `use: ["news"]`, same-URL learning source merged to `use` both, YAML moved to `config/legacy/`, second run exit 2 — in `tests/integration/config-migrate.test.ts`
- [x] T012 [P] [US1] Integration test: `fp collect` with a temp `professor.json` (stubbed fetch, one rss news source for domain `backend`, one lessons-only source) collects only the news source and labels items `backend` — in `tests/integration/collect-professor.test.ts`
- [x] T013 [P] [US1] Unit test: `fp save-report` rejects a draft item whose domain is not configured; `fp search --domain old-id` still finds items stored under a removed domain — in `tests/unit/domains-dynamic.test.ts`

### Implementation for User Story 1

- [x] T014 [US1] Implement `migrateYaml()` per research R3 (read legacy YAML with schemas from `src/schemas/config.ts`, map, merge by id/canonical URL, write via `updateProfessor`, move files to `config/legacy/`, return counts) in `src/config/migrate.ts`
- [x] T015 [US1] Call `migrateYaml()` from `loadProfessor()` when any legacy YAML exists next to `professor.json` (or `professor.json` is missing), print one line `migrated: …` to stderr, in `src/config/professor.ts`
- [x] T016 [US1] Add `fp config migrate` (counts text, exit 2 when nothing to migrate) to `configCommands` in `src/cli/professor.ts`
- [x] T017 [US1] Rewrite `loadSources()` (news sources: `use ∋ news`, mapped by `toCollectorSource`), `loadInterests()` (from `ranking`, `updatedAt` = file mtime date) and `loadSettings()` (from `schedule`) to read `professor.json` in `src/config/load.ts`; remove `sourcesPath()`
- [x] T018 [US1] Make `fp sources check|resolve` operate on `professor.json` news sources; `resolve` writes `channelId` with `updateProfessor('sources', …)`; `check` warns on `unspecified` Extensibility fields, in `src/cli/sources.ts`
- [x] T019 [US1] In `fp save-report` semantic validation, reject draft item domains that are not configured (message lists configured ids) in `src/report/validate.ts`
- [x] T020 [US1] `fp search --domain` accepts any id; error only if the id is neither configured nor present in the index, in `src/cli/history.ts`
- [x] T021 [US1] `fp learn context` lists only sources with `use ∋ lessons` in `src/cli/professor.ts`
- [x] T022 [US1] Run `npm run fp -- config migrate` on the real repo config: verify counts against `config/sources.yml` (38 sources), `interests.yml` (10 priorities), `settings.yml`; commit the migrated `config/professor.json` and `config/legacy/`
- [x] T023 [P] [US1] Update `.claude/skills/daily-report/SKILL.md` (no fixed domain list in description/step 4; "configured domains") and `.claude/skills/news-history/SKILL.md` (`--domain <configured id>`)

**Checkpoint**: US1 works alone — one file drives the news report; YAML no longer read

---

## Phase 4: User Story 2 - Choose what happens when a session starts (Priority: P1)

**Goal**: Session start runs `ask` / ordered actions / nothing, from config.

**Independent Test**: quickstart §5 — `ask` shows one question; `actions` runs review then lesson; `off` does nothing.

- [x] T024 [US2] `fp session-start [--hook]` with ask/actions/off modes and state line in `src/cli/professor.ts`
- [x] T025 [US2] Tests for session-start modes, hook JSON, < 400 chars, invalid config in `tests/unit/professor-cli.test.ts`
- [x] T026 [US2] Router skill `.claude/skills/professor/SKILL.md`
- [x] T027 [US2] Example hook switched to `fp session-start --hook` in `scripts/schedule/claude-settings.example.json`
- [x] T028 [US2] Include `failed scheduled runs` and unread counts test cases (seed a report and a failure) in `tests/unit/professor-cli.test.ts`

**Checkpoint**: US2 works with US1 or alone (baseline config)

---

## Phase 5: User Story 3 - Learn a topic: explanation, teaching, end-of-lesson quiz (Priority: P1)

**Goal**: Lessons at the configured depth with a configured quiz; progress recorded per domain.

**Independent Test**: quickstart §6 — beginner lesson, 3 questions, no early answers, record shows next review.

- [x] T029 [US3] Learning record schema and spaced-repetition store in `src/schemas/learning.ts`, `src/store/learning.ts`
- [x] T030 [US3] `fp learn context|start|record|due|status` in `src/cli/professor.ts`
- [x] T031 [US3] Tests for scheduling, mastery rule, unassessed lessons in `tests/unit/learning.test.ts`
- [x] T032 [US3] Skills `.claude/skills/learn/SKILL.md`, `.claude/skills/review/SKILL.md`, `.claude/skills/english/SKILL.md`, `.claude/skills/research/SKILL.md`
- [x] T033 [US3] `fp transcript <url> [--max]` in `src/cli/professor.ts`
- [x] T034 [US3] Add `prerequisites` and `objectives` (string[], default `[]`) to `LearningEntry` in `src/schemas/learning.ts`; `fp learn start --prerequisites "a; b" --objectives "x; y"` stores them (replace when given) in `src/store/learning.ts` and `src/cli/professor.ts`
- [x] T035 [US3] Test for T034 (fields stored, shown in `learn status --json`) in `tests/unit/professor-cli.test.ts`
- [x] T036 [US3] Update `.claude/skills/learn/SKILL.md` step 2 to pass `--prerequisites`/`--objectives` to `fp learn start`

**Checkpoint**: US3 complete

---

## Phase 6: User Story 4 - Set and change focus (Priority: P2)

**Goal**: Focus set by the user drives ranking and is stated in every report.

**Independent Test**: quickstart §4 — `focus set security backend`, collect, report header shows focus, non-focus items marked, advisories kept.

### Tests for User Story 4

- [x] T037 [US4] Tests for `fp focus set|clear|show`, unknown id rejected, other content preserved in `tests/unit/professor-cli.test.ts`
- [x] T038 [P] [US4] Unit test: ranking with focus `[security, backend]` — focus bonus +4/+3, non-focus items `outsideFocus: true`, advisories never `outsideFocus`, no focus → no flag, in `tests/unit/rank.test.ts`
- [x] T039 [P] [US4] Unit test: `fp save-report` rejects a draft whose `focus` differs from the run's; render shows `Fokus:` header and `(fokusdan kənar)` marker, in `tests/unit/validate.test.ts` and `tests/unit/render-focus.test.ts`

### Implementation for User Story 4

- [x] T040 [US4] `fp focus show|set|clear` in `src/cli/professor.ts`; skill `.claude/skills/focus/SKILL.md`
- [x] T041 [US4] Add `focus: string[]` (default `[]`) and `depthByDomain` to `RunEnvelope`, `outsideFocus?: boolean` to `Candidate` in `src/schemas/candidate.ts`
- [x] T042 [US4] Pass `focus` into `rank()`: focus bonus (first +4, −1 per position, min +1) and `outsideFocus` flag, in `src/pipeline/rank.ts`
- [x] T043 [US4] `collect()` loads focus/depths from `loadProfessor()`, passes focus to `rank`, writes `focus` and `depthByDomain` to the run envelope, in `src/collect/collect.ts`
- [x] T044 [US4] Add `focus` to `ReportDraft`/`Report` and `outsideFocus?` to items in `src/schemas/report.ts`; update `specs/001-daily-news-report/contracts/report-draft.schema.json` and its contract test `tests/contract/report-draft.schema.test.ts`
- [x] T045 [US4] Validate draft `focus` equals run `focus` (missing in old runs → `[]`) in `src/report/validate.ts`
- [x] T046 [US4] Render `Fokus: a, b` (or `Fokus: yoxdur`) in the header and `(fokusdan kənar)` after outside-focus item titles in `src/report/render-md.ts`
- [x] T047 [US4] Update `.claude/skills/daily-report/SKILL.md`: copy `focus` from the run into the draft, set `outsideFocus` from the candidate, prioritize focus items in step 4

**Checkpoint**: US4 works; reports state their focus

---

## Phase 7: User Story 5 - Set learning depth per domain (Priority: P2)

**Goal**: Lessons and news explanations follow each domain's depth.

**Independent Test**: same topic at `beginner` then `expert` gives visibly different depth (quickstart §6.4); a news item is written at its domain's depth.

- [x] T048 [US5] `depth` per domain (default intermediate) in `src/schemas/professor.ts`; printed by `fp learn context`
- [x] T049 [US5] Depth definitions in `.claude/skills/learn/SKILL.md` step 4
- [x] T050 [US5] Render depth line in the report header only when a domain's depth ≠ intermediate (from run `depthByDomain`) in `src/report/render-md.ts`, test in `tests/unit/render-focus.test.ts`
- [x] T051 [US5] Update `.claude/skills/daily-report/SKILL.md` step 6: write `summaryAz`/`implicationsAz` at the depth of the item's first domain using the same four definitions as the `learn` skill

**Checkpoint**: US5 complete

---

## Phase 8: User Story 6 - Clear errors for a broken configuration (Priority: P2)

**Goal**: Every mistake is reported with file, field path and fix hint; missing file is recreated.

**Independent Test**: quickstart §3 — three different errors each reported precisely; nothing runs automatically.

### Tests for User Story 6

- [x] T052 [US6] Tests: unknown domain with "did you mean", invalid JSON exit 1, session-start shows errors, in `tests/unit/professor-cli.test.ts`
- [x] T053 [P] [US6] Error test set (SC-003, ≥ 10 cases: invalid JSON, unknown top-level field, bad id case, duplicate domain id, duplicate source id, bad URL, tier 5, focus unknown id, news use on `docs` kind, quizQuestions 11, bad HH:mm, missing `domains`) — each asserts the field path in output and exit 1, in `tests/unit/config-errors.test.ts`
- [x] T054 [P] [US6] Test: missing `professor.json` and no YAML → default file written and reported; `fp config init` exit 3 when the file exists, in `tests/unit/config-init.test.ts`

### Implementation for User Story 6

- [x] T055 [US6] Report JSON syntax errors with line and column (compute from the position in Node's message) in `src/config/professor.ts`
- [x] T056 [US6] Move the default config to `src/config/default-professor.json` (current `config/professor.json` content); `loadProfessor()` writes it when no config and no YAML exist and prints `created config/professor.json`; add `fp config init` in `src/config/professor.ts` and `src/cli/professor.ts`
- [x] T057 [US6] Implement `fp config schema` (writes `config/professor.schema.json` from `z.toJSONSchema(ProfessorConfig, { io: 'input' })`) in `src/cli/professor.ts`; regenerate the committed file
- [x] T058 [US6] Contract test: committed `config/professor.schema.json` equals generated output, in `tests/contract/professor-schema.test.ts`

**Checkpoint**: US6 complete

---

## Phase 9: User Story 7 - Professor identity without "Frontend" (Priority: P3)

**Goal**: No user-visible "Frontend Professor"; one scheduled task under the new name.

**Independent Test**: quickstart §8 — `git grep` finds no current references; only `Professor-DailyReport` exists after `schedule enable`.

- [x] T059 [P] [US7] Test: `enable` deletes `FrontendProfessor-DailyReport` (ignores "not found") before creating `Professor-DailyReport`; `disable` deletes both; `status` reports a leftover legacy task — in `tests/unit/schedule.test.ts`
- [x] T060 [US7] `TASK_NAME = 'Professor-DailyReport'`, `LEGACY_TASK_NAMES`, cleanup in enable/disable/status, description text in `src/schedule/schtasks.ts`
- [x] T061 [US7] `fp schedule enable|disable` write `schedule` via `updateProfessor` instead of YAML `parseDocument` in `src/cli/schedule.ts`
- [x] T062 [P] [US7] User agent `professor/0.2 (personal learning companion)` in `src/lib/http.ts`; update `tests/unit/http.test.ts` if it asserts the string
- [x] T063 [P] [US7] Header text "Professor: …" in `src/cli/unread.ts` and `tests/unit/unread.test.ts`
- [x] T064 [P] [US7] `package.json` name `professor`, description "Personal multi-domain researcher and mentor: lessons, reviews, verified daily news"; run `npm install` to refresh `package-lock.json`
- [x] T065 [P] [US7] Replace remaining "Frontend Professor" in `README.md` (schedule section task name, `config/` section: YAML files → `config/legacy/`) and `scripts/schedule/run-scheduled.ps1` comments

**Checkpoint**: US7 complete

---

## Phase 10: Polish & Cross-Cutting Concerns

- [x] T066 [P] Update `specs/001-daily-news-report/contracts/config.md` with a note pointing to `specs/002-professor-json-config/data-model.md` (configuration moved)
- [x] T067 Remove `yaml` usage except in `src/config/migrate.ts` and legacy schemas; keep the dependency for migration (also kept in `src/config/professor.ts` to locate JSON syntax errors Node reports without a position)
- [x] T068 Run `npm test` and `npm run typecheck` (SC-007)
- [x] T069 Run quickstart.md §2–§8 and record results (below, "Validation 2026-10-31"; checklist files are reviewer-owned and were not edited)
- [x] T070 `git grep -n "Frontend Professor"` outside history files (SC-008) returns nothing (only the legacy task name kept for cleanup in `src/schedule/schtasks.ts`, its tests and README)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → user stories → **Polish (10)**
- T005 (DomainId) and T006 (schema) block everything that reads sources or reports

### User Story Dependencies

- **US1 (P1)**: after Phase 2. Provides news sources/ranking/schedule from JSON.
- **US2 (P1)**: baseline done; T028 independent.
- **US3 (P1)**: baseline done; T034–T036 independent.
- **US4 (P2)**: after Phase 2; T043 uses `loadProfessor()` only, so it does not need US1, but run end-to-end after US1 (T017) for real news sources.
- **US5 (P2)**: T050 needs T041 (`depthByDomain`) from US4.
- **US6 (P2)**: after Phase 2; T056 interacts with T015 (auto-migrate before default creation) — do T015 first.
- **US7 (P3)**: T061 needs T006 (`schedule` in schema) and T017 (`loadSettings` from JSON).

### Within Each User Story

- Tests first, failing; then schemas → store/config → CLI → skills.

### Parallel Opportunities

- T003, T004 · T008 alongside T007 · T011–T013 · T023 alongside T014–T022 · T038, T039 · T053, T054 · T059, T062–T065 · T066

---

## Parallel Example: User Story 1

```bash
Task: "Integration test for fp config migrate in tests/integration/config-migrate.test.ts"
Task: "Integration test for fp collect from professor.json in tests/integration/collect-professor.test.ts"
Task: "Unit test for dynamic domains in tests/unit/domains-dynamic.test.ts"
Task: "Update daily-report and news-history skills (no fixed domain list)"
```

## Parallel Example: User Story 7

```bash
Task: "Schedule legacy-task tests in tests/unit/schedule.test.ts"
Task: "User agent in src/lib/http.ts"
Task: "unread header in src/cli/unread.ts"
Task: "package.json rename"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2 (domains as data, full schema)
2. Phase 3 (US1): one file drives everything, YAML migrated
3. **Validate**: quickstart §2–§3, `npm test`
4. US2 and US3 are already usable from the baseline

### Incremental Delivery

1. US1 → MVP
2. US4 + US5 → focus and depth reach the news report
3. US6 → hardened errors, generated schema
4. US7 → rename
5. Polish

---

## Notes

- `[x]` tasks were delivered in the baseline slice and are covered by passing tests
- Commit after each phase; never run `fp config migrate` on the real config before T011 passes
- `updateProfessor` is the only writer of the user's file (FR-007)

## Validation 2026-10-31

- Automated: 28 test files, 164 tests pass; typecheck clean.
- §2 Migration on the real config: 38 sources, 10 priority technologies, 0 ignored topics,
  schedule migrated; YAML moved to `config/legacy/`; `config check` → 5 domains, 47 sources.
- §3 (temp copy): new domain + `youtube-video` source → ok; typo `beckend` → field path + "did you
  mean"; broken JSON → session-start shows the error with line/column and no action instruction.
- §4 (temp copy): `focus set security backend` ok; unknown id rejected, file unchanged;
  session-start states the focus. `fp collect` + `/daily-report` with focus not run (network).
- §6 CLI part (temp copy): start → record 3/3 → next review +3 days → listed by `learn due`.
- Not run here (interactive or system-changing): §5 session start in a new Claude Code session
  (needs `.claude/settings.json` hook), §6/§7 lessons and English in chat, §8 `schedule enable`
  (creates a real Windows task).
