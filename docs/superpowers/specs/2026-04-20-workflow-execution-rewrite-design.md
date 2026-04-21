# Workflow Execution Rewrite — Design

**Date:** 2026-04-20
**Branch:** `review-skills`
**Driver:** `review.md` — "workflow cli-workflow" section (lines 35-66)

## Summary

Rewrite the designbook skill's workflow-execution story from scratch: consolidate execution docs into a single guide (`workflow-execution.md`), clean up the CLI reference (`cli-workflow.md`), drop authoring content (moves to `designbook-skill-creator`), and make targeted CLI changes to match the new story (implicit config, `list --workflow <id>` filter, `config --var`, `resume`, provider rules on results).

Goals:
- One consistent execution guide, readable end-to-end.
- Every action the AI takes has a clear CLI command behind it — no magic state transitions.
- designbook skill contains only execution-relevant content; authoring belongs to skill-creator.

## Scope Split

**designbook skill (execution only):**
- `resources/workflow-execution.md` — rewrite from scratch
- `resources/cli-workflow.md` — rewrite from scratch
- `resources/cli-reference.md` — keep (unchanged index)
- `resources/cli-config.md`, `cli-storybook.md`, `cli-playwright.md`, `cli-validate.md` — keep (unchanged)
- `SKILL.md` — update Resources list; remove links to removed files

**Removed from designbook:**
- `resources/architecture.md` — authoring content moves to skill-creator; execution bits fold into `workflow-execution.md`
- `resources/task-format.md` — authoring content moves to skill-creator; tasks.yml runtime format folds into `workflow-execution.md`

**designbook-skill-creator (authoring):**
- Absorb gaps from the dropped files. Dedupe against existing `resources/schemas.md`, `rules/structure.md`, `rules/principles.md` before importing.

Parked for a separate spec:
- Architecture question: "no code in executor, everything as reference?"
- skill-creator's own clarity review (validate referencing rules, etc.)

## New `workflow-execution.md` Structure

### 1. Main Loop (engine lens)

~5 bullets stating what the engine does, independent of how the AI acts:
- At `workflow create` and at every stage-done, the engine expands pending tasks whose params are resolved.
- A task is done when all result keys are resolved — via direct submission, provider rule, or task body.
- When every task in a stage is done, scope is collected and expansion runs again.
- Results live either in workflow scope (data results) or on a path (file results).
- Params resolve via `resolve:` code resolvers at create-time or provider rules at task-time; unresolved params block expansion.

### 2. Running a Workflow (AI lens)

- Introduce `_debo` as a one-line inline alias ("we use `_debo` as shorthand for `npx storybook-addon-designbook`"). Not a code block; not a bootstrap step.
- Start with `_debo workflow create --workflow <id> [--params '<json>']`.
- Handle the response:
  - `unresolved:` — present candidates (if any) or ask the user; re-call `create`.
  - Otherwise — first task is already in-progress; proceed to the task loop.
- Resuming an interrupted workflow: `_debo workflow list --workflow <id>` to check for active workflows of this type; if one exists, ask the user continue-or-fresh and pick up by task ID.
- **No `eval config`, no bootstrap.** The CLI loads config internally.

### 3. Task Loop (schema-centric)

For each in-progress task, in order:

1. **Read the schema of the expected results** — `schema.result` from the `workflow create` / `workflow done` response. The schema is the task's goal.
2. **Check providers for each result key.** A provider is a rule with `provides: <result-key>` in frontmatter — its instructions are how that result gets produced. If no provider, the task body fills the role; if neither can resolve a key, ask the user.
3. **Read the task body** — for decisions and flow that schema, rules, and blueprints don't cover (UX choices, user Q&A, conditional logic).
4. **Read rules + blueprints** — constraints and starting points. Silent; never mentioned to the user.
5. **Resolve the schema** — fill every required result key. When asking the user, first run `_debo workflow wait --message "<question>"` (status: `running → waiting`), then ask. After the user answers, run `_debo workflow resume --workflow $WORKFLOW_NAME` to transition back to `running`, then submit via step 6.
6. **Mark the task done:**
   ```
   _debo workflow done --workflow $WORKFLOW_NAME --task <id> --data '<json>'
   ```
   All result keys (file and data) are submitted via `--data`. The CLI serializes file results, validates every result against its schema, and marks the task done.
7. **Follow the response** — `next_step` in the same stage / stage transition with `scope_update` + `expanded_tasks` / `waiting_for` prompting user input / `{ "stage": "done" }` for archive.

Global rule preserved: file results declared in `result:` frontmatter MUST be submitted via `workflow done --data` (or, for `submission: direct`, via `workflow result` after the external tool writes). Direct Write-tool writes are forbidden.

### 4. Param Resolution (behavior)

Not a step — a behavior that runs whenever params are missing:
- **Code resolvers** (`resolve:` on workflow params) run deterministically at `workflow create` time.
- **Provider rules** (`provides: <param>` on rules) execute during task-time when a matching param is still unresolved.
- **User fallback** — when neither code resolver nor provider rule covers a param, the task body asks the user.

### 5. Results

- **File results** (result keys with `path:`): submitted via `--data` on `workflow done`. Default is `submission: data`, `flush: deferred`; override `flush: immediate` when the file must be visible to subsequent steps within the same task; override `submission: direct` when an external tool writes the file (Playwright, etc.) and the CLI only validates.
- **Data results** (result keys without `path:`): submitted via `--data`; flow into workflow scope at stage completion, driving `each:` expansion in later stages.
- **Validation** — file and data results are validated against `schema.definitions` (base + blueprint extensions + rule constraints).
- **tasks.yml runtime format** — brief subsection documenting what the AI sees at runtime (status values, result state semantics: `valid` absent / `valid: true` / `valid: false`).

