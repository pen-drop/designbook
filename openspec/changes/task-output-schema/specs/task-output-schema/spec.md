# task-result-schema Specification

## Purpose

Unifies file writes and data results into a single `result:` declaration on tasks. Introduces skill-level JSON Schema definitions, schema-based validation, and a scope-based data flow model where stage completion (not task completion) triggers collection and next-stage expansion.

Replaces `files:` + `--params` with a single `result:` contract. Replaces `write-file` with `workflow result`. Eliminates file-based inter-stage communication (draft JSON files) in favor of engine-managed scope.

---

## Requirement: Skill-level schema definitions

Each skill directory MAY contain `schemas.yml` files that declare shared JSON Schema types. Tasks reference these schemas via `$ref` with file paths — relative or skill-qualified.

```
.agents/skills/designbook/design/schemas.yml
.agents/skills/designbook-drupal/components/schemas.yml
```

A `schemas.yml` file is a YAML map where each key is a PascalCase type name and each value is a JSON Schema (draft-07) definition:

```yaml
# .agents/skills/designbook/design/schemas.yml

Check:
  type: object
  required: [storyId, breakpoint, region]
  properties:
    storyId: { type: string }
    breakpoint: { type: string }
    region: { enum: [full, header, footer] }
    threshold: { type: number, default: 0 }

Issue:
  type: object
  required: [severity, description, file_hint]
  properties:
    severity: { enum: [critical, major, minor] }
    description: { type: string }
    file_hint: { type: string }
    properties:
      type: array
      items:
        type: object
        properties:
          property: { type: string }
          expected: { type: string }
          actual: { type: string }

Component:
  type: object
  required: [component, group]
  properties:
    component: { type: string }
    slots: { type: array, items: { type: string }, default: [] }
    group: { type: string }
    design_hint: { type: object }

ComponentYml:
  type: object
  required: [name, status]
  properties:
    name: { type: string }
    status: { type: string }
    slots: { type: object }
    props: { type: object }
```

- Schema files are part of the skill — they travel with the skill and are versioned alongside task and rule files
- Schema type names MUST be PascalCase
- Schema definitions follow JSON Schema draft-07 syntax
- A schema file MAY live at any level within a skill directory (e.g. `design/schemas.yml`, `components/schemas.yml`)

#### Scenario: Schema file loaded at workflow create
- **WHEN** `workflow create` resolves a task that contains `$ref` paths
- **THEN** the engine loads the referenced schema files and resolves all `$ref` entries
- **AND** stores the resolved schemas in `tasks.yml` for runtime validation

#### Scenario: Unresolvable $ref
- **WHEN** a task references `$ref: ../schemas.yml#/Unknown` and `Unknown` does not exist in the file
- **THEN** `workflow create` fails with an error naming the unresolved reference

---

## Requirement: $ref uses file paths for schema references

Schema references in task frontmatter (`each:`, `result:`, `params:`) use `$ref` with a file path and fragment, following JSON Schema conventions. Two forms are supported:

**Relative path** — resolved from the task file's directory:

```yaml
# Task at: designbook/design/tasks/compare-screenshots.md
# Schema at: designbook/design/schemas.yml
each:
  checks:
    $ref: ../schemas.yml#/Check
result:
  issues:
    type: array
    items:
      $ref: ../schemas.yml#/Issue
```

**Skill-qualified path** — resolved from the skills root (`.agents/skills/`):

```yaml
# Task in designbook-drupal referencing a schema from designbook core
each:
  components:
    $ref: designbook/design/schemas.yml#/Component
```

This follows the same naming convention as task `name` and `as` fields (e.g. `designbook:design:compare-screenshots`).

- The path before `#` identifies the schema file
- The fragment after `#/` identifies the type within that file
- Relative paths use `../` navigation from the task file's location
- Skill-qualified paths start from the skills root directory
- The engine resolves all `$ref` entries at `workflow create` time and inlines the resolved schemas into `tasks.yml`

#### Scenario: Relative $ref resolution
- **WHEN** a task at `designbook/design/tasks/triage.md` declares `$ref: ../schemas.yml#/Issue`
- **THEN** the engine resolves it to `.agents/skills/designbook/design/schemas.yml`, type `Issue`

#### Scenario: Cross-skill $ref resolution
- **WHEN** a task in `designbook-drupal/components/tasks/` declares `$ref: designbook/design/schemas.yml#/Component`
- **THEN** the engine resolves it to `.agents/skills/designbook/design/schemas.yml`, type `Component`

