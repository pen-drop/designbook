## Context

The `design-shell` workflow completed a full end-to-end run but required several manual interventions:
1. `$ref: ../schemas.yml#/Check` in task result schemas failed to resolve at `workflow done --data` validation time, requiring manual inlining of schemas in tasks.yml
2. Triage emitted fields (`id`, `storyId`, `checkKey`, `scene`) on Issue objects that the schema does not declare, causing downstream polish tasks to rely on undeclared params
3. Two integration rules used bare `create-scene` step names that never fire
4. Two files classified as rule/blueprint contain procedural content that belongs in resources

The CLI codebase is in `packages/storybook-addon-designbook/src/cli/`. Skill files are in `.agents/skills/` (symlinked to `.claude/skills/`).

## Goals / Non-Goals

**Goals:**
- `$ref` entries in task result schemas resolve correctly during `workflow done --data` validation
- `schemas.yml#/Issue` declares all fields emitted by triage and consumed by polish
- All `when.steps` values match actual workflow step names
- Files are classified correctly per the 4-level skill model (task/rule/blueprint/resource)
- Blueprint deduplication: remove constraint content that belongs in rules

**Non-Goals:**
- Changing the workflow stage structure or adding new stages
- Modifying CLI commands or adding new subcommands
- Refactoring the AJV validation pipeline beyond `$ref` resolution
- Addressing the `design_hint` propagation path from intake through to polish (separate concern)

## Decisions

### D1: Resolve `$ref` in `expandWorkflowTasks` by calling `collectAndResolveSchemas`

The function `collectAndResolveSchemas` already exists in `workflow-resolve.ts` and handles `$ref` resolution + schema collection. Currently it is only called in `resolveWorkflowPlan` (the plan-mode path) but not in `expandTasksFromParams` (the task-expansion path that `workflow done` uses).

**Fix**: After `expandTasksFromParams` returns tasks, call `collectAndResolveSchemas(tasks, skillsRoot)` to:
1. Populate `task.result[key].schema` for every `$ref`-only declaration
2. Return the collected `schemas` map

Then pass this `schemas` map to `workflowPlan` instead of `undefined`.

**Alternative considered**: Resolve `$ref` at YAML parse time when reading tasks.yml. Rejected because `$ref` paths are relative to the task source file location (in skills/), not to tasks.yml location (in workflows/). The resolution must happen with the correct base path, which `collectAndResolveSchemas` already handles.

### D2: Extend Issue schema inline — no new schema type

Add `id`, `storyId`, `checkKey`, `scene` as optional properties to `schemas.yml#/Issue`. These fields are populated by triage and consumed by polish but are not present in every Issue context (e.g., compare emits issues without `id`).

**Alternative considered**: Create a separate `TriageIssue` schema extending `Issue`. Rejected because the workflow engine does not support schema inheritance, and maintaining two issue schemas adds complexity for minimal benefit.

### D3: Move `extract-reference.md` and `static-assets.md` to `resources/`

Both files contain procedural instructions (Playwright commands, curl sequences) that are neither hard constraints (rules) nor overridable starting points (blueprints). The `resources/` directory already exists in the skill structure and is the correct home for reference material that tasks and rules may cite.

The files retain their content but lose their `when.steps` frontmatter — resources are loaded on-demand by tasks, not auto-loaded by the stage resolver.

### D4: Fix step names with qualified syntax

Replace bare `create-scene` with `design-shell:create-scene, design-screen:create-scene` in the two integration rule files. This matches the colon-qualified syntax used everywhere else (e.g., `design-shell:intake`).

## Risks / Trade-offs

- **[Risk] `collectAndResolveSchemas` may have side effects in expand context** → Mitigation: The function is pure (reads files, returns data). Verify it does not mutate the tasks array in unexpected ways by checking for shared references.
- **[Risk] Making Issue schema fields optional allows incomplete triage output** → Mitigation: The triage task itself enforces field presence via its body instructions. The schema serves as documentation, not enforcement.
- **[Risk] Moving files to resources/ breaks existing `when.steps` auto-loading** → Mitigation: This is the intended effect. Tasks that need the content must explicitly reference it. Verify no stage_loaded entry depends on these files being auto-resolved.
