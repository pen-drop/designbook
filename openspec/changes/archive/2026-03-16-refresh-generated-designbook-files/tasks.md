## 1. Task File Format & Directories

- [x] 1.1 Create `designbook/workflows/changes/` and `designbook/workflows/archive/` directories with `.gitkeep`
- [x] 1.2 Define TypeScript interface for `tasks.yml` format (WorkflowTaskFile, WorkflowTask types)
- [x] 1.3 Add YAML parse/serialize utility for task files

## 2. Workflow Skill

- [x] 2.1 Create `workflow-skill` agent skill with SKILL.md defining task file I/O conventions
- [x] 2.2 Implement `createWorkflow(changeName, title, workflow, tasks[])` — creates `tasks.yml` with all tasks in `pending` status
- [x] 2.3 Implement `updateTask(changeName, taskId, status)` — updates task status with timestamps, atomic write
- [x] 2.4 Implement `archiveWorkflow(changeName)` — moves directory from changes to archive
- [x] 2.5 Handle idempotent workflow creation (update existing if present)

## 3. Vite Plugin — Watcher & Refresh

- [x] 3.1 Add watcher on `designbook/workflows/changes/` in `configureServer` hook
- [x] 3.2 Detect new `tasks.yml` creation → trigger full Storybook reload via `server.ws.send({ type: 'full-reload' })`
- [x] 3.3 Detect `tasks.yml` update where all tasks are `done` → trigger full reload
- [x] 3.4 Ignore partial task updates (not all done) — no reload

## 4. Vite Plugin — HTTP Endpoint

- [x] 4.1 Add `/__designbook/workflows` middleware endpoint in `configureServer`
- [x] 4.2 Scan `designbook/workflows/changes/*/tasks.yml`, parse YAML, return JSON array
- [x] 4.3 Include `changeName` (from directory name) in each response entry

## 5. DeboActionList UI Components

- [x] 5.1 Study Storybook's internal `ActionList` from `storybook/internal/components` as reference (structure, API, visual design)
- [x] 5.2 Create `src/components/ui/DeboActionList.jsx` — list container with compound component API (`DeboActionList.Item`, `.Icon`, `.Text`, `.Badge`)
- [x] 5.3 Implement `DeboActionList.Item` — compact single-line row with icon, label, and trailing content
- [x] 5.4 Implement status icon rendering: green checkmark (done), spinner (in-progress), neutral circle (pending)
- [x] 5.5 Implement label color by status: success color (done), default (in-progress), muted (pending)
- [x] 5.6 Use existing `DeboBadge` for type display (component, scene, data, etc.) — no new badge component
- [x] 5.7 Style with `debo:` prefixed Tailwind/DaisyUI classes — no dependency on `storybook/internal/components`

## 6. Workflow Panel

- [x] 6.1 Rewrite `Panel.tsx` to fetch `/__designbook/workflows` and display active workflows
- [x] 6.2 Show workflow title + progress indicator (e.g., "3/5") for each workflow
- [x] 6.3 Add expand/collapse per workflow to show `DeboActionList` task list
- [x] 6.4 Show empty state when no active workflows
- [x] 6.5 Implement 3s polling when panel is active, stop when hidden

## 7. Notifications

- [x] 7.1 Detect task status delta between polls (track previous state)
- [x] 7.2 Call `api.addNotification()` when a task transitions to `done`
- [x] 7.3 Set headline to task title, subHeadline to workflow title, auto-dismiss after 5s

## 8. Integration & Testing

- [ ] 8.1 Update one debo-* workflow (e.g., `debo-design-shell`) to use workflow-skill as proof of concept
- [x] 8.2 Verify end-to-end: workflow writes tasks → panel shows progress → notifications fire → reload on completion
- [ ] 8.3 Test concurrent workflows (two active changes simultaneously)
- [ ] 8.4 Test workflow resumption (interrupted workflow, restart)
