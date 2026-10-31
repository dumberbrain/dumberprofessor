# Quickstart: validate feature 002

Prerequisites: Node.js ≥ 22, `npm install`; optional `yt-dlp`. Commands from the repo root.
Contracts: [cli.md](./contracts/cli.md), [skills.md](./contracts/skills.md); data:
[data-model.md](./data-model.md).

## 1. Automated

```powershell
npm test            # unit, integration, contract (incl. schema-in-sync, migration counts)
npm run typecheck
```

## 2. Migration (US1, SC-002)

1. Start from a checkout that still has `config/sources.yml`, `interests.yml`, `settings.yml`.
2. `npm run fp -- config migrate` → prints counts equal to the YAML contents; YAML moved to
   `config/legacy/`.
3. `npm run fp -- config migrate` again → `nothing to migrate`, exit 2.
4. `npm run fp -- sources check` → all news sources probed as before.

## 3. Hand edits and errors (US1, US6)

1. Add a domain `backend` and a source of kind `youtube-video` for it; `npm run fp -- config check` → ok.
2. Change a source domain to `beckend` → error with `sources.N.domains.0` and `did you mean "backend"`.
3. Break the JSON (remove a bracket) → error with position; `npm run fp -- session-start` shows
   the errors and no action instruction.
4. Rename `config/professor.json` away → any command recreates the default (or migrates YAML).

## 4. Focus (US4)

```powershell
npm run fp -- focus set security backend   # file keeps all other content
npm run fp -- focus set beckend            # exit 1, file unchanged
npm run fp -- collect                      # run envelope has focus; focus items rank first
```

Then `/daily-report` → header shows "Fokus: security, backend"; non-focus items marked
"(fokusdan kənar)"; security advisories present.

## 5. Session start (US2)

1. Copy `scripts/schedule/claude-settings.example.json` to `.claude/settings.json` (review it).
2. `sessionStart.mode: "ask"` → new session, send "salam" → one question with the enabled options.
3. `mode: "actions"`, actions `[review, lesson]` → review runs first (or is skipped with a note),
   then a lesson starts.
4. `mode: "off"` → nothing happens.

## 6. Lesson and review (US3, US5)

1. `/learn backend` with depth `beginner`, quiz 3 → two teaching messages, then 3 questions of the
   configured types; answers not shown before you answer.
2. Answer → `npm run fp -- learn status --domain backend` shows the topic with next review date.
3. `npm run fp -- learn due --date <next review>` lists it; `/review` quizzes it.
4. Repeat with depth `expert` → no basic definitions, more internals/trade-offs.

## 7. English (FR-039)

`/english` → choose "Yazı düzəlişi", paste a paragraph → corrected text + original → correct → why
table; `npm run fp -- learn status --domain english` shows the recurring error as a topic.

## 8. Rename (US7, SC-008)

```powershell
npm run fp -- schedule enable --time 08:00   # Task Scheduler: only Professor-DailyReport exists
git grep -n "Frontend Professor" -- . ':!specs/001-*' ':!.specify/memory/constitution.md'   # no hits
```
