# CLI: workflow

Manages workflow lifecycle — create, execute tasks, track stage transitions.

> This is the **complete command list** — do not attempt `status`, `tasks`, or other subcommands.

## Global options

| Option | Description |
|---|---|
| `--research` | Enable research mode. Tags all log entries with `research: true` for post-workflow audit. |

All `workflow` subcommands write structured JSONL log entries to `$DESIGNBOOK_DATA/dbo.log`. Each line is a JSON object with `ts`, `cmd`, `args`, and `result` or `error`. When `--research` is set, entries include `research: true`.

## `workflow create`

Create a new workflow tracking file. The workflow `.md` file is resolved automatically from the workflow ID via `skills/**/workflows/<id>.md`.

```bash
 workflow create --workflow <id> [--parent <name>] [--params <json>]
```

| Option | Required | Description |
|---|---|---|
| `--workflow <id>` | Yes | Workflow identifier (e.g. `vision`, `design-screen`) |
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
 . [--include-archived]
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
  "items": [{ "scene": "shell", "product_name": "My Product" }]
}
```

## `workflow get-file`

Return the staged and final path for a file key. Used by external tools (e.g. Playwright) that write files directly.

```bash
 workflow get-file <workflow-name> <task-id> --key <key>
```

| Argument/Option | Required | Description |
|---|---|---|
| `<workflow-name>` | Yes | Positional — workflow name |
| `<task-id>` | Yes | Positional — task ID from `expanded_tasks` |
| `--key <key>` | Yes | Result key as declared in task `result:` frontmatter |

**Response:**
```json
{ "staged_path": "/abs/path/to/file.png.wf-id.debo", "final_path": "/abs/path/to/file.png" }
```

The `staged_path` is where external tools should write. After writing, call `workflow result --key <key> --external` to register.

## `workflow result`

Write a task result (file or data), validate, and update task state.

### File result (content from stdin)

```bash
cat <<'EOF' | workflow result --task <task-id> --key <key>
<file content>
EOF
```

Writes file content from stdin. The file path is resolved from the task's `result:` declaration. Validation runs immediately (JSON Schema + semantic validators).

### Data result (JSON inline)

```bash
workflow result --task <task-id> --key <key> --json '<json-data>'
```

Stores structured data inline in `tasks.yml`. Data results flow into the workflow scope when the stage completes, making them available to subsequent stages via `each:`.

### File result — submission and flush

Results declare two orthogonal fields in the task frontmatter: `submission:` (who produces the content) and `flush:` (when it lands on disk). Both have defaults, so simple tasks need neither.

```yaml
result:
  type: object
  properties:
    extract:
      path: "{{ reference_dir }}/extract.json"
      flush: immediate            # write when `workflow done` completes, before stage flush
    component-yml:
      path: "components/{{name}}/{{name}}.component.yml"
      # submission: data  flush: deferred   (implicit defaults)
    screenshot:
      path: "screenshots/{{ story_id }}.png"
      submission: direct          # task code writes the file (e.g. Playwright); CLI only validates
```

Use `flush: immediate` when the file must be readable by subsequent steps within the same task (e.g. extract-reference writes a file that the same intake task reads next). `submission: direct` is for outputs produced by external tools whose content can't be round-tripped through `--data`.

### Path mode — direct write

```bash
cat <<'EOF' | workflow result --task <task-id> --path <absolute-path>
<file content>
EOF
```

`--path` writes directly to the given path without requiring a result key declaration in the task frontmatter. The file is **not** tracked in the task's gate check — use for auxiliary reference files (e.g. `design-reference.json`) that rules produce but that aren't task deliverables.

`--path` and `--key` are mutually exclusive.

| Option | Required | Description |
|---|---|---|
| `--task <id>` | Yes | Task ID from `expanded_tasks` |
| `--key <key>` | One of key/path | Result key as declared in task `result:` frontmatter |
| `--path <path>` | One of key/path | Direct file path (bypasses result key lookup) |
| `--json <data>` | No | JSON data for data results (mutually exclusive with stdin) |
| `--external` | No | Register an already-written file (skip stdin) |

**Response (file result):**
```json
{ "valid": true, "errors": [], "file_path": "/abs/path/to/written/file" }
```

**Response (data result):**
```json
{ "valid": true, "errors": [] }
```

If `valid: false`, fix content and call again.

## `workflow done`

Mark a task as done. Triggers stage transitions, scope collection, and auto-archives when all tasks complete.

```bash
 workflow done --workflow <name> --task <id> [--loaded <json>] [--summary <text>]
```

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name |
| `--task <id>` | Yes | Task ID to mark done |
| `--loaded <json>` | No | Stage context payload for observability (task_file, rules, config_rules, config_instructions) |
| `--summary <text>` | No | Short human-readable result summary for the task |

**Gate checks before marking done:**
- All declared results must be written via `workflow result` and valid
- Results with unresolved `{param}` placeholders are skipped

**Output:**
```
Task <id> → done (N/M tasks complete)
  ✓ Completed Task — done
  ○ Current Task — in-progress
  · Pending Task — pending

RESPONSE: <json>
```

Parse the `RESPONSE:` JSON line — it drives all subsequent actions. All responses include `stage_progress` and `stage_complete` fields.

**Response: next task in same stage**
```json
{ "stage": "component", "step_completed": "create-component", "next_step": "create-component", "stage_progress": "1/3", "stage_complete": false }
```

**Response: stage transition (stage complete, scope collected)**
```json
{ "stage": "test", "transition_from": "component", "next_stage": "test", "next_step": "screenshot", "stage_progress": "3/3", "stage_complete": true, "scope_update": { "issues": [...] }, "expanded_tasks": [{ "id": "...", "step": "...", "stage": "...", "title": "..." }] }
```

When `stage_complete: true`, the engine has collected all data results from the completed stage into the workflow scope. `scope_update` shows which keys were added. `expanded_tasks` lists tasks expanded for the next stage(s) based on the updated scope.

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
{ "stage": "done", "dispatch": [{ "workflow": "design-verify", "params": { "..." } }] }
```

## `workflow wait`

Set workflow status to `waiting`. Use before asking the user a question. The Storybook panel shows an amber pulse animation and the optional message.

```bash
_debo workflow wait --workflow <name> [--message "<question for the user>"]
```

| Option | Description |
|--------|------------|
| `--workflow` | Workflow name (required) |
| `--message` | Question or prompt to display in the workflow panel (optional) |

The workflow transitions `running → waiting`. The next CLI call (`done`, `result`, or `instructions`) automatically transitions back to `running` and clears the message.

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
