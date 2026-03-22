## Why

debo-* workflows run all stages sequentially in a single AI session. The AI manually resolves task files, expands file paths, filters rules — work that is deterministic, error-prone when done by an LLM, and wastes context window. Isolated subagents per task would reduce context size and enable parallel execution, but first the planning logic must move from AI rules to CLI code so each subagent receives fully-resolved task data.

## What Changes

- **`workflow plan` CLI takes over Rule 3 Phase 2**: accepts a workflow-file path + intake items, resolves task files (skill scan + `when`-filter), expands `{{ param }}` in file paths, computes `depends_on` from stage ordering, matches rule files — outputs a fully-resolved plan
- `tasks.yml` gains: top-level `params`, per-task `params`, `depends_on`, `task_file`, `rules`
- **The main agent becomes a DAG orchestrator** after planning: spawns isolated subagents per task using the Agent tool
- Each subagent reads its fully-resolved task data from tasks.yml — no skill scanning, no rule discovery needed
- After plan is shown, execution starts immediately (Ctrl+C to abort)
- **File locking** on tasks.yml for concurrent subagent access (validate/done)
- Workflow YAML format (`debo-*.md`) is **unchanged**

## Capabilities

### New Capabilities
- `workflow-parallel-execution`: DAG orchestration logic — dependency resolution, parallel Agent spawning, wave-based execution with Ctrl+C abort
- `workflow-plan-resolution`: CLI-side task-file resolution, when-filtering, file-path expansion, depends_on computation, rule-file matching — replaces AI-side Rule 3 Phase 2

### Modified Capabilities
- `workflow-execution`: Rule 3 Phase 2 replaced by single CLI call; Rule 5 extended with Rule 5d (parallel subagent dispatch); subagents read pre-resolved task_file/params/rules from tasks.yml
- `workflow-format`: `tasks.yml` schema extended with top-level `params`, per-task `params`/`depends_on`/`task_file`/`rules`

## Impact

- `packages/storybook-addon-designbook/src/workflow.ts` — major: `workflowPlan` rewritten with resolution logic
- `packages/storybook-addon-designbook/src/workflow-types.ts` — extended types
- `packages/storybook-addon-designbook/src/cli.ts` — new `workflow plan` options
- `.agents/skills/designbook-workflow/rules/workflow-execution.md` — Rule 3 Phase 2 simplified, new Rule 5d
- `.agents/skills/designbook-workflow/resources/` — updated docs (task-format, cli-reference, architecture)
- No changes to `debo-*.md` workflow files
