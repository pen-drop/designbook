---
name: workflow-update
description: Updates a task's status to in-progress or done.
---

# Step: Update Task Status

Call this step before starting work on a task (`in-progress`) and after completing it (`done`).

## Command

```bash
npx storybook-addon-designbook workflow update $WORKFLOW_NAME <task-id> --status <in-progress|done>
```

## Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `$WORKFLOW_NAME` | captured from create step | The workflow instance name |
| `<task-id>` | string | ID as declared in `workflow create --task` |
| `--status` | `in-progress` \| `done` | New status |

## Lifecycle

```
pending → in-progress → done
```

- `in-progress`: sets `started_at` timestamp
- `done`: sets `completed_at` timestamp; if all tasks are done, archives the workflow

## Pattern

```bash
# Before doing the work:
npx storybook-addon-designbook workflow update $WORKFLOW_NAME <task-id> --status in-progress

# ... do the work, register files (see add-files step) ...

# After validation passes (see validate step):
npx storybook-addon-designbook workflow update $WORKFLOW_NAME <task-id> --status done
```

> ⚠️ **Never mark done before validating.** On the last task, marking `done` archives the workflow — `validate` will fail afterward.
