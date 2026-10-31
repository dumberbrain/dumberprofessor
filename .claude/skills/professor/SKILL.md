---
name: professor
description: Session entry point of the Professor. Asks what the user wants (news, lesson, review, English, a question) and routes to the right skill. Use at session start when the context says "Professor session start", or when the user runs /professor or says "nə edək", "nə öyrənək", "başla".
---

# Professor — router

Keep this turn short: one menu, then hand off. Answer in the configured language (default
Azerbaijani, technical terms in English).

## 1. State

Use the `Professor session start` lines already in context; if absent, run
`npm run -s fp -- session-start`. If it says the config is invalid: show the errors with the fix
hint, tell the user to edit `config/professor.json` (check: `npm run -s fp -- config check`), and
stop.

## 2. Ask (mode ask, or when invoked by the user)

One AskUserQuestion, header "Bu gün", at most 4 options, built from the state line:

- **Dərs** — new or in-progress lesson (mention the in-progress topic if any)
- **Təkrar** — only if due reviews > 0 (show the count)
- **Xəbərlər** — mention unread count if > 0
- **İngilis dili** — if an `english` (language) domain exists
  If more than 4 apply, drop Xəbərlər first when unread is 0. The automatic "Other" answer is a
  free request (a question, a task, "explain X", "help with this code").

In mode actions: skip the question and run the listed actions in order; skip one whose
precondition is missing (no due reviews, nothing unread) with a one-line note.

## 3. Route

| Choice                                                 | Do                                                                                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dərs                                                   | invoke skill `learn`                                                                                                                                              |
| Təkrar                                                 | invoke skill `review`                                                                                                                                             |
| Xəbərlər                                               | unread > 0 → `npm run -s fp -- unread` and show it; else invoke skill `daily-report`                                                                              |
| İngilis dili                                           | invoke skill `english`                                                                                                                                            |
| free text                                              | invoke skill `research` with the user's words                                                                                                                     |
| change focus / depth / domains                         | invoke skill `focus`                                                                                                                                              |
| my documents / library ("sənədlərim", "nə öyrənmişəm") | `npm run -s fp -- doc list [--domain id] [--type lesson\|research\|news] [--q text]`; open a file only when the user picks one; full index: `documents/README.md` |

Never change focus, domains or depth yourself (constitution IX). You may suggest it in one line.