#### Scenario: $ref in params for inline typed fields
- **WHEN** a task declares `params: { reference: { type: array, items: { $ref: ../schemas.yml#/Reference } } }`
- **THEN** the engine resolves the nested `$ref` and uses the full schema for validation

---

## Requirement: Unified result declaration replaces `files:` and `--params`

A task file MAY declare a `result:` field in its frontmatter. `result:` replaces both the current `files:` declaration (for file results) and `--params` on `workflow done` (for data results). The distinction is the `path:` field.

**Data result** (no `path:`) — value stored in the task's result in tasks.yml, flows into workflow scope at stage completion:

```yaml
---
when:
  steps: [setup-compare]
result:
  checks:
    type: array
    items:
      $ref: ../schemas.yml#/Check
---
```

**File result** (`path:` present) — content written to disk, validated against schema and optional semantic validators:

```yaml
---
when:
  steps: [create-component]
  frameworks.component: sdc
each:
  components:
    $ref: designbook/design/schemas.yml#/Component
result:
  component-yml:
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    $ref: ../schemas.yml#/ComponentYml
    validators: [component]
  component-twig:
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.twig
---
```

Rules:

- `result:` is a map where each key is a result identifier
- Each result entry is a JSON Schema definition, optionally extended with `path:` and `validators:`
- Results without `path:` are data results → stored in tasks.yml, flow into scope
- Results with `path:` are file results → written to disk by `workflow result`
- `path:` supports `$ENV` variables and `{{ param }}` templates (same as current `files:` paths)
- `validators:` is an optional array of semantic validator keys (e.g. `[component, scene]`) that run in addition to JSON Schema validation
- A task without `result:` produces nothing (side-effect only)
- Result keys MUST NOT collide with reserved workflow fields (`status`, `name`, `engine`, `stages`)

#### Scenario: Task with data result
- **WHEN** a task declares `result: { checks: { type: array, items: { $ref: ... } } }` (no `path:`)
- **THEN** the result value is stored in the task's result in tasks.yml
- **AND** at stage completion, the value flows into the workflow scope

#### Scenario: Task with file result
- **WHEN** a task declares `result: { component-yml: { path: "...", $ref: "..." } }`
- **THEN** the content is written to the resolved path on disk
- **AND** validated against the JSON Schema and any declared validators

#### Scenario: Task with mixed results
- **WHEN** a task declares both file results (with `path:`) and data results (without `path:`)
- **THEN** file results are written to disk, data results are stored in tasks.yml
- **AND** all results must be valid before the task can be marked done

---

## Requirement: Result validation runs schema and semantic validators

Each `workflow result` call validates the content against all declared validators for that result key. A result is only accepted when ALL validations pass.

Validation runs in order:

1. **JSON Schema validation** — if the result declares `$ref` or inline JSON Schema, validate the content against the resolved schema
2. **Semantic validators** — if the result declares `validators: [...]`, run each named validator against the content

```
workflow result --key component-yml < content
  │
  ├─ 1. JSON Schema ($ref: ../schemas.yml#/ComponentYml)  → ✓ or ✗
  │
  └─ 2. Semantic validator: component                      → ✓ or ✗
       │
       └─ ALL ✓ → result accepted
          ANY ✗ → error returned, task stays in-progress
```

- Schema validation uses the resolved JSON Schema from `tasks.yml`
- Semantic validators are existing CLI validators (`component`, `scene`, `data-model`, `tokens`, `entity-mapping`)
- A result without `$ref` and without `validators:` is accepted without validation (untyped result)
- Validation errors include the validator name and failure details

#### Scenario: Result passes all validators
- **WHEN** `workflow result --key component-yml` is called with valid content
- **AND** the content passes both JSON Schema and the `component` validator
- **THEN** the result is accepted

#### Scenario: Result fails schema validation
- **WHEN** content fails JSON Schema validation
- **THEN** the engine returns an error with schema violation details
- **AND** the result is not written

#### Scenario: Result fails semantic validation
- **WHEN** content passes JSON Schema but fails the `component` semantic validator
- **THEN** the engine returns an error with the validator's failure message
- **AND** the result is not written

#### Scenario: Result without any validators
- **WHEN** a task declares `result: { component-twig: { path: "..." } }` with no `$ref` and no `validators:`
- **THEN** the content is accepted without validation

---

## Requirement: `workflow result` replaces `workflow write-file`

The `workflow write-file` CLI command is replaced by `workflow result`.

