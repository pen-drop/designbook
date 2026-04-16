# Schema Composition Integration Tests

## Goal

Integration tests that validate the full workflow lifecycle output (tasks.yml) with focus on schema composition (`extends`, `provides`, `constrains`). Tests run against real fixtures in temp directories, call the actual functions (`resolveAllStages`, `workflowCreate`, `workflowDone`), and assert structural expectations against the resulting tasks.yml state at each step.

## File Location

```
packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts
```

## Helpers

### Builder Functions

Reusable functions that create skill artifacts in a temp directory. Each takes an object for frontmatter (serialized via `js-yaml`), avoiding manual YAML string construction.

```typescript
function writeWorkflow(dir: string, id: string, fm: object): string
function writeTask(agentsDir: string, skill: string, name: string, fm: object, body?: string): string
function writeRule(agentsDir: string, skill: string, name: string, fm: object, body?: string): string
function writeBlueprint(agentsDir: string, skill: string, name: string, fm: object, body?: string): string
```

- `writeWorkflow` writes to `{dir}/workflows/{id}.md`
- `writeTask` writes to `{agentsDir}/skills/{skill}/tasks/{name}.md`
- `writeRule` writes to `{agentsDir}/skills/{skill}/rules/{name}.md`
- `writeBlueprint` writes to `{agentsDir}/skills/{skill}/blueprints/{name}.md`

### normalize()

Strips volatile fields and relativizes paths for stable comparison:

```typescript
function normalize(data: WorkflowFile, rootDir: string): object
```

Removes: `started_at`, `completed_at`, `last_validated`, `workflow_id`.
Relativizes: absolute paths starting with `rootDir` become relative.

### runWorkflow()

Orchestrates the full workflow lifecycle and collects state snapshots:

```typescript
interface WorkflowStep {
  done: string;                        // task ID to mark done
  data?: Record<string, unknown>;      // --data payload for data results
  summary?: string;
}

interface WorkflowRun {
  agentsDir: string;
  workflowId: string;
  config: DesignbookConfig;
  rawConfig?: Record<string, unknown>;
  params?: Record<string, unknown>;
  steps: WorkflowStep[];
}

async function runWorkflow(run: WorkflowRun): Promise<{
  resolved: ResolvedSteps;             // output of resolveAllStages
  created: WorkflowFile;               // state after workflowCreate
  afterSteps: WorkflowFile[];          // state after each workflowDone
}>
```

Internally:
1. Calls `resolveAllStages()` with the workflow file, config, and agents dir
2. Calls `workflowCreate()` with resolved stages, stage_loaded, params, schemas, envMap
3. For each step: calls `workflowDone()` with the step's task ID and optional data payload
4. After each call, reads tasks.yml and pushes the state into the return arrays

## Fixture Setup

Minimal skill structure in temp directory:

```
{tmpDir}/.agents/skills/test-skill/
  workflows/test-compose.md
  tasks/
    intake--test-compose.md
    create-thing.md
  rules/
    extend-thing.md
    constrain-thing.md
  blueprints/
    thing-bp.md
```

### Workflow: test-compose.md

```yaml
title: Test Composition
stages:
  intake:
    steps: [intake]
  execute:
    steps: [create-thing]
engine: direct
```

### Task: intake--test-compose.md

```yaml
when:
  steps: [intake]
domain: [data-model]
result:
  type: object
  required: [items]
  properties:
    items:
      type: array
      items:
        type: object
```

### Task: create-thing.md

Base result schema with `name` property (enum + string type):

```yaml
when:
  steps: [create-thing]
domain: [data-model]
each:
  items:
    type: object
result:
  type: object
  required: [thing]
  properties:
    thing:
      type: object
      required: [name]
      properties:
        name: { type: string, enum: [a, b, c, d] }
```

### Rule: extend-thing.md

Adds `extra` property via `extends`:

```yaml
domain: data-model
extends:
  thing:
    properties:
      extra: { type: number }
```

### Rule: constrain-thing.md

Narrows `name` enum via `constrains`:

```yaml
domain: data-model
constrains:
  thing:
    properties:
      name: { enum: [b, c, d, e] }
```

### Blueprint: thing-bp.md

Sets `name` default via `provides`:

```yaml
type: component
name: thing
domain: data-model
provides:
  thing:
    properties:
      name: { default: untitled }
```

### Expected merged_schema

After merge order (bp extends -> rule extends -> bp provides -> rule provides -> rule constrains):

```yaml
thing:
  type: object
  required: [name]
  properties:
    name: { type: string, enum: [b, c, d], default: untitled }
    extra: { type: number }
```

- `extends` (rule) added `extra: { type: number }`
- `provides` (blueprint) set `default: untitled` on `name`
- `constrains` (rule) intersected enum: `[a,b,c,d]` & `[b,c,d,e]` = `[b,c,d]`

## Test Scenarios

### Test 1: resolveAllStages produces merged_schema

Calls only `resolveAllStages()`. No create, no done. Asserts:

- `step_resolved['create-thing'].merged_schema.thing` contains the fully composed schema
- `step_resolved['create-thing'].rules` includes both rule files
- `step_resolved['create-thing'].blueprints` includes the blueprint file

### Test 2: workflowCreate stores merged_schema in stage_loaded

Runs through create. Reads tasks.yml. Asserts:

- `status: running`, `current_stage: intake`
- `stage_loaded['create-thing'].merged_schema` matches expected composed schema
- `stage_loaded['create-thing'].rules` and `.blueprints` are correctly stored
- First task (intake) is `in-progress` with correct result declarations

### Test 3: full lifecycle with schema composition

Uses `runWorkflow()` with one step. Task IDs are resolved dynamically from `created.tasks` (since create generates the intake task ID from the step name):

```typescript
steps: [
  { done: '<intake-task-id>', data: { items: [{ name: 'alpha' }] } },
]
```

`runWorkflow()` resolves `done` values: if a step's `done` matches a step name, it looks up the actual task ID from the current workflow state. This avoids hardcoding generated IDs.

Asserts after intake done:
- `current_stage: execute`
- `scope.items` populated from intake data result
- Intake task is `done`
- Expanded create-thing task is `in-progress`
- Expanded task has base result schema (from task frontmatter)
- `stage_loaded` still carries the merged_schema

## Comparison Strategy

- `normalize()` strips volatile fields, then `toMatchObject()` against handwritten expected partial objects
- Expected objects only specify fields that matter — volatile and irrelevant fields are omitted
- `expect.objectContaining()` / `expect.arrayContaining()` used selectively for deeply nested partial matches
- Each test scenario defines its expected partials as constants (e.g. `AFTER_CREATE`, `AFTER_INTAKE_DONE`)

## Out of Scope

- CLI subprocess testing (we call the functions directly)
- Git worktree engine (tests use `engine: direct`)
- File result writing/validation (covered by existing `workflow-integration.test.ts`)
- Snapshot files on disk (expected structures are inline in the test)
