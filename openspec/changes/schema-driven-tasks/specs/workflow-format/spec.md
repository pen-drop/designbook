# workflow-format Delta Specification

## Purpose

Extends the workflow format spec to add declarative schema composition fields to rule/blueprint frontmatter (`extends:`, `provides:`, `constrains:`), update the `workflow instructions` response to include merged schemas, and support simplified single-stage workflow definitions.

---

## MODIFIED Requirements

### Requirement: Workflow frontmatter uses grouped stage definitions

Workflow files live at `<concern>/workflows/<workflow-id>.md`. Frontmatter MUST use a `stages` map where each key is a stage name with `steps`, optional `each`, `workflow`, and `params`.

Simple workflows that previously used a two-stage pattern (intake → create) MAY collapse to a single stage when the create task absorbs the intake task's responsibilities. The result schema on the create task drives questioning for missing data.

```yaml
---
title: Define Product Vision
description: Create the product vision document
stages:
  create-vision:
    steps: [create-vision]
engine: direct
---
```

Multi-stage workflows with `each:` expansion, subworkflow dispatch, or complex data flows retain their existing stage structure:

```yaml
---
title: Design Screen
description: Create screen design components for a section
stages:
  intake:
    steps: [design-screen:intake]
  component:
    each: component
    steps: [create-component]
  scene:
    each: scene
    steps: [design-screen:create-scene]
  verify:
    each: scene
    workflow: design-verify
engine: direct
---
```

- `workflow create` parses `stages` as `Record<string, StageDefinition>` with `steps?: string[]`, `each?: string`, `workflow?: string`, `params?: Record<string, StageParam>`
- Frontmatter MUST NOT contain `name:`, `id:`, or `category:`
- `engine: direct` uses direct engine; `engine: git-worktree` uses git worktree engine
- `description` is required — matched against user intent at dispatch time

#### Scenario: Single-stage workflow from merged intake+create
- **WHEN** a workflow defines a single stage with one step (e.g., `create-vision`)
- **AND** the task for that step declares `result:` with required properties
- **THEN** `workflow create` creates the workflow with one stage
- **AND** the task's result schema drives questioning for missing required properties
- **AND** no separate intake stage is needed

#### Scenario: Multi-stage workflow retains intake
- **WHEN** a workflow defines multiple stages with `each:` expansion
- **AND** the intake stage produces arrays that drive `each:` in later stages
- **THEN** the intake stage remains as a separate stage
- **AND** the intake task uses `result:` with data-only keys and `workflow done --data`

---

### Requirement: Rule files use when to scope to steps and config

Rules in `skills/<name>/rules/` are candidates for all steps; `when` narrows scope.

- `when: { steps: [create-data-model], backend: drupal }` → applies only during that step+config combo
- Rules without `when` (or empty) are skipped (`requireWhen=true`)

Rules MAY additionally declare `extends:`, `provides:`, and `constrains:` fields for declarative schema composition (see added requirements below).

#### Scenario: Rule with extends scoped by when
- **WHEN** a rule declares `when: { steps: [create-tokens], frameworks.css: tailwind }` and `extends: { design-tokens: {...} }`
- **THEN** the extends are only applied when the step is `create-tokens` AND the CSS framework is tailwind

#### Scenario: Rule without when is skipped
- **WHEN** a rule has no `when` field
- **THEN** it is skipped during resolution (requireWhen=true behavior unchanged)

---

### Requirement: Blueprint files use when to scope to steps and config

Blueprints use same `when` system as rules, deduplicated by `type`+`name` with priority-based resolution. Highest `priority` wins (default: 0); equal priority uses last match.

Blueprints MAY additionally declare `extends:` and `provides:` fields for declarative schema composition (see added requirements below). Blueprints SHALL NOT declare `constrains:` — constraints are rule-only.

#### Scenario: Blueprint with extends scoped by when
- **WHEN** a blueprint declares `when: { steps: [create-tokens], frameworks.css: tailwind }` and `extends: { design-tokens: {...} }`
- **THEN** the extends are merged into the task's result schema during resolution

#### Scenario: Blueprint with provides supplies defaults
- **WHEN** a blueprint declares `provides: { design-tokens: { properties: { component: { properties: { container: { default: {...} } } } } } }`
- **AND** the blueprint's `when` matches the current step and config
- **THEN** the default values are merged into the result schema at resolution time

---

### Requirement: tasks.yml structure