**For file results** (result has `path:`):

```bash
cat <<'EOF' | _debo workflow result --task $TASK_ID --key component-yml
... file content ...
EOF
```

**For data results** (result has no `path:`):

```bash
_debo workflow result --task $TASK_ID --key issues --json '[...]'
```

- `--key` identifies which result entry from the task's `result:` declaration
- File results read content from stdin (same as current `write-file`)
- Data results accept `--json` with inline JSON
- Validation runs immediately on each `workflow result` call
- Success response: `{ "valid": true, "errors": [] }` (plus `"file_path"` for file results)
- Failure response: `{ "valid": false, "errors": ["..."] }`, exit code 1
- `workflow write-file` continues to work as a deprecated alias

#### Scenario: File result via stdin
- **WHEN** `cat content | _debo workflow result --task X --key component-yml`
- **AND** the result declares `path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml`
- **THEN** the engine writes the content to the resolved path, validates, and returns the result

#### Scenario: Data result via --json
- **WHEN** `_debo workflow result --task X --key issues --json '[...]'`
- **AND** the result declares no `path:`
- **THEN** the engine stores the value in the task's result in tasks.yml and validates against the schema

#### Scenario: Unknown key
- **WHEN** `workflow result --key unknown-key` is called
- **AND** the task's `result:` does not contain `unknown-key`
- **THEN** the engine returns an error listing the valid result keys

---

## Requirement: `workflow done` marks task complete without result data

`workflow done` no longer accepts `--output` or `--params` for passing data. It only marks the task as complete. The engine checks that all declared results have been written via `workflow result`.

```bash
_debo workflow done --task $TASK_ID [--summary <text>]
```

- If all declared results are written and valid → task marked as done
- If any declared result is missing or invalid → error, task remains in-progress
- `--params` on `workflow done` is deprecated and emits a warning; its data is treated as a data result
- `--summary` remains for display in the Storybook panel

#### Scenario: Task done with all results written
- **WHEN** all declared results have been written via `workflow result`
- **AND** `workflow done --task X` is called
- **THEN** the task is marked as done

#### Scenario: Task done with missing result
- **WHEN** a task declares `result: { checks: ... }` but `workflow result --key checks` was never called
- **AND** `workflow done --task X` is called
- **THEN** the engine returns an error listing the missing result keys
- **AND** the task remains in-progress

---

## Requirement: Tasks declare iteration via `each:` in frontmatter

A task file MAY declare an `each:` field in its frontmatter. This replaces the current `each:` on the workflow stage definition.

```yaml
---
when:
  steps: [compare]
each:
  checks:
    $ref: ../schemas.yml#/Check
params:
  scene: { type: string }
result:
  issues:
    type: array
    items:
      $ref: ../schemas.yml#/Issue
---
```

- `each:` is a map with exactly one entry: `{ <scope-key>: <json-schema> }`
- The scope key (e.g. `checks`) names the array in the workflow scope to iterate over
- The value is a JSON Schema (typically a `$ref`) that defines the shape of each item
- Each item in the array becomes one task instance. Item fields are available as task params
- `each:` and `result:` together imply collection: the engine concatenates data result arrays across all task instances at stage completion

#### Scenario: Task with each and result (fan-out with collection)
- **WHEN** a task declares `each: { checks: { $ref: ... } }` and a data result `issues`
- **AND** the scope contains `checks: [c1, c2, c3]`
- **THEN** the engine creates 3 task instances, each receiving one Check item as params
- **AND** upon stage completion, concatenates all `issues` arrays from all instances

#### Scenario: Task with each but no result (fan-out without collection)
- **WHEN** a task declares `each: { checks: { $ref: ... } }` but no `result:`
- **THEN** the engine creates N task instances but does not collect any result

#### Scenario: each validates items against schema
- **WHEN** a task declares `each: { checks: { $ref: ../schemas.yml#/Check } }`
- **AND** the scope contains `checks: [...]`
- **THEN** the engine validates each item against the resolved Check schema before creating task instances

---

## Requirement: Workflow stages no longer declare `each:`

The `each:` field on workflow stage definitions is deprecated. Iteration is declared on the task.

```yaml
# Before (deprecated)
stages:
  compare:
    each: checks
    steps: [compare]

# After
stages:
  compare:
    steps: [compare]
```

The workflow file becomes a pure orchestration layer: stage ordering and step assignment. Data contracts live on tasks.

