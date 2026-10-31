---
name: focus
description: Show or change the Professor's focus, domains, depth, curriculum, sources or session-start behaviour in config/professor.json — only on the user's explicit request. Use for "fokusu dəyiş", "backend-ə fokuslan", "yeni sahə əlavə et", "bu YouTube videosunu mənbə kimi əlavə et", "dərinliyi artır", or /focus.
---

# Focus and configuration

Only the user decides (constitution IX). Make exactly the change they asked for; never more.

| Request                                                                                                               | Do                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| show                                                                                                                  | `npm run -s fp -- focus show`                                                                                                |
| set focus                                                                                                             | `npm run -s fp -- focus set <id> [<id>…]` (order = priority)                                                                 |
| clear focus                                                                                                           | `npm run -s fp -- focus clear`                                                                                               |
| anything else (domain, depth, level, curriculum, source, YouTube link, session start, lesson settings, extra sources) | Edit `config/professor.json` (fields are documented in `config/professor.schema.json`), then `npm run -s fp -- config check` |

Rules for edits:

- New domain: kebab-case `id`, `name`, `description`; `kind` `language` for languages, `general`
  for non-software fields.
- New source: kebab-case `id`, `kind` (`docs`, `web`, `rss`, `github`, `youtube-channel`,
  `youtube-video`, `youtube-playlist`), `url`, `tier` (1 official … 4 learning resource),
  `domains`. Do not fetch the URL to "check" it unless asked.
- If `config check` fails, fix your edit (not the user's other content) and re-check.
- Confirm with one line showing what changed.
