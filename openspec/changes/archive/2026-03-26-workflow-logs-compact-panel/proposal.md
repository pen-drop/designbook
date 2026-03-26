## Why

The workflow logs panel currently renders every task and file as individual rows, creating long scrollable lists that are hard to scan. Key metadata (loaded skills, rules, config, validation details) is available in the data but never displayed. Users need a compact overview with on-demand detail access.

## What Changes

- **Compact panel view**: Replace per-task rows with stage-level badges showing status and task count (e.g., `✅ create-component (4)`)
- **Workflow detail modal**: Click on workflow row or stage badge opens a `Modal` with `DeboTabs` — one Overview tab + one tab per stage
- **Stage tabs**: Each stage tab shows loaded skills/rules/config and all tasks with their files and validation results
- **Context menus**: Right-click on workflow rows, stage badges, and files in modal for file actions (Copy path, Open in IDE via `vscode://` links)
- **FileAction component**: Reusable `[Copy] [Open]` buttons for every file path across the UI
- **Server provides `designbookDir`**: The `/workflows` endpoint includes the base path so the panel can build absolute file paths for IDE links

## Capabilities

### New Capabilities
- `workflow-log-panel`: Compact workflow log display with stage badges, detail modal with DeboTabs, context menus, and file action links

### Modified Capabilities

## Impact

- `packages/storybook-addon-designbook/src/components/Panel.tsx` — Major rewrite of WorkflowsTab rendering
- `packages/storybook-addon-designbook/src/vite-plugin.ts` — Add `designbookDir` to workflows endpoint response
- `packages/storybook-addon-designbook/src/components/ui/` — New components (FileAction, WorkflowDetailModal, context menus)
- Uses existing Storybook primitives: `Modal`, `WithTooltip` (trigger="right-click"), `TooltipLinkList`, `DeboTabs`
