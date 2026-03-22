## Why

When the AI agent creates component files via the Write tool, Storybook's file watcher picks up the initial create event before the content is fully written. This causes broken renders in Storybook. A subsequent `touch` on the files triggers a clean watcher reload and fixes the issue. Currently this must be done manually — the CLI should handle it automatically after `workflow done`.

## What Changes

- `workflow done` command touches all task files after marking a task as done, triggering a clean Storybook file watcher reload
- Only touches files that exist on disk (skips missing files)

## Capabilities

### New Capabilities

- `touch-after-done`: After `workflow done` marks a task complete, touch all files in `task.files[]` to trigger file watcher re-reads

### Modified Capabilities

- `workflow-features`: `workflow done` gains a post-completion file touch step

## Impact

- `packages/storybook-addon-designbook/src/workflow.ts` — `workflowDone()` function
- No API changes, no breaking changes
- Affects all workflows that create files (component, scene, etc.)
