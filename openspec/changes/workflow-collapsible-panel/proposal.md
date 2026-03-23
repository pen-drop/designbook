## Why

The workflow panel currently uses a Modal with tabs for workflow details. This requires a click to see any task-level information, and the modal obscures the panel context. The onboarding component (`DeboOnboardingGuide`) demonstrates a lighter pattern — flat activity rows with minimal chrome that is much less intrusive. Applying a collapsible pattern (Workflow → Stage → Tasks) gives instant visibility into what's running without leaving the panel.

## What Changes

- Replace the workflow detail modal with nested collapsibles in the Workflows tab
- Level 1: Workflow collapsible — status icon + title + time range, border color reflects status (green for completed)
- Level 2: Stage collapsible — stage name + progress badge (e.g., `3/4`), border color reflects stage status
- Level 3: Task rows — flat activity rows using the `ManagerActivityItem` dot pattern from the onboarding component
- Running workflows default to open, completed/incomplete default to closed
- Running stages within an open workflow default to open
- Remove `WorkflowDetailModal`, `OverviewTab`, and `StageTab` components

## Capabilities

### New Capabilities
- `workflow-collapsible-panel`: Nested collapsible workflow display replacing the modal-based detail view

### Modified Capabilities
- `workflow-log-panel`: Replace modal-based workflow detail with inline collapsible hierarchy

## Impact

- `Panel.tsx` — Replace `WorkflowDetailModal` and related components with collapsible rendering in `WorkflowsTab`
- `DeboCollapsible.jsx` — May need a variant for status-colored borders (or a new lightweight collapsible)
- Removes Modal dependency from the workflows tab
- Reuses `ManagerActivityItem` pattern from `manager-utils.tsx`
- ContextAction on workflow rows and stage headers stays (from existing `workflow-logs-compact-panel` change)