Contains top-level `stages` map, `stage_loaded` map (resolved step data per step: task_file, rules, blueprints, config_rules, config_instructions, merged_schema), and `tasks` (flat array with `step` and `stage` per task).

The `merged_schema` field in `stage_loaded` SHALL contain the fully composed result schema for each step — the base task schema merged with all applicable `extends:`, `provides:`, and `constrains:` from matched blueprints and rules.

#### Scenario: Merged schema persisted in tasks.yml
- **WHEN** `workflow create` resolves a task with base schema, one blueprint extending it, and one rule constraining it
- **THEN** the `stage_loaded` entry for that step includes `merged_schema`
- **AND** the merged schema reflects all three sources (base + extends + constrains)

#### Scenario: tasks.yml read at workflow done time
- **WHEN** `workflow done --data` is called
- **THEN** the engine reads the `merged_schema` from `stage_loaded` in tasks.yml
- **AND** validates the provided data against that schema

---

## ADDED Requirements

### Requirement: Rule frontmatter supports extends field

A rule MAY declare an `extends:` field in its frontmatter. The value is a map keyed by result key, containing JSON Schema property additions to deep-merge into the task's result schema at resolution time.

```yaml
---
when:
  steps: [create-tokens]
  frameworks.css: tailwind
extends:
  design-tokens:
    properties:
      semantic:
        properties:
          color:
            required: [primary, secondary, accent, neutral]
            properties:
              primary: { $ref: "tokens/schemas.yml#/W3cToken" }
---
```

The engine SHALL deep-merge `extends:` additions into the base result schema. Duplicate property names across multiple `extends:` sources SHALL cause a resolution error.

`extends:` values MAY contain `$ref` references, which SHALL be resolved at merge time using the same resolution logic as task-level `$ref`.

#### Scenario: Rule extends result schema
- **WHEN** a rule declares `extends: { design-tokens: { properties: { semantic: { properties: { color: { required: [primary] } } } } } }`
- **AND** the base task schema declares `result: { design-tokens: { type: object, properties: { semantic: { type: object } } } }`
- **THEN** the merged schema includes `semantic.color.primary` as required

#### Scenario: Duplicate extends causes resolution error
- **WHEN** two rules both extend the same result key with the same property name at the same path
- **THEN** `workflow create` fails with an error identifying the conflicting rules

#### Scenario: Extends with $ref resolved at merge time
- **WHEN** an `extends:` field contains `$ref: "tokens/schemas.yml#/W3cToken"`
- **THEN** the engine resolves the reference and inlines the schema at merge time

---

### Requirement: Rule frontmatter supports provides field

A rule or blueprint MAY declare a `provides:` field in its frontmatter. The field serves two purposes depending on its value type:

**Object value** — a map keyed by result key, containing JSON Schema `default:` additions to merge into the task's result schema. The engine SHALL merge these defaults at resolution time.

```yaml
---
when:
  steps: [create-tokens]
provides:
  design-tokens:
    properties:
      component:
        properties:
          container:
            default:
              max-width:
                sm: { $value: "640px", $type: dimension }
---
```

**String value** (dot-path notation) — signals to the AI that this rule helps fill the named property via dynamic logic in the rule's prose body. The engine SHALL NOT merge string-valued `provides:` into the schema.

```yaml
---
provides: reference.url
when:
  steps: [design-verify:intake]
  extensions: stitch
---
# Prose describing how to resolve the URL via MCP calls
```

When multiple rules provide object-valued defaults for the same property, the last rule (by file order) wins.

The AI MUST read rules with string-valued `provides:` before asking the user for that property.

#### Scenario: Object provides merges defaults into schema
- **WHEN** a blueprint declares `provides: { design-tokens: { properties: { component: { properties: { container: { default: {...} } } } } } }`
- **THEN** the merged schema includes the container defaults
- **AND** the AI does not need to ask for container token values

#### Scenario: String provides signals dynamic resolution
- **WHEN** a rule declares `provides: reference.url` (string value)
- **THEN** the engine does NOT merge anything into the schema
- **AND** the AI reads the rule's prose before asking the user for the `reference` property

#### Scenario: Multiple provides for same property — last wins
- **WHEN** rule A provides `default: { sm: "640px" }` and rule B provides `default: { sm: "600px" }` for the same property
- **THEN** the merged schema uses rule B's default

---

### Requirement: Rule frontmatter supports constrains field

