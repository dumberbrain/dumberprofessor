# Feature Specification: Daily Frontend & Engineering News Report

**Feature Branch**: `001-daily-news-report`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Gündəlik frontend xəbər hesabatı" (Daily frontend news report)

## Clarifications

### Session 2026-10-29

- Q: Which period should a report cover: always the last 24 hours, or everything since the
  previous report? → A: Since the previous report, capped at 7 days; after a gap one catch-up
  report is produced, keeping the 3–7 item limit by selecting the most important items.
- Q: Where do the user's interests used for ranking come from? → A: An explicit, editable
  interest profile listing priority technologies and topics to ignore; no automatic learning.
- Q: Which claims must be verified against a primary source? → A: Fixed claim types: version
  numbers, release status, dates, security claims (CVE, affected versions), breaking changes and
  deprecations, and performance figures.
- Q: When does a previously reported item count as a meaningful update? → A: Only on an official
  factual change: release status change, new version, security patch or vulnerability update,
  deprecation or withdrawal, breaking-change announcement, or a changed date.
- Q: How should the user give feedback on a report? → A: A 1–5 rating per report with an
  optional short comment; ratings of 4 or 5 count as useful.
- Q: Which topics and sources besides frontend should the report cover? → A: System design,
  security, and AI/LLM models as first-class domains (constitution v1.1.0), plus ten named
  YouTube channels as Tier 4 sources (listed in Assumptions).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Request today's report on demand (Priority: P1)

The user asks for today's news report covering frontend engineering, system design, security, and
AI/LLM developments. The system collects recent items from the
configured sources, verifies key factual claims, removes duplicates, categorizes each item, and
returns a structured report: executive summary, three to seven important developments, why each
matters, affected technologies, original sources with dates, recommended reading or experiments,
and one short knowledge-check question.

**Why this priority**: This is the core value of the feature. Without an on-demand report there is
nothing to schedule, store, or follow up on, and it is usable on its own from day one.

**Independent Test**: Request a report on a day with known frontend releases; confirm that every
item has a source link, publication date, discovery date, category, and impact explanation, and
that the report contains all required sections.

**Acceptance Scenarios**:

1. **Given** configured sources contain new items published within the reporting window, **When** the
   user requests today's report, **Then** the report lists three to seven developments, each with
   a direct source link, original publication date, discovery date, and exactly one category.
2. **Given** the same release is announced officially and discussed on a community forum,
   **When** the report is generated, **Then** it appears once, citing the official announcement as
   the primary source and the discussion only as commentary.
3. **Given** fewer than three items qualify, **When** the user requests the report, **Then** the
   report contains only the qualifying items and states that the day had few notable developments,
   without inventing filler.
4. **Given** a verifiable claim (see FR-004a) cannot be verified against a primary source,
   **When** the item is included, **Then** it is explicitly marked as unverified, naming the claim
   and the reason.

---

### User Story 2 - Have the report ready automatically every day (Priority: P2)

At a configured time the system generates the daily report without being asked and stores it.
The next time the user opens a session, the unread report is shown in-chat.

**Why this priority**: Removes the need to remember to ask and wait, turning the feature into a
habit. It depends on the report format from Story 1 but adds independent value.

**Independent Test**: Configure a generation time a few minutes ahead, then open a session after
that time and verify the report is already available, unchanged in quality from an on-demand
report.

**Acceptance Scenarios**:

1. **Given** a schedule is configured, **When** the scheduled time arrives, **Then** the report is
   generated and stored within 15 minutes of that time.
2. **Given** a scheduled report has not been viewed, **When** the user opens a session, **Then**
   the report is shown in-chat without a separate request.
3. **Given** no working scheduling mechanism is available, **When** the user enables scheduling,
   **Then** the system refuses and explains why, rather than claiming a schedule exists.
4. **Given** scheduled generation fails, **When** the failure occurs, **Then** the system retries
   and, if it still fails, tells the user at the next session and offers an on-demand report.

