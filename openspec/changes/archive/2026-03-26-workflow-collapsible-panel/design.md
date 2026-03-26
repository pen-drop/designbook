## Context

The Workflows tab in `Panel.tsx` currently renders workflow rows with stage badges. Clicking opens a `WorkflowDetailModal` (Storybook `Modal` + `DeboTabs`) with Overview and per-stage tabs. This works but requires a context switch — the modal covers the panel.

The `DeboOnboardingGuide` uses a much lighter pattern: flat `ManagerActivityItem` rows (14px dot + title + timestamp) in a 320px dropdown. The `DeboCollapsible` component (HTML5 `<details>/<summary>`) exists but is styled for page content with white background and shadows — too heavy for the compact panel.

Manager components must use inline styles or Storybook public components, not Tailwind/DaisyUI classes.

## Goals / Non-Goals

**Goals:**
- Replace modal with inline nested collapsibles: Workflow → Stage → Tasks
- Running workflows open by default, completed closed
- Status-colored borders (green = done, neutral = running/pending)
- Reuse the `ManagerActivityItem` dot pattern for task rows
- Keep ContextAction on workflow rows and stage headers

**Non-Goals:**
- Loaded resources display (task_file, rules, config) — keep that for ContextAction menus
- Validation details inline — keep in ContextAction tooltip
- Touching the onboarding guide component
- Changing the data model or API endpoints

## Decisions

### 1. Use DeboCollapsible variants (from `collapsible-variants` change)

Depends on the `collapsible-variants` change which adds `variant`, `status`, and `progress` props to `DeboCollapsible`.

- Workflow level: `variant="action-summary"` with `status` and `progress` props
- Stage level: `variant="action-item"` with `status` prop
- No new collapsible component needed

### 2. Three-level nesting structure

```
<details>  ← Workflow (Level 1)
  <summary> ⚡ Define Sections     14:30 </summary>
  <details>  ← Stage (Level 2)
    <summary> create-section    3/4 </summary>
    <div>  ← Tasks (Level 3, flat)
      ✓ product-overview
      ✓ telemetry-dashboard
      ○ maintenance-diagnostics
    </div>
  </details>
</details>
```

Level 1 and 2 are `<details>` (DeboCollapsible), level 3 is flat `ManagerActivityItem` rows with file badges. No deeper nesting.

### 2b. File badges on task rows

Each task row shows its files as inline `ManagerBadge` components wrapped in `ContextAction`. Badge color reflects validation status.

```
✓ create-component-button  [button.component.yml ⋮] [button.twig ⋮] [button.story.yml ⋮]
```

| Validation | Badge color |
|-----------|-------------|
| valid | green |
| invalid | yellow |
| pending/no validation | gray |

Each ⋮ opens ContextAction with "Copy path", "Open in editor", and validation info for that specific file.

### 3. Default open/closed state via `open` attribute

| Element | Condition | Default |
|---------|-----------|---------|
| Workflow | `status === 'running'` or `status === 'planning'` | open |
| Workflow | `status === 'completed'` or `status === 'incomplete'` | closed |
| Stage | parent workflow is open AND stage has `in-progress` or `pending` tasks | open |
| Stage | all tasks `done` | closed |

The `open` attribute is set at render time. Users can still manually toggle any collapsible.

### 4. Border color mapping

Reuse the color scheme from `ManagerBadge`:

| Status | Border color | Hex |
|--------|-------------|-----|
| done/completed | green | `#D0FAE5` |
| running/in-progress | yellow | `#FEF3C7` |
| pending/planning | gray | `#F1F5F9` |
| incomplete | gray | `#F1F5F9` |

### 5. Remove WorkflowDetailModal

The modal, OverviewTab, and StageTab components are fully replaced by the collapsible hierarchy. The overview information (status, parent, timestamps) moves into the workflow summary row. Stage loaded resources stay accessible via ContextAction menus on stage headers.

## Risks / Trade-offs

- **Long task lists:** A workflow with 10+ tasks per stage could make the panel very tall. → Acceptable because users can collapse stages. Could add `max-height` + scroll on task lists if needed later.
- **Lost detail:** Modal showed loaded resources and validation details inline. Collapsible only shows task status dots. → ContextAction menus still expose all detail on demand. Trade-off: less discoverability, more compactness.
- **Nesting depth:** Three levels of `<details>` could feel cluttered. → Mitigated by minimal styling (just left border, no backgrounds). The onboarding pattern proves flat rows work at this density.
