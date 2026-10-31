---
name: review
description: Spaced-repetition review of topics that are due in the learning record. Use when the user chooses "Təkrar", asks to review or repeat ("təkrar edək", "yoxla məni"), or runs /review [domain].
---

# Review

No lesson, no sources unless an answer needs a correction with a source. Short messages.

1. `npm run -s fp -- learn due [--domain <id>]`. Exit code 2 → "təkrar ediləcək mövzu yoxdur";
   offer a lesson (skill `learn`) and stop.
2. Take at most 3 due topics (oldest first). For each, ask 2 questions in one message: one aimed
   at a listed misconception (if any), one applying the topic in a new situation (different from a
   plain recall question). Language topics: use the language's own question types.
3. Wait for answers; do not reveal them first. Evaluate each in one or two lines, correct
   misconceptions.
4. Per topic:
   `npm run -s fp -- learn record --domain <d> --topic "<t>" --kind review --score <n> --total 2 --misconceptions "<still open; …>"`
5. End with the returned lines (status and next review) — one line per topic.
