# CLI: workflow

Per-subcommand reference for `_debo workflow <subcommand>`. This is a dry reference — see [`workflow-execution.md`](workflow-execution.md) for the narrative on running a workflow.

All CLI calls here use `_debo` as shorthand for `npx storybook-addon-designbook` (defined once in `workflow-execution.md`).

> This is the **complete command list** — no `status`, `tasks`, or other subcommands exist.

## Global flag

| Flag | Description |
|---|---|
| `--log` | Tag this CLI call in `$DESIGNBOOK_DATA/dbo.log` (picked up by post-workflow `--research` audits). Placed before the subcommand: `_debo workflow --log done …`. |

Every subcommand writes a JSONL entry to `dbo.log` with `ts`, `cmd`, `args`, and either `result` or `error`.

---

## `workflow create`

**Purpose:** Create a new workflow tracking file. The workflow `.md` is resolved from the workflow id via `skills/**/workflows/<id>.md`. Resolves workflow-level `resolve:` params, applies defaults, expands the first task, and marks it `in-progress`.

**Syntax:**

```bash
_debo workflow create --workflow <id> [--title <title>] [--parent <name>] [--params <json>]
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <id>` | Yes | Workflow identifier (e.g. `vision`, `design-screen`). |
| `--title <title>` | No | Human-readable title. Defaults to the workflow file's `title:` frontmatter. |
| `--parent <name>` | No | Triggering workflow name when started via a hook. |
| `--params <json>` | No | JSON object of initial params (e.g. from parent dispatch or user-supplied overrides). |

**Response shape:**

```json
{
  "name": "vision-2026-04-08-a3f7",
  "steps": ["vision:intake", "create-vision"],
  "stages": {
    "intake": { "steps": ["vision:intake"] },
    "create-vision": { "steps": ["create-vision"] }
  },
  "engine": "direct",
  "step_resolved": {
    "vision:intake": {
      "task_file": "/abs/path/intake--vision.md",
      "rules": [],
      "blueprints": [],
      "config_rules": [],
      "config_instructions": [],
      "schema": { "params": {}, "result": {}, "definitions": {} }
    },
    "create-vision": { "…": "…" }
  },
  "expected_params": {
    "product_name": { "required": true, "from_step": "create-vision" }
  },
  "task_ids": { "create-vision": "task-create-vision-a3f7" }
}
```

Intake-skip case (design-component-style workflow where `--params` already carries every required input): the response includes `task_ids` for the pre-expanded second-stage tasks, and the first of those is already `in-progress`.

**Notes:**

- `step_resolved[<step>].schema` is the authoritative goal statement for the task loop (see `workflow-execution.md` §3).
- Capture `name` into `$WORKFLOW_NAME` — every subsequent call needs it.

---

## `workflow list`

**Purpose:** List workflow names for a given workflow id, newest-first.

**Syntax:**

```bash
_debo workflow list --workflow <id> [--include-archived]
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <id>` | Yes | Workflow identifier to list (e.g. `debo-design-shell`). |
| `--include-archived` | No | Also include archived workflows. |

**Response shape:** Newline-separated workflow names, one per line:

```
vision-2026-04-08-a3f7
vision-2026-04-05-b1c2
```

**Notes:**

- Empty output = no active workflows of that id.
- Used to decide between resume and fresh-start before calling `create` (see `workflow-execution.md` §2 "Resuming an interrupted workflow").

---

## `workflow resume`

**Purpose:** Transition workflow status from `waiting` to `running`. Call after the user answers a `workflow wait` prompt and before submitting the answer via `done` / `result`.

**Syntax:**

```bash
_debo workflow resume --workflow <name>
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name (e.g. `vision-2026-04-08-a3f7`). |

**Response shape:**

```json
{ "status": "running", "workflow": "vision-2026-04-08-a3f7" }
```

**Notes:**

- Pair with `workflow wait`. `running → waiting → running` is the full cycle; neither transition is automatic.
- Errors if the workflow is missing or already archived.

---

## `workflow done`

**Purpose:** Mark a task as done. Validates submitted results against the task's schema, serializes file results to their declared paths, updates workflow scope when a stage completes, and auto-archives the workflow when every task is `done`.

**Syntax:**

```bash
_debo workflow done --workflow <name> --task <id> [--data <json>] [--loaded <json>] [--summary <text>]
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name. |
| `--task <id>` | Yes | Task id to mark done. |
| `--data <json>` | No | JSON object with result values — keys must match the task's declared result entries. Required in practice whenever the task declares any non-`submission: direct` result. |
| `--loaded <json>` | No | JSON payload with stage context (`task_file`, `rules`, `config_rules`, `config_instructions`) and task validation results. Observability only. |
| `--summary <text>` | No | Short human-readable result summary for the task. |

