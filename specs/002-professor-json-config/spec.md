# Feature Specification: User-Editable Professor Configuration

**Feature Branch**: `002-professor-json-config`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "User-editable JSON configuration that drives the Professor
(constitution v2.0.0, Principle IX User-Directed Focus). One hand-editable JSON config file
replaces the hardcoded domain list and the current YAML configs. In it the user can define domains
freely, set the active focus, list learning sources per domain (feeds, websites, GitHub, YouTube
channels, individual YouTube videos and playlists), set learning depth per domain, configure what
happens when a session starts (news report, lesson with teaching and an end-of-lesson quiz,
review of due topics, or ask), configure lesson and quiz settings, and the daily-report schedule.
Config is validated on load with clear errors. Lessons record learning progress per domain.
Remaining 'Frontend Professor' strings are renamed. The existing daily news report keeps working
from the new config."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define domains and sources in one hand-editable file (Priority: P1)

The user opens a single JSON configuration file and, by hand, declares the domains they want the
Professor to know (any field, e.g. "backend", "system design", "music theory"), and for each
domain the sources to learn from: blog and news feeds, websites, GitHub repositories, YouTube
channels, and specific YouTube videos or playlists. Each source carries a trust tier. The editor
offers autocomplete and inline validation for the file. The daily news report then collects only
from these sources and labels items with these domains.

**Why this priority**: without user-defined domains and sources, nothing else (focus, depth,
lessons) has anything to act on. It also removes the hardcoded four-domain limit, which the
constitution (v2.0.0, Extensibility and Principle IX) now forbids.

**Independent Test**: add a new domain with two sources (one feed, one YouTube video) to the
file, run the daily report, and confirm the new domain and its items appear; remove a default
domain and confirm it no longer appears anywhere.

**Acceptance Scenarios**:

1. **Given** a configuration file with a new domain "backend" and a feed source assigned to it,
   **When** the user requests the daily report, **Then** items from that feed appear labeled
   "backend".
2. **Given** a source entry that is an individual YouTube video link, **When** the Professor
   collects or teaches, **Then** that video is used as a learning source, and if its transcript
   cannot be accessed the output says so instead of claiming to have analyzed it.
3. **Given** the user removes the "frontend" domain, **When** any report, lesson or history search
   runs, **Then** "frontend" is not offered as a domain and sources that referenced only it are
   reported as invalid configuration.
4. **Given** an existing installation using the previous configuration files, **When** the new
   version runs for the first time, **Then** the user's existing domains, sources, ranking
   preferences and schedule are carried into the new file without loss, and the old files are no
   longer read.

---

### User Story 2 - Choose what happens when a session starts (Priority: P1)

The user sets, in the configuration file, what the Professor does automatically when a new
session starts: show the news report, start or continue a lesson, run a review of topics that are
due, or ask the user which of these to do. Each action can be switched on or off and ordered.

**Why this priority**: this is the user's main daily touchpoint; it decides whether the Professor
acts as a news digest or as a teacher on any given day.

**Independent Test**: set session start to "lesson" only, start a new session, and confirm a
lesson begins and no news report is shown; switch to "ask" and confirm the user is offered the
enabled choices.

**Acceptance Scenarios**:

1. **Given** session start is configured as `[news]`, **When** a session starts, **Then** unread
   or today's report is shown, as today.
2. **Given** session start is configured as `[review, lesson]`, **When** a session starts and
   topics are due for review, **Then** the review runs first, then a lesson is offered.
3. **Given** session start is configured as `ask`, **When** a session starts, **Then** the user is
   shown the enabled actions and nothing runs until they choose.
4. **Given** all session-start actions are disabled, **When** a session starts, **Then** the
   Professor does nothing automatically.

---

### User Story 3 - Learn a topic: explanation, teaching, end-of-lesson quiz (Priority: P1)

The user starts (or the session start triggers) a lesson. The Professor picks the next topic in
the active focus, from the user's own topic list for that domain if present, otherwise derived
from the configured sources. It explains the topic at the configured depth, following the
constitution's Teaching Protocol, gives an exercise, and at the end asks the configured number
and types of questions. It evaluates the user's answers, corrects misconceptions, and records
the result in the learning record for that domain.

