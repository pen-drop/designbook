## Context

The workflow engine in `storybook-addon-designbook` currently uses three separate mechanisms for task data flow:

1. **`files:` declarations** — Tasks declare files they will write; the engine validates them on `workflow write-file` and gates `workflow done` on all files being written and valid.
2. **`--params` on `workflow done`** — Intake tasks pass structured data (component lists, scene references) to expand subsequent stages via `expandTasksFromParams()`.
3. **Filesystem-based communication** — Fan-in patterns (e.g. compare→triage) rely on tasks writing draft JSON files to disk, which downstream tasks read via glob. No engine involvement.

This fragmentation means tasks have no typed contract for what they produce. The engine cannot validate data at stage boundaries. Inter-stage data flow relies on implicit conventions rather than explicit declarations.

### Current implementation touchpoints

- `expandTasksFromParams()` at `src/workflow.ts:390-524` — reads stage-level `each:` from workflow definitions, looks up `params[name]`, expands tasks per item
- `workflowDone()` at `src/workflow.ts:679-872` — marks task done, gates on all `files:` written, handles `--params` expansion inline, walks stage transitions
- `workflowWriteFile()` at `src/workflow.ts:913-995` — writes file content via engine, runs semantic validators, updates task state
- `StageResponse` interface at `src/workflow.ts:656-663` — current response shape (no stage progress)
- CLI commands at `src/cli/workflow.ts` — `done` (line 460), `write-file` (line 368), `get-file` (line 353)
- `resolveAllStages()` in `src/workflow-resolve.ts` — resolves task files and expands file declarations
- `ajv` v8.18.0 already in `package.json` dependencies
- Existing semantic validators in `src/validators/schemas/` — `component`, `scene`, `data-model`, `tokens`, `entity-mapping`

## Goals / Non-Goals

**Goals:**

- Unified `result:` declaration that replaces both `files:` and `--params`, giving every task a typed contract for what it produces
- Skill-level `schemas.yml` with JSON Schema definitions, enabling cross-task and cross-skill type sharing via `$ref`
- Engine-managed workflow scope that replaces filesystem-based inter-stage communication
- Stage completion as the collection trigger, enabling proper fan-in without file-based workarounds
- Dual validation (JSON Schema + semantic validators) on every `workflow result` call
- `each:` on tasks (not stages), making tasks self-documenting about their iteration requirements
- Backwards-compatible deprecation of `files:`, `--params`, and stage-level `each:`

**Non-Goals:**

- Task configuration / overridable defaults (deferred to a separate spec)
- Follow/loop workflows (re-running stages until convergence)
- Changes to the `direct` engine's worktree or stash mechanics
- Migration tooling or automated rewriting of existing task files (manual migration)
- Changes to existing semantic validators — they continue as-is

## Decisions

### Decision 1: `result:` replaces `files:` and `--params`

**Choice:** A single `result:` map in task frontmatter declares all task outputs — both file results (with `path:`) and data results (without `path:`).

**Why not keep `files:` and add a separate `data:` field?** Two separate declarations for the same concept (task output) would perpetuate the fragmentation. A unified `result:` means one place to look, one validation pipeline, and one CLI command to write results.

**Implementation:**
- Task frontmatter parser (`parseFrontmatter()` in `workflow-resolve.ts`) gains `result:` support
- `expandFileDeclarations()` → renamed/extended to `expandResultDeclarations()` — handles both file and data results
- `WorkflowTask.files` → `WorkflowTask.result` — each entry is `{ path?, valid?, value?, validators? }`
- `workflowDone()` gates on all declared results being present and valid (same pattern as current files gate)
- `files:` continues to work as a deprecated alias, internally converted to `result:` with `path:`

### Decision 2: Skill-level `schemas.yml` with file-path `$ref`

**Choice:** Schema definitions live in `schemas.yml` files within skill directories. Tasks reference them via `$ref` using relative paths (from task file) or skill-qualified paths (from skills root).

**Alternatives considered:**
- Inline JSON Schema on every task — verbose, no reuse
- Central schema registry — doesn't travel with skills, complicates skill packaging
- TypeScript types — not available at runtime for validation

