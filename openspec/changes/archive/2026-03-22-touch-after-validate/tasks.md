## 1. Implementation

- [x] 1.1 In `packages/storybook-addon-designbook/src/workflow.ts`, add a `touchTaskFiles()` helper that iterates `task.files[]` and calls `utimesSync(path, now, now)` for each file that exists on disk (wrap in try/catch to skip missing files)
- [x] 1.2 Call `touchTaskFiles(task)` in `workflowDone()` after setting `task.status = 'done'` and before the all-tasks-complete archive check

## 2. Testing

- [x] 2.1 Add a test that verifies `workflowDone()` updates the mtime of task files after completion
- [x] 2.2 Add a test that verifies missing files are silently skipped during touch (no error thrown)
