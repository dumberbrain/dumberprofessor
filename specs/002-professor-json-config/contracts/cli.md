# CLI contract: Professor commands (feature 002)

Extends [001 cli.md](../../001-daily-news-report/contracts/cli.md). All commands accept `--json`.
Exit codes: 0 ok · 1 invalid input/config · 2 nothing to do · 3 conflict. Text output is compact
plain text meant to be read by skills (token economy, FR-040). `--date YYYY-MM-DD` overrides
"today" on learning commands (tests).

## Configuration

| Command             | Behaviour                                                                                                                                  | Status   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `fp config check`   | validate `config/professor.json`; `ok: N domains, M sources` or one line per issue `<field.path>: <problem>[ (did you mean "x"?)]`, exit 1 | baseline |
| `fp config migrate` | YAML → JSON per research R3; prints counts; moves YAML to `config/legacy/`; second run: `nothing to migrate`, exit 2                       | new      |
| `fp config schema`  | regenerate `config/professor.schema.json` from the zod schema                                                                              | new      |
| `fp config init`    | write the default file if missing; exit 3 if it exists                                                                                     | new      |

Any command that loads config (all except `config init`) migrates first when needed (R3) and
fails with exit 1 and the issue list when invalid.

## Focus (Principle IX)

| Command                      | Output                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `fp focus` / `fp focus show` | `focus: a, b` or `focus: none (all domains equal)` + `domains: id (name, depth); …` |
| `fp focus set <id…>`         | writes `focus`; unknown id → exit 1, file unchanged                                 |
| `fp focus clear`             | writes `[]`                                                                         |

## Learning

| Command                                                                                                                            | Output                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fp learn context [--domain id]`                                                                                                   | domain/kind/depth/level, focus, priority topics, in-progress, next curriculum topic, due count, mastered/learning, open misconceptions, lesson settings (filtered question types), language, extra-source policy, lesson sources (`- id kind T<tier> url`). No domain and no focus → exit 1 listing ids |
| `fp learn start --domain id --topic t [--prerequisites "a; b"] [--objectives "x; y"]`                                              | `started id/t (in-progress)`                                                                                                                                                                                                                                                                            |
| `fp learn record --domain id --topic t --score n --total n [--kind lesson\|review] [--strengths "a; b"] [--misconceptions "x; y"]` | `id/t: n/N · status · confidence c · next review YYYY-MM-DD`; `score > total` → exit 1                                                                                                                                                                                                                  |
| `fp learn due [--domain id]`                                                                                                       | `domain · topic · due D · last n/N · misconceptions: …` per line; none → `no reviews due`, exit 2                                                                                                                                                                                                       |
| `fp learn status [--domain id]`                                                                                                    | `domain · topic · status · confidence · next D` per line                                                                                                                                                                                                                                                |

`learn context` lists only sources whose `use` includes `lessons`.

## Session and media

| Command                                  | Output                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fp session-start [--hook]`              | ≤ 3 lines: instruction (`ask` → ask the user; `actions` → run in order: …) + `state: unread reports N · [failed scheduled runs N ·] due reviews N · [lesson in progress: …] · focus: …`. `off` → empty. Invalid config → error lines, exit 0 (hook must not fail). `--hook` wraps it as SessionStart `additionalContext` JSON |
| `fp transcript <url> [--max chars=8000]` | `language: xx (untrusted content)` + `[m:ss] text` lines, truncated with a note; unavailable → `unavailable: <reason>`, exit 2                                                                                                                                                                                                |

## Changed (feature 001 commands)

| Command                               | Change                                                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fp collect`                          | reads `sources` with `use ∋ news` and `enabled`; records `focus`, `depthByDomain` in the run; ranking applies focus (R6)                                         |
| `fp sources check\|resolve`           | operate on news sources in `professor.json`; `resolve` writes `channelId` via `updateProfessor('sources', …)`; check warns on `unspecified` Extensibility fields |
| `fp save-report`                      | draft `focus` must equal run focus; item domains must be configured                                                                                              |
| `fp search --domain id`               | any id in config or stored items                                                                                                                                 |
| `fp schedule enable\|disable\|status` | settings in `professor.json` `schedule`; task `Professor-DailyReport`; removes legacy `FrontendProfessor-DailyReport`                                            |
| `fp unread`                           | header text without "Frontend"                                                                                                                                   |