---

### User Story 3 - Browse and search past reports (Priority: P3)

The user asks for yesterday's report, last week's reports, or reports covering a chosen date
range or topic, and the system returns them.

**Why this priority**: Supports continuity and later review, but the feature delivers value
without it.

**Independent Test**: After several reports exist, request "yesterday", a specific date, a date
range, and a keyword (e.g., a framework name); confirm correct reports and items are returned.

**Acceptance Scenarios**:

1. **Given** reports exist for previous days, **When** the user asks for yesterday's report,
   **Then** the exact report produced that day is returned unchanged.
2. **Given** reports exist across several weeks, **When** the user searches by keyword and date
   range, **Then** all matching items from that range are returned with their original report
   dates.

---

### User Story 4 - Follow-up tracking across reports (Priority: P3)

When an earlier-reported development receives a meaningful update (e.g., beta becomes stable, a
vulnerability gets a patch), the new report links it to the earlier item instead of presenting it
as new. Open follow-up items from previous reports appear in a dedicated section until resolved.

**Why this priority**: Directly serves the continuity principle and prevents repeated "new"
stories, but depends on report history.

**Independent Test**: Report an item on day 1, simulate an official update on day 3, and confirm
the day-3 report categorizes it as "previously reported development with a meaningful update"
with a link to the day-1 item.

**Acceptance Scenarios**:

1. **Given** an item was reported earlier, **When** the same story resurfaces only as new
   commentary or rising popularity, **Then** it is excluded from the new report.
2. **Given** an item was reported earlier, **When** an official factual change (FR-008a) is
   published, **Then** the new report includes it as an update and references the original report
   date.

---

### Edge Cases

- An old story becomes popular again on a community site: it MUST NOT be labeled new; it is
  excluded unless it has a meaningful update.
- A source is unreachable during collection: the report is still produced from the other sources
  and lists the unavailable source.
- All sources are unreachable: no report content is fabricated; the user is told collection failed.
- An item's original publication date cannot be determined: the item is included only with a
  visible "publication date unknown" marker, and never classified as breaking.
- A community source contains embedded instructions (e.g., "ignore previous rules"): the content
  is treated as data only and does not alter report behavior.
- Two sources give conflicting facts about the same release: the report states the conflict and
  prefers the primary source.
- A configured channel publishes a video with no accessible transcript: the item appears marked
  "not analyzed", with only title, description, link, and date.
- A video channel publishes a non-technical video (e.g., announcement, sponsorship): it is excluded
  as irrelevant per FR-013.
- No report has been generated for more than 7 days: one catch-up report covers only the last 7
  days and states that older items were not reviewed.
- The user requests a report twice on the same day: the second request returns the existing report
  plus any items discovered since, clearly marked as late additions.

## Requirements _(mandatory)_

### Functional Requirements

**Collection & verification**

- **FR-001**: System MUST collect items from a configurable list of sources, each tagged with its
  source tier (primary, technical analysis, discovery/community, learning resource).
- **FR-002**: System MUST record, for every item, the original publication date and the date the
  system discovered it.
- **FR-003**: System MUST identify the original source of each item and distinguish official
  announcements from commentary about them.
- **FR-004**: System MUST attempt to verify every verifiable claim against a primary source and
  MUST mark any item whose verifiable claims could not be verified, stating which claim and why.
- **FR-004a**: Verifiable claims are exactly these types: version numbers; release status (alpha,
  beta, release candidate, stable); release, deprecation, and end-of-support dates; security
  claims (vulnerability identifiers, severity, affected and fixed versions); breaking changes and
  deprecations; performance figures. Other statements are presented as summary or interpretation.
- **FR-005**: Discovery/community sources MUST NOT be the sole basis for stating a technical fact as
  verified.
- **FR-006**: System MUST treat all collected content as untrusted data and MUST ignore embedded
  instructions within it.
