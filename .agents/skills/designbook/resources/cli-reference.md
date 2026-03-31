# CLI Reference

## Storybook Process Management

Manages the Storybook daemon lifecycle. State is persisted in `$DESIGNBOOK_DATA/storybook.json` (PID/port) and `$DESIGNBOOK_DATA/storybook.log` (output).

```bash
# Start Storybook as a detached daemon, wait until ready
 storybook start [--port <port>]
# → JSON to stdout: { ready, pid, port, log, startup_errors }
# → exit 0 if ready, exit 1 on timeout (120s)
# → errors if already running (use restart instead)

# Stop a running Storybook
 storybook stop [--pid <pid>]
# → reads PID from storybook.json when --pid omitted
# → SIGTERM → 5s wait → SIGKILL if needed
# → removes storybook.json

# Check if Storybook is running
 storybook status
# → JSON: { running: true, pid, port, log, started_at }
# → JSON: { running: false } or { running: false, stale: true }
# → cleans up stale PID file automatically

# Print Storybook log output
 storybook logs [-f|--follow]
# → without -f: prints log content to stdout
# → with -f: tails log, polling every 1s

# Restart (stop + start)
 storybook restart [--port <port>]
```

---

## Workflow CLI

> This is the **complete command list** — do not attempt `status`, `tasks`, or other subcommands. To inspect task state, read the workflow's `tasks.yml` directly.

### Commands

```bash
# Create workflow (resolves all stages from frontmatter)
 create --workflow <id> --workflow-file <path> [--parent <name>]
# → returns $WORKFLOW_NAME

# Plan — expand stages into tasks via each iterables
 plan --workflow $WORKFLOW_NAME \
  --params '<params_json>'
# → stages with each: expand iterables into tasks; stages without each: singleton tasks
# → validates params, expands file paths, computes deps; writes tasks.yml; outputs JSON plan

# Dry-run — preview plan without writing tasks.yml
 plan --workflow $WORKFLOW_NAME \
  --params '<params_json>' \
  --dry-run
# → same JSON output, no writes

# List workflows for an id
 list --workflow <id>
 list --workflow <id> --include-archived

# Inspect stage files (task_file + rules) for a stage
 instructions --workflow <name> --stage <stage>
# → returns JSON: { stage, task_file, rules, blueprints, config_rules, config_instructions }

# Execution (2 calls per task)
 validate --workflow <name> --task <id>
 done     --workflow <name> --task <id>

# Escape hatch: add file not known at plan time
 add-file --workflow <name> --task <id> --file <path>
```

### `workflow plan` Options

Stage resolution happens at `workflow create --workflow-file` time. The `plan` command reads the pre-resolved `stage_loaded` from tasks.yml.

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name (from `workflow create`) |
| `--params <json>` | No | Intake params — iterables are arrays keyed by `each` name (e.g. `{"component":[...],"scene":[...]}`) |

**Each expansion:** Stages with `each: <name>` auto-expand all their steps for each item in `params[name]`. Stages without `each` create one singleton task per step.

**JSON output format:**
```json
{
  "params": { "section_id": "dashboard" },
  "stages": ["create-component", "create-scene"],
  "tasks": [
    {
      "id": "create-component-button",
      "title": "Create Component: button",
      "type": "component",
      "stage": "create-component",
      "depends_on": [],
      "params": { "component": "button", "slots": [] },
      "task_file": "/abs/path/.agents/skills/.../tasks/create-component.md",
      "rules": ["/abs/path/.agents/skills/.../rules/rule.md"],
      "blueprints": ["/abs/path/.agents/skills/.../blueprints/section.md"],
      "config_rules": [],
      "config_instructions": [],
      "files": ["/abs/path/components/button/button.component.yml"]
    }
  ]
}
```
