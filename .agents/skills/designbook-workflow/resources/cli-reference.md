# Workflow CLI Reference

## Commands

```bash
# Early creation (intake phase — no tasks yet)
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" [--parent <name>]
# → returns $WORKFLOW_NAME; creates planning-status tasks.yml with empty tasks

# Plan — expand items into tasks (uses stage_loaded from create)
${DESIGNBOOK_CMD} workflow plan --workflow $WORKFLOW_NAME \
  --params '<global_params_json>' \
  --items '<items_json>'
# → validates params, expands file paths, computes deps; writes tasks.yml; outputs JSON plan

# Plan — legacy mode (AI pre-builds the tasks array)
${DESIGNBOOK_CMD} workflow plan --workflow $WORKFLOW_NAME --stages '<json>' --tasks '<json>'

# Full creation in one call (skip intake status)
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" --stages '<json>' --tasks '<json>'
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" --tasks-file <path>

# List workflows for an id
${DESIGNBOOK_CMD} workflow list --workflow <id>
${DESIGNBOOK_CMD} workflow list --workflow <id> --include-archived

# Execution (2 calls per task)
${DESIGNBOOK_CMD} workflow validate --workflow <name> --task <id>
${DESIGNBOOK_CMD} workflow done     --workflow <name> --task <id>

# Escape hatch: add file not known at plan time
${DESIGNBOOK_CMD} workflow add-file --workflow <name> --task <id> --file <path>
```

## `workflow plan` Options

Stage resolution happens at `workflow create --workflow-file` time. The `plan` command reads the pre-resolved `stage_loaded` from tasks.yml.

| Option | Required | Description |
|---|---|---|
| `--workflow <name>` | Yes | Workflow name (from `workflow create`) |
| `--items <json>` | Yes | Array of `{stage, params}` items |
| `--params <json>` | No | Global params — merged as defaults into each item's params before validation |

**Param merging:** Global `--params` are merged with item-level `params` (item takes precedence). Params common to all items (e.g. `product_name`) go in `--params` instead of repeating per item.

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
      "config_rules": [],
      "config_instructions": [],
      "files": ["/abs/path/components/button/button.component.yml"]
    }
  ]
}
```
