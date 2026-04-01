## 1. Extract tab components from Panel.tsx

- [x] 1.1 Create `WorkflowSummaryTab` component — receives `WorkflowData`, renders progress bar + count, timestamps, optional summary text, and current running task in an open-by-default collapsible (with stage/step/files as inline metadata)
- [x] 1.2 Create `WorkflowTasksTab` component — receives `WorkflowData`, renders flat task list with stage headers as dividers (stage name + progress count), task rows with status-colored backgrounds (green done, amber running, transparent pending), status dot, title, duration
- [x] 1.3 Create `WorkflowContextTab` component — receives `WorkflowData`, renders multi-select step filter badges and a table (Type, Name, Step columns) of all loaded context files from `stage_loaded`, with full path tooltip on hover

## 2. Integrate tabs into workflow collapsible

- [x] 2.1 Replace the nested Stage → Step → Task rendering inside each workflow collapsible with a `DeboTabs` containing the three new tab components (Summary default active)
- [x] 2.2 Move the progress count (e.g., `5/12`) into the workflow collapsible summary header alongside status icon and title
- [x] 2.3 Remove stage collapsible, step collapsible, and per-step context collapsible rendering code from Panel.tsx

## 3. Styles

- [x] 3.1 Add inline styles to the `S` object: task row backgrounds (done/running/pending), stage header dividers, context table layout, step filter badge toggle states