**Why this priority**: teaching is the core purpose of the Professor; news alone does not build
competence.

**Independent Test**: with a domain at depth "beginner" and quiz size 3, run a lesson, answer the
questions, and confirm: the explanation matches beginner depth, exactly 3 questions of the
configured types are asked, answers are not revealed before the attempt, and the learning record
shows the topic, the result and a next review date.

**Acceptance Scenarios**:

1. **Given** domain "system-design" with depth "advanced", **When** a lesson is given, **Then**
   it covers implementation details, trade-offs and edge cases appropriate to advanced depth, and
   states the depth and focus it was produced for.
2. **Given** quiz settings of 4 questions of types conceptual and debugging, **When** the lesson
   ends, **Then** 4 questions are asked, drawn only from those types.
3. **Given** "reveal answers only after attempt" is on, **When** the user has not answered,
   **Then** the answer is not shown unless the user explicitly asks for it.
4. **Given** the user answered the quiz, **When** the lesson completes, **Then** the learning
   record for that domain stores the topic, questions, outcome, identified misconceptions,
   evidence-based confidence and the next review date; a single correct answer is not recorded as
   mastery.
5. **Given** an unfinished lesson from a previous session, **When** a lesson is started, **Then**
   the Professor offers to continue it.

---

### User Story 4 - Set and change focus (Priority: P2)

The user sets the active focus (an ordered list of domains) either by editing the file or with a
command or chat skill (set, show, clear). Reports, ranking, lessons and source selection follow
the focus. The Professor never changes the focus itself; it may suggest a change.

**Why this priority**: required by constitution Principle IX, but the file-edit path already
covers the need, so the command is a convenience.

**Independent Test**: set focus to `[security, backend]` via the command, confirm the file now
contains it, run the report and a lesson, and confirm both prioritize those domains and state the
focus.

**Acceptance Scenarios**:

1. **Given** focus `[security, backend]`, **When** the daily report is generated, **Then** items
   from those domains rank first, items outside the focus are marked as outside the focus, and
   security advisories for configured technologies are always kept.
2. **Given** no focus is set, **When** a report or lesson is produced, **Then** all configured
   domains are treated equally.
3. **Given** the user runs "focus set" with a domain id that is not configured, **When** the
   command runs, **Then** it is rejected, the valid ids are listed, and the file is not changed.
4. **Given** the user edits the file by hand, **When** "focus set" later writes the file, **Then**
   the user's other hand edits are preserved.

---

### User Story 5 - Set learning depth per domain (Priority: P2)

For each domain the user sets the depth: beginner, intermediate, advanced or expert. Lessons and
news explanations in that domain are written at that depth.

**Why this priority**: personalization (Principle V) depends on it, but sensible defaults make
the feature usable without it.

**Independent Test**: set the same topic's domain to beginner, run a lesson, then to expert, run
again, and confirm the second lesson skips basics and goes into detail.

**Acceptance Scenarios**:

1. **Given** depth "beginner", **When** a news item in that domain is explained, **Then** the
   explanation defines key terms and avoids assuming prior knowledge.
2. **Given** no depth is set for a domain, **When** content is produced, **Then** the default
   depth "intermediate" is used.
3. **Given** the configured depth differs from the depth the learning record evidences, **When**
   a lesson starts, **Then** the Professor follows the configured depth and may suggest a change,
   but does not change the setting itself.

---

### User Story 6 - Clear errors for a broken configuration (Priority: P2)

When the user makes a mistake in the file (invalid JSON, unknown field, wrong value, a source
pointing at a domain that does not exist), the Professor tells them exactly where and what is
wrong, instead of failing silently or behaving unexpectedly.

**Why this priority**: the file is edited by hand, so mistakes are expected.

**Independent Test**: introduce three different errors and start a session; confirm each is
reported with file, field path and a fix hint, and that nothing runs on partially valid config.

**Acceptance Scenarios**:

1. **Given** the file contains invalid JSON, **When** a session starts or any command runs,
   **Then** the user sees the file path, line and column of the error and the session continues
   without running automatic actions.
2. **Given** a source references domain "beckend" (typo), **When** the config is loaded, **Then**
   the error names the field path and suggests the closest configured domain id.
3. **Given** the file is missing, **When** the Professor starts, **Then** it creates the file with
   the default domains and settings, and tells the user where it is.

---

### User Story 7 - Professor identity without "Frontend" (Priority: P3)

All user-visible names (documentation, chat skill descriptions, scheduled task name, network user
agent, chat output headers) refer to the Professor without "Frontend".

**Why this priority**: cosmetic, but required for consistency with the constitution v2.0.0.

**Independent Test**: search all user-visible output and documentation for "Frontend Professor";
none remain except in history (changelog, past reports, constitution history).

**Acceptance Scenarios**:

1. **Given** a daily schedule was enabled under the old task name, **When** the user upgrades and
   re-enables or the Professor migrates the schedule, **Then** exactly one scheduled task exists,
   under the new name.

### Edge Cases

- A domain listed in the focus is later deleted from the file: the config is reported invalid,
  pointing at the focus entry.
- Two sources share the same identifier, or two domains share an id: reported as an error.
- A YouTube link is a playlist with many videos: lessons use it in order; the report treats new
  videos only.
- A source URL is unreachable: marked unavailable for that run; other sources continue (existing
  behavior).
- Content fetched from configured sources contains instructions (e.g. a transcript saying "ignore
  your rules"): treated as untrusted data and never followed.
- Quiz size set to 0: lesson ends without questions but still records the lesson as not assessed;
  it is never counted as mastery.
- The user answers only some quiz questions or leaves mid-lesson: progress so far is saved and the
  lesson can be continued.
- The configuration file is edited while a session is running: changes apply from the next
  command or session; the running lesson is not altered mid-way.
- A non-software domain (e.g. "history"): GitHub-specific or code-question settings do not apply;
  code and debugging question types are skipped for that domain with a note.
- Stored past reports reference a domain that has since been removed: history stays readable and
  searchable under the old domain id.

## Requirements *(mandatory)*

### Functional Requirements

**Configuration file**

- **FR-001**: The system MUST read all user settings from one hand-editable JSON configuration
  file in the project.
- **FR-002**: The system MUST provide a machine-readable schema for that file, referenced from the
  file itself, so that common editors offer autocomplete, field descriptions and validation.
- **FR-003**: The system MUST validate the file on every load and report each problem with the
  file path, the field path, the problem, and when possible a suggested fix (e.g. closest valid
  id).
- **FR-004**: If the file is invalid, the system MUST NOT run any automatic session-start action
  or scheduled action, and MUST show the validation errors instead; manual help commands MUST
  still work.
- **FR-005**: If the file does not exist, the system MUST create it with the default domains and
  settings defined by the constitution's seed list and the current defaults, and tell the user.
- **FR-006**: On first run after upgrade, the system MUST migrate existing domains, sources,
  ranking preferences, ignored topics and schedule settings from the previous configuration
  files into the new file without loss, and then stop reading the previous files.
- **FR-007**: Writes made by the system (focus command, migration) MUST preserve all other content
  the user has written in the file.

**Domains**

- **FR-008**: Users MUST be able to add, edit and remove domains in the file. Each domain MUST
  have a unique id, a name and a description, and MAY have priority topics, ignored topics, a
  depth, and an ordered topic list (curriculum).
- **FR-009**: The system MUST NOT contain a fixed set of domains anywhere outside the
  configuration's defaults; every place that lists, filters or labels domains MUST use the
  configured domains.

**Sources**

- **FR-010**: Users MUST be able to list sources per domain of these kinds: feed (RSS/Atom), web
  page, GitHub (repository releases or security advisories), community discovery feed, YouTube
  channel, YouTube video, YouTube playlist.
- **FR-011**: Each source MUST declare id, kind, address, tier (1–4), the domains it serves, and
  MAY declare the constitution's integration fields (purpose, update frequency, reliability,
  limitations, failure behavior); missing optional fields get documented defaults.
