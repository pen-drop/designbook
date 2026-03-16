## Why

When the AI generates or updates Designbook files (components, scenes, data, tokens), Storybook doesn't reflect the changes until manually restarted. The current `handleHotUpdate` hook only tracks data file dependencies, and the file watcher only emits change events for new `.scenes.yml` files. There is no mechanism for the AI to signal "I'm done, please refresh" — and no feedback in the Storybook UI about what happened.

Users have no visibility into what the AI is doing or how far along a workflow is. The terminal output is the only source of truth.

## What Changes

- **Workflow task tracking**: Each Designbook workflow (e.g., `/debo-design-shell`, `/debo-sample-data`) writes a `tasks.yml` file to `designbook/workflows/changes/[change-name]/`. The file contains a task list with status tracking (`pending`, `in-progress`, `done`). Completed workflows are moved to `designbook/workflows/archive/`.
- **Task file format with timestamps and types**: Each task has `id`, `title`, `status`, `type` (e.g., `component`, `scene`, `data`, `tokens`), `started_at`, and `completed_at` timestamps. The `type` field determines the refresh strategy and enables future grouping in UI.
- **Refresh on workflow start and completion**: A full Storybook refresh triggers when a workflow starts (new `tasks.yml` created) and when it completes (all tasks done). Individual task completions trigger `api.addNotification()` toasts only.
- **Storybook panel with progress**: The Designbook addon panel shows active workflows with progress (e.g., "Design Shell 2/4"). Each workflow can be expanded to show individual tasks with status and type.
- **`DeboActionList` React component**: New UI component displaying a single task with status indicator, title, type badge, and timestamps. Used in the panel and potentially in workflow step widgets on section/shell pages.
- **Workflow lifecycle skill**: A shared skill that manages creating, updating, and archiving workflow task files. All debo-* workflows use this skill to write their task lists.

### Task file format

```yaml
# designbook/workflows/changes/design-shell/tasks.yml
title: Design Shell
workflow: debo-design-shell
started_at: 2026-03-11T18:30:00
completed_at:
tasks:
  - id: create-logo
    title: Logo Component
    type: component
    status: done
    started_at: 2026-03-11T18:30:01
    completed_at: 2026-03-11T18:30:05
  - id: create-navigation
    title: Navigation Component
    type: component
    status: done
    started_at: 2026-03-11T18:30:05
    completed_at: 2026-03-11T18:30:10
  - id: create-header
    title: Header Component
    type: component
    status: in-progress
    started_at: 2026-03-11T18:30:10
    completed_at:
  - id: create-footer
    title: Footer Component
    type: component
    status: pending
    started_at:
    completed_at:
```

### Refresh strategy

| Event | Action |
|-------|--------|
| Workflow started (tasks.yml created) | Full reload |
| Task completed | `api.addNotification()` toast |
| Workflow completed (all tasks done) | Full reload, move to archive |

## Capabilities

### New Capabilities
- `workflow-tasks`: Task file format (`tasks.yml`), lifecycle management (changes → archive), Vite plugin watcher on `designbook/workflows/changes/`, and refresh triggers on workflow start/completion.
- `workflow-panel`: Storybook addon panel showing active workflows with progress and expandable task lists. Uses `DeboActionList` for individual tasks and `api.addNotification()` for completion toasts.
- `workflow-skill`: Shared skill providing utilities for all debo-* workflows to create, update, and archive task files. Single source of truth for task file I/O.

### Modified Capabilities
- `unified-loader`: Extend the Vite plugin's `configureServer` hook to watch `designbook/workflows/changes/` and trigger full reload on workflow start/completion. Serve task data via HTTP middleware for the panel.
- `designbook-shared-components`: New `DeboActionList` UI component (status indicator, title, type badge, timestamps). Follows existing Debo* conventions (DaisyUI classes with `debo:` namespace, composition pattern).

## Impact

- **Vite plugin** (`src/vite-plugin.ts`): New watcher on `designbook/workflows/changes/`, full reload on workflow start/completion, HTTP middleware endpoint for task data.
- **Storybook UI**: Panel rewrite from static command list to live workflow progress. New `DeboActionList` component in `src/components/ui/`. Channel events for server → client task updates.
- **Skills**: New `workflow-skill` shared by all debo-* workflows. Each workflow defines its task list upfront and updates status as it progresses.
- **File structure**: New directories `designbook/workflows/changes/` and `designbook/workflows/archive/`.
- **No breaking changes**: Existing file watching behavior is preserved. Workflow tracking is additive.
