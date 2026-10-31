# Feature Specification: Local Documents Reader

**Feature Branch**: `004-documents-reader`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "isteyirem ki …/dumberprofessor/documents bu claude ile generate etdiyim metnleri
lokalda bir ya astro ya da next js ve ya tanstack start ile bir proyekt qaldirib oxumaq olsun — best
practice ile quraq, en yaxshisi dushunurem nextjs ola biler" (a local web app to read the documents
Claude generated in `documents/`, built with best practices; the user leans towards Next.js, Astro and
TanStack Start are alternatives)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Read a document comfortably (Priority: P1)

The user starts the reader with one command and opens any lesson, research note or daily report from
the library in the browser. The Markdown is rendered as a clean, readable article: headings,
lists, tables, code blocks with syntax highlighting, links, and the front matter (title, type,
domain, date, sources) shown as a header, not as raw text.

**Why this priority**: reading is the whole point; everything else helps find what to read.

**Independent Test**: start the reader, open `documents/news/2026-10-31.md` → it shows the title,
date, type and domain at the top, the claim badges and source links work, and nothing is shown as raw
Markdown syntax.

**Acceptance Scenarios**:

1. **Given** the library contains a daily report, **When** the user opens it, **Then** headings,
   lists, emphasis, tables and links render correctly and the front matter is shown as a styled header.
2. **Given** a lesson with code examples, **When** it is opened, **Then** code blocks are
   syntax-highlighted for common languages (TypeScript, JavaScript, JSON, shell, CSS, HTML, SQL) and
   can be copied with one click.
3. **Given** a document links to another document by relative path, **When** the user clicks the
   link, **Then** the linked document opens in the reader.
4. **Given** a document with external links, **When** the user clicks one, **Then** it opens in a new
   tab.
5. **Given** a narrow window (phone width), **When** a document is open, **Then** text reflows,
   tables scroll horizontally, and nothing overflows the screen.

---

### User Story 2 - Browse the library (Priority: P1)

The user sees the whole library on the home page: grouped by domain (with the configured domain
names), then by type (lessons, research), and the news reports by date, newest first. A sidebar or
navigation lets the user move between groups without returning home.

**Why this priority**: without browsing, the user would need to know file names.

**Independent Test**: with documents in at least two domains and two news reports, the home page
lists all of them in the right groups and order, each with title and date.

**Acceptance Scenarios**:

1. **Given** documents in several domains, **When** the home page opens, **Then** each domain shows
   its human-readable name and its lessons and research notes, newest first.
2. **Given** several daily reports, **When** the user opens the news section, **Then** reports are
   listed newest first with their dates.
3. **Given** an empty library, **When** the home page opens, **Then** a friendly message explains that
   documents appear after lessons, research or daily reports.
4. **Given** a document without valid front matter, **When** the library is listed, **Then** it is
   still shown (title taken from its first heading or file name) and marked as missing metadata.

---

### User Story 3 - Find a document by searching (Priority: P2)

The user types words into a search box and gets matching documents (by title and content) with a
short snippet, and can filter by domain and type.

**Why this priority**: the library grows daily; after a few weeks browsing alone is slow.

**Independent Test**: search for "node-forge" → the 2026-10-31 report appears with a snippet around
the match; filter to type "lesson" → it disappears.

**Acceptance Scenarios**:

1. **Given** a search term present in a document body, **When** the user searches, **Then** that
   document is listed with a snippet showing the term.
2. **Given** a search term with Azerbaijani letters (ə, ğ, ı, ö, ü, ç, ş), **When** the user searches,
   **Then** matching is case-insensitive and finds the documents.
3. **Given** domain and type filters, **When** the user applies them, **Then** only matching documents
   remain.
4. **Given** no match, **When** the user searches, **Then** an empty-state message is shown.

---

### User Story 4 - New documents appear without restarting (Priority: P2)

While the reader is running, the user finishes a lesson in Claude Code (which saves a new document).
The new document appears in the reader after a browser refresh, without restarting anything.

**Why this priority**: the reader runs next to Claude Code sessions; a restart for each lesson is
friction.

**Independent Test**: reader running; add a new Markdown file to `documents/` → refresh the home page
→ it is listed and opens.

**Acceptance Scenarios**:

1. **Given** the reader is running, **When** a new document is saved to the library, **Then** it is
   listed after a page refresh.
2. **Given** a document is edited on disk, **When** its page is refreshed, **Then** the new content
   is shown.

---

### User Story 5 - Comfortable reading settings (Priority: P3)

The user can switch between light and dark theme (default follows the system), sees a table of
contents for long documents, and the interface text is in Azerbaijani.

**Why this priority**: comfort features; the reader is usable without them.

**Independent Test**: toggle theme → whole page switches and the choice is remembered on reload;
open a long lesson → a table of contents of its headings links to each section.

**Acceptance Scenarios**:

1. **Given** the system is in dark mode, **When** the reader opens for the first time, **Then** it is
   dark; **When** the user switches to light, **Then** the choice persists across reloads.
2. **Given** a document with three or more second-level headings, **When** it is open, **Then** a
   table of contents links to each heading.
3. **Given** any page, **Then** navigation labels, empty states and errors are in Azerbaijani.

