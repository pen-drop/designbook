## 1. Types: Extend WorkflowTask and WorkflowFile

- [x] 1.1 Add to `WorkflowTask` in `workflow-types.ts`: `depends_on?: string[]`, `params?: Record<string, unknown>`, `task_file?: string`, `rules?: string[]`, `config_rules?: string[]`, `config_instructions?: string[]`
- [x] 1.2 Add to `WorkflowTaskFile` in `workflow-types.ts`: `params?: Record<string, unknown>`
- [x] 1.3 Mirror changes in `workflow.ts` `WorkflowFile` and `WorkflowTask` interfaces

## 2. CLI: Resolution engine in workflow plan

- [x] 2.1 Add task-file resolution function: given a stage name + config, scan `.agents/skills/*/tasks/<stage>.md`, parse `when:` frontmatter, apply filtering + precedence, return matched path
- [x] 2.2 Add file-path expansion function: given a task file's `files:` templates + params + env vars, expand `{{ param }}` and `${ENV_VAR}` placeholders, return absolute paths
- [x] 2.3 Add rule-file matching function: scan `.agents/skills/*/rules/*.md` frontmatter, match `when.stages` and config conditions, return matched paths per stage
- [x] 2.4 Add config resolution function: read `designbook.config.yml` → `workflow.rules.<stage>` and `workflow.tasks.<stage>`, return `config_rules[]` and `config_instructions[]` strings per stage
- [x] 2.5 Add depends_on computation: given stages array + items-per-stage, compute depends_on arrays (stage N tasks depend on all stage N-1 task IDs)
- [x] 2.6 Add params validation: check item params against task file's `params:` frontmatter (required = `~`, optional = default value), error on missing required
- [x] 2.7 Add task ID generation: `<stage>-<key-param>` (e.g. `create-component-button`)
- [x] 2.8 Wire it all together in new `workflowPlanResolved()` function: accepts workflow-file path, global params, items array → returns fully-resolved plan
- [x] 2.9 Add `--workflow-file`, `--params`, `--items` options to `workflow plan` CLI command in `cli.ts`, call `workflowPlanResolved()` when present, fall back to existing `workflowPlan()` when absent

## 3. CLI: File locking

- [x] 3.1 Add file-lock helper (lockfile next to tasks.yml with retry/backoff)
- [x] 3.2 Wrap `readWorkflow` + `writeWorkflowAtomic` calls in `workflowValidate` and `workflowDone` with lock acquire/release
- [x] 3.3 Ensure lock is released on error (try/finally)

## 4. CLI: Persist new fields in workflow plan

- [x] 4.1 Update `workflowPlan` (and new `workflowPlanResolved`) to write `depends_on`, `params`, `task_file`, `rules` per task and top-level `params` to tasks.yml

## 5. Tests

- [x] 5.1 Unit test: task-file resolution with `when` filtering and precedence
- [x] 5.2 Unit test: file-path expansion with `{{ param }}` and `${ENV}` placeholders
- [x] 5.3 Unit test: depends_on computation from stage ordering
- [x] 5.4 Unit test: params validation (required missing → error, optional → default)
- [x] 5.5 Unit test: config resolution — `workflow.rules.<stage>` and `workflow.tasks.<stage>` strings resolved per task
- [x] 5.6 Unit test: `workflowPlanResolved()` end-to-end with a mock workflow-file and skill structure
- [x] 5.7 Unit test: file locking with concurrent writes

## 6. Execution Rules: Update workflow-execution.md

- [x] 6.1 Simplify Rule 3 Phase 2: replace manual scan/filter/expand with single `workflow plan --workflow-file --params --items` call
- [x] 6.2 Add Rule 5d: DAG orchestration loop — compute ready set, spawn Agent per task, wait for wave, repeat
- [x] 6.3 Update Rule 5b for subagents: "read files listed in `task.rules[]`" instead of scanning
- [x] 6.4 Add subagent contract: what the subagent prompt contains, what it reads from tasks.yml

## 7. Resource Docs

- [x] 7.1 Update `cli-reference.md`: new `workflow plan` options (`--workflow-file`, `--params`, `--items`), JSON output format
- [x] 7.2 Update `task-format.md`: new fields in tasks.yml schema (`params`, `depends_on`, `task_file`, `rules`, `config_rules`, `config_instructions`)
- [x] 7.3 Update `architecture.md`: CLI-side resolution, DAG orchestration pattern

## 8. Spec Sync

- [x] 8.1 Sync delta from `specs/workflow-execution/spec.md` to main spec
- [x] 8.2 Sync delta from `specs/workflow-format/spec.md` to main spec
- [x] 8.3 Add new `openspec/specs/workflow-plan-resolution/spec.md` from this change
- [x] 8.4 Add new `openspec/specs/workflow-parallel-execution/spec.md` from this change (if not folded into workflow-execution)
