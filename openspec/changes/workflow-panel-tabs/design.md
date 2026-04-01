## Context

The Workflows tab in Panel.tsx currently renders each workflow as a collapsible with deeply nested children: Stage → Step → Task, with context files shown per-step in additional collapsibles. This creates 4 levels of nesting that are hard to scan. The existing `DeboTabs` component provides URL-synced tab switching and is already used at the top level (Workflows/Status tabs).

Key constraints:
- Manager components must use inline styles only (no Tailwind/DaisyUI)
- The existing `DeboCollapsible` handles status-colored borders and progress badges
- Workflow data comes via polling from `/__designbook/workflows` endpoint
- `stage_loaded` data is organized per-step (rules, blueprints, config_rules, task files)

## Goals / Non-Goals

**Goals:**
- Replace nested Stage → Step → Task hierarchy with three focused tabs inside each workflow collapsible
- Summary tab: minimal progress overview with current task
- Tasks tab: flat task list with stage headers as only grouping
- Context tab: filterable table of all loaded context files
- Maintain status-colored visual language (green done, amber running, neutral pending)

**Non-Goals:**
- Changing the workflow data model or polling mechanism
- Adding new data to the workflow API response
- Modifying DeboCollapsible or DeboTabs core components
- Changing the top-level Workflows/Status tab structure

## Decisions

### Tab state management
**Decision**: Use local React state (`useState`) for the per-workflow tab selection. Do NOT use `DeboTabs`/`useUrlState` for the sub-tabs.

**Rationale**: `DeboTabs` uses a single hardcoded URL key (`debo-tab`), which would clash when multiple workflows each have their own tab bar. Local state survives polling re-renders (React key is stable at `wf.changeName`) and is sufficient — tab selection is ephemeral and does not need to survive page refresh. Same applies to Context tab filter badges (multi-select step filter uses `useState<Set<string>>`).

**Alternative considered**: Keyed URL state (`useUrlState` with `wf-<changeName>-tab` per workflow) — robust across refresh but clutters the URL and requires modifying `DeboTabs` to accept a custom key. Not worth the complexity.

### Tasks tab: stage headers as dividers
**Decision**: Render stages as styled `<div>` headers (not collapsibles) with a horizontal rule and stage name + progress count. Tasks render as flat rows directly below their stage header.

**Rationale**: The user explicitly wants no collapsibles in the tasks view. Stage headers serve only as visual separators. Step-level grouping is removed entirely from this view.

### Task row status backgrounds
**Decision**: Each task row gets a background color based on status:
- `done`: `rgba(34, 197, 94, 0.08)` (subtle green) — consistent with existing `--c-done`
- `in-progress`: `rgba(245, 158, 11, 0.10)` (subtle amber) — consistent with existing `--c-running`
- `pending`: transparent

**Rationale**: Backgrounds provide instant scan-ability without needing to read status dots. Colors match the existing DeboCollapsible status palette.

### Context tab: step-level filter badges
**Decision**: Show multi-select toggle badges for each step. When no filters are active, show all context. When filters are active, show only context from selected steps. The table columns are: Type (icon + label), Name, Step.

**Rationale**: Step is the natural grouping for context because `stage_loaded` data is keyed by step. Stage filtering can be derived (select all steps within a stage). Full file path shown via title attribute / hover tooltip to keep the table compact.

### Summary tab: current task collapsible
**Decision**: Summary shows: status + progress bar + count, timestamps, optional `summary` text from WorkflowData, and the currently running task in a DeboCollapsible that is open by default. The task shows its stage/step as inline metadata.

**Rationale**: The summary tab is the "at a glance" view. Only the running task needs detail — everything else is covered by the Tasks tab.

### Component extraction
**Decision**: Extract three new components from Panel.tsx:
- `WorkflowSummaryTab` — summary view
- `WorkflowTasksTab` — flat task list
- `WorkflowContextTab` — filterable context table

All receive the `WorkflowData` object as a prop. Inline styles stay in the `S` object in Panel.tsx.

**Rationale**: Panel.tsx is already 915 lines. Extracting keeps each tab's logic contained. Keeping styles in `S` maintains the existing pattern.

## Risks / Trade-offs

- **[Loss of step visibility]** → Steps disappear from the UI entirely except as metadata. Users who relied on step-level collapsibles for navigation lose that. Mitigated by the Context tab's step filter making step info accessible.
- **[Tab state per workflow]** → Local React state resets on page refresh. Acceptable trade-off — tab selection is ephemeral and defaults to Summary.
- **[Panel.tsx refactor scope]** → Extracting three components from a 915-line file is significant. → Keep the extraction mechanical — move rendering logic, don't restructure data flow.
