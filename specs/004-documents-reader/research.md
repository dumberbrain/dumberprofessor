# Research: Local Documents Reader

Versions checked on the npm registry on 2026-10-31: next 16.4.3, react 19.3.1, tailwindcss 4.3.3,
@tailwindcss/typography 0.5.20, react-markdown 10.1.0, remark-gfm 4.0.1, rehype-sanitize 6.0.0,
rehype-slug 6.0.0, rehype-pretty-code 0.14.5, shiki 4.5.0, gray-matter 4.0.3, zod 4.6.7,
next-themes 0.4.6, @playwright/test 1.64.1, @axe-core/playwright 4.14.0, vitest 5.0.5,
@testing-library/react 16.3.3, jsdom 30.1.3.

## R1 — Framework: Next.js (App Router)

**Decision**: Next.js 16 with the App Router, React Server Components reading `documents/` from
disk on each request.

**Rationale**:

- FR-018 requires the user's team frontend standards; they define exactly two kinds of app:
  Next.js (App Router + FSD + Tailwind + shadcn/ui) and React SPAs. Astro and TanStack Start are not
  covered, so choosing them would mean inventing standards.
- Server Components read local files directly (no API layer, no client JS for content), which fits
  FR-001 (read in place) and FR-011 (refresh shows new files) when pages are rendered dynamically.
- The user prefers Next.js.

**Alternatives**:

| Option         | Strength                                                 | Why not                                                                                           |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Astro          | Best-in-class for Markdown content sites (content layer) | Outside the team standards; its content collections are build-time oriented (dev server re-syncs) |
| TanStack Start | Type-safe routing, server functions                      | Outside the team standards (team profile uses TanStack Router only in Vite SPAs); younger         |
| React SPA      | Covered by standards                                     | A browser SPA cannot read local files; would need an extra API server                             |

## R2 — Fresh content on refresh (FR-011)

**Decision**: every page that lists or reads documents calls `await connection()` (from
`next/server`) inside the data function, making the route dynamic; no `"use cache"`. Each request
re-reads the folder (a few ms for 1,000 small files — SC-002/SC-003).

**Alternatives**: `generateStaticParams` + rebuild — rejected (needs restart/rebuild); file watcher
with in-memory index — rejected (state + complexity for no measurable gain at this scale).

## R3 — Markdown rendering and safety (FR-002–FR-005, SC-004)

**Decision**: `MarkdownAsync` from `react-markdown` in a Server Component with plugins, in order:
`remark-gfm` → (remark-rehype, raw HTML **not** enabled) → `rehype-sanitize` (GitHub schema) →
`rehype-slug` → `rehype-pretty-code` (shiki, themes `github-light` / `github-dark`, dual theme via CSS
variables). Custom components: `a` (internal `.md` links → reader URLs via `next/link`; external →
`target="_blank" rel="noopener noreferrer"`; every `href` through `safeHref`), `pre` (adds a client
`CopyCodeButton` leaf), `table` (horizontal scroll wrapper).

**Rationale**: produces a React tree, so no `dangerouslySetInnerHTML` at all (team security rule).
Raw HTML from documents is never parsed into elements; sanitize runs on the untrusted tree **before**
the trusted highlighter adds its markup. Highlighting happens on the server — no client bundle for
shiki.

**Alternatives**: `unified` → HTML string + `sanitizeHtml` + `dangerouslySetInnerHTML` — allowed
by the standards but more surface; MDX — executes code, wrong for untrusted content.

## R4 — Document discovery and metadata (FR-001, FR-006–FR-009)

**Decision**: a server-only repository (`import 'server-only'`) walks `DOCUMENTS_DIR` (default:
`<repo>/documents`, validated in `shared/config/env.server.ts`), skips `README.md` at the root,
parses front matter with `gray-matter` and validates it with a zod schema matching feature 002
(`title`, `type` ∈ lesson|research|news, `domain?`, `date` YYYY-MM-DD, `sources?`). Invalid/missing
front matter → title from the first `#` heading or the file name, type from the folder
(`lessons`/`research`/`news`), `missingMetadata: true`. Domain names are read from
`config/professor.json` (`domains[].id/name` only) with fallback to the id.