**Implementation:**
- New `loadSchemaFile(path)` utility that parses `schemas.yml` YAML → JSON Schema map
- `$ref` resolution at `workflow create` time in `resolveAllStages()` — all references resolved and inlined into `tasks.yml` under top-level `schemas:` field
- Resolution order: try relative path first, then skill-qualified path
- Unresolvable `$ref` → hard error at create time (fail fast)
- Use `ajv` (already in dependencies) for runtime validation with the inlined schemas

### Decision 3: `each:` moves to task frontmatter

**Choice:** Tasks declare `each: { <scope-key>: { $ref: ... } }` in their frontmatter. The workflow stage definition no longer needs `each:`.

**Why move it?** Currently, looking at a task file alone doesn't tell you whether it runs once or N times, or what shape its iteration items have. Moving `each:` to the task makes it self-documenting.

**Implementation:**
- `parseFrontmatter()` extracts `each:` from task files
- `expandTasksFromParams()` refactored: instead of reading `stages[stage].each`, reads `taskFrontmatter.each` to get the scope key and schema
- Fallback: if task has no `each:` but stage definition has `each:`, use stage-level (deprecation warning via `console.warn`)
- Task-level `each:` takes precedence over stage-level

### Decision 4: Workflow scope as engine-managed namespace

**Choice:** A `scope` object lives in `tasks.yml` (top-level field). Data results flow into scope at stage completion. Task params and `each:` arrays are resolved from scope.

**Why not pass data through `params` on the workflow?** The current `data.params` is a flat bag set at create/done time. Scope is a structured, evolving namespace that grows as stages complete. It also cleanly separates "initial configuration" from "accumulated stage results."

**Implementation:**
- `WorkflowFile` gains `scope: Record<string, unknown>` field (defaults to `{}`)
- On stage completion in `workflowDone()`: collect data results from all done tasks in the stage, write to scope
- For `each:`-stages: concatenate array-typed data results across all task instances
- For single-task stages: write data result directly to scope
- Scope persisted atomically with the rest of `tasks.yml`

### Decision 5: Stage completion triggers collection and expansion

**Choice:** The engine waits for ALL tasks in a stage to complete before collecting results and expanding next stages. Individual task completions within an `each:`-stage do not trigger expansion.

**Why not expand on each task done (current behavior)?** The current per-task expansion means fan-in is impossible — there's no point where "all compare tasks are done, now collect issues." Stage completion provides that synchronization point.

**Implementation changes to `workflowDone()` (src/workflow.ts:679-872):**

1. After marking task done, check if ALL tasks in `task.stage` are now done
2. If not all done → return `stage_progress: "N/M"`, `stage_complete: false`, and `next_step` pointing to next pending task in same stage
3. If all done → **stage completion sequence:**
   a. Collect data results from all tasks in the stage
   b. For `each:`-stages: concatenate arrays keyed by result name
   c. Write collected results to `scope`
   d. Evaluate ALL pending stages: check `each:` key exists in scope + all `params:` satisfied
   e. Expand stages whose requirements are met (in declaration order)
   f. Return `stage_complete: true`, `scope_update`, `next_stage`, `expanded_tasks`

The current `expandTasksFromParams()` is reused but its input source changes: instead of `data.params`, it reads from `data.scope`.

### Decision 6: `workflow result` CLI command

**Choice:** A new `workflow result` command replaces `workflow write-file`. It handles both file results (stdin) and data results (`--json`).

```
workflow result --workflow <name> --task <id> --key <key> [--json <data>]
```

- Without `--json`: reads stdin (file result), same as current `write-file`
- With `--json`: stores data result inline in tasks.yml
- Validation runs immediately (JSON Schema via ajv + semantic validators)
- `workflow write-file` remains as a deprecated alias that delegates to `workflow result`

**Implementation:**
- New CLI command registration at `src/cli/workflow.ts`
- New `workflowResult()` function in `src/workflow.ts` — combines logic from current `workflowWriteFile()` (file path, engine delegation, validation) with new data-result storage logic
- Response: `{ valid: boolean, errors: string[] }` (+ `file_path` for file results)

### Decision 7: Dual validation pipeline

**Choice:** Every `workflow result` call runs validation in order: (1) JSON Schema via ajv, (2) semantic validators. Both must pass.

**Implementation:**
- `validateResult(key, content, resultDeclaration, resolvedSchemas, config)` — new function
- Step 1: If `$ref` or inline schema present → `ajv.validate(schema, data)` — for data results, parse JSON; for file results, parse file content as YAML/JSON
- Step 2: If `validators:` present → delegate to existing `validateByKeys()` from `validation-registry.ts`
- Both steps run unconditionally when declared — a result is only accepted when ALL pass
- Error response aggregates errors from both steps

