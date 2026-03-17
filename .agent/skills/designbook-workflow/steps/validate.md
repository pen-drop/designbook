---
name: workflow-validate
description: Validates all registered files in an active workflow. Runs fix loop until all pass.
---

# Step: Validate Workflow Files

Run after registering files with `add-files` and before marking the task done.

## Command

```bash
npx storybook-addon-designbook workflow validate $WORKFLOW_NAME
```

## Output Format

One JSON line per registered file:

```json
{ "task": "create-data-model", "file": "data-model.yml", "type": "data-model", "valid": true }
{ "task": "create-component", "file": "components/card/card.component.yml", "type": "component", "valid": false, "error": "Missing required field: slots" }
{ "task": "create-scenes", "file": "scenes/home.scenes.yml", "type": "scenes", "valid": true, "skipped": true }
```

| Field | Meaning |
|-------|---------|
| `"valid": true` | File passes schema validation |
| `"valid": false` | File has errors — fix before continuing |
| `"skipped": true` | Storybook not running; story/scene files skipped (exit 0) |

## Exit Codes

- `0` — all files valid (or skipped)
- `1` — one or more `"valid": false`

## Fix Loop

```
1. Run validate
2. For each "valid": false → read the error, fix the file
3. Re-run validate
4. Repeat until exit 0
```

If warnings are present (no errors): ask the user before proceeding.

## After This Step

Once exit code is 0, mark the task done:

```bash
npx storybook-addon-designbook workflow update $WORKFLOW_NAME <task-id> --status done
```

> ⚠️ **Never run validate after marking the last task done.** Marking all tasks done archives the workflow — subsequent `validate` calls will fail because the workflow is no longer in `changes/`.
