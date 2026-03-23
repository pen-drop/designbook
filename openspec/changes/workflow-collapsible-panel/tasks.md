## 1. Workflow Level

- [x] 1.1 Replace current workflow row rendering in `WorkflowsTab` with `DeboCollapsible variant="action-summary"` — summary shows status icon + title + time range
- [x] 1.2 Set `defaultOpen` based on workflow status: open for `running`/`planning`, closed for `completed`/`incomplete`
- [x] 1.3 Pass `status` prop mapped from workflow status and `progress={{ done, total }}` from task counts
- [x] 1.4 Wrap workflow summary in `ContextAction` with tasks.yml path

## 2. Stage Level

- [x] 2.1 Render each stage as nested `DeboCollapsible variant="action-item"` — summary shows stage name + progress badge (`done/total`)
- [x] 2.2 Set stage `defaultOpen`: open if stage has `in-progress` or `pending` tasks, closed if all `done`
- [x] 2.3 Pass `status` prop derived from stage task statuses
- [x] 2.4 Wrap stage summary in `ContextAction` with stage's task_file and rule files as extraLinks

## 3. Task Level

- [x] 3.1 Render tasks inside stage body as `ManagerActivityItem` rows (dot + title pattern from `manager-utils.tsx`)
- [x] 3.2 Map task status to activity item: `done` → green dot with checkmark, `pending` → empty circle, `in-progress` → running indicator
- [x] 3.3 Render each task's files as inline `ManagerBadge` after the task title — badge color reflects validation status (green=valid, yellow=invalid, gray=pending)
- [x] 3.4 Wrap each file badge in `ContextAction` with the file's absolute path and validation data

## 4. Cleanup

- [x] 4.1 Remove `WorkflowDetailModal`, `OverviewTab`, `StageTab` components and their styled wrappers from `Panel.tsx`
- [x] 4.2 Remove Modal import if no longer used elsewhere in Panel.tsx
