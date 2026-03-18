## Why

Workflows currently lack a clear lifecycle. Each workflow starts executing immediately with no "planning" phase, file registration is manual (scattered `workflow update --files` calls), and there's no clean status visibility in the Storybook panel. The current `Workflow Tracking` section sits at the bottom of each workflow as an afterthought, making the system hard to understand and maintain.

## What Changes

- **Add explicit workflow status lifecycle:** planning → running → completed
  - `planning`: workflow created with tasks defined, nothing has started
  - `running`: first files registered, active work in progress
  - `completed`: all tasks done, workflow archived
- **New marker system** for workflows and skills: `!WORKFLOW_FILE <path>` and `!WORKFLOW_DONE`
  - Replaces manual `workflow update --files` calls
  - AI rules automatically handle file registration and validation
- **Add AI Rules section** to designbook-workflow skill defining marker behavior
- **Validation is now a hard gate:** files must validate (exit 0) before task can be marked done
- **Update Panel display:** show 📋 (planning) / ⚡ (running) / ✅ (completed) with clean status icons
- **Refactor all debo-* workflows** to use new marker system; remove manual `Workflow Tracking` sections

## Capabilities

### New Capabilities
- `workflow-status-lifecycle`: Planning/running/completed state machine with automatic transitions
- `workflow-file-markers`: `!WORKFLOW_FILE` and `!WORKFLOW_DONE` markers for declarative workflow structure
- `workflow-validation-gate`: Hard validation gate — files must exit 0 before task completion

### Modified Capabilities
- `designbook-workflow`: Add AI Rules section defining marker semantics and state transitions
- `workflow-panel-display`: Add status field visualization with three-state icons

## Impact

**Code:**
- `packages/storybook-addon-designbook/src/workflow.ts` — add `status` field, auto-transitions
- `packages/storybook-addon-designbook/src/workflow-types.ts` — add `status` to `WorkflowTaskFile`
- `packages/storybook-addon-designbook/src/components/Panel.tsx` — render new status field with icons

**Workflows & Skills:**
- 13 debo-* workflows: add YAML frontmatter metadata + markers, remove manual Workflow Tracking sections
- ~8 designbook-* skills: add `!WORKFLOW_FILE` markers for consistency
- `designbook-workflow/SKILL.md`: new AI Rules section

**Breaking:** Old workflows without markers won't use new auto-transitions (but existing system still works)
