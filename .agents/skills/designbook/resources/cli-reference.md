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
# → JSON: { running: true, pid, port, url, log, started_at }
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

## Scene URL Resolution

Resolves scene references to Storybook iframe URLs. Reads the active port from `$DESIGNBOOK_DATA/storybook.json` to construct the full URL.

```bash
# Resolve scene to Storybook URL
 resolve-url --scene <group>:<name>
# → JSON array: [{ scene, storyId, url, filePath }]
# → Requires Storybook running (reads port from storybook.json)

# Resolve from explicit file
 resolve-url --scene <name> --file <path-to-scenes.yml>
```

**Output format:**
```json
[{
  "scene": "shell",
  "storyId": "designbook-design-system-scenes--shell",
  "url": "http://localhost:39943/iframe.html?id=designbook-design-system-scenes--shell&viewMode=story",
  "filePath": "/abs/path/designbook/design-system/design-system.scenes.yml"
}]
```

**Note:** The URL includes the active Storybook port from `storybook.json`. If Storybook is not running, the command will fail with "fetch failed". Fallback: derive `storyId` from `designbook/screenshots/` directory listing.

---

## Workflow CLI

> This is the **complete command list** — do not attempt `status`, `tasks`, or other subcommands. To inspect task state, read the workflow's `tasks.yml` directly.

### Commands

```bash
# Create workflow (resolves all stages from frontmatter)
 create --workflow <id> --workflow-file <path> [--parent <name>]
# → returns $WORKFLOW_NAME

# List workflows for an id
 list --workflow <id>
 list --workflow <id> --include-archived

# Inspect stage files (task_file + rules) for a stage
 instructions --workflow <name> --stage <stage>
# → returns JSON: { stage, task_file, rules, blueprints, config_rules, config_instructions }

# Execution (2 calls per task)
 validate --workflow <name> --task <id>
 done     --workflow <name> --task <id> [--params '<json>']
# → when --task intake: --params triggers implicit plan (expands iterables into tasks)
# → without --params on intake: auto-plans with empty params {} (singleton workflows)

# Escape hatch: add file not known at plan time
 add-file --workflow <name> --task <id> --file <path>
```

### `workflow done` with `--params` (Implicit Plan)

When completing the intake task, `--params` triggers implicit plan logic. Stage resolution happens at `workflow create --workflow-file` time. The done command reads the pre-resolved `stage_loaded` from tasks.yml and expands iterables into tasks before marking intake as done.

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name (from `workflow create`) |
| `--task <id>` | Yes | Task id — use `intake` to trigger implicit plan |
| `--params <json>` | No | Intake params — iterables are arrays keyed by `each` name (e.g. `{"component":[...],"scene":[...]}`). Omit for singleton workflows (auto-plans with `{}`) |

**Each expansion:** Stages with `each: <name>` auto-expand all their steps for each item in `params[name]`. Stages without `each` create one singleton task per step.
