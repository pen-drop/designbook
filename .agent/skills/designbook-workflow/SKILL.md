---
name: designbook-workflow
description: Manages workflow task tracking via CLI commands. Creates and updates tasks.yml files for Storybook panel progress display and notifications.
---

# Designbook Workflow Tracking

> Tracks AI workflow progress via CLI commands. Storybook's panel polls these files and shows notifications on task completion.

## Prerequisites

- Designbook CLI must be built (`node packages/storybook-addon-designbook/dist/cli.js`)
- During development, replace `npx storybook-addon-designbook` with `node packages/storybook-addon-designbook/dist/cli.js`

## CLI Commands

### Create Workflow

```bash
WORKFLOW_NAME=$(designbook workflow create \
  --workflow <workflow-id> \
  --title "<Human-readable title>" \
  --task "<id>:<title>:<type>" \
  [--task "<id>:<title>:<type>" ...])
```

- Generates unique name: `<workflow-id>-<YYYY-MM-DD>-<4-char-hex>`
- Creates `$DESIGNBOOK_DIST/workflows/changes/<name>/tasks.yml`
- All tasks start as `pending`
- Prints the generated name to stdout — capture it for subsequent `update` calls

### Update Task

```bash
designbook workflow update <name> <task-id> --status <in-progress|done>
```

- Sets task status and timestamps (`started_at` for in-progress, `completed_at` for done)
- When all tasks are `done`: sets top-level `completed_at` and moves to `workflows/archive/`
- Validates task exists and status transition is valid

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

## Integration Pattern

Every `debo-*` workflow brackets its work with tracking:

```
1. Create workflow → capture $WORKFLOW_NAME
2. If --spec: output plan and stop
3. For each step:
   a. designbook workflow update $WORKFLOW_NAME <task-id> --status in-progress
   b. Do the work
   c. designbook workflow update $WORKFLOW_NAME <task-id> --status done
4. Last task done → auto-archives
```

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
