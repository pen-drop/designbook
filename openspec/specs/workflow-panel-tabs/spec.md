# workflow-panel-tabs Specification

## Purpose
Workflow panel UI: collapsible workflows with status-colored progress, four-tab interface (Summary, Tasks, Context, Files).

---

## Requirement: Workflow collapsible display

Each workflow renders as `DeboCollapsible` (variant `action-summary`) with summary showing status dot, title, active task hint, ContextAction, progress badge (e.g. `5/12`). Body contains tabbed view.

| Status | Default state |
|--------|--------------|
| `running` | open |
| `planning` | open |
| `completed` | closed |
| `incomplete` | closed |

---

## Requirement: Workflow tabbed view

Four tabs inside collapsible: Summary, Tasks, Context, Files. Summary selected by default. Active tab persisted via `useUrlState('debo-wf-tab')`. Tab switching preserves state.

---

## Requirement: Status-colored borders and progress bar

`DeboCollapsible` uses status colors: `done` = `rgb(102, 191, 60)`, `running` = `#FEF3C7`, `pending`/`incomplete` = `#F1F5F9`. The `action-summary` variant displays a progress bar colored by status.

---

## Requirement: Summary tab

Displays: progress bar with status dot and done/total count, timestamp range with duration, optional summary text, and currently running task in expandable collapsible.

- Running workflow: status dot + progress bar + `N/M` count + timestamp + live duration
- Completed workflow: formatted time range (e.g. "14:20 - 14:35") + total duration
- No `summary` field → no summary text section

---

## Requirement: Active task collapsible

In Summary tab, `DeboCollapsible` (variant `action-inline`), open by default for `in-progress` tasks. Shows title, status dot, live duration. Body shows stage, step, loaded context, files. No running task → section hidden.

- Context section: lists `task_file`, `rules[]`, `blueprints[]`, `config_rules[]`, `config_instructions[]` with type badge and shortened name
- Files section: file badges with validation-based coloring

---

## Requirement: Tasks tab — flat list by stage

All tasks as flat list grouped by stage headers (derived from workflow `stages`). Intake tasks displayed alongside all others. No step-level grouping.

Stage headers: visual dividers with stage name + progress badge (`2/2` green, `pending` gray, `running` yellow). Tasks appear in original order from `WorkflowData.tasks`.

Task row backgrounds by status:

| Status | Background | Details |
|--------|-----------|---------|
| `done` | `rgba(34, 197, 94, 0.08)` | Green dot, title at 0.7 opacity, duration |
| `in-progress` | `rgba(245, 158, 11, 0.10)` | Amber dot, title, live elapsed label |
| `pending` | transparent | Neutral dot, title |

---

## Requirement: Context tab with step filter

Displays all loaded context from `stage_loaded` in filterable table. Columns: Name, Type, Step. Type shows `ManagerBadge` (`task`, `rule`, `blueprint`, `config`, `instruction`).

- Multi-select step filter badges; no selection → show all
- Split into "loaded" (done/in-progress steps, full opacity) and "pending" (below divider, 0.5 opacity)
- Full path shown on hover via `title` attribute

---

## Requirement: Files tab with task filter

All files across tasks in filterable list with multi-select task filter badges.

File row: status dot, shortened path, file key, ContextAction. Background colored by validation (green=valid, amber=invalid, transparent=pending).

File status dot derivation:
- `flushed_at` set → done
- `validation_result.valid === true` (no `flushed_at`) → done
- `validation_result.valid === false` → in-progress
- No validation result → pending

---

## Requirement: File badges with ContextAction

Files displayed as `ManagerBadge` with `ContextAction` ("Copy path", "Open in editor").

Badge color: green if `flushed_at` or valid, yellow if invalid, gray if no result. Context menu includes validation info when available.

---

## Requirement: ContextAction on workflow headers

Workflow summary rows include `ContextAction` with tasks.yml path ("Copy path", "Open in editor").
