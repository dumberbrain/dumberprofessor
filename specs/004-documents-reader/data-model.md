# Data Model: Local Documents Reader

Read-only, derived from files on disk on every request. No database, no cache.

## Document (`entities/document`)

| Field             | Type                                        | Source / rule                                                               |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| `path`            | string                                      | path relative to `DOCUMENTS_DIR`, `/` separators, e.g. `news/2026-10-31.md` |
| `slug`            | string[]                                    | `path` without `.md`, split on `/`                                          |
| `href`            | string                                      | `/docs/` + segments joined, each `encodeURIComponent`-ed                    |
| `title`           | string                                      | front matter `title` → first `#` heading → file name                        |
| `type`            | `lesson` \| `research` \| `news` \| `other` | front matter → folder (`lessons`, `research`, `news`) → `other`             |
| `domain`          | string \| null                              | front matter `domain` → parent of `lessons`/`research` folder → null        |
| `date`            | string (YYYY-MM-DD) \| null                 | front matter `date` → leading `YYYY-MM-DD` of file name → null              |
| `sources`         | string[]                                    | front matter `sources` (valid URLs only), default `[]`                      |
| `body`            | string                                      | Markdown after front matter                                                 |
| `missingMetadata` | boolean                                     | true when front matter is absent or fails the schema                        |

Front-matter schema (zod, matches feature 002 `fp doc`): `title` string ≥ 1, `type` enum
`lesson|research|news`, `domain` kebab-case optional, `date` `YYYY-MM-DD` (string or YAML date),
`sources` array of URLs optional. Unknown keys ignored.

Excluded: `README.md` at the library root; files outside `DOCUMENTS_DIR` (resolved path must start
with the root — traversal guard); non-`.md` files.

## Library (`entities/document/lib/group`)

```text
Library
├── domains: DomainGroup[]       sorted by domain name (az collation)
│   └── DomainGroup { id, name, lessons: Document[], research: Document[], other: Document[] }  each newest first
├── news: Document[]             newest first
└── unsorted: Document[]         no domain and not news (e.g. missing metadata)
```

Sort key: `date` desc, then `title` asc (az collation); `null` dates last.

## Domain name map (`entities/domain`)

`Record<id, name>` read from `config/professor.json` → `domains[].{id,name}`; missing/invalid file →
empty map (fallback to ids). Never written.

## Search

Input (URL): `q` (trimmed, ≤ 200 chars), `domain` (id or empty), `type` (`lesson|research|news` or
empty). Matching: `toLocaleLowerCase('az')` on query and text. Result `{ document, snippet,
titleMatch }`; title matches first, then date desc. Empty `q` with filters → filtered list without
snippets.

## Table of contents

`TocItem { id, text, depth: 2 | 3 }` from Markdown headings, ids from `github-slugger` (same as
`rehype-slug`); shown when ≥ 3 depth-2 items.
