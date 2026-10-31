---
description: 'Task list for feature 004 — local documents reader'
---

# Tasks: Local Documents Reader

**Input**: Design documents from `/specs/004-documents-reader/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/routes.md, quickstart.md

**Tests**: Required — FR-019 (unit tests for discovery, front matter, grouping/sorting, search, safe
rendering) and SC-006 (Playwright + axe). Write the unit tests of each story before its
implementation.

**Organization**: grouped by user story (US1–US5 from spec.md). All paths below `apps/reader/` unless
they start with a root file name.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Add `"workspaces": ["apps/*"]` and scripts `reader` (`npm run dev -w apps/reader`), `reader:build`, `reader:start` to root `package.json`; change root `typecheck` to `tsc --noEmit && npm run typecheck --workspaces --if-present` and `test` to `vitest run && npm run test --workspaces --if-present`
- [ ] T002 Create `apps/reader/package.json` (name `@professor/reader`, private, `type: module`, `engines.node >=22`) with scripts `dev` (`next dev -H 127.0.0.1 -p 3100`), `build`, `start` (`next start -H 127.0.0.1 -p 3100`), `typecheck`, `test` (`vitest run`), `test:watch`, `test:e2e` (`playwright test`); dependencies next@^16.4, react@^19.3, react-dom@^19.3, react-markdown@^10.1, remark-gfm, rehype-sanitize, rehype-slug, rehype-pretty-code, shiki, github-slugger, gray-matter, zod@^4, next-themes, server-only, clsx, tailwind-merge, class-variance-authority, lucide-react, @radix-ui/react-dialog, @radix-ui/react-select, @radix-ui/react-slot; devDependencies typescript, @types/react, @types/react-dom, @types/node, tailwindcss@^4.3, @tailwindcss/postcss, @tailwindcss/typography, vitest, @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @playwright/test, @axe-core/playwright; run `npm install` from the root (single lockfile)
- [ ] T003 [P] Create `apps/reader/tsconfig.json` (strict, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `moduleResolution: bundler`, `jsx: preserve`, paths `@/*` → `./src/*`, Next plugin) and add `apps` to the root `tsconfig.json` `exclude`
- [ ] T004 [P] Create `apps/reader/next.config.ts` (`poweredByHeader: false`, `reactStrictMode: true`, `typedRoutes: true`) and `apps/reader/postcss.config.mjs` (`@tailwindcss/postcss`)
- [ ] T005 [P] Create `apps/reader/vitest.config.ts` (plugin react, `environment: 'node'` default with `environmentMatchGlobs` jsdom for `*.test.tsx`, setup file `src/shared/lib/test/setup.ts` importing `@testing-library/jest-dom/vitest`, alias `@` → `src`, alias `server-only` → an empty module, exclude `e2e/**`)
- [ ] T006 [P] Add `prettier-plugin-tailwindcss` to the root dev dependencies and `"plugins": ["prettier-plugin-tailwindcss"]` with `"tailwindStylesheet": "./apps/reader/app/globals.css"` to `.prettierrc.json`; add `apps/reader/.next/`, `apps/reader/playwright-report/`, `apps/reader/test-results/` to `.gitignore`
- [ ] T007 [P] Add an `overrides` entry for `apps/reader/**` to `.oxlintrc.json`: plugins `react`, `jsx-a11y`, `nextjs`, `react-perf`; rules `react-hooks/rules-of-hooks` error, `react-hooks/exhaustive-deps` warn, `max-lines` (150, skipBlankLines, skipComments) for `*.tsx`, `no-console` (allow warn/error), `no-restricted-imports` patterns forbidding upward FSD imports (e.g. from `entities` to `@/features/*`, `@/widgets/*`, `@/views/*`) with a comment explaining the layer order

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: every story needs these

- [ ] T008 Create `apps/reader/app/globals.css`: `@import 'tailwindcss'`, `@plugin '@tailwindcss/typography'`, `@custom-variant dark (&:where(.dark, .dark *))`, shadcn/ui theme tokens (light + `.dark`) as CSS variables in `@theme inline`, shiki dual-theme rules (`[data-theme] span { color: var(--shiki-light) }`, `.dark … var(--shiki-dark)`)
- [ ] T009 [P] Create `src/shared/config/env.server.ts` (`import 'server-only'`; zod-validated `DOCUMENTS_DIR` and `PROFESSOR_CONFIG`, resolved against the repository root `../../` from `process.cwd()` of the app; defaults `documents`, `config/professor.json`) and `src/shared/config/messages.ts` (all Azerbaijani UI strings: nav, empty states, search labels, theme labels, not-found, errors, copy button)
- [ ] T010 [P] Create `src/shared/lib/cn.ts` (clsx + tailwind-merge), `src/shared/lib/logger.ts` (thin wrapper over `console.warn/error`, the only place allowed to call console) and `src/shared/lib/safe-href.ts` (`safeHref(url)`: allows `http:`, `https:`, `mailto:`, relative and `#` URLs, returns `null` otherwise) with tests `src/shared/lib/safe-href.test.ts`
- [ ] T011 [P] Add shadcn/ui primitives in `src/shared/ui/` (`button.tsx`, `input.tsx`, `badge.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `skip-link.tsx`) and `apps/reader/components.json` pointing aliases to `@/shared/ui` and `@/shared/lib/cn`; export from `src/shared/ui/index.ts`
- [ ] T012 Create `proxy.ts` (per-request nonce, `Content-Security-Policy` per research R8, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`; nonce passed via `x-nonce` request header; matcher excludes `_next/static`, `_next/image`, `favicon.ico`)
- [ ] T013 Create `src/app-layer/providers/ThemeProvider.tsx` (`"use client"`, wraps `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `nonce` prop) and `app/layout.tsx` (reads nonce from `headers()`, `<html lang="az" suppressHydrationWarning>`, skip link, providers, `metadata` default title `Sənədlər`), plus `app/error.tsx` (`"use client"`), `app/global-error.tsx`, `app/not-found.tsx` (link home), `app/loading.tsx`

**Checkpoint**: `npm run reader` serves an empty shell at `127.0.0.1:3100` with CSP headers

---

## Phase 3: User Story 1 - Read a document comfortably (Priority: P1) 🎯 MVP

**Goal**: open any document at `/docs/...` and read it rendered, safely.

**Independent Test**: quickstart §2 and §6 — the 2026-10-31 report renders with meta header, links, no raw Markdown; malicious fixture renders nothing executable.

### Tests for User Story 1 ⚠️ write first

- [ ] T014 [P] [US1] Fixture library in `apps/reader/e2e/fixtures/documents/` (`security/lessons/2026-10-30-xss-basics.md` with a TS code block, a GFM table and a relative link to `../research/2026-10-31-csp.md`; `security/research/2026-10-31-csp.md`; `news/2026-10-31.md`; `english/lessons/2026-10-29-articles.md`; `no-meta.md` without front matter; `malicious.md` with `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `[x](javascript:alert(1))`; `README.md`)
- [ ] T015 [P] [US1] Unit tests `src/entities/document/model/front-matter.test.ts` (valid front matter; YAML date object → `YYYY-MM-DD`; invalid type → `missingMetadata`) and `src/entities/document/lib/slug.test.ts` (path ↔ slug ↔ href with Azerbaijani letters and spaces; relative link resolution `../research/x.md` from a document path)
- [ ] T016 [P] [US1] Unit tests `src/entities/document/api/repository.server.test.ts` against the fixture folder: lists all `.md` except root `README.md`; title fallback to first heading / file name; type/domain/date from folders and file name; `getDocument(['..','..','package'])` → `null` (traversal guard); unknown slug → `null`
- [ ] T017 [P] [US1] Component test `src/widgets/document-article/DocumentArticle.test.tsx` rendering the Markdown pipeline output for `malicious.md` (no `script` element, no `onerror` attribute, no `javascript:` href), a GFM table inside a scroll wrapper, an internal link → `/docs/security/research/2026-10-31-csp`, an external link with `target="_blank"` and `rel="noopener noreferrer"`

### Implementation for User Story 1

- [ ] T018 [P] [US1] `src/entities/document/model/types.ts` (Document, DocumentType, TocItem) and `src/entities/document/model/front-matter.ts` (zod schema per data-model.md, `parseFrontMatter(raw)` with gray-matter)
- [ ] T019 [P] [US1] `src/entities/document/lib/slug.ts` (`pathToSlug`, `slugToPath`, `hrefFor`, `resolveRelative(fromPath, link)`) and `src/entities/document/lib/toc.ts` (headings → `TocItem[]` with `github-slugger`)
- [ ] T020 [US1] `src/entities/document/api/repository.server.ts` (`import 'server-only'`; `await connection()`; `listDocuments()`, `getDocument(slug)` with traversal guard; reads `env.DOCUMENTS_DIR`) and `src/entities/document/index.ts` public API
- [ ] T021 [P] [US1] `src/entities/document/ui/DocumentMeta.tsx` (title, type badge, domain, date, sources as safe external links; "metadata yoxdur" badge when missing)
- [ ] T022 [US1] `src/widgets/document-article/DocumentArticle.tsx` (async Server Component: `MarkdownAsync` with remark-gfm, rehype-sanitize (default schema), rehype-slug, rehype-pretty-code (`github-light`/`github-dark`, `keepBackground: false`); `components` map from `./components/`), `components/MarkdownLink.tsx` (internal → `next/link` via `resolveRelative`, external → new tab, other → text, all through `safeHref`), `components/MarkdownTable.tsx` (overflow-x wrapper), `components/CodeBlock.tsx` (pre + `CopyCodeButton`), `components/TableOfContents.tsx` (≥ 3 h2) — each file ≤ 150 lines
- [ ] T023 [P] [US1] `src/features/copy-code/ui/CopyCodeButton.tsx` (`"use client"`; copies the `pre` text via `navigator.clipboard`; `aria-live` "Kopyalandı"; keyboard accessible) with test `CopyCodeButton.test.tsx`
- [ ] T024 [US1] `src/views/document/DocumentView.tsx` (meta, TOC, article, sources, prev/next in its group; `notFound()` when `getDocument` is null) and thin route `app/docs/[...slug]/page.tsx` (await `params`, `generateMetadata` with the document title)
- [ ] T025 [US1] Run `npm run test -w apps/reader` and `npm run typecheck -w apps/reader`; open `/docs/news/2026-10-31` on the real library and check quickstart §2

**Checkpoint**: US1 works alone — any document URL renders safely

---

## Phase 4: User Story 2 - Browse the library (Priority: P1)

**Goal**: home page groups everything; sidebar navigation on every page.

**Independent Test**: quickstart §3 — `/` lists domains by configured name, news newest first; empty state when the folder is missing.

### Tests for User Story 2 ⚠️

- [ ] T026 [P] [US2] Unit tests `src/entities/document/lib/group.test.ts` (domains sorted by name with az collation; lessons/research newest first, null dates last; news newest first; unsorted bucket) and `src/entities/domain/api/domain-names.server.test.ts` (names from a temp `professor.json`; missing/invalid file → `{}`)

### Implementation for User Story 2

- [ ] T027 [P] [US2] `src/entities/document/lib/group.ts` (`groupLibrary(documents, names)` per data-model.md)
- [ ] T028 [P] [US2] `src/entities/domain/api/domain-names.server.ts` (`import 'server-only'`; reads `env.PROFESSOR_CONFIG`, zod-parses only `domains[].{id,name}`) and `src/entities/domain/index.ts`
- [ ] T029 [P] [US2] `src/entities/document/ui/DocumentCard.tsx` (title link, date, type badge, missing-metadata badge)
- [ ] T030 [US2] `src/widgets/library-overview/LibraryOverview.tsx` (domain sections → Dərslər / Araşdırmalar, Xəbərlər, Digər; empty state from messages) and `src/widgets/library-sidebar/LibrarySidebar.tsx` (desktop aside + mobile `Sheet`; current document highlighted via `aria-current`)
- [ ] T031 [US2] `src/widgets/site-header/SiteHeader.tsx` (home link, slot for search form and theme toggle, mobile sidebar trigger) wired into `app/layout.tsx`
- [ ] T032 [US2] `src/views/home/HomeView.tsx` and thin `app/page.tsx`

**Checkpoint**: US1 + US2 — browse and read

---

## Phase 5: User Story 3 - Find a document by searching (Priority: P2)

**Goal**: `/search?q=&domain=&type=` with snippets and filters.

**Independent Test**: quickstart §5.

### Tests for User Story 3 ⚠️

- [ ] T033 [P] [US3] Unit tests `src/entities/document/lib/search.test.ts`: title matches first; snippet around the first body match with Markdown stripped; `ŞƏRT` matches `şərt` and `I`/`ı` handling via `toLocaleLowerCase('az')`; domain/type filters; empty query with filters; no match → `[]`; query longer than 200 chars truncated

### Implementation for User Story 3

- [ ] T034 [US3] `src/entities/document/lib/search.ts` (`searchDocuments(documents, { q, domain, type })` per data-model.md) exported from `src/entities/document/index.ts`
- [ ] T035 [P] [US3] `src/features/search-documents/ui/SearchForm.tsx` (server component `<form method="get" action="/search">` with labelled `q` input; domain and type selects as native `<select>` styled with shadcn tokens; preserves current values)
- [ ] T036 [US3] `src/widgets/search-results/SearchResults.tsx` (result list with snippet, highlighted term via `<mark>`, empty state) and `src/views/search/SearchView.tsx` + thin `app/search/page.tsx` (await `searchParams`, zod-parse them)
- [ ] T037 [US3] Put the compact `SearchForm` into `SiteHeader`

**Checkpoint**: search works without JavaScript

---

## Phase 6: User Story 4 - New documents appear without restarting (Priority: P2)

**Goal**: refresh shows added/changed/deleted documents.

**Independent Test**: quickstart §4.

- [ ] T038 [US4] Unit test `src/entities/document/api/repository.server.test.ts` (extend): a file written to a temp `DOCUMENTS_DIR` after the first `listDocuments()` appears in the next call; a deleted file disappears; changed content is returned
- [ ] T039 [US4] Verify no route or data function is cached: `connection()` is awaited in `repository.server.ts` and `domain-names.server.ts`, no `"use cache"`, no `generateStaticParams`; confirm with `npm run reader:build` that `/`, `/docs/[...slug]` and `/search` are listed as dynamic (ƒ)

---

## Phase 7: User Story 5 - Comfortable reading settings (Priority: P3)

**Goal**: theme toggle, TOC, Azerbaijani UI.

**Independent Test**: quickstart §7.

- [ ] T040 [P] [US5] `src/features/toggle-theme/ui/ThemeToggle.tsx` (`"use client"`; `useTheme`; three options system/light/dark with accessible labels from messages; renders a placeholder until mounted via `useSyncExternalStore`, not `useEffect`) with test `ThemeToggle.test.tsx`
- [ ] T041 [US5] Add `ThemeToggle` to `SiteHeader`; check TOC appears only for ≥ 3 h2 (unit test `src/entities/document/lib/toc.test.ts`)
- [ ] T042 [US5] Review all UI strings come from `src/shared/config/messages.ts` (`git grep` for Latin UI literals in `src/widgets`, `src/views`, `src/features`)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T043 [P] Playwright config `apps/reader/playwright.config.ts` (webServer `npm run build && npm run start` with `DOCUMENTS_DIR=e2e/fixtures/documents`, baseURL `http://127.0.0.1:3100`, retries 2 on CI, trace on first retry) and specs `apps/reader/e2e/home.spec.ts`, `document.spec.ts` (render, internal link, external link attrs, malicious fixture: no dialog fired, TOC), `search.spec.ts` (query + filters via URL, empty state), `not-found.spec.ts`, `theme.spec.ts` (toggle persists after reload); each spec runs `@axe-core/playwright` (WCAG 2.x A/AA) and asserts zero serious/critical violations
- [ ] T044 Add a `reader` job to `.github/workflows/ci.yml`: `npm ci`, `npx playwright install --with-deps chromium`, `npm run build -w apps/reader`, `npm run test:e2e -w apps/reader`, `npm audit --omit=dev --audit-level=high`; upload the Playwright report on failure
- [ ] T045 [P] Add a "Reader" section to the root `README.md` (`npm run reader`, URL, env vars, what it shows, read-only) and link from the Documents section
- [ ] T046 Run the full gates: `npm run check` (format, lint incl. reader override, typecheck and tests for root + reader), `npm run test:e2e -w apps/reader`, `npm run reader:build`; fix findings; confirm every `.tsx` ≤ 150 lines
- [ ] T047 Run quickstart §1–§8 on the real `documents/` folder; record timings (startup, page, search) and results in a "Validation" section at the end of this file

---

## Dependencies & Execution Order

- Setup (T001–T007) → Foundational (T008–T013) → US1 → US2 → US3 → US4 → US5 → Polish.
- US1 needs the repository (T020) which US2–US4 reuse; US2 adds grouping; US3 adds search; US4 only
  verifies/extends repository behaviour; US5 is UI-only.
- E2E (T043) needs all routes; CI job (T044) needs T043.
- Within a story: tests → model/lib → api → ui → view/route.

### Parallel Opportunities

- T003–T007 (separate config files); T009–T011
- US1: T014–T017 (tests), then T018, T019, T021, T023
- US2: T026; T027–T029
- US3: T033; T035 alongside T034
- Polish: T043, T045

---

## Parallel Example: User Story 1

```bash
Task: "Fixture library in apps/reader/e2e/fixtures/documents/"
Task: "Unit tests front-matter.test.ts and slug.test.ts"
Task: "Unit tests repository.server.test.ts"
Task: "Component test DocumentArticle.test.tsx"
```

---

## Implementation Strategy

### MVP First

1. Setup + Foundational
2. US1 → any document readable at its URL, safely
3. **Validate**: quickstart §2, §6

### Incremental Delivery

1. US1 read → 2. US2 browse → 3. US3 search → 4. US4 freshness check → 5. US5 comfort → 6. E2E,
   CI, docs

---

## Notes

- Every `.tsx` ≤ 150 lines; sub-components in a `components/` folder next to the parent.
- `"use client"` only on: ThemeProvider, ThemeToggle, CopyCodeButton, the sidebar Sheet trigger,
  `app/error.tsx`, `app/global-error.tsx`.
- Commit after each phase (Conventional Commits, scope = slice, e.g. `feat(document): render markdown safely`).
