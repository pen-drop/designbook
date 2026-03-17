---
name: workflow-create
description: Creates a workflow tracking file and captures the workflow name for subsequent steps.
---

# Step: Create Workflow

Create the tracking file at the start of any `debo-*` workflow.

## Command

```bash
WORKFLOW_NAME=$(npx storybook-addon-designbook workflow create \
  --workflow <workflow-id> \
  --title "<Human-readable title>" \
  --task "<id>:<title>:<type>" \
  [--task "<id>:<title>:<type>" ...])
```

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--workflow` | Kebab-case workflow ID (e.g. `debo-data-model`) |
| `--title` | Human-readable title shown in Storybook panel |
| `--task` | One per task: `<id>:<title>:<type>` (repeat for multiple tasks) |

**Task types**: `component`, `scene`, `data`, `tokens`, `view-mode`, `css`, `validation`

## Output

- Generates unique name: `<workflow-id>-<YYYY-MM-DD>-<4-char-hex>`
- Creates `$DESIGNBOOK_DIST/workflows/changes/<name>/tasks.yml`
- All tasks start as `pending`
- Prints the generated name to stdout — **always capture into `$WORKFLOW_NAME`**

## Example

```bash
WORKFLOW_NAME=$(npx storybook-addon-designbook workflow create \
  --workflow debo-data-model \
  --title "Define Data Model" \
  --task "create-data-model:Create data model:data")
```

## After This Step

If `--spec` flag was passed: output the plan and stop here.
Otherwise: use `$WORKFLOW_NAME` in all subsequent `update` and `validate` calls.