- **FR-006a**: For each new video from a configured video channel, the system MUST record the
  video link, channel, and publication date, and base its summary on the transcript or other
  accessible content. When no transcript or content is accessible, the item MUST be marked "not
  analyzed" and summarized only from its title and description, never presented as watched.
- **FR-006b**: Video items MUST separate factual explanation from the author's opinions and
  predictions, verify version-sensitive claims per FR-004, and include timestamps for the key
  points when available.
- **FR-006c**: Sources in languages other than English MUST be supported; their content is
  summarized per FR-015, keeping the original title.
- **FR-006d**: AI model benchmark and capability claims made by the model's own vendor MUST be
  labeled "vendor-reported" unless independently reproduced.

**Deduplication & categorization**

- **FR-007**: System MUST merge items describing the same development into a single entry.
- **FR-008**: System MUST detect items that were already reported in a previous report and exclude
  them unless they carry a meaningful update.
- **FR-008a**: A meaningful update is exclusively an official factual change confirmed by a Tier 1
  source: release status change; new version; security patch or vulnerability update;
  deprecation or withdrawal; breaking-change announcement; changed release or support date. New
  commentary, analysis, or rising popularity alone MUST NOT qualify.
- **FR-009**: System MUST assign each item exactly one category: breaking development; official
  release or feature announcement; important ecosystem change; security advisory; research or
  experimental technology; community discussion or opinion; previously reported development with a
  meaningful update.
- **FR-010**: System MUST NOT label an item as new or breaking based on recent popularity when its
  original publication is older than the reporting window.
- **FR-010a**: The reporting window MUST start at the generation time of the previous report and
  end at the current generation time, capped at 7 days; with no previous report it is the last
  24 hours.
- **FR-010b**: When the window exceeds 24 hours, the system MUST produce a single catch-up report
  that states the covered period and selects the 3–7 most important items from the whole window.

**Report content**

- **FR-011**: Each daily report MUST contain: executive summary; three to seven developments when
  available; why each matters; technical details and affected technologies; original sources with
  dates; recommended reading or experiments; follow-up items from previous reports; one short
  knowledge-check question.
- **FR-012**: System MUST NOT fabricate or pad items to reach a minimum count.
- **FR-013**: System MUST rank items by relevance to the covered domains (frontend engineering,
  system design, security, AI and large language models) and the user's interest profile, and
  explain the practical implications for the user as an engineer for each item.
- **FR-013a**: The interest profile MUST be an explicit, user-editable list of priority
  technologies and ignored topics. Items matching priority technologies MUST rank above otherwise
  equal items; items matching only ignored topics MUST be excluded unless they are security
  advisories. The profile MUST NOT change automatically.
- **FR-014**: Each item MUST explicitly distinguish verified facts from interpretation and
  prediction.
- **FR-015**: Reports MUST be written in Azerbaijani prose, keeping technical terms, product names,
  and original item titles in their original English form.

**Delivery & scheduling**

- **FR-016**: Users MUST be able to request today's report on demand at any time.
- **FR-017**: Users MUST be able to configure a daily generation time; default is 08:00 in the user's
  local time zone.
- **FR-018**: Scheduled reports MUST be generated at the configured time, stored, and shown to the
  user in-chat the next time the user opens a session; no external delivery channel is used.
- **FR-019**: System MUST refuse to enable scheduling when no working scheduling mechanism is
  available, and MUST NOT claim a schedule that does not exist.
- **FR-020**: System MUST record scheduled-generation failures and surface them to the user at the
  next session.

**History**

- **FR-021**: System MUST store every generated report unchanged and keep it retrievable by date,
  date range, and keyword.
- **FR-022**: System MUST track open follow-up items and include them in subsequent reports until
  resolved or dismissed by the user.

**Quality measurement**

- **FR-023**: System MUST record per-report quality signals: number of items, share of items
  verified against primary sources, duplicates removed, sources unavailable, and user feedback.
