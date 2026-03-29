# Workflow CLI Reference

> This is the **complete command list** — do not attempt `status`, `tasks`, or other subcommands. To inspect task state, read the workflow's `tasks.yml` directly.

## Commands

```bash
# Create workflow (resolves all stages from frontmatter)
 create --workflow <id> --workflow-file <path> [--parent <name>]
# → returns $WORKFLOW_NAME

# Plan — expand items into tasks
 plan --workflow $WORKFLOW_NAME \
  --params '<global_params_json>' \
  --items '<items_json>'
# → validates params, expands file paths, computes deps; writes tasks.yml; outputs JSON plan

# Dry-run — preview plan without writing tasks.yml
 plan --workflow $WORKFLOW_NAME \
  --params '<global_params_json>' \
  --items '<items_json>' \
  --dry-run
# → same JSON output, no writes

# List workflows for an id
 list --workflow <id>
 list --workflow <id> --include-archived

# Inspect stage files (task_file + rules) for a stage
 instructions --workflow <name> --stage <stage>
# → returns JSON: { stage, task_file, rules, config_rules, config_instructions }

# Execution (2 calls per task)
 validate --workflow <name> --task <id>
 done     --workflow <name> --task <id>

# Escape hatch: add file not known at plan time
 add-file --workflow <name> --task <id> --file <path>
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