**Slugs**: URL `/docs/<path without .md>` with each segment `encodeURIComponent`-ed; the path is
resolved and must stay inside `DOCUMENTS_DIR` (path traversal guard), otherwise `notFound()`.

## R5 — Search (FR-010, SC-003)

**Decision**: server-side linear search on the `/search` page from URL `searchParams` (`q`,
`domain`, `type`), case-insensitive with `toLocaleLowerCase('az')` normalization on both sides,
title matches ranked first, snippet = ±80 characters around the first body match (Markdown syntax
stripped). The search form is a plain `<form method="get">` (works without JavaScript).

**Alternatives**: MiniSearch in the browser — rejected (ships the whole library to the client; not
needed for ≤1,000 documents).

## R6 — UI, theme, comfort (FR-012–FR-015)

**Decision**: Tailwind CSS v4 + shadcn/ui primitives in `shared/ui` (button, input, select, badge,
separator, sheet for the mobile sidebar) + `@tailwindcss/typography` (`prose`, `dark:prose-invert`).
Theme via `next-themes` (`attribute="class"`, `defaultTheme="system"`, persisted in
`localStorage`; nonce passed for CSP). Table of contents from `h2`/`h3` collected server-side with
`github-slugger` (same algorithm as `rehype-slug`), shown when there are ≥ 3 `h2`. Interface strings in
one module (`shared/config/messages.ts`) — single locale, so no next-intl (standards: i18n only for

> 1 locale).

## R7 — Workspace, tooling and gates (FR-017, FR-018, SC-007)

**Decision**:

- `apps/reader/` as an **npm workspace** (root `package.json` `"workspaces": ["apps/*"]`) — one
  lockfile (team rule: never a second lockfile); the `fp` CLI stays at the root, untouched.
- Root scripts: `reader` (= `npm run dev -w apps/reader`, bound to `127.0.0.1:3100`),
  `typecheck` and `test` also run the workspace (`npm run … --workspaces --if-present`), so the
  existing husky hooks and CI cover the reader without new steps.
- Lint: the repository linter (oxlint, feature 003) with an override for `apps/reader/**`: plugins
  `react`, `jsx-a11y`, `nextjs`, `react-perf`, rules `react-hooks/rules-of-hooks`,
  `react-hooks/exhaustive-deps`, `max-lines` (150, `.tsx`), `no-console`, and
  `no-restricted-imports` patterns for FSD layer direction.
- Format: the repository Prettier config plus `prettier-plugin-tailwindcss` (class sorting).
- CI: add a `reader` job: build + Playwright E2E with axe against `next start` and a fixture
  documents folder; `npm audit --omit=dev --audit-level=high`.

**Deviations from the team standards** (recorded in plan Complexity Tracking): oxlint instead of
ESLint; repo Prettier style (single quotes, 120 columns) instead of the team style; husky-set hooks
instead of lint-staged/commitlint; no Sentry; no axios/`serverFetch` (the app makes no HTTP calls).

## R8 — Security headers (team §13)

**Decision**: `proxy.ts` sets a per-request CSP nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`,
no `'unsafe-inline'`; `style-src 'self' 'unsafe-inline'` for shiki CSS variables; `img-src 'self'
data:`; `frame-ancestors 'none'`) and the standard security headers; `poweredByHeader: false`. The
server binds to `127.0.0.1` only (FR-016).

## R9 — Testing

**Decision**:

- Vitest (jsdom for components, node for server libs): repository (discovery, README skip, traversal
  guard, missing metadata), front-matter schema, grouping/sorting, search (Azerbaijani letters,
  filters, snippets), slug ↔ path, `safeHref`, markdown rendering (a fixture with `<script>`,
  `onerror`, `javascript:` link renders none of them; internal/external links; GFM table), TOC.
- Playwright + `@axe-core/playwright` against `next build && next start` with
  `DOCUMENTS_DIR=e2e/fixtures/documents`: home, a document, search via URL with filters, not-found,
  theme toggle persistence; axe zero serious/critical on every route (SC-006).