### 6. Hooks

- **Before hooks** — after `workflow create` (response with `before:` in frontmatter), apply the policy (`always` / `if-never-run` / `ask`), start the hook workflow, complete it fully before continuing.
- **After hooks** — when the workflow archives (response `{ "stage": "done" }`), iterate `after:` entries: prompt the user "Run `/<workflow-id>` next?"; if accepted, start with `--parent $WORKFLOW_NAME`. Include a concrete walk-through (e.g., design-screen → design-verify).

### 7. Untracked Workflows (`track: false`)

Short section preserved — workflows that skip the lifecycle (utility commands).

### 8. Optimize / Research passes

Brief, preserved — minor edits only to reflect removed `eval` step.

## New `cli-workflow.md` Structure

Pure CLI reference, one section per subcommand with consistent structure: purpose → syntax → options table → response shape → notes.

Subcommand changes:

| Subcommand | Change |
|---|---|
| `workflow create` | Rewrite. Still entry point. Remove any reference to "bootstrap". Document intake-skipped response shape. |
| `workflow list` | Extend with optional `--workflow <id>` filter. Without the flag, returns all active workflows. |
| `workflow resume` | **New.** Transitions `waiting → running`. Syntax: `workflow resume --workflow <name>`. Response: current workflow state. |
| `workflow done` | Rewrite for clarity. Same behavior. `--data` is the single submission channel for results. |
| `workflow result` | Keep. Clarify `--key` vs `--path`, `submission: direct` use case, stdin vs `--json`. |
| `workflow get-file` | Keep. Used by external tools. |
| `workflow wait` | Rewrite: document the explicit `wait → running` via new `resume` command. No auto-transition. |
| `workflow instructions` | Demote. Documented as "rarely needed; re-reads current stage's resolved files when context was lost mid-workflow". Not referenced from `workflow-execution.md`. |
| `workflow config --var <NAME>` | **New.** Returns a single variable's resolved value to stdout. Non-zero exit on unknown var. Purpose-built for task bodies needing one shell var without full eval. |
| `workflow abandon`, `workflow merge` | Keep unchanged. |

Removals from the CLI reference:
- `eval "$(_debo config)"` guidance (no longer required)
- `_debo()` helper shown as a code block (inline alias only, in workflow-execution.md)

## CLI Code Changes

Implementation changes required in `packages/storybook-addon-designbook/src/cli/`:

1. **Implicit config loading.** Every subcommand that resolves templates or paths loads config internally on first use. The existing `_debo config` shell-export command remains available for back-compat but is no longer required.
2. **`workflow list --workflow <id>` filter** — new flag on `list`.
3. **New `workflow config --var <NAME>`** subcommand — returns one variable's value.
4. **Provider rules extended to result keys** — rules with `provides: <result-key>` become result providers. The executor reads `provides:` on rules and routes to the rule's instructions when resolving that result.
5. **Remove `waiting → running` auto-transition** — `done` / `result` / `instructions` no longer silently clear waiting state. The bug lived in that mechanism; removing the mechanism removes the bug.
6. **New `workflow resume --workflow <name>`** — explicit `waiting → running` state transition.
7. **Doc-only changes** (no code) — `_debo()` presented inline, not as a code block.

## SKILL.md Update

Resources list after the change:
```
- [workflow-execution.md](resources/workflow-execution.md) — Execution guide
- [cli-reference.md](resources/cli-reference.md) — CLI command index
```

(Removed: `architecture.md`, `task-format.md`.)

## Content Migration — `architecture.md` + `task-format.md`

Stays in designbook (folded into `workflow-execution.md`):
- Main loop / engine behavior
- WORKTREE lifecycle (execution-relevant: staged vs. flushed writes, atomic commit on stage/workflow end)
- Param resolver behavior (create-time + provider rules + user fallback)
- Scope collection + re-expansion
- tasks.yml runtime format
- Result state semantics (`valid` absent / true / false)

Moves to `designbook-skill-creator` (dedupe against existing content first):
- Unified Extension Model (`name`, `as`, `priority`)
- Stage-based architecture authoring details
- Workflow params + resolvers syntax
- `each:` declaration syntax + JSONata rules
- CLI-side resolution internals
- Task / Rule / Blueprint frontmatter specs
- Domain-based matching + domain taxonomy
- JSONata interpolation spec
- `$ref` syntax
- `schemas.yml` format
- Before/After hook frontmatter declaration

## Success Criteria

1. `workflow-execution.md` reads as a single consistent execution guide from main loop through hooks, with no leftover "Step 0.5" / "bootstrap" / `eval` / authoring content.
2. `cli-workflow.md` documents every subcommand with a consistent response-shape format; `list --workflow`, `resume`, `config --var` are present.
3. `architecture.md` and `task-format.md` are removed from designbook; their authoring content lives in `designbook-skill-creator` with no duplication.
4. `SKILL.md` links only `workflow-execution.md` + `cli-reference.md`.
5. The schema-centric task loop reads as the natural description of what the AI does — a reader new to the repo can follow it without prior context.
6. `_debo workflow list --workflow vision`, `_debo workflow config --var DESIGNBOOK_DIRS_CSS`, and `_debo workflow resume --workflow <name>` all work end-to-end.
7. The `waiting → running` auto-transition code path is gone; `wait` and `resume` are symmetric explicit commands.
8. Running a workflow never requires `eval "$(_debo config)"`.

## Open Follow-ups (separate specs)

- Architecture question: "no code in executor, everything as reference?"
- `designbook-skill-creator` clarity review (validate referencing rules, etc.) — surfaced in review.md line 68-69.
- `architecture.md`'s stale DAG orchestration references — resolved by deleting the file; if skill-creator imports any of that content, review independently.
