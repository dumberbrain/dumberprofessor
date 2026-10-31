# Feature Specification: Lint, Format and Git Hooks

**Feature Branch**: `003-lint-format-hooks`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "bu layihe ucun husky ve oxlint ve prettier elave etmek isteyirem"
(add husky, oxlint and prettier to this project)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent formatting everywhere (Priority: P1)

The user (and Claude, when editing) gets one consistent code style across the project's source,
tests, configuration and hand-written documentation. A single command formats everything; another
command checks formatting without changing files.

**Why this priority**: every later check depends on a stable baseline; without it, lint and
hook output is noise from style differences (mixed line endings already exist in the repository).

**Independent Test**: run the format check on a clean checkout → passes; change indentation in one
source file → the check names that file; run the format command → the check passes again.

**Acceptance Scenarios**:

1. **Given** the project after the one-time formatting change, **When** the format check runs,
   **Then** it reports zero files to change.
2. **Given** a source file with wrong indentation or quotes, **When** the format check runs,
   **Then** it fails and names the file.
3. **Given** generated or personal content (the document library, personal data, Spec Kit
   templates), **When** formatting runs, **Then** those files are not touched.
4. **Given** the user's hand-edited configuration file, **When** it is formatted, **Then** its
   content and meaning are unchanged (only whitespace/layout may change).

---

### User Story 2 - Fast lint for real bugs (Priority: P1)

A linter catches likely bugs (unused variables, unreachable code, suspicious comparisons, missing
awaits where detectable) in the TypeScript source and tests within a few seconds, without arguing
with the formatter about style.

**Why this priority**: the codebase grew quickly (features 001–002 plus the document library);
an automatic bug check is the cheapest safety net.

**Independent Test**: run the lint command on the project → no errors; add an unused variable to a
source file → the lint command fails naming file and line.

**Acceptance Scenarios**:

1. **Given** the current codebase after fixes, **When** lint runs, **Then** it reports zero errors.
2. **Given** a newly introduced unused import, **When** lint runs, **Then** it fails with file,
   line and rule.
