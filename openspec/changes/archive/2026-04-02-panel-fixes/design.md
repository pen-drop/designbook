## Context

The Storybook addon panel (`Panel.tsx`) uses inline styles and React state for workflow sub-tabs. Several UI bugs have accumulated: wrong active tab colors, no state persistence on reload, missing end time, wrong column order in context tab. Additionally, a new Files tab is needed and the CLI filters out intake tasks unnecessarily.

## Goals / Non-Goals

**Goals:**
- Fix all visual bugs in the panel sub-tabs
- Add Files sub-tab with file status tracking
- Persist sub-tab state across Storybook reloads
- Remove intake step filtering from CLI

**Non-Goals:**
- Refactoring Panel.tsx into separate files (do later)
- Adding new API endpoints (all data already available)
- Changing the workflow data model

## Decisions

### 1. Active tab styling: white text on green border
- **Decision**: `tabButtonActive` uses `color: '#FFFFFF'` and `borderBottomColor: '#66BF3C'`
- **Rationale**: Matches Designbook's green brand color. White text provides contrast against the tab bar background.

### 2. Sub-tab state via useUrlState
- **Decision**: Replace `useState<WorkflowSubTab>` in `WorkflowTabs` with `useUrlState('debo-wf-tab', 'summary')`
- **Alternative considered**: Using `DeboTabs` component — rejected because `WorkflowTabs` uses custom inline tab buttons, not Storybook's `TabsView`. Adding `useUrlState` directly is simpler.
- **Rationale**: `useUrlState` hook already exists and is proven in `DeboTabs`. URL param survives Storybook hot-reload.

### 3. Files tab: derive status from validation_result
- **Decision**: Three-state file coloring derived from existing `TaskFile.validation_result`:
  - White (no `validation_result`) → pending/unwritten
  - Orange (`validation_result` exists, `valid !== true`) → modified/written
  - Green (`valid === true`) → flushed/validated
- **Alternative considered**: Adding a `flushed` field to the data model — rejected to avoid backend changes.
- **Rationale**: The existing validation pipeline already provides the needed state transitions.

### 4. Files tab: task filter badges
- **Decision**: Reuse the same badge-filter pattern from `WorkflowContextTab` (step filter), but filter by task title/id instead.
- **Rationale**: Consistent UI pattern, minimal new code.

### 5. Active task collapsible shows context + files
- **Decision**: In `WorkflowSummaryTab`, the active task's `DeboCollapsible` body shows two sections:
  1. Context list from task's `task_file`, `rules[]`, `blueprints[]`, `config_rules[]`, `config_instructions[]`
  2. Files list from task's `files[]` with status badges
- **Rationale**: All data already exists on the `WorkflowTask` interface — no API changes needed.

### 6. Intake filter removal
- **Decision**: Delete lines 382-384 in `cli.ts` (`const intakeSteps = ...` through `const execSteps = ...`) and use `allSteps` instead of `execSteps` downstream.
- **Rationale**: Intake tasks should remain visible throughout the workflow lifecycle. The original filtering was premature — intake tasks are valid tasks that deserve tracking.

## Risks / Trade-offs

- **URL param collision** → Using `debo-wf-tab` prefix to avoid clashing with other Storybook URL params.
- **Intake task duplication** → Intake tasks created at `workflow create` time could theoretically be re-created at `start` time. Mitigation: `workflow start` creates tasks for steps, not for intake — intake already exists, so the step-based task creation won't duplicate it.
