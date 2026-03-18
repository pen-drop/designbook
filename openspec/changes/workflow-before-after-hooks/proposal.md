## Why

Designbook workflows currently run in isolation — there is no way to declare that a workflow depends on another running first, or that a follow-up workflow should be suggested afterwards. This forces users to manually chain workflows and know the correct order. Additionally, workflows only appear in the Storybook panel once tasks are planned — the dialog phase is invisible, making long interviews feel disconnected from the tracking UI.

## What Changes

- Add `before` and `after` arrays to workflow frontmatter (`debo-*.md` files)
- `before`: list of workflows to run after the dialog but before tasks execute, with configurable execution policy (`always`, `if-never-run`, `ask`)
- `after`: list of workflows to suggest after the current workflow completes — always prompts the user
- New `status: dialog` — workflows are now created at dialog start (not after), making the dialog phase visible in Storybook
- New `parent` field in `tasks.yml` — when a workflow is triggered by a hook, it stores the triggering workflow's name
- New CLI flag `workflow list --include-archived` for `if-never-run` checks
- New CLI command `workflow plan` — adds stages + tasks to a `dialog`-status workflow, transitioning to `planning`
- `workflow create` gains `--status dialog` and `--parent` flags for early creation
- Storybook panel: new `dialog` status icon + parent reference display
- Before hooks only execute if the referenced workflow's `reads:` are all satisfied

## Capabilities

### New Capabilities

- `workflow-hooks`: Before/after hook declarations in workflow frontmatter with policy-based execution control

### Modified Capabilities

- `workflow-skill`: New AI rules for hook processing + updated Rule 0/1 for dialog status lifecycle
- `workflow-cli`: `--include-archived` on `workflow list`; `workflow create --status dialog --parent`; new `workflow plan` command
- `workflow-panel`: New `dialog` status display + parent workflow reference

## Impact

- `.agents/workflows/debo-*.md` — can optionally add `before`/`after` declarations
- `designbook-workflow` SKILL.md — new and updated AI rules
- `workflow.ts` — `workflowList` + `workflowCreate` + new `workflowPlan`
- `workflow-types.ts` — `parent?: string` on `WorkflowTaskFile`; add `'dialog'` to status union
- `cli.ts` — new flags + `workflow plan` subcommand
- `Panel.tsx` + `WorkflowData` — dialog status icon, parent reference
