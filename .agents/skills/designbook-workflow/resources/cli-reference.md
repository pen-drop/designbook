# Workflow CLI Reference

## Commands

```bash
# Early creation (intake phase — no tasks yet)
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" [--parent <name>]
# → returns $WORKFLOW_NAME; creates planning-status tasks.yml with empty tasks

# Plan (after intake — adds tasks to existing planning workflow)
${DESIGNBOOK_CMD} workflow plan --workflow $WORKFLOW_NAME --stages '<json>' --tasks '<json>'

# Full creation in one call (skip intake status)
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" --stages '<json>' --tasks '<json>'
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" --tasks-file <path>

# List workflows for an id
${DESIGNBOOK_CMD} workflow list --workflow <id>
${DESIGNBOOK_CMD} workflow list --workflow <id> --include-archived

# Execution (2 calls per task)
${DESIGNBOOK_CMD} workflow validate --workflow <name> --task <id>
${DESIGNBOOK_CMD} workflow done     --workflow <name> --task <id> --loaded '<json>'

# Escape hatch: add file not known at plan time
${DESIGNBOOK_CMD} workflow add-file --workflow <name> --task <id> --file <path>
```

## `--loaded` JSON Shape

All fields required; use empty arrays when absent:

```json
{
  "task_file": "/abs/path/to/.agents/skills/<skill>/tasks/<stage>.md",
  "rules": ["/abs/path/to/.agents/skills/<skill>/rules/<name>.md"],
  "config_rules": ["string from designbook.config.yml workflow.rules.<stage>"],
  "config_instructions": ["string from designbook.config.yml workflow.tasks.<stage>"],
  "validation": [
    { "file": "/abs/path/to/file.component.yml", "validator": "component", "passed": true },
    { "file": "/abs/path/to/file.twig", "validator": "twig", "passed": true }
  ]
}
```

> ⛔ **All `files[]` paths MUST be absolute.** Never use relative paths. Resolve env vars (`$DESIGNBOOK_DIST`, `$DESIGNBOOK_DRUPAL_THEME`) to their full absolute values before writing the task JSON.
