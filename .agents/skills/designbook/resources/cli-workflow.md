# CLI: workflow

Manages workflow lifecycle — create, execute tasks, track stage transitions.

> This is the **complete command list** — do not attempt `status`, `tasks`, or other subcommands.

## `workflow create`

Create a new workflow tracking file from a workflow `.md` file.

```bash
 workflow create --workflow <id> --workflow-file <path> [--parent <name>] [--params <json>]
```

| Option | Required | Description |
|---|---|---|
| `--workflow <id>` | Yes | Workflow identifier (e.g. `vision`, `design-screen`) |
| `--workflow-file <path>` | Yes | Absolute path to workflow `.md` file |
| `--title <title>` | No | Human-readable workflow title |
| `--parent <name>` | No | Parent workflow name (traceability for child workflows) |
| `--params <json>` | No | Initial params JSON. If all required params are satisfied, intake is skipped and tasks are expanded immediately. |

**Response (normal — with intake):**
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
      "config_instructions": []
    },
    "create-vision": {
      "task_file": "/abs/path/create-vision.md",
      "rules": ["/abs/path/vision-format.md"],
      "blueprints": [],
      "config_rules": [],
      "config_instructions": []
    }
  },
  "expected_params": {
    "product_name": { "required": true, "from_step": "create-vision" },
    "description": { "required": true, "from_step": "create-vision" },
    "features": { "required": false, "from_step": "create-vision", "default": [] }
  }
}
```

**Response (intake skipped — `--params` satisfies all required params):**
```json
{
  "name": "design-verify-2026-04-08-b1c2",
  "intake_skipped": true,
  "expanded_tasks": [
    { "id": "screenshot-a3f2b1", "step": "screenshot", "stage": "capture", "title": "Screenshot: shell sm" }
  ],
  "steps": ["..."],
  "stages": { "...": "..." },
  "step_resolved": { "...": "..." },
  "expected_params": { "...": "..." }
}
```

When `intake_skipped: true`, the first expanded task is already marked `in-progress`.

## `workflow list`

List active workflows for a given workflow ID.

```bash
 workflow list --workflow <id> [--include-archived]
```

Returns workflow names newest-first, one per line. With `--include-archived`, also scans the archive.

## `workflow instructions`

Get resolved file paths for a stage — the AI reads these files to know what to do.

```bash
 workflow instructions --workflow <name> --stage <stage>
```

**Response (normal stage):**
```json
{
  "stage": "create-vision",
  "task_file": "/abs/path/create-vision.md",
  "rules": ["/abs/path/vision-format.md"],
  "blueprints": [],
  "config_rules": [],
  "config_instructions": [],
  "expected_params": { "product_name": { "required": true } }
}
```

Stage name resolution: tries direct key first, then looks up via the stage's first step name.

**Response (subworkflow dispatch stage):**
```json
{
  "stage": "verify",
  "dispatch": true,
  "workflow": "design-verify",
  "workflow_file": "/abs/path/design-verify.md",
  "items": [{ "scene": "shell", "product_name": "My Product" }]
}
```

## `workflow write-file`

Write file content from stdin, validate, and update task state.

```bash
cat <<'EOF' | workflow write-file <workflow-name> <task-id> --key <key>
<file content>
EOF
```

| Argument/Option | Required | Description |
|---|---|---|
| `<workflow-name>` | Yes | Positional — workflow name |
| `<task-id>` | Yes | Positional — task ID from `expanded_tasks` |
| `--key <key>` | Yes | File key as declared in task frontmatter |

Content is read from stdin. The CLI writes via the engine (git-worktree or direct) and validates against the task's declared validators.

**Response:**
```json
{ "valid": true, "errors": [], "file_path": "/abs/path/to/written/file" }
```

If `valid: false`, fix content and call again.

## `workflow done`

Mark a task as done. Triggers stage transitions and auto-archives when all tasks complete.

```bash
 workflow done --workflow <name> --task <id> [--params <json>] [--loaded <json>]
```

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name |
| `--task <id>` | Yes | Task ID to mark done |
| `--params <json>` | No | Params JSON — expands new tasks. The CLI decides plan vs. append mode based on workflow state. |
| `--loaded <json>` | No | Stage context payload for observability (task_file, rules, config_rules, config_instructions) |

**Gate checks before marking done:**
- All declared files must be written and valid
- Files with unresolved `{param}` placeholders are skipped
- Files that exist on disk (e.g. binary screenshots) are accepted without validation_result

**Output:**
```
Expanded N tasks                          ← only if --params expanded tasks
Task <id> → done (N/M tasks complete)
  ✓ Completed Task — done
  ○ Current Task — in-progress
  · Pending Task — pending

RESPONSE: <json>
```

Parse the `RESPONSE:` JSON line — it drives all subsequent actions.

**Response: next task in same stage**
```json
{ "stage": "component", "step_completed": "create-component", "next_step": "create-component" }
```

**Response: stage transition**
```json
{ "stage": "test", "transition_from": "component", "next_stage": "test", "next_step": "screenshot" }
```

**Response: waiting for user params**
```json
{ "stage": "preview", "waiting_for": { "user_approved": { "type": "boolean", "prompt": "Preview OK?" } } }
```

**Response: workflow complete**
```json
{ "stage": "done" }
```

**Response: workflow complete with child dispatch**
```json
{ "stage": "done", "dispatch": [{ "workflow": "design-verify", "workflow_file": "/abs/path", "params": { "..." } }] }
```

**Response: done with expanded tasks (when `--params` provided)**
```json
{ "stage": "create-vision", "transition_from": "...", "next_stage": "create-vision", "next_step": "create-vision", "expanded_tasks": [{ "id": "...", "step": "...", "stage": "...", "title": "..." }] }
```

## `workflow abandon`

Archive a workflow as incomplete.

```bash
 workflow abandon --workflow <name>
```

Dispatches `engine.cleanup()` (e.g. deletes git branch), then archives with status `incomplete`.

## `workflow merge`

Squash-merge a workflow branch and archive. Only for `git-worktree` engine.

```bash
 workflow merge --workflow <name>
```

Merges the worktree branch back, deletes the branch, and archives the workflow.
