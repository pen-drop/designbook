---
name: designbook-workflow
description: Manages workflow task tracking via CLI commands. Creates and updates tasks.yml files for Storybook panel progress display and notifications.
---

# Designbook Workflow Tracking

> Tracks AI workflow progress via CLI commands. Storybook's panel polls these files and shows notifications on task completion.

## Steps

- [create](./steps/create.md): Create a workflow tracking file and capture `$WORKFLOW_NAME`
- [update](./steps/update.md): Update a task's status (`in-progress` / `done`)
- [add-files](./steps/add-files.md): Register produced files with a task for validation
- [validate](./steps/validate.md): Validate all registered files; run fix loop until exit 0

## Integration Pattern

Every `debo-*` workflow brackets its work with tracking. Load the relevant steps:

```
1. Load @designbook-workflow/steps/create.md → capture $WORKFLOW_NAME
2. If --spec: output plan and stop
3. For each task:
   a. Load @designbook-workflow/steps/update.md  → mark in-progress
   b. Do the work
   c. Load @designbook-workflow/steps/add-files.md → register produced files
   d. Load @designbook-workflow/steps/validate.md  → fix loop until exit 0
   e. Load @designbook-workflow/steps/update.md  → mark done
4. Last task done → auto-archives
```

## Task Types

| Type | Used for |
|------|----------|
| `component` | Creating/updating UI components |
| `scene` | Creating/updating scenes.yml |
| `data` | Creating/updating data.yml, vision.md, etc. |
| `tokens` | Creating/updating design tokens |
| `view-mode` | Creating/updating view mode mappings |
| `css` | Generating CSS token files |
| `validation` | Running validation commands |

## Directory Structure

```
$DESIGNBOOK_DIST/
└── workflows/
    ├── changes/          # Active workflows
    │   └── [name]/
    │       └── tasks.yml
    └── archive/          # Completed workflows
        └── [name]/
            └── tasks.yml
```

## Task File Format

```yaml
title: Design Shell
workflow: debo-design-shell
started_at: 2026-03-12T18:30:00
completed_at:                      # Set when all tasks are done
tasks:
  - id: create-spec
    title: Create shell spec
    type: scene
    status: pending                # pending | in-progress | done
    started_at:
    completed_at:
```

## Storybook Integration

- Vite plugin watches `workflows/changes/` for file changes
- New `tasks.yml` → full Storybook reload
- All tasks done → full Storybook reload + archive
- Panel polls `/__designbook/workflows` every 3s for progress display
- `api.addNotification()` fires on each task completion