#### Scenario: Workflow with stage-level each (migration)
- **WHEN** the engine encounters a stage with `each:` in the workflow frontmatter
- **THEN** it uses the stage-level `each:` as fallback (backwards compatibility)
- **AND** emits a deprecation warning suggesting migration to task-level `each:`

#### Scenario: Task-level each takes precedence
- **WHEN** both the stage definition and the task file declare `each:`
- **THEN** the task-level `each:` takes precedence

---

## Requirement: Workflow scope as shared data namespace

The engine maintains a `scope` object per workflow run. Data results flow into the scope at stage completion. Task inputs (params + each) are resolved from the scope.

- Scope starts empty at workflow creation
- When a stage completes, collected data results are written to the scope
- File results (with `path:`) do NOT flow into the scope — they are written to disk only
- Scope keys are strings; values are any JSON-serializable type
- Later writes to the same key overwrite earlier values (last writer wins)
- Scope is persisted in `tasks.yml` under a top-level `scope:` field

```yaml
# tasks.yml
scope:
  scene: "design-system:shell"
  component: [...]
  reference: [...]
  checks: [...]
  issues: [...]
```

#### Scenario: Data result updates scope
- **WHEN** a stage completes and its tasks produced data results `{ checks: [...] }`
- **THEN** the engine writes `scope.checks = [...]`

#### Scenario: File result does not update scope
- **WHEN** a task produces a file result (with `path:`)
- **THEN** the file is written to disk but the scope is not affected

#### Scenario: Later stage overwrites scope key
- **WHEN** compare stage produces `scope.issues = [raw]` and triage stage later produces `scope.issues = [consolidated]`
- **THEN** the scope contains the consolidated version (last writer wins)

#### Scenario: Task params resolved from scope
- **WHEN** a task declares `params: { scene: { type: string } }`
- **AND** the scope contains `scene: "design-system:shell"`
- **THEN** the task receives `scene = "design-system:shell"` as a param

---

## Requirement: Task params declare scope dependencies

The `params:` field on a task declares what the task needs from the scope, beyond what it receives from `each:` iteration.

```yaml
---
each:
  checks:
    $ref: ../schemas.yml#/Check
params:
  scene: { type: string }
result:
  issues:
    type: array
    items:
      $ref: ../schemas.yml#/Issue
---
```

- `params:` is a map where each key is a scope variable name and the value is a JSON Schema type constraint
- Params without `default:` are required — the stage cannot expand until the scope contains a matching value
- Params with `default:` are optional — the default is used if the scope does not contain the key
- Params from `each:` item fields are NOT repeated in `params:` — the `$ref` schema defines them
- The engine uses `params:` + `each:` together to determine when a stage is ready to expand

#### Scenario: Stage expansion blocked by missing param
- **WHEN** a task in a pending stage declares `params: { scene: { type: string } }`
- **AND** the scope does not yet contain `scene`
- **THEN** the engine does not expand that stage's tasks

#### Scenario: Stage expansion proceeds when all deps met
- **WHEN** a task declares `params: { scene: { type: string } }` and `each: { checks: { $ref: ... } }`
- **AND** the scope contains both `scene: "..."` and `checks: [...]`
- **THEN** the engine expands N tasks (one per check), each receiving scene + check-item fields

---

## Requirement: Params use inline JSON Schema — old format rejected

Every `params:` value MUST be a JSON Schema object (an object with a `type` property). Simple params use shorthand inline schema, complex params use full inline schema with `properties:`. No `$ref` is required for params — they are self-contained in the task file.

**Simple params** — scalar types that come from scope or `each:` item fields:

```yaml
params:
  product_name: { type: string }
  order: { type: integer }
  storyId: { type: string }
```

**Complex params** — structured types with nested properties:

```yaml
params:
  design_reference:
    type: object
    properties:
      type: { type: string }
      url: { type: string }
      label: { type: string }
  problems:
    type: array
    default: []
    items:
      type: object
      properties:
        title: { type: string }
        solution: { type: string }
```

**Required vs. optional** is determined by the `default:` field:
- No `default:` → required — stage expansion blocks until scope provides a value
- Has `default:` → optional — the default is used when scope does not contain the key

**Old format detection** — The engine MUST reject params that use the legacy YAML-default convention. A param value is old-format if:
- It is `null` / `~` (YAML null)
- It is a bare array (`[]`)
- It is a bare object without `type` (`{}`)
- It is a scalar string, number, or boolean (not wrapped in `{ type: ... }`)