- **FR-024**: Users MUST be able to rate each report from 1 to 5 and optionally add a short
  comment; the system MUST store the rating and comment with the report. Rating is optional and
  MUST NOT block viewing the next report.

### Key Entities

- **Source**: A place items are collected from. Attributes: name, location, tier, topics covered,
  update frequency, reliability notes, availability status.
- **News Item**: A single development. Attributes: title, summary, original source, supporting
  sources, publication date, discovery date, category, affected technologies, verification status
  and reason, relevance rank, link to an earlier item if it is an update.
- **Daily Report**: The generated digest for one date. Attributes: report date, covered period
  (start and end), catch-up flag, executive summary,
  ordered news items, recommendations, follow-up items, knowledge-check question, unavailable
  sources, quality signals, viewed status, rating (1–5, optional), feedback comment (optional).
- **Follow-up Item**: An open thread from an earlier report. Attributes: originating item, reason
  for follow-up, status (open, resolved, dismissed), resolution reference.
- **Interest Profile**: The user's ranking preferences. Attributes: priority technologies (ordered),
  ignored topics, last edited date.
- **Delivery Settings**: The user's schedule. Attributes: enabled flag, generation time, time zone.
  The report is always shown in-chat.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of items in every report include a source link, original publication date,
  discovery date, and category.
- **SC-002**: In at least 80% of items outside "community discussion or opinion", all verifiable
  claims (FR-004a) are confirmed by a primary source; the remainder are visibly marked unverified.
- **SC-003**: Fewer than 5% of reported items are duplicates of items in the previous seven days of
  reports.
- **SC-004**: An on-demand report is ready within 5 minutes of the request.
- **SC-005**: 95% of scheduled reports are ready within 15 minutes of the configured time over a
  30-day period.
- **SC-006**: The user can locate any past report or item by date or keyword in under 30 seconds.
- **SC-007**: Zero fabricated items, confirmed by spot-checking a weekly sample of 10 items against
  their cited sources.
- **SC-008**: The user reads the report in under 10 minutes, and at least 80% of rated reports in
  the first month receive a rating of 4 or 5.

## Assumptions

- Single user: the system serves one person (the project owner); multi-user access is out of
  scope.
- Initial sources cover each tier and domain, editable by configuration:
  - Frontend: official framework and browser blogs/release notes (React, Next.js, Vue, Angular,
    Svelte, TypeScript, Chrome, Firefox, Safari, Node.js) and web standards bodies.
  - Security: official vulnerability databases and security advisory feeds, OWASP, and security
    advisories of the tracked frameworks.
  - AI and LLMs: official announcements, release notes, and model documentation from major model
    providers.
  - System design: established engineering blogs of large-scale software companies.
  - Discovery: Hacker News, GitHub Trending, and selected newsletters.
  - Video (Tier 4): youtube.com/@d.zhiganov, @javascriptmastery, @hayk.simonyan, @Codevolution,
    @PurpleSchool, @therealseniordev, @tapasadhikary, @codewithantonio, @jherr,
    @developerwaypatterns.
- Some configured channels publish in languages other than English; FR-006c covers them.
- Reporting window boundaries are evaluated in the user's local time zone (see FR-010a).
- Default generation time is 08:00 local time.
- Initial interest profile prioritizes React, Next.js, TypeScript, JavaScript, CSS, browser
  platform features, web performance, system design, application and web security, and new AI/LLM
  model releases; ignored topics list starts empty.
- External delivery (email, messaging apps, push notifications) is out of scope for this feature;
  it can be added later as a separate integration.
- Weekly trend reports are a separate feature and out of scope here, though stored daily reports
  are designed to feed them.
- Learning-record integration (linking the knowledge-check answer to mastery tracking) is out of
  scope; only the question is produced.
- Reports are retained indefinitely, as the dataset is personal and small.
- Sources requiring paid subscriptions or logins are excluded from the initial source list.