- **FR-012**: Sources MAY be marked as used for news, for lessons, or both; the default is both.
- **FR-013**: All content retrieved from configured sources MUST be treated as untrusted data and
  MUST NOT change system behavior, configuration, or the focus.

**Focus**

- **FR-014**: The file MUST hold the active focus as an ordered list of configured domain ids;
  earlier entries weigh more. An empty list means no focus.
- **FR-015**: Users MUST be able to show, set and clear the focus by command and by chat skill;
  setting validates every id and rejects unknown ones without changing the file.
- **FR-016**: The system MUST NOT change domains, focus or depth on its own; it MAY suggest a
  change with its evidence.
- **FR-017**: Reports, ranking, lessons and source selection MUST prioritize the focus; items
  outside the focus MAY appear only when marked as outside the focus; security advisories for
  configured technologies MUST always be kept. Every report and lesson MUST state the focus and
  depth it was produced for.

**Depth**

- **FR-018**: Users MUST be able to set a depth per domain: beginner, intermediate, advanced or
  expert; the default is intermediate.
- **FR-019**: Lessons and news explanations MUST be written at the domain's configured depth;
  each depth level MUST have a documented definition of what it includes and excludes.

**Session start**

- **FR-020**: Users MUST be able to configure session-start behavior as either an ordered list of
  actions to run, or "ask". Available actions: news (show unread or today's report), lesson
  (start or continue a lesson), review (run due spaced-repetition reviews). Each action MUST be
  individually enableable.
- **FR-021**: In "ask" mode the system MUST present only the enabled actions and run nothing until
  the user chooses.
- **FR-022**: Actions whose preconditions are not met (no due reviews, no unread report) MUST be
  skipped with a one-line note, and the next action MUST run.

**Lessons and quiz**

- **FR-023**: A lesson MUST select the next topic for the highest-priority focus domain that has
  material: first from that domain's curriculum (next unfinished topic), otherwise proposed from
  the domain's lesson sources and learning record, and MUST state which source(s) it is based on
  with links and dates.
- **FR-024**: A lesson MUST follow the constitution's Teaching Protocol (prerequisites and
  objectives, explanation, mental model, example, details and edge cases, trade-offs, exercise,
  evaluation, correction, record and next step).
- **FR-025**: At the end of each lesson the system MUST ask the configured number of questions
  (default 3, allowed 0–10), using only the configured question types (conceptual, code reading,
  debugging, implementation, comparison); types that do not fit the domain MUST be skipped with a
  note.
- **FR-026**: When "reveal answers only after attempt" is on (default on), answers MUST NOT be
  shown before the user attempts them unless the user explicitly asks.
- **FR-027**: The system MUST evaluate each answer, explain mistakes and correct misconceptions.
- **FR-028**: Output language MUST be configurable; the default is Azerbaijani with technical
  terms and titles kept in English.

**Learning record and review**

- **FR-029**: The system MUST keep a learning record per domain and topic with the fields the
  constitution requires (prerequisites, objectives, exercises attempted, assessment results,
  strengths, unresolved misconceptions, evidence-based confidence, last review date, next review
  date).
- **FR-030**: Mastery MUST require repeated, varied successful assessments across at least two
  sessions; a single quiz MUST NOT mark a topic as mastered.
- **FR-031**: The system MUST schedule next reviews with increasing intervals after successful
  reviews and shorter intervals after failures, and the review action MUST quiz the user on due
  topics.
- **FR-032**: An interrupted lesson or review MUST be saved and offered for continuation.

**Schedule and existing report**

- **FR-033**: The daily-report schedule (enabled, time, time zone) MUST be configured in the same
  file; enabling it MUST still require an explicit user command that creates a real scheduled
  task.
- **FR-034**: The existing daily news report (feature 001) MUST keep all its behavior and
  guarantees, reading domains, sources and ranking preferences from the new file.
- **FR-035**: Stored reports and history MUST remain readable and searchable, including items
  labeled with domains that no longer exist.

**Identity**

