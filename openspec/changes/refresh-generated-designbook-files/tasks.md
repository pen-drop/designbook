## 1. Task File Format & Directories

- [ ] 1.1 Create `designbook/workflows/changes/` and `designbook/workflows/archive/` directories with `.gitkeep`
- [ ] 1.2 Define TypeScript interface for `tasks.yml` format (WorkflowTaskFile, WorkflowTask types)
- [ ] 1.3 Add YAML parse/serialize utility for task files

## 2. Workflow Skill

- [ ] 2.1 Create `workflow-skill` agent skill with SKILL.md defining task file I/O conventions
- [ ] 2.2 Implement `createWorkflow(changeName, title, workflow, tasks[])` — creates `tasks.yml` with all tasks in `pending` status
- [ ] 2.3 Implement `updateTask(changeName, taskId, status)` — updates task status with timestamps, atomic write
- [ ] 2.4 Implement `archiveWorkflow(changeName)` — moves directory from changes to archive
- [ ] 2.5 Handle idempotent workflow creation (update existing if present)

## 3. Vite Plugin — Watcher & Refresh

- [ ] 3.1 Add watcher on `designbook/workflows/changes/` in `configureServer` hook
- [ ] 3.2 Detect new `tasks.yml` creation → trigger full Storybook reload via `server.ws.send({ type: 'full-reload' })`
- [ ] 3.3 Detect `tasks.yml` update where all tasks are `done` → trigger full reload
- [ ] 3.4 Ignore partial task updates (not all done) — no reload

## 4. Vite Plugin — HTTP Endpoint

- [ ] 4.1 Add `/__designbook/workflows` middleware endpoint in `configureServer`
- [ ] 4.2 Scan `designbook/workflows/changes/*/tasks.yml`, parse YAML, return JSON array
- [ ] 4.3 Include `changeName` (from directory name) in each response entry

## 5. DeboTaskItem UI Component

- [ ] 5.1 Create `src/components/ui/DeboTaskItem.jsx` with props: `id`, `title`, `type`, `status`, `startedAt`, `completedAt`
- [ ] 5.2 Render status icon: checkmark (done), spinner (in-progress), circle (pending)
- [ ] 5.3 Render type badge using `DeboBadge` component
- [ ] 5.4 Render relative timestamps (e.g., "2m ago") for `startedAt`/`completedAt`
- [ ] 5.5 Follow `debo:` prefixed Tailwind class convention

## 6. Workflow Panel

- [ ] 6.1 Rewrite `Panel.tsx` to fetch `/__designbook/workflows` and display active workflows
- [ ] 6.2 Show workflow title + progress indicator (e.g., "3/5") for each workflow
- [ ] 6.3 Add expand/collapse per workflow to show `DeboTaskItem` list
- [ ] 6.4 Show empty state when no active workflows
- [ ] 6.5 Implement 3s polling when panel is active, stop when hidden

## 7. Notifications

- [ ] 7.1 Detect task status delta between polls (track previous state)
- [ ] 7.2 Call `api.addNotification()` when a task transitions to `done`
- [ ] 7.3 Set headline to task title, subHeadline to workflow title, auto-dismiss after 5s

## 8. Integration & Testing

- [ ] 8.1 Update one debo-* workflow (e.g., `debo-design-shell`) to use workflow-skill as proof of concept
- [ ] 8.2 Verify end-to-end: workflow writes tasks → panel shows progress → notifications fire → reload on completion
- [ ] 8.3 Test concurrent workflows (two active changes simultaneously)
- [ ] 8.4 Test workflow resumption (interrupted workflow, restart)
