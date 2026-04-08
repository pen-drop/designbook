# workflow-log-panel Specification

## Purpose
Render workflow activity in the Storybook manager panel using collapsible + tabbed UI with four sub-tabs (Summary, Tasks, Context, Files).

## Requirements

### Requirement: Collapsible workflow display with tabbed body
Each workflow renders as `DeboCollapsible` (variant `action-summary`) with summary row (status dot, title, active task hint, ContextAction, progress badge). Body contains Summary, Tasks, Context, Files tabs (Summary active by default).

- `status: running` or `planning` — open by default
- `status: completed` or `incomplete` — closed by default

### Requirement: Workflow summary row content
Summary row shows: status dot, title, active task hint (if any), ContextAction for log path, progress badge (done/total).

- Running task "Create tokens" with 5/12 done: shows hint + badge `5/12`
- All done: badge shows `12/12` with green variant

### Requirement: Workflow row ContextAction
Summary row includes `ContextAction` with log file path (`{designbookDir}/workflows/{changes|archive}/{changeName}/tasks.yml`), providing "Copy path" and "Open in editor" via ellipsis button.

### Requirement: ContextAction component
Reusable wrapper providing ellipsis menu via `WithTooltip trigger="click"` + `TooltipLinkList`. Props:
- `path` (absolute): "Copy path" and "Open in editor" actions (`api.openInEditor({ file })`)
- `validation` (optional): displays validation status in menu
- `extraLinks` (optional): additional menu entries

### Requirement: Server provides designbookDir
`/__designbook/workflows` returns `{ designbookDir, workflows }` so the panel can construct absolute paths.

### Requirement: stage_loaded in API response
Workflow data includes `stage_loaded` for each workflow (skills, rules, config) for the Context tab.

### Requirement: Maximum log entries
Panel displays at most 10 workflows (MAX_LOG_ENTRIES).