3. **Given** a style-only difference (quotes, spacing), **When** lint runs, **Then** it does not
   report it (formatting is the formatter's job).

---

### User Story 3 - Checks run automatically on commit and push (Priority: P1)

When the user commits, only the staged files are checked quickly (format, lint), the branch name
and the commit message are checked against the project's conventions; when the user pushes, the
whole repository is checked (format, lint, type check, tests). Each step shows its number, what it
checks and how long it took.

**Why this priority**: the checks only help if they run without the user remembering them; the
project's commits already follow Conventional Commits, so the message rule matches current
practice.

**Independent Test**: stage a badly formatted file and commit → the commit is refused with the
file named; write a commit message "wip" → refused; push with a failing test → refused; a normal
commit and push → pass, each step printed with its number and time.

**Acceptance Scenarios**:

1. **Given** a staged file that fails formatting or lint, **When** the user commits, **Then** the
   commit is refused, the failing step is named, and nothing in the working tree is modified.
2. **Given** a commit message not of the form `type(scope): subject` or `type: subject` with an
   allowed type, **When** the user commits, **Then** the commit is refused with the allowed types
   listed. Git's own generated messages (merge, revert, fixup/squash) are accepted.
3. **Given** a branch whose name does not start with an allowed prefix or a feature number
   (e.g. `003-…`), **When** the user commits, **Then** the commit is refused before any file is
   checked; `main`, `master` and a detached HEAD are exempt.
4. **Given** a push, **When** the whole-repository checks run, **Then** steps are numbered with a
   constant total (e.g. `[3/4] typecheck … ok 2.1s`) and any failure stops the push.
5. **Given** an urgent situation, **When** the user sets the documented bypass, **Then** hooks are
   skipped; the hook files themselves document how.
6. **Given** a fresh clone, **When** dependencies are installed, **Then** the hooks are active
   with no further manual step; **Given** dependencies are not installed, **Then** steps that need
   them are skipped with a warning instead of failing or installing anything.

---

### User Story 4 - Same checks outside git (Priority: P2)

The user (or Claude before committing) can run the exact same checks by hand: one command for the
staged-file checks and one for the full sweep.

**Why this priority**: lets Claude verify its own edits before proposing a commit; convenience on
top of US3.

**Independent Test**: run the full-check command → same steps and result as the push hook.

**Acceptance Scenarios**:

1. **Given** any working tree, **When** the full-check command runs, **Then** it performs the same
   steps as the push hook and exits with the same status.

---

### User Story 5 - Server-side check on every push (Priority: P2)

Every push to GitHub and every pull request runs the same full sweep (format check, lint, type
check, tests) on GitHub's servers, so a commit pushed with hooks bypassed is still checked, and
the result is visible on the commit and pull request.

**Why this priority**: the user's hook convention treats CI as the authority and the hooks as a
faster echo of it; the project had no CI (clarified 2026-10-31: add it).

**Independent Test**: push a branch with a lint error using `--no-verify` → the CI run fails on
the lint step; fix and push → the run passes.

**Acceptance Scenarios**:

1. **Given** a push to any branch or a pull request, **When** CI runs, **Then** it performs the
   same steps as the push hook on a clean install and reports pass/fail per step.
2. **Given** a commit that bypassed the local hooks, **When** it is pushed, **Then** CI still
   fails on the first broken check.
3. **Given** CI and the local push hook, **When** their steps are compared, **Then** CI checks
   everything the hooks check (the hooks never check something CI does not).

### Edge Cases

- Windows checkout with CRLF line endings: hook scripts must still run (they must stay LF).
- Files that were already committed with CRLF: the one-time formatting change normalizes them;
  afterwards no mixed endings remain.
- Commit with only deleted files or only non-checkable files (e.g. images): the commit passes with
  the corresponding steps skipped, and the step count reflects only steps that run.
- Partially staged file (some hunks staged): checks must not modify or restage the file.
- Rebase, bisect (detached HEAD) and merges: branch gate and message rule do not block them.
- Formatting a file the `fp` CLI also writes (configuration, generated schema): the CLI's own
  output must already satisfy the formatter, so a later `fp` write does not create format failures.
- Very large reformat diff: the one-time formatting change is its own commit, separate from any
  behavior change, so history stays reviewable.

## Requirements *(mandatory)*

### Functional Requirements

**Formatting**

- **FR-001**: The project MUST use Prettier as its single formatter for TypeScript, JavaScript,
  JSON and hand-written Markdown, with one shared configuration matching the existing style
  (2-space indentation, single quotes, semicolons, 120-character lines, LF line endings).
- **FR-002**: The formatter MUST NOT touch generated or personal content: `documents/`, `data/`,
  `node_modules/`, `.specify/` (Spec Kit templates and scripts), lock files, and `config/legacy/`.
- **FR-003**: The project MUST provide a command that formats all covered files and a command that
  only checks them and fails listing files that need formatting.
- **FR-004**: Files the `fp` CLI writes (`config/professor.json`, `config/professor.schema.json`)
  MUST already be in the formatter's style when written, or be excluded, so `fp` writes never cause
  format failures.
- **FR-005**: A one-time formatting change of the whole project MUST be committed separately from
  any behavior change.

**Linting**

- **FR-006**: The project MUST use oxlint as its linter for TypeScript source and tests, with
  correctness rules enabled and style rules disabled (style belongs to the formatter).
- **FR-007**: Lint MUST report errors with file, line and rule and exit non-zero on errors; the
  existing codebase MUST pass with zero errors (fix real findings; any rule disabled for the project
  MUST be listed with a one-line reason in the configuration).

**Git hooks** (husky, following the user's established three-hook layout)

- **FR-008**: Hooks MUST be managed by husky and become active automatically after dependency
  installation; no hook installs anything or writes to the working tree.
- **FR-009**: `pre-commit` MUST first check the branch name (allowed prefixes:
  `chore|feat|hotfix|bugfix|reconcile|fix|docs|refactor|test|perf|ci`, plus Spec Kit feature
  branches `NNN-…`; `main`, `master`, detached HEAD exempt), then run numbered checks on staged
  files only: format check and lint. It MUST finish in a few seconds for a typical commit.
- **FR-010**: `commit-msg` MUST require a Conventional Commits subject with one of the allowed
  types (`feat|fix|docs|chore|refactor|test|perf|ci|build|style|revert`), optional scope, and
  accept git-generated subjects (`Merge `, `Revert `, `Reapply `, `fixup!`, `squash!`, `amend!`).
- **FR-011**: `pre-push` MUST run the whole-repository sweep with a constant step total: format
  check, lint, type check, tests.
- **FR-012**: Every step MUST be printed with its number before it starts and its result and
  duration after; timing MUST be optional (never block when a clock is unavailable); steps whose
  dependencies are missing MUST be skipped with a warning.
- **FR-013**: Hook files MUST document the bypass (`HUSKY=0` or `--no-verify`) and the manual
  commands; hook scripts MUST be kept with LF endings regardless of the platform checkout.
- **FR-014**: The project MUST provide commands running the staged checks and the full sweep by
  hand, with the same steps and exit status as the hooks.

**Continuous integration**

- **FR-016**: A GitHub Actions workflow MUST run on every push and pull request: clean dependency
  install, then format check, lint, type check and tests, each as a separately reported step,
  failing the run on the first broken check.
- **FR-017**: CI MUST cover every check the hooks perform; CI MUST NOT need secrets or network
  access beyond installing dependencies (tests already run offline).
- **FR-018**: CI MUST run on the Node.js version the project requires (≥ 22) and finish in under
  5 minutes.

**Documentation**

- **FR-015**: The README MUST describe the format, lint and check commands, the hooks, the bypass
  and the CI workflow.

### Key Entities

- **Format configuration**: one shared style definition and an ignore list.
- **Lint configuration**: enabled rule categories and any project-wide exceptions with reasons.
- **Hook set**: shared step machinery, pre-commit, commit-msg, pre-push.
- **CI workflow**: server-side run of the full sweep on push and pull request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A typical commit's checks (1–10 staged files) complete in under 5 seconds.
- **SC-002**: The push sweep completes in under 60 seconds on the user's machine.
- **SC-003**: After the one-time change, the format check and lint report 0 problems on a clean
  checkout, and the full test suite still passes.
- **SC-004**: 100% of the test scenarios in US3 behave as described (refuse bad format, bad lint,
  bad message, bad branch; accept good ones and git-generated messages).
- **SC-005**: Running an `fp` command that writes configuration never makes the format check fail.
- **SC-006**: No hook modifies any file in the working tree in any scenario.
- **SC-007**: A push with a deliberately broken check (made with hooks bypassed) shows a failed
  server-side check within 5 minutes; a clean push shows a passed one.

## Assumptions

- The user's husky convention (`husky-set`: shared step library, numbered timed steps, cost-based
  placement, no extra dependencies such as lint-staged or commitlint) is the target layout.
- The test suite (~10 s) is fast enough for `pre-push`; it stays out of `pre-commit`.
- Spec documents under `specs/` are Markdown written by Spec Kit and Claude; they are formatted
  like other hand-written Markdown. `.specify/` (vendored Spec Kit files) is excluded.
- The formatter's style is chosen to match the current code so the one-time diff is mostly line
  endings and small spacing changes.
- Node.js ≥ 22 and npm remain the toolchain; tools are added as dev dependencies only.
