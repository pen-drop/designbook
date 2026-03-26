## 1. Server: Add designbookDir to API response

- [x] 1.1 Modify `/__designbook/workflows` endpoint in `vite-plugin.ts` to return `{ designbookDir, workflows }` instead of bare array
- [x] 1.2 Update `Panel.tsx` fetch handler to destructure the new response format

## 2. ContextAction component

- [x] 2.1 Create `ContextAction` component in `components/ui/` — renders an ellipsis (⋮) `IconButton` with `WithTooltip trigger="click"` + `TooltipLinkList`. Menu items: "Copy path" (clipboard) and "Open in editor" (`api.openInEditor()`). Accepts optional `validation` prop to show validation status in the menu. Accepts optional `extraLinks` prop for additional menu entries.
- [x] 2.2 Add `copyToClipboard(path)` utility function

## 3. Panel: Compact workflow display

- [x] 3.1 Add `WorkflowData.stage_loaded` to the Panel interfaces (already in the data, just not typed in Panel)
- [x] 3.2 Create `StageBadge` styled component — inline badge showing status icon + stage name + task count
- [x] 3.3 Add `deriveStageStatus()` helper: all done → ✅, any incomplete → ❌, any in-progress → ⚡, else ○
- [x] 3.4 Replace `renderTasksGrouped()` and `renderTask()` with compact stage badge row per workflow. Add `ContextAction` ⋮ button to workflow row (for log path). Add `ContextAction` ⋮ button to each stage badge (for stage files via `extraLinks`).
- [x] 3.5 Remove unused styled components (TaskRow, TaskTitle, FileRow, FilePath, FileError, StageLabel)

## 4. Workflow detail modal

- [x] 4.1 Create `WorkflowDetailModal` component using Storybook `Modal` + `DeboTabs`
- [x] 4.2 Implement Overview tab: status, parent, timestamps, params, stage summary list
- [x] 4.3 Implement Stage tab: "Loaded" section (task_file, rules, config_rules, config_instructions) with each file wrapped in `ContextAction`; "Tasks" section with task list, each file wrapped in `ContextAction` showing validation details
- [x] 4.4 Wire click on workflow title row → open modal at `overview` tab
- [x] 4.5 Wire click on stage badge → open modal at corresponding stage tab
