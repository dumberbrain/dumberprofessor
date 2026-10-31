# Implementation Plan: Local Documents Reader

**Branch**: `004-documents-reader` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-documents-reader/spec.md`

## Summary

A local, read-only web reader for `documents/`, built as a Next.js 16 App Router app in the npm
workspace `apps/reader/`, following the user's team frontend standards (FSD, Server Components by
default, Tailwind v4 + shadcn/ui, Vitest + Playwright/axe, CSP). Server Components read the folder on
every request, so new documents appear on refresh. Markdown is rendered to a React tree on the server
(GFM, sanitized, highlighted with shiki) — no `dangerouslySetInnerHTML`, no client JS for content.
Search runs on the server from URL parameters. Details: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (strict) on Node.js ≥ 22; React 19.3

**Primary Dependencies**: next 16.4, react/react-dom 19.3, tailwindcss 4.3 + @tailwindcss/typography,
shadcn/ui (Radix primitives), react-markdown 10 (`MarkdownAsync`), remark-gfm, rehype-sanitize,
rehype-slug, rehype-pretty-code + shiki, github-slugger, gray-matter, zod 4, next-themes,
server-only; dev: vitest 5, @testing-library/react, jsdom, @playwright/test, @axe-core/playwright,
prettier-plugin-tailwindcss

**Storage**: none — reads `documents/` and `config/professor.json` (read-only)

**Testing**: Vitest (node + jsdom), Playwright + axe against a production build with fixture documents

**Target Platform**: local browser on Windows; server bound to `127.0.0.1:3100`

**Project Type**: web application (Next.js) inside the existing single repository, as an npm workspace

**Performance Goals**: page and search < 1 s for 1,000 documents (SC-002/003); ready < 30 s (SC-001)

**Constraints**: read-only; no network needed; untrusted content rendered safely; existing `fp` CLI,
its tests and the 003 gates unaffected and extended to the workspace

**Scale/Scope**: single user; ≤ 1,000 documents; 3 routes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution v2.0.0. Before Phase 0: **PASS**. After Phase 1: **PASS** (deviations below concern the
team frontend standards, not the constitution).

| Principle / Section     | Gate                                           | Evidence                                                                         | Status |
| ----------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| II. Sources             | Sources stay visible and checkable             | Front-matter sources and in-text links rendered as links; claim badges preserved | ✅     |
| VI. Continuity          | Earlier material reachable                     | Library grouped by domain, relative links between documents work, search         | ✅     |
| VII. Transparency       | Stored ≠ verified stays visible                | Documents rendered as stored; missing metadata marked, not guessed silently      | ✅     |
| IX. User-directed focus | No change to focus/config                      | Config read-only (domain names only)                                             | ✅     |
| Security and Trust      | Untrusted content never executes               | Raw HTML not rendered, rehype-sanitize, `safeHref`, CSP nonce, localhost bind    | ✅     |
| Extensibility           | Config over code                               | Domains/names from config; `DOCUMENTS_DIR` / `PROFESSOR_CONFIG` env              | ✅     |
| Separation of concerns  | Instructions, tools, knowledge, progress apart | Reader is a separate workspace; reads the library only; no access to `data/`     | ✅     |

## Project Structure

### Documentation (this feature)

```text
specs/004-documents-reader/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/routes.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
package.json                     # + "workspaces": ["apps/*"], reader scripts, aggregated typecheck/test
.oxlintrc.json                   # + override for apps/reader/** (react, jsx-a11y, nextjs, max-lines, FSD imports)
.prettierrc.json                 # + prettier-plugin-tailwindcss
.github/workflows/ci.yml         # + reader job: build, E2E + axe, audit
apps/reader/
├── package.json  next.config.ts  tsconfig.json  postcss.config.mjs  components.json
├── vitest.config.ts  playwright.config.ts
├── proxy.ts                     # CSP nonce + security headers
├── app/                         # routing only, thin files
│   ├── layout.tsx  globals.css  not-found.tsx  error.tsx  global-error.tsx  loading.tsx
│   ├── page.tsx                 → views/home
│   ├── docs/[...slug]/page.tsx  → views/document
│   └── search/page.tsx          → views/search
├── src/
│   ├── app-layer/providers/     # ThemeProvider (next-themes, nonce)
│   ├── views/{home,document,search}/
│   ├── widgets/{site-header,library-sidebar,document-article,library-overview,search-results}/
│   ├── features/{search-documents,toggle-theme,copy-code}/
│   ├── entities/document/{model,lib,api,ui}/   # schema, types, group/search/slug/toc, repository.server.ts, cards/meta
│   ├── entities/domain/{api,lib}/               # domain-name map from config (server-only)
│   └── shared/{ui,lib,config}/                  # shadcn primitives, cn, safeHref, logger, env.server.ts, messages.ts
└── e2e/
    ├── fixtures/documents/      # small library incl. a malicious fixture
    └── *.spec.ts                # home, document, search, not-found, theme, axe
```

**Structure Decision**: Next.js + FSD per the team standards (`app/` routing only, FSD in `src/`
with `app-layer` and `views` renames). Separate npm workspace so the root `fp` CLI is untouched and
there is still one lockfile.

## Complexity Tracking

Deviations from the user's **team frontend standards** (not constitution violations):

| Deviation                                                                         | Why Needed                                                                            | Standard Alternative Rejected Because                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| oxlint (with react/jsx-a11y/nextjs plugins) instead of ESLint                     | Repository already standardised on oxlint in feature 003; one linter per repo         | ESLint just for `apps/reader` = two linters, two configs, slower hooks |
| Repo Prettier style (single quotes, width 120)                                    | One formatter config per repository (feature 003)                                     | Team style (double quotes, 100) would reformat or split the repo       |
| husky-set hooks instead of lint-staged + commitlint                               | User's own hook layout already in place (003)                                         | Would add dependencies the user's doctrine explicitly avoids           |
| FSD layer rules via `no-restricted-imports` instead of `eslint-plugin-boundaries` | oxlint has no boundaries plugin                                                       | Same as row 1                                                          |
| No Sentry / Web Vitals reporting                                                  | Local single-user tool, no remote endpoint                                            | Would send data off the machine for no benefit                         |
| No axios client / `serverFetch`                                                   | The app makes no HTTP requests (reads local files)                                    | Empty HTTP layer would be dead code                                    |
| `next-themes` (not in the stack table)                                            | Flash-free theme switch with CSP nonce support; shadcn/ui's documented theme solution | Hand-written theme script needs its own nonce handling and FOUC fix    |