**Response shape:** Human-readable status lines followed by a single `RESPONSE:` line carrying the engine payload.

```
Task <id> → done (2/3 tasks complete)
  ✓ Completed Task — done
  ○ Current Task — in-progress
  · Pending Task — pending

RESPONSE: {"stage":"component","step_completed":"create-component","next_step":"render","stage_progress":"2/3","stage_complete":false}
```

Payload variants on the `RESPONSE:` line:

- **Next task in same stage:** `{ "stage": "...", "step_completed": "...", "next_step": "...", "stage_progress": "N/M", "stage_complete": false }`
- **Validation failure (known key, bad data):** exit 0, payload `{ "stage": "<current>", "validation_errors": ["outputs/svg: must be a string", ...] }`. Task stays `in-progress`; re-call `done` with corrected `--data`.
- **Stage transition:** adds `"stage_complete": true`, `"transition_from": "...", "next_stage": "...", "scope_update": { ... }, "expanded_tasks": [ ... ]`.
- **Stage-transition resolver failure:** exit 0, payload includes `"resolver_errors": { "<key>": { "input": "...", "error": "..." } }`. Cannot advance until the offending inputs are fixed.
- **Waiting for params:** `{ "stage": "...", "waiting_for": { "<key>": { "type": "...", "prompt": "..." } } }` — run `workflow wait`, ask the user, `workflow resume`, then resubmit `done` with the answer in `--data`.
- **Workflow complete:** `{ "stage": "done" }`. Archived-case also prints `Workflow <name> archived (all tasks done)`.

**Notes:**

- `done` exits non-zero only on thrown errors (unknown result keys, missing workflow, IO/lock failures). When known keys fail schema or validator checks, exit is 0 and the `RESPONSE:` payload carries `validation_errors`; the task stays `in-progress` and you re-call with corrected `--data`.
- `--data` carries both file and data results. File results are staged under `.debo` and atomically flushed at stage end (or immediately for `flush: immediate` keys).
- `submission: direct` results are registered via `workflow result` first, then `done` closes the task (see below).

---

## `workflow result`

**Purpose:** Register an externally-written file result (`submission: direct`) or record a data result inline. For everything else, submit results via `workflow done --data`.

**Syntax:**

```bash
_debo workflow result --workflow <name> --task <id> --key <key> [--json <data>]
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name. |
| `--task <id>` | Yes | Task id. |
| `--key <key>` | Yes | Result key as declared in the task's `result:` frontmatter. |
| `--json <data>` | No | Inline JSON for a data result. Omitting `--json` marks the key as an externally-written file — the CLI reads the staged path from the schema. |

**Response shape:**

```json
{ "valid": true, "errors": [] }
```

On validation failure:

```json
{ "valid": false, "errors": ["outputs/svg: must be a string", "data: required key missing"] }
```

Exits non-zero when `valid: false`.

**Notes:**

- There is **no `--external` flag.** External-file submission is implicit: no `--json` means "the tool already wrote the file; validate and register it." With `--json`, the key is treated as a data result.
- Typical direct-submission flow: task runs the external tool (e.g. Playwright) → tool writes to the staged path from `workflow get-file` → call `workflow result --key <k>` → when all keys are in place, call `workflow done`.

---

## `workflow get-file`

**Purpose:** Return the staged path for a declared file-result key. External writers (Playwright, headless CLIs) need this to know where to write.

**Syntax:**

```bash
_debo workflow get-file <workflow-name> <task-id> --key <key>
```

**Options / arguments:**

| Name | Required | Description |
|---|---|---|
| `<workflow-name>` | Yes | Positional — workflow name. |
| `<task-id>` | Yes | Positional — task id. |
| `--key <key>` | Yes | Result key declared in task `result:` frontmatter. |

**Response shape:**

```json
{ "staged_path": "/abs/path/to/file.png.wf-id.debo", "final_path": "/abs/path/to/file.png" }
```

**Notes:**

- Always write to `staged_path`, never to `final_path`. The CLI promotes staged → final on `workflow done`.
- After writing, call `workflow result --key <key>` (no `--json`) to register, then `workflow done` when all keys are in place.

---

## `workflow wait`

**Purpose:** Set workflow status to `waiting`. Use before asking the user a question — the Storybook panel shows an amber pulse with the optional message.

**Syntax:**

```bash
_debo workflow wait --workflow <name> [--message "<prompt for the user>"]
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name. |
| `--message <text>` | No | Question or prompt to display in the workflow panel. |

