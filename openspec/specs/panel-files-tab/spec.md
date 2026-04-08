# panel-files-tab Specification

## Purpose
Files sub-tab in the workflow panel: displays all files from all tasks with status indicators and task-based filtering.

## Requirements

### Requirement: Files sub-tab with status coloring
The workflow panel SHALL include a "Files" sub-tab showing a flat file list with status-based row coloring and status dots.

Row background (`fileRowColor`):
1. No `validation_result` — neutral/inherit (pending)
2. `validation_result.valid === true` — green (`rgba(34, 197, 94, 0.12)`)
3. Otherwise — orange (`rgba(245, 158, 11, 0.12)`)

Status dot (`fileStatusDot`), `flushed_at` is primary green indicator:
1. `flushed_at` set — `done` (green)
2. No `validation_result` — `pending` (gray)
3. `validation_result.valid === true` — `done` (green)
4. Otherwise — `in-progress` (yellow)

Each file shows shortened path via `shortenPath()`, file key as label, and a `ContextAction` with validation result.

### Requirement: File badge variant in task summary
`fileBadgeVariant` determines badge color, checking `flushed_at` first:
1. `flushed_at` set — `green`
2. No `validation_result` — `gray`
3. `valid === true` — `green`
4. `valid === false` — `yellow`
5. Otherwise — `gray`

### Requirement: Task-based filtering
Filter badges per task allow viewing files for specific tasks only.

- No filter active: all files displayed
- Click badge: show only that task's files
- Click active badge: remove filter
- Multiple badges: show files from all selected tasks
- No files: display "No files registered yet."