When old-format params are detected, `workflow create` MUST fail with an error listing the offending params and the task file path.

#### Scenario: Valid inline JSON Schema params
- **WHEN** a task declares `params: { scene: { type: string }, issues: { type: array, default: [] } }`
- **THEN** `workflow create` accepts the params
- **AND** `scene` is required (no default), `issues` is optional (has default)

#### Scenario: Old-format null param rejected
- **WHEN** a task declares `params: { product_name: ~ }`
- **THEN** `workflow create` fails with: `Invalid param "product_name" in <task-file>: expected JSON Schema object with "type" property, got null`

#### Scenario: Old-format array default rejected
- **WHEN** a task declares `params: { features: [] }`
- **THEN** `workflow create` fails with: `Invalid param "features" in <task-file>: expected JSON Schema object with "type" property, got array`

#### Scenario: design_reference as optional complex param
- **WHEN** a task declares:
  ```yaml
  params:
    design_reference:
      type: object
      default: null
      properties:
        type: { type: string }
        url: { type: string }
        label: { type: string }
  ```
- **THEN** `design_reference` is optional (has `default: null`)
- **AND** when provided, its value is validated against the inline schema

---

## Requirement: Stage completion collects results and updates scope

Stage completion is the moment when all tasks in a stage have status `done`. At this point the engine:

1. Collects all data results (without `path:`) from the stage's tasks
2. For stages with `each:`-tasks: concatenates array results across all task instances
3. Writes collected results to the scope
4. Validates scope against pending stages' input requirements
5. Expands stages whose requirements are now met

```
task-1 result --key issues --json '[a, b]'   → validated ✓
task-1 done                                   → stage not complete
task-2 result --key issues --json '[c]'       → validated ✓
task-2 done                                   → stage not complete
task-3 result --key issues --json '[]'        → validated ✓
task-3 done                                   → stage COMPLETE
  → collect: scope.issues = [a, b, c]
  → next stage: triage needs scope.issues ✓ + scope.scene ✓
  → expand triage tasks
```

- For non-`each:` stages (single task): data result is written directly to scope (no concatenation)
- For `each:` stages: array-typed data results are concatenated; non-array data results cause an error
- Empty arrays are valid and included in concatenation (they contribute nothing)
- The `RESPONSE:` JSON from the last `workflow done` in a stage includes `stage_complete: true` and the expanded tasks for the next stage

#### Scenario: each-stage collects array results
- **WHEN** a stage with 3 tasks (from `each:`) completes, each having produced data result `{ issues: [...] }`
- **THEN** the engine concatenates all issues arrays into `scope.issues`

#### Scenario: Single-task stage writes result to scope
- **WHEN** a stage with 1 task completes with data result `{ checks: [...] }`
- **THEN** the engine writes `scope.checks = [...]` directly

#### Scenario: Last task triggers stage completion
- **WHEN** the last pending task in a stage is marked done
- **THEN** the `RESPONSE:` JSON includes `stage_complete: true`, the collected scope values, and the expanded tasks for the next stage

#### Scenario: Non-last task does not trigger stage expansion
- **WHEN** a task in an each-stage is marked done but other tasks remain pending
- **THEN** the `RESPONSE:` JSON includes `stage_complete: false` and `stage_progress: "2/4"`

---

## Requirement: `RESPONSE:` JSON includes stage progress

The `workflow done` response is extended with stage-awareness:

```json
{
  "task": "compare-sm-header",
  "status": "done",
  "stage": "compare",
  "stage_progress": "2/4",
  "stage_complete": false
}
```

When `stage_complete: true`:

```json
{
  "task": "compare-xl-footer",
  "status": "done",
  "stage": "compare",
  "stage_progress": "4/4",
  "stage_complete": true,
  "scope_update": {
    "issues": [ ... ]
  },
  "next_stage": "triage",
  "expanded_tasks": [
    { "id": "triage-a3f7", "step": "triage", "title": "Triage: design-system:shell" }
  ]
}
```

#### Scenario: Mid-stage response
- **WHEN** task 2 of 4 completes in an each-stage
- **THEN** the response includes `stage_progress: "2/4"` and `stage_complete: false`
- **AND** the response includes `next_step` pointing to the next pending task in the same stage

#### Scenario: Stage-completing response
- **WHEN** the last task in a stage completes
- **THEN** the response includes `stage_complete: true`, `scope_update` with collected values, `next_stage`, and `expanded_tasks`

---

## Requirement: tasks.yml stores result per task and scope per workflow