**Response shape:**

```json
{ "status": "waiting", "workflow": "vision-2026-04-08-a3f7", "message": "Pick a component name" }
```

(`message` is present only when `--message` was passed.)

**Notes:**

- Transitions `running → waiting`. Returning to `running` is **explicit**: you must call `workflow resume` after the user answers. `done`, `result`, and `instructions` do not auto-clear `waiting` — they simply fail or stay waiting until `resume` runs.
- Typical loop: `wait` → ask the user → `resume` → submit answer via `done --data`.

---

## `workflow instructions`

**Purpose:** Re-fetch the files to load for a given stage (`task_file`, `rules`, `blueprints`, `config_rules`, `config_instructions`, and the stage's schema). Returns the same shape that `workflow create` already provided in `step_resolved[<step>]`.

**Syntax:**

```bash
_debo workflow instructions --workflow <name> --stage <stage>
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name. |
| `--stage <stage>` | Yes | Stage name (e.g. `intake`, `create-component`). Falls back to the stage's first step name if the direct key misses. |

**Response shape:**

```json
{
  "stage": "create-vision",
  "task_file": "/abs/path/create-vision.md",
  "rules": ["/abs/path/vision-format.md"],
  "blueprints": [],
  "config_rules": [],
  "config_instructions": [],
  "schema": { "params": {}, "result": {}, "definitions": {} },
  "submit_results": "…hint text…"
}
```

On an unknown stage, exits non-zero and prints available stages:

```
Error: no resolved data for stage "foo". Available stages: intake, create-vision.
```

**Notes:**

- Rarely needed in normal execution — the `create` response already carries enough to proceed. Use to re-read the current stage's files when context was lost mid-workflow.

---

## `workflow config`

**Purpose:** Return the value of a single resolved config variable. Useful inside a task body that needs one `DESIGNBOOK_*` value without loading the full config.

**Syntax:**

```bash
_debo workflow config --var <name>
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--var <name>` | Yes | Variable name (e.g. `DESIGNBOOK_DIRS_CSS`). |

**Response shape:** The raw value, printed to stdout with no wrapping:

```
/abs/path/to/css
```

Exits non-zero with `Error: unknown variable "<name>"` when the variable is not defined.

**Notes:**

- Scope is the resolved env map the CLI uses internally — every `DESIGNBOOK_*` variable plus workspace-derived paths.

---

## `workflow abandon`

**Purpose:** Archive a workflow as `incomplete`. Runs the engine's cleanup hook (e.g. deletes the git worktree branch) first.

**Syntax:**

```bash
_debo workflow abandon --workflow <name>
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name. |

**Response shape:** Human-readable lines:

```
Workflow vision-2026-04-08-a3f7 archived as incomplete
  Summary: <summary>
```

**Notes:**

- Use when the user declines to resume an interrupted workflow, or to clean up before starting fresh.
- Irreversible — the archived workflow only surfaces via `workflow list --include-archived`.

---

## `workflow merge`

**Purpose:** Squash-merge a workflow branch back to its base, delete the branch, kill any preview, and archive the workflow. Only meaningful for the `git-worktree` engine.

**Syntax:**

```bash
_debo workflow merge --workflow <name>
```

**Options:**

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name. |

**Response shape:** Human-readable lines:

```
✓ Workflow vision-2026-04-08-a3f7 merged and archived
  Branch:  debo/vision-2026-04-08-a3f7 (deleted)
  Commit:  workflow: vision-2026-04-08-a3f7
```

**Notes:**

- Run only after every task is `done` and the user has approved the result.
- Errors if the engine isn't `git-worktree` or the branch can't be squash-merged cleanly.
