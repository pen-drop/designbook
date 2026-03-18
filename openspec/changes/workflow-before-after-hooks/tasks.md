# Implementation Tasks

## 1. TypeScript: Types

- [x] 1.1 Add `'dialog'` to the `status` union in `WorkflowTaskFile` in `workflow-types.ts`
- [x] 1.2 Add `parent?: string` field to `WorkflowTaskFile` in `workflow-types.ts`
- [x] 1.3 Update `WorkflowData` interface in `Panel.tsx` to include `parent?: string` and `dialog` in status union

## 2. CLI: `workflow list --include-archived`

- [x] 2.1 Add `includeArchived?: boolean` parameter to `workflowList()` in `workflow.ts`
- [x] 2.2 When `includeArchived` is true, also scan `workflows/archive/` and append matching names
- [x] 2.3 Add `--include-archived` flag to the `workflow list` CLI command in `cli.ts`
- [x] 2.4 Write tests for `workflowList()` with `--include-archived`

## 3. CLI: `workflow create --status dialog --parent`

- [x] 3.1 Add `--status dialog` flag to `workflow create` in `cli.ts` — when set, `--stages`/`--tasks` are omitted
- [x] 3.2 Update `workflowCreate()` in `workflow.ts` to accept optional `status: 'dialog'` — writes `tasks: []` and `status: dialog`
- [x] 3.3 Add `--parent <name>` flag to `workflow create` in `cli.ts`
- [x] 3.4 Update `workflowCreate()` to accept optional `parent` — writes `parent: <name>` to tasks.yml when provided
- [x] 3.5 Write tests for dialog-status creation and parent field

## 4. CLI: New `workflow plan` command

- [x] 4.1 Implement `workflowPlan(dist, name, stages, tasks)` in `workflow.ts` — reads existing `dialog`-status tasks.yml, adds stages + tasks, transitions to `planning`
- [x] 4.2 Guard: if status is not `dialog`, exit with error code 1
- [x] 4.3 Add `workflow plan --workflow <name> --stages '<json>' --tasks '<json>'` subcommand to `cli.ts`
- [x] 4.4 Write tests for `workflowPlan()` including error case

## 5. Storybook Panel: dialog status + parent display

- [x] 5.1 Add `'💬'` to `workflowStatusIcon()` for `status === 'dialog'`
- [x] 5.2 Render `dialog`-status workflows with reduced opacity and no task list expansion
- [x] 5.3 Add parent reference display below workflow title when `wf.parent` is set — "↳ `<parent>`" in muted style

## 6. Skill: New AI Rules in `designbook-workflow` SKILL.md

- [x] 6.1 Update Rule 0 (Resume Check): include `dialog`-status workflows in resume check
- [x] 6.2 Update Rule 1 (Workflow Plan): split into two CLI calls — `workflow create --status dialog` at dialog start, then `workflow plan` after dialog
- [x] 6.3 Add **Rule: Before Hooks** — after dialog, before plan:
  - For each `before` entry: check reads → skip if unsatisfied
  - `always` → run; `if-never-run` → check via `workflow list --include-archived`; `ask` → prompt
  - Pass `--parent $WORKFLOW_NAME` when triggering a hook workflow
- [x] 6.4 Add **Rule: After Hooks** — after last `workflow done`:
  - For each `after` entry: prompt user
  - If accepted: start referenced workflow, pass `--parent $WORKFLOW_NAME`
- [x] 6.5 Document the `before`/`after` frontmatter format with an example in SKILL.md

## 7. Workflow Frontmatter: Apply hooks to existing workflows

- [x] 7.1 Add `after: [{workflow: /debo-css-generate}]` to `debo-design-tokens.md`
- [x] 7.2 Add `before: [{workflow: /debo-css-generate, execute: if-never-run}]` to `debo-design-component.md`
- [x] 7.3 Add `before: [{workflow: /debo-css-generate, execute: if-never-run}]` to `debo-design-shell.md`
- [x] 7.4 Add `before: [{workflow: /debo-css-generate, execute: if-never-run}]` to `debo-design-screen.md`
