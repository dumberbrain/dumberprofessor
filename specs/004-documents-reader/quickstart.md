# Quickstart: validate feature 004

Contracts: [routes.md](./contracts/routes.md) · data: [data-model.md](./data-model.md).

## 1. Install and run (SC-001)

```bash
npm install            # root + apps/reader workspace, one lockfile
npm run reader         # → http://127.0.0.1:3100 within 30 s
```

## 2. Read (US1)

Open `/` → click the 2026-10-31 report. Expect: meta header (type, date), claim badges, source links,
no raw Markdown, TOC (the report has ≥ 3 sections), external links open in a new tab. Narrow the
window to 375 px → no horizontal page scroll; tables scroll inside their box.

## 3. Browse (US2)

`/` lists domains by name, news newest first. Temporarily rename `documents/` → empty state shown;
rename back.

## 4. Freshness (US4, SC-005)

With the server running: `npm run fp -- doc save --type research --domain security --title "Test"
<draft>` (or copy any `.md` into `documents/security/research/`) → refresh `/` → listed; delete it →
refresh → gone; its URL shows "not found".

## 5. Search (US3)

`/search?q=node-forge` → the report with a snippet. `/search?q=ŞƏRT` matches "şərt". Add
`&type=lesson` → empty state.

## 6. Safety (SC-004)

Unit test fixture with `<script>alert(1)</script>`, `<img onerror=…>`, `[x](javascript:alert(1))`
renders none of them (`npm test`). Response headers of `/` include `Content-Security-Policy` with a
nonce and no `'unsafe-inline'` in `script-src`.

## 7. Theme and comfort (US5)

Toggle theme → persists after reload; first visit follows the OS setting. Keyboard: Tab reaches skip
link, search, theme toggle, sidebar links with visible focus.

## 8. Gates (SC-006, SC-007)

```bash
npm run check                       # format, lint, typecheck, tests (incl. reader)
npm run test:e2e -w apps/reader     # Playwright + axe: 0 serious/critical
```

CI: the `reader` job (build + E2E + audit) is green.
