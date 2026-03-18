## Why

Workflow skill files (debo-design-shell.md etc.) are monolithic: dialog logic, component instructions, and scene instructions are all mixed in one file. SDC component creation instructions are duplicated across every workflow that creates components. When the SDC convention changes, every workflow file needs updating.

The solution: split workflows into a composition of reusable, parameterized task files. Each task file is a self-contained instruction unit that knows its own files and which workflows use it.

## What Changes

- New task file format: YAML frontmatter with `used_by`, `params`, `files` template — body contains parameterized instructions
- Workflow frontmatter gains `tasks[]` array with `file` + `params` per task (replaces prose + markers)
- Task files live inside their skill directory: `designbook-components-sdc/tasks/create-component.md`
- Dynamic workflows (tasks depend on user input) declare `tasks: dynamic` in frontmatter — AI builds task list after dialog, then calls `workflow create --tasks '<json>'`
- `workflow create` can accept a workflow frontmatter file directly via `--workflow-file <path>` to expand parameterized tasks

## Capabilities

### New Capabilities
- `workflow-task-file-format`: Task file schema — frontmatter (`used_by`, `params`, `files`), param templating, body instructions
- `workflow-composition`: Workflow frontmatter `tasks[].file` + `tasks[].params` — how workflows compose task files

### Modified Capabilities
- `workflow-skill`: Workflow files become thin compositions; dialog logic stays in workflow, execution instructions move to task files
- `workflow-cli`: `workflow create` gains `--workflow-file <path>` to expand parameterized task declarations directly from workflow frontmatter

## Impact

- `.agents/skills/*/tasks/` — new task file directories per skill
- `.agents/workflows/debo-*.md` — frontmatter gains `tasks[]` with `file` + `params`; body simplified to dialog-only
- `packages/storybook-addon-designbook/src/workflow.ts` — `workflow create` gains `--workflow-file` flag