### Decision 8: Params use inline JSON Schema, no `$ref`

**Choice:** Params use inline JSON Schema type constraints directly in the task frontmatter. Simple scalar types use `{ type: string }`, complex structured types use full inline schema with `properties:`. No `$ref` to `schemas.yml` — params are self-contained.

**Why inline, not `$ref`?** Params are task-local input declarations. Unlike results (which are shared across stages via scope and need cross-skill type sharing), params describe what a single task needs from its environment. Inline keeps the task file self-documenting without requiring external file lookups.

**Why not keep the old format?** The old `~` / `[]` convention encodes required/optional via YAML value types (null = required, non-null = optional with that value as default). This is ambiguous — `design_reference: ~` looks required but the intake task says it's optional. JSON Schema makes this explicit via `default:`. The CLI rejects old-format params at `workflow create` time (fail-fast).

**Detection rule:** A param value is old-format if it lacks a `type` property. This catches null (`~`), bare arrays (`[]`), bare objects (`{}`), and scalar defaults. The error message names the param and task file.

### Decision 9: No deprecation window for old-format params

**Choice:** Old-format params are a hard error, not a deprecation warning. `workflow create` fails immediately.

**Why no grace period?** The old format is the root cause of the `design_reference` required/optional bug. A deprecation warning would let broken workflows continue running silently. Since all task files are in the same repo and the migration is mechanical (replace `~` with `{ type: string }`, replace `[]` with `{ type: array, default: [] }`), a one-shot migration is feasible.

## Risks / Trade-offs

**Stage completion blocks progress on slow tasks** — If one task in an `each:`-stage hangs, no results flow to the next stage. This is by design (correctness over speed), but a stuck task blocks the entire pipeline.
→ Mitigation: `workflow abandon` already exists for stuck tasks. Stage progress (`"2/4"`) in the response makes the blocker visible.

**Breaking change surface is large** — `files:` → `result:`, `--params` → `workflow result`, `write-file` → `workflow result`, stage-level `each:` → task-level. All existing task files and workflow instructions need updating.
→ Mitigation: Deprecated aliases (`files:` fallback, `write-file` alias, `--params` warning) provide a migration window. Core skill migration (Part 1) and addon changes (Part 2) can be done in one coordinated change since they're in the same repo.

**Scope grows unboundedly** — Every data result accumulates in scope for the workflow's lifetime. For workflows with many large arrays, `tasks.yml` could get large.
→ Mitigation: Current workflows produce small data sets (< 100 items). If this becomes a problem, scope pruning can be added later without changing the model.

**JSON Schema validation adds a runtime dependency on schema resolution** — `workflow create` must resolve all `$ref` paths. If a schema file is missing or malformed, create fails.
→ Mitigation: Fail-fast at create time is intentional — better to catch missing schemas before any work starts. `ajv` is already a dependency.

**Parallel stage expansion adds complexity** — Multiple stages expanding simultaneously means the engine must evaluate all pending stages after each scope update, not just the "next" one.
→ Mitigation: The evaluation loop is simple (iterate pending stages, check requirements). Tasks are still executed sequentially per existing engine behavior — only expansion is parallel, not execution.

## Migration Plan

1. **Part 2 (addon):** Implement `workflow result` command, scope management, stage completion logic, schema resolution, `result:` on tasks. Keep `write-file` as alias, `files:` as fallback, `--params` with deprecation warning.
2. **Part 1 (core skill):** Create `schemas.yml` files per concern. Migrate all task files from `files:` to `result:`, stage-level `each:` to task-level `each:`. Update skill instructions (`workflow-execution.md`, `task-format.md`).
3. **Part 3 (integration skills):** Migrate task files (e.g. `designbook-drupal/components/tasks/create-component.md`). Integration schemas may reference core schemas via skill-qualified `$ref`.
4. **Part 4 (params migration):** Add old-format params detection to `parseFrontmatter()`. Migrate all task files from old-format `params:` to inline JSON Schema. Hard error on old format at `workflow create` time.
5. **Storybook panel:** Update Files tab to read from `result:` entries instead of `files:`.
5. **Remove deprecations** in a follow-up release after all skills are migrated.