- **FR-036**: User-visible names (documentation, skill descriptions, scheduled task name, network
  user agent, chat headers) MUST NOT say "Frontend Professor"; an existing scheduled task under
  the old name MUST be replaced, not duplicated.

**Ask-first, help, language learning, token economy** (added 2026-10-31)

- **FR-037**: The default session-start mode MUST be "ask": the Professor asks what the user wants
  (lesson, review, news, a language practice, or any free request) before doing anything.
- **FR-038**: For a free request (question or task) the Professor MUST answer from the configured
  sources first and use additional sources only as the configuration allows (never / ask once /
  always), citing links and dates for current or version-specific claims.
- **FR-039**: A domain MAY be a language (e.g. English) with a CEFR level; for it the Professor
  MUST offer mini lessons, writing correction, translation and conversation practice, explain in
  the configured output language, use language question types, and record recurring errors as
  misconceptions.
- **FR-040**: Token economy: per-turn context needed by the Professor MUST come from compact
  command output rather than full files; the number of pages read per answer MUST be bounded by a
  configurable limit (default 3); the lesson style MUST be configurable (concise default); the
  session-start context MUST stay under a few lines.

### Key Entities

- **Configuration**: the single user-edited document; contains domains, sources, focus, session
  start, lesson settings, language, schedule.
- **Domain**: a field of knowledge chosen by the user; id, name, description, depth, priority
  topics, ignored topics, optional curriculum.
- **Source**: a place to learn or collect news from; id, kind, address, tier, domains, usage
  (news, lessons, both), integration metadata.
- **Focus**: ordered list of domain ids the user wants prioritized.
- **Session-start policy**: ordered actions with on/off flags, or "ask".
- **Lesson settings**: quiz size, question types, reveal policy, language.
- **Lesson**: one teaching session on a topic in a domain at a depth; sources used, exercise,
  questions, answers, evaluation, state (in progress, completed).
- **Learning record entry**: per domain and topic; the constitution's required fields plus review
  schedule.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The user can add a new domain with at least one source and see it in the next
  report or lesson in under 5 minutes, without changing any program code.
- **SC-002**: 100% of the previous configuration's domains, sources, preferences and schedule are
  present in the new file after migration.
- **SC-003**: For every invalid configuration in a test set of at least 10 common mistakes, the
  user is shown the field path and problem; none results in a silent failure or a partially
  applied configuration.
- **SC-004**: Session start performs exactly the configured actions in the configured order in
  100% of test runs, and performs nothing when all actions are disabled.
- **SC-005**: Every lesson ends with exactly the configured number of questions of the configured
  types (or a note for skipped types), and no answer is revealed before an attempt unless
  requested.
- **SC-006**: After a completed lesson, the learning record contains the topic, outcome and next
  review date in 100% of cases.
- **SC-007**: All existing daily-report behaviors and tests continue to pass after the change.
- **SC-008**: No user-visible output or current documentation contains "Frontend Professor".
- **SC-009**: The system never changes focus, domains or depth without an explicit user action
  across all test scenarios.

## Assumptions

- Single user on one Windows machine, as in feature 001; no multi-user or sync needs.
- JSON is the chosen format because the user asked for it; comments are not required, so field
  descriptions come from the schema in the editor.
- "Session start" means the start of a Claude Code session in this project, using the existing
  session-start mechanism (today it shows unread reports); the user still opts into that mechanism
  once, as today.
- Lessons and quizzes happen in Claude Code chat; there is no separate UI.
- If a domain has no curriculum, topics are proposed from its lesson sources and learning record;
  the user can accept, skip, or add the topic to the curriculum.
- Depth levels are four fixed values (beginner, intermediate, advanced, expert); finer control is
  out of scope for v1.
- Spaced-repetition intervals use a simple increasing schedule (e.g. 1, 3, 7, 14, 30 days); an
  advanced algorithm is out of scope.
- Weekly reports and new collection adapters beyond the listed source kinds are out of scope; a
  YouTube playlist reuses the existing YouTube collection capability.
- Secrets (e.g. GitHub token) stay in environment variables, never in the configuration file.