A rule MAY declare a `constrains:` field in its frontmatter. The value is a map keyed by result key, containing JSON Schema constraint additions (`enum`, `pattern`, `minimum`, `maximum`, `minItems`, `maxItems`) to merge into the task's result schema.

```yaml
---
when:
  steps: [design-verify:intake]
constrains:
  reference:
    items:
      properties:
        type:
          enum: [stitch, url, image]
---
```

When multiple rules constrain the same property with `enum`, the engine SHALL intersect the enum values (narrowest set wins).

Blueprints SHALL NOT use `constrains:` — only rules may constrain.

#### Scenario: Rule constrains property to enum
- **WHEN** a rule declares `constrains: { reference: { items: { properties: { type: { enum: [stitch, url, image] } } } } }`
- **THEN** the merged schema restricts `reference[].type` to those enum values
- **AND** validation rejects any value not in the enum

#### Scenario: Multiple enum constraints intersect
- **WHEN** rule A constrains `type: { enum: [stitch, url, image] }` and rule B constrains `type: { enum: [stitch, url] }`
- **THEN** the merged schema uses `enum: [stitch, url]` (intersection)

#### Scenario: Blueprint cannot use constrains
- **WHEN** a blueprint declares a `constrains:` field
- **THEN** `workflow create` reports a validation error indicating that `constrains:` is rule-only

---

### Requirement: Schema merge order at resolution time

The engine SHALL merge all declarative schema extensions from matched rules and blueprints into the task's result schema during `workflow create` and `workflow instructions`. The merge order is:

1. Base task schema (from task frontmatter `result:`)
2. `extends:` from each matched blueprint (in file order)
3. `extends:` from each matched rule (in file order)
4. `provides:` (object values only) from each matched blueprint (in file order)
5. `provides:` (object values only) from each matched rule (in file order)
6. `constrains:` from each matched rule (in file order)

Blueprints merge before rules — they define the structural skeleton. Rules then constrain or fill.

The resulting merged schema SHALL be persisted in `tasks.yml` under the `stage_loaded` entry for the step, and returned by `workflow instructions`.

#### Scenario: Full merge chain produces correct schema
- **WHEN** a task declares a base result schema with `semantic: { type: object }`
- **AND** a Tailwind blueprint extends with `semantic.color.required: [primary, secondary]`
- **AND** a container blueprint provides `component.container.default: {...}`
- **AND** a rule constrains `reference.type.enum: [stitch, url]`
- **THEN** the merged schema contains all three layers
- **AND** the AI sees required color roles, container defaults, and type constraints

#### Scenario: Blueprint extends before rule extends
- **WHEN** both a blueprint and a rule declare `extends:` for the same result key
- **THEN** the blueprint's extensions are merged first (structural skeleton)
- **AND** the rule's extensions are merged on top

---

### Requirement: Workflow instructions returns merged schema

The `workflow instructions` response SHALL include a `merged_schema` field containing the fully composed result schema for the current task. This is the single source of truth the AI uses to determine what properties to fill, what is required, what has defaults, and what constraints apply.

```json
{
  "stage": "create-tokens",
  "task_file": "/path/create-tokens.md",
  "rules": ["/path/renderer-hints.md"],
  "blueprints": ["/path/css-naming.md", "/path/container.md"],
  "merged_schema": {
    "design-tokens": {
      "path": "$DESIGNBOOK_DATA/design-system/design-tokens.yml",
      "type": "object",
      "required": ["primitive", "semantic"],
      "properties": {
        "primitive": { "type": "object" },
        "semantic": {
          "type": "object",
          "properties": {
            "color": {
              "required": ["primary", "secondary"],
              "properties": {
                "primary": { "$value": "string", "$type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

The AI reads `task_file` for domain context, `rules`/`blueprints` for prose instructions, and `merged_schema` for the complete contract. The AI does NOT need to manually merge schemas from rule/blueprint files.

#### Scenario: AI reads merged schema from instructions
- **WHEN** `workflow instructions --stage create-tokens` is called
- **THEN** the response includes `merged_schema` with the fully composed schema
- **AND** the AI uses `merged_schema` as the authoritative source for what to fill

#### Scenario: Schema consistency between instructions and validation
- **WHEN** the AI fills results based on the `merged_schema` from `workflow instructions`
- **AND** calls `workflow done --data` with those results
- **THEN** the engine validates against the same `merged_schema` persisted in tasks.yml
- **AND** there is no divergence between what the AI saw and what the engine enforces
