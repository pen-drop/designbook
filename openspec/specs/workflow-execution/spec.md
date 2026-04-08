# workflow-execution Specification

## Purpose
Defines workflow runtime: CLI commands, response-driven execution, lifecycle state machine, engines, dispatch, and panel display.

---

## Requirement: CLI commands

Available: `workflow create`, `workflow done`, `workflow write-file`, `workflow instructions`, `workflow list`, `workflow abandon`, `workflow merge`. No `plan`, `validate`, or `update` subcommands.

---

## Requirement: workflow create

Accepts `--workflow <id>`, `--workflow-file <path>`, optional `--title`, `--parent`, `--params`. Resolves all stages, creates intake task (if declared), outputs JSON with workflow name, steps, stages, engine, step_resolved, expected_params.

- Creates unique name `<id>-<date>-<hex>`, `tasks.yml` under `$DESIGNBOOK_DATA/workflows/changes/<name>/`, status `planning`
- Intake task created with `id: intake`, `status: in-progress` from stages frontmatter
- If `--params` satisfies all required `expected_params` → intake skipped, tasks expanded immediately, `intake_skipped: true`

---

## Requirement: workflow done

Accepts `--workflow <name>`, `--task <id>`, optional `--params <json>`, `--loaded <json>`. Marks task done, computes next action via lifecycle, emits `RESPONSE:` JSON.

- Task set to `done` with `completed_at`, all task file timestamps updated
- Gate-check: rejects if declared files unwritten or have `validation_result.valid === false`
- `--params` with intake → plan mode; with non-intake → append mode
- `--loaded` stored in `stage_loaded[step]` (first write wins)

---

## Requirement: Response-driven execution

`workflow done` returns `RESPONSE:` JSON that drives all execution. AI MUST follow the response.

| Condition | Response |
|-----------|----------|
| More pending tasks in stage | `{ "stage": "<current>", "next_step": "<step>" }` |
| Stage transition | `{ "stage": "<next>", "transition_from": "<prev>", "next_stage": "<next>", "next_step": "<step>" }` |
| Unfulfilled stage params | `{ "waiting_for": { "<key>": { "type": "<type>", "prompt": "<text>" } } }` |
| Subworkflow dispatch | `{ "stage": "done", "dispatch": [{ "workflow": "<id>", "workflow_file": "<path>", "params": {...} }] }` |
| All stages exhausted | `{ "stage": "done" }`, workflow archived |

---

## Requirement: workflow write-file

`workflow write-file <name> <task-id> --key <key>` reads stdin, delegates to engine, validates, updates task file entry.

- Success: `{ "valid": true, "errors": [], "file_path": "<path>" }`
- Failure: `{ "valid": false, "errors": ["<msg>"] }`, exit 1; AI must fix and retry
- First successful write transitions status `planning` → `running`
- Unknown key → error listing valid keys

---

## Requirement: workflow instructions

`workflow instructions --workflow <name> --stage <name>` returns resolved task_file, rules, blueprints, config_rules, config_instructions, expected_params from `stage_loaded`. Subworkflow stages include `dispatch: true`, `workflow`, `workflow_file`, `items`.

---

## Requirement: workflow list

`workflow list --workflow <id>` lists unarchived workflows, newest first. `--include-archived` includes archived.

---

## Requirement: Workflow status lifecycle

Values: `planning`, `running`, `completed`, `incomplete`.

- `workflow create` → `planning`
- First `write-file` → `running`
- All stages exhausted → `completed`, archived to `workflows/archive/`
- `workflow abandon` → `incomplete`, archived

---

## Requirement: WorkflowTask data model

Fields: `id`, `title`, `type`, `step`, `stage`, `status` (`pending`|`in-progress`|`done`|`incomplete`), `started_at`, `completed_at`, `params`, `task_file`, `rules`, `blueprints`, `config_rules`, `config_instructions`, `files`. Each file entry has `path`, `key`, `validators`, optional `validation_result` and `flushed_at`.

---

## Requirement: Atomic writes and file locking

- All tasks.yml modifications written atomically via temp file + rename
- Modifying commands acquire `.lock` via `withLockAsync` before read-modify-write
- Retry with exponential backoff (base 50ms, up to 10 attempts); stale locks (>30s) auto-removed

---

## Requirement: Lifecycle state machine

Stages from frontmatter traversed in order with implicit stages (`committed`, `finalizing`, `done`) injected after declared stages.

- Declared `[intake, execute, test, preview]` → full order: `created → planned → intake → execute → test → preview → committed → finalizing → done`
- Empty stages (no steps, no `workflow`) excluded
- `engine.onTransition(from, to, ctx)` called at stage boundaries; may return `requires` or `archive`
- Implicit stages always traversed (e.g. `committed` triggers `onTransition` even without tasks)

---

## Requirement: Write isolation engines

Two engines: `git-worktree` (isolated branch + worktree) and `direct` (stash directory, flushes at stage boundaries). Resolution: CLI flag > frontmatter `engine:` > auto-detection. Engine name, `write_root`, `root_dir`, optional `worktree_branch` stored in tasks.yml.

---

## Requirement: Sequential execution

Tasks execute sequentially via `RESPONSE:` JSON. No DAG-based parallel dispatch, wave scheduling, or subagent orchestration. Main agent executes directly, no `Agent` tool spawning.

---

## Requirement: Child workflow dispatch

For stages with `workflow` and `each`, parent dispatches via `RESPONSE: { dispatch: [...] }`. AI creates each sequentially: `workflow create --workflow <id> --workflow-file <path> --parent <parent> --params '<json>'`. Intake skipped, tasks expanded immediately.

---

## Requirement: Task-level execution cycle

Load instructions → do work → write files via `write-file` → fix validation errors → mark done via `workflow done` → follow `RESPONSE:`.

---

## Requirement: Workflow resume

- AI checks `workflow list --workflow <id>` at startup; if found, asks "Continue or start fresh?"
- Fresh start → `workflow abandon --workflow <existing>` before creating new

---

## Requirement: Panel displays workflow status

Status dot mapping: `planning` → pending, `running` → in-progress, `completed` → done. Panel shows each task with status dot and live duration for running tasks. File entries show validation status indicators.
