## Why

The workflow panel currently renders workflow state as deeply nested collapsibles (Workflow → Stage → Step → Task), mixing context files with task progress. This makes it hard to quickly assess workflow progress and to understand which rules/blueprints are loaded. Splitting the per-workflow view into three focused tabs (Summary, Tasks, Context) reduces nesting, separates concerns, and makes each view purpose-built.

## What Changes

- **Replace** the current nested Stage → Step → Task collapsible hierarchy inside each workflow with a tabbed view containing three tabs: **Summary**, **Tasks**, **Context**
- **Summary tab**: Minimal overview — status dot, progress bar with count (e.g. 5/12), timestamps, optional workflow summary text, and the currently running task shown in an expanded collapsible. No params, no engine/branch metadata.
- **Tasks tab**: Flat task list grouped only by stage headers (no step-level grouping, no collapsibles). Each task row shows status, title, and duration. Done tasks get a green background, running task gets amber background with pulse animation, pending tasks are neutral.
- **Context tab**: Multi-select step filter badges at the top, then a table with columns: Type (blueprint/rule/task/config), Name, Step. Full file path shown via hover tooltip/overlay. Replaces the per-step context collapsibles.
- **Remove** Step as a visible grouping level from the UI entirely — step info only appears as metadata (in context table and on the current task in summary)

## Capabilities

### New Capabilities

- `workflow-panel-tabs`: Three-tab layout (Summary, Tasks, Context) inside each workflow collapsible, replacing the nested Stage → Step → Task hierarchy

### Modified Capabilities

- `workflow-collapsible-panel`: Per-workflow collapsible now contains tabs instead of nested stage/step/task collapsibles

## Impact

- `packages/storybook-addon-designbook/src/components/Panel.tsx` — major refactor of WorkflowsTab rendering logic; extract three new tab components
- `packages/storybook-addon-designbook/src/components/ui/DeboTabs.jsx` — may need adaptation for nested tab usage (tabs inside a collapsible)
- Inline styles in `Panel.tsx` `S` object — new styles for task list rows, stage headers, context table, step filter badges