### Edge Cases

- A document contains raw HTML or script tags (content came from untrusted web sources via Claude):
  it must be rendered safely — no script executes, no inline event handlers run.
- Very long documents (e.g. a catch-up report with 7 items): page stays responsive; table of contents
  helps navigation.
- File names with non-ASCII characters or spaces: links still work.
- A document is deleted while the reader runs: its page shows a "not found" message with a link home,
  not a crash.
- Broken relative links between documents: shown as links that lead to the "not found" page.
- `documents/README.md` (the generated index): not listed as a document itself; the reader builds
  its own navigation.
- The library folder is missing entirely: the reader starts and shows the empty state.

## Requirements _(mandatory)_

### Functional Requirements

**Reading**

- **FR-001**: The reader MUST read Markdown documents directly from the project's `documents/`
  folder (no copy, no import step), read-only — it MUST NOT modify, move or delete any document.
- **FR-002**: The reader MUST render CommonMark plus GitHub-flavoured Markdown (tables, task lists,
  strikethrough, autolinks) and show front matter (title, type, domain, date, sources) as a styled
  header; sources MUST be listed as links.
- **FR-003**: Code blocks MUST be syntax-highlighted and have a copy button.
- **FR-004**: Relative links between documents MUST navigate within the reader; external links MUST
  open in a new tab with safe link attributes.
- **FR-005**: Rendering MUST be safe for untrusted content: raw HTML in documents MUST be sanitized
  (no scripts, no event handlers, no `javascript:` URLs).

**Navigation**

- **FR-006**: The home page MUST list all documents grouped by domain (using the human-readable domain
  names from the Professor configuration, falling back to the id) and type, newest first, and daily
  reports by date, newest first.
- **FR-007**: Each document MUST have a stable, shareable local URL derived from its path.
- **FR-008**: Documents without valid front matter MUST still be listed and readable, marked as
  missing metadata.
- **FR-009**: `documents/README.md` MUST NOT appear as a document.

**Search**

- **FR-010**: Users MUST be able to search titles and content, case-insensitively including
  Azerbaijani letters, with snippets, and filter by domain and type.

**Freshness**

- **FR-011**: While the reader runs, added, changed and deleted documents MUST be reflected after a
  page refresh without restarting.

**Comfort**

- **FR-012**: Light and dark themes MUST be available; default follows the system; the choice MUST
  persist.
- **FR-013**: Documents with three or more second-level headings MUST show a table of contents.
- **FR-014**: Interface text MUST be in Azerbaijani; document content is shown as written.
- **FR-015**: Pages MUST be usable on phone-width screens and meet basic accessibility: keyboard
  navigation, visible focus, sufficient contrast, semantic headings and landmarks.

**Operation and quality**

- **FR-016**: The reader MUST start with one command from the project root and run only on the local
  machine (bound to localhost); it MUST NOT require network access to render documents.
- **FR-017**: The reader MUST live in its own folder inside this repository with its own dependencies,
  so the existing `fp` CLI and its tests are unaffected.
- **FR-018**: The reader MUST follow the user's team frontend standards (as recorded in the
  `team-frontend` standards) and pass the project's existing quality gates: formatting, linting, type
  check and tests run by the hooks and CI.
- **FR-019**: The reader MUST have automated tests for document discovery, front-matter parsing,
  grouping/sorting, search and safe rendering.

### Key Entities

- **Document**: a Markdown file in the library; path, URL slug, title, type (lesson, research, news),
  domain, date, sources, body, missing-metadata flag.
- **Library**: all documents, grouped by domain and type; news by date.
- **Domain name map**: domain id → human-readable name, from the Professor configuration.
- **Search result**: document, matching snippet.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From a fresh clone with dependencies installed, the reader is running and showing the
  library within 30 seconds of one command.
- **SC-002**: Any document opens within 1 second on the user's machine for a library of up to 1,000
  documents.
- **SC-003**: Search returns results within 1 second for a library of up to 1,000 documents.
- **SC-004**: 100% of current documents render without raw Markdown syntax visible and without
  errors; a test document containing script tags renders with no script executed.
- **SC-005**: A newly saved document is visible after one page refresh in 100% of attempts, with no
  restart.
- **SC-006**: Automated accessibility checks on the home page and a document page report no serious or
  critical violations.
- **SC-007**: The project's quality gates (format, lint, type check, tests — locally and in CI) pass
  with the reader added.

## Assumptions

- Single user, local only; no authentication, no deployment. A static export for hosting may be
  considered later but is out of scope.
- Read-only: editing documents, marking lessons as read, running quizzes or showing the learning record
  in the reader are out of scope for v1 (the learning record lives in `data/`, which is personal and
  git-ignored).
- The document library format is the one produced by feature 002 (`documents/<domain>/lessons|research/`,
  `documents/news/`, front matter with title, type, domain, date, sources).
- Domain names come from `config/professor.json`; the reader only reads it.
- The web framework is chosen during planning; the user prefers Next.js and also named Astro and
  TanStack Start. The choice must satisfy the requirements above (server-side reading of local files,
  safe rendering, refresh-to-update) and the user's team frontend standards.
- Node.js ≥ 22 and npm remain the toolchain.