The `tasks.yml` format is extended:

```yaml
scope:
  scene: "design-system:shell"
  checks: [...]
  issues: [...]

schemas:                                   # resolved schemas, inlined at create time
  Check: { type: object, properties: ... }
  Issue: { type: object, properties: ... }
  ComponentYml: { type: object, ... }

tasks:
  - id: compare-sm-header-a3f7
    step: compare
    stage: compare
    status: done
    result:
      issues:                              # data result: inline in tasks.yml
        - { severity: major, description: "...", file_hint: "..." }
    params:
      scene: "design-system:shell"
      storyId: "designbook-design-system-scenes--shell"
      breakpoint: sm
      region: header

  - id: create-component-header-b8c2
    step: create-component
    stage: component
    status: done
    result:
      component-yml:                       # file result: path reference
        path: /abs/path/components/header/header.component.yml
        valid: true
      component-twig:
        path: /abs/path/components/header/header.twig
        valid: true
```

- Data results (no `path:`) are stored inline as values in the task's `result:` map
- File results (with `path:`) are stored as `{ path, valid }` references
- `scope:` at workflow level stores the current accumulated scope (data results only)
- `schemas:` at workflow level stores all resolved schemas (inlined from `$ref` resolution at create time)

#### Scenario: Workflow resume with scope
- **WHEN** a workflow is resumed after interruption
- **THEN** the engine reads `scope:` from tasks.yml to restore the data namespace
- **AND** stage expansion uses the restored scope to determine which stages are ready

---

## Requirement: Parallel stage expansion when deps are met

Multiple stages MAY be expanded simultaneously if their input requirements are independently satisfied.

```yaml
stages:
  intake:
    steps: [intake]
  component:                # task needs: component[] from scope
    steps: [create-component]
  scene:                    # task needs: reference[] from scope
    steps: [create-scene]
```

If intake produces both `component: [...]` and `reference: [...]`, both the component and scene stages can expand immediately.

- The engine evaluates ALL pending stages after each scope update
- Stages with all requirements met are expanded in declaration order
- Tasks across parallel-eligible stages are still executed sequentially (per existing sequential execution requirement)

#### Scenario: Two stages expand from one scope update
- **WHEN** intake produces `scope.component = [...]` and `scope.reference = [...]`
- **AND** both the component stage (task needs component via `each:`) and scene stage (task needs reference via `params:`) are pending
- **THEN** both stages are expanded and their tasks are queued

---

## MODIFIED Requirements

### Modified: workflow-format — Task file frontmatter replaces `files:` with `result:`

Task frontmatter `files:` is replaced by `result:`. Each result entry combines the previous `file` path template, `key` (now the map key), `validators`, and adds `$ref` for JSON Schema validation. The `key` used in `workflow result --key` corresponds to the result map key.

Previous format:
```yaml
files:
  - file: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    key: component-yml
    validators: [component]
```

New format:
```yaml
result:
  component-yml:
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    $ref: ../schemas.yml#/ComponentYml
    validators: [component]
```

### Modified: workflow-format — Stage definition fields

The `each:` field on stage definitions is deprecated. Stages retain `steps`, optional `workflow`, and optional `params`. The `each:` field, if present, serves as a fallback when the resolved task does not declare its own `each:`.

### Modified: workflow-execution — `workflow result` replaces `workflow write-file`

`workflow write-file` is replaced by `workflow result`. The new command handles both file results (stdin) and data results (`--json`). Validation runs immediately on each call.

### Modified: workflow-execution — `workflow done` no longer accepts `--params`

`workflow done` only marks a task as complete. Data passing is handled by `workflow result --key <key> --json <data>` before calling `done`. `--params` on `done` is deprecated.

### Modified: workflow-execution — Response-driven execution

The `RESPONSE:` JSON from `workflow done` is extended with `stage_progress`, `stage_complete`, and `scope_update` fields. Stage transitions occur at stage completion (all tasks done), not at individual task completion.

### Modified: workflow-format — tasks.yml structure

`tasks.yml` gains top-level `scope:` and `schemas:` fields. Per-task `files:` is replaced by `result:` which stores either inline data (for data results) or `{ path, valid }` references (for file results).

### Modified: workflow-format — Task file frontmatter gains `each:` and `result:`

Task frontmatter gains optional `each:` and `result:` fields. Both use JSON Schema with `$ref` for type references. The `$ref` path is resolved relative to the task file location or as a skill-qualified path from the skills root.
