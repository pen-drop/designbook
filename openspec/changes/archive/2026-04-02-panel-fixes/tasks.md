## 1. Quick Fixes (Panel.tsx)

- [x] 1.1 Fix `tabButtonActive` style: `color: '#FFFFFF'`, `borderBottomColor: '#66BF3C'`
- [x] 1.2 Add "Completed: HH:MM" span in `WorkflowSummaryTab` timestamps when `wf.completed_at` exists
- [x] 1.3 Swap Context tab column order to Name → Type → Step (header + body rows)

## 2. Tab State Persistence

- [x] 2.1 Import `useUrlState` in Panel.tsx and replace `useState<WorkflowSubTab>('summary')` with `useUrlState('debo-wf-tab', 'summary')` in `WorkflowTabs`

## 3. Active Task Context in Summary

- [x] 3.1 Extend `WorkflowSummaryTab` active task collapsible body to show context section: list task_file, rules, blueprints, config_rules, config_instructions with type labels and shortened paths
- [x] 3.2 Verify files section already renders in the collapsible (existing FileBadge code)

## 4. Files Sub-Tab

- [x] 4.1 Add `'files'` to `WorkflowSubTab` type and tabs array in `WorkflowTabs`
- [x] 4.2 Create `WorkflowFilesTab` component that collects all files from all tasks with task association
- [x] 4.3 Add task filter badges (same pattern as Context step filter)
- [x] 4.4 Render file rows with three-state coloring: white (no validation_result), orange (validation_result but valid !== true), green (valid === true)

## 5. Intake Task Visibility

- [x] 5.1 Remove intake step filter in cli.ts (lines 382-384: `const intakeSteps`, `const execSteps`) and use `allSteps` downstream instead of `execSteps`

## 6. Verification

- [x] 6.1 Run `pnpm check` to verify typecheck, lint, and tests pass
