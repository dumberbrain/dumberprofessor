# Contract: reader routes and commands

## Routes (all dynamic, read on each request)

| Route                      | Shows                                                                                   | Errors                                |
| -------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------- |
| `/`                        | library: domains → lessons / research, news by date, unsorted; empty state              | —                                     |
| `/docs/[...slug]`          | one document: meta header, TOC (≥ 3 h2), rendered body, sources, prev/next in its group | unknown or outside root → `not-found` |
| `/search?q=&domain=&type=` | form (GET) + results with snippets; filters keep the query                              | empty result → empty state            |
| any other                  | `not-found` page with link home                                                         | —                                     |

Every page: `generateMetadata` title `<document title> · Sənədlər`; header with home link, search box
and theme toggle; mobile sidebar in a sheet. `loading.tsx`, `error.tsx` per segment,
`global-error.tsx`.

## Rendering rules

- Internal link `./x.md`, `../lessons/y.md` (relative to the current document) → `/docs/...`.
- External `http(s):` link → new tab, `rel="noopener noreferrer"`. Other schemes → rendered as text.
- Raw HTML in Markdown → not rendered as elements.
- Code fence with language → highlighted; copy button announces "Kopyalandı" via `aria-live`.

## Commands (repository root)

| Command                           | Does                                                               |
| --------------------------------- | ------------------------------------------------------------------ |
| `npm run reader`                  | dev server on `http://127.0.0.1:3100`                              |
| `npm run reader:build`            | production build of `apps/reader`                                  |
| `npm run reader:start`            | production server on `127.0.0.1:3100`                              |
| `npm run test`                    | root tests + reader unit tests                                     |
| `npm run typecheck`               | root + reader                                                      |
| `npm run test:e2e -w apps/reader` | Playwright + axe against a production build with fixture documents |

Environment: `DOCUMENTS_DIR` (optional, absolute or relative to the repository root; default
`documents`), `PROFESSOR_CONFIG` (optional; default `config/professor.json`).
