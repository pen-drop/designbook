## Why

The Storybook addon panel has accumulated several small UI bugs and missing features that degrade the workflow monitoring experience. Active tab styling is wrong, state is lost on reload, the summary lacks end time, context columns are in wrong order, and there's no way to see file status across a workflow.

## What Changes

- Fix active sub-tab styling: text white, border green (#66BF3C)
- Show loaded context (task_file, rules, blueprints, config) and files in active task collapsible on Summary tab
- Add completed_at time display in Summary timestamps
- Persist workflow sub-tab selection via URL state (survives Storybook reload)
- Swap Context tab column order to Name → Type → Step
- Add new "Files" sub-tab showing all workflow files with three-state coloring (white=pending, orange=modified, green=flushed) and task filter badges
- Show intake task in Tasks tab (stop filtering it out)
- **CLI**: Remove intake step filter from `workflow start` command so intake tasks persist in the workflow

## Capabilities

### New Capabilities
- `panel-files-tab`: New Files sub-tab in workflow panel showing all task files with status coloring and task-based filtering

### Modified Capabilities
- `workflow-collapsible-panel`: Fix active tab styling, persist tab state via URL, show context+files in active task collapsible, add end time to summary, fix context column order, show intake in tasks tab
- `workflow-execution`: Remove intake step filtering from CLI `workflow start` so intake tasks remain visible throughout workflow lifecycle

## Impact

- `packages/storybook-addon-designbook/src/components/Panel.tsx` — bulk of UI changes
- `packages/storybook-addon-designbook/src/cli.ts` — remove intake filter (lines 382-384)
- No API changes, no dependency changes, no breaking changes
