## Context

The Panel.tsx workflow tab currently renders a flat list: workflow → stages (labels) → tasks (rows) → files (rows). All metadata from `stage_loaded` (skill task files, rules, config) and detailed validation info is available in the data but not rendered. The panel becomes unwieldy with larger workflows.

Storybook 10.2 provides `Modal`, `WithTooltip` (with `trigger="right-click"`), `TooltipLinkList`, and the project already has `DeboTabs` (URL-synced via `debo-tab` query param).

## Goals / Non-Goals

**Goals:**
- Compact panel: one workflow = title row + stage badges (2-3 lines total)
- Click workflow title or stage badge → Modal with full details via DeboTabs
- Stage badge click deep-links to the corresponding tab
- Right-click anywhere with file paths → context menu with Copy path / Open in IDE
- Reusable `<ContextAction>` component for file path actions across the UI
- Server exposes `designbookDir` so the panel can construct absolute paths

**Non-Goals:**
- Editing workflow data from the panel
- Inline file content preview (view source)

## Decisions

### 1. Stage badges instead of task rows

Collapse all tasks into their stage badge: `✅ create-component (4)`. Stage status derived from task statuses:
- `✅` all done
- `⚡` at least one in-progress
- `❌` at least one incomplete
- `○` all pending

**Why**: A workflow with 4 stages × 5 tasks currently takes 20+ rows. With badges it's 2-3 lines. Detail lives in the modal.

### 2. Single modal per workflow with DeboTabs

One Modal with tabs: Overview + one tab per stage. Uses `DeboTabs` for URL-synced tab selection.

**Why over drill-down modals**: Avoids modal-in-modal awkwardness. All info accessible via tabs. Deep-linking via `debo-tab` query param works out of the box.

**Why over accordion**: Too many expandable rows creates click-fatigue. Modal separates compact view from detail view cleanly.

### 3. Ellipsis (⋮) button for file actions, click for modal

Consistent interaction pattern using Storybook's established ⋮ menu pattern:
- Click on workflow row → Modal (overview tab)
- Click on stage badge → Modal (stage tab)
- ⋮ on workflow row → menu: Copy log path, Open in editor
- ⋮ on stage badge → menu: Open task.md, Open rules
- ⋮ on file rows (inside modal) → menu: Copy path, Open in editor

**Why ⋮ over right-click**: Consistent with Storybook's own "Open in editor" pattern (3 dots). Discoverable — users see the button. No hidden interactions.

### 4. designbookDir in API response

The `/__designbook/workflows` endpoint wraps the response as `{ designbookDir, workflows }` so the panel can build absolute paths for IDE links and log file locations.

**Why over deriving paths**: The `designbookDir` comes from `options.fsRoot` configuration. Deriving it client-side would require duplicating config resolution logic.

### 5. ContextAction uses Storybook's openInEditor API

Storybook provides `api.openInEditor({ file, line?, column? })` via `storybook/manager-api` (channel event `OPEN_IN_EDITOR_REQUEST`). This uses the user's configured editor automatically — no `vscode://` hardcoding needed.

`ContextAction` renders an ellipsis (⋮) `IconButton` with `WithTooltip trigger="click"` + `TooltipLinkList`. The "Open in editor" action calls `api.openInEditor()`. Accepts optional `validation` and `extraLinks` props.

**Why a component**: File action buttons appear in 4+ contexts (stage loaded files, task files, validation files, log path). Single component avoids duplication.

**Why openInEditor over vscode://**: Works with any editor the user has configured in Storybook. No hardcoding, no configuration needed on our side.

## Risks / Trade-offs

- **Modal width in narrow panels** → Storybook Modal has responsive width, should be fine. Test with narrow addon panel.
- **⋮ button adds visual clutter** → Use small `IconButton` with `EllipsisIcon` from `@storybook/icons`. Only visible on hover for file rows in modal to keep it clean.
- **DeboTabs URL param collision** → Workflow modal and other pages share `debo-tab`. Only one modal open at a time, so no conflict in practice.
