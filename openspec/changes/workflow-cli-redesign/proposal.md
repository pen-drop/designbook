## Why

The current workflow CLI mixes positional arguments with flags, making it error-prone for AI agents. Tasks must be declared upfront in YAML frontmatter, preventing dynamic task planning (e.g. one task per component in a loop). There is no resume support for interrupted workflows, and validation runs at the workflow level rather than per-task.

## What Changes

- **BREAKING**: `workflow create --task "<id>:<title>:<type>"` positional syntax replaced with `--flag` style throughout all commands
- **BREAKING**: Frontmatter `workflow.tasks` array removed — tasks are now added dynamically via `workflow add-task`
- New `workflow add-task` command to register tasks at runtime (enables per-component task loops)
- New `workflow add-file` command replaces `workflow update --files`
- New `workflow done` command to mark a task complete (replaces `workflow update --status done`)
- New `--task <id>` flag on `workflow validate` for per-task validation scoping
- Resume support: CLI detects unarchived workflows for the same `--workflow` id and prints them; AI asks user whether to continue or create fresh
- Standalone check: when `$WORKFLOW_NAME` is unset, AI asks user if they want workflow tracking before proceeding

## Capabilities

### New Capabilities
- `workflow-resume`: Check for existing unarchived workflows and prompt AI to continue or start fresh

### Modified Capabilities
- `workflow-cli`: **BREAKING** new command API — all positional args replaced with flags; add-task and add-file commands added; validate gains --task scope
- `workflow-skill`: New SKILL.md marker syntax (`!TASK`/`!FILE`/`!TASK_END`/`!WORKFLOW_DONE`), dynamic task planning rules, resume rule (Rule 0), standalone check rule (Rule 0.5)

## Impact

- `packages/storybook-addon-designbook/src/workflow.ts` — CLI command implementations
- `packages/storybook-addon-designbook/src/cli.js` — command registration
- `.agents/skills/designbook-workflow/SKILL.md` — AI rules and marker syntax
- All `debo-*` workflow files that use `!WORKFLOW_FILE` markers (updated to new syntax)
