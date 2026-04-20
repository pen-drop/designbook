---
name: schemas
description: Reference for schemas.yml format, $ref syntax, and result conventions in task bodies
---

# Schema Definitions & Result Conventions

## `schemas.yml` Format

Each concern directory (core skill) or skill root (integration skill) can contain a `schemas.yml` file with reusable JSON Schema definitions.

### Placement

```
# Core skill — per concern
.agents/skills/designbook/<concern>/schemas.yml

# Integration skill — skill root
.agents/skills/designbook-drupal/schemas.yml
.agents/skills/designbook-drupal/components/schemas.yml   # sub-concern
```

### Format Conventions

- **Keys are PascalCase** — `Component`, `Issue`, `StoryYml` (not `component`, `issue`, `story-yml`)
- **Values are standard JSON Schema** (draft-07)
- **Each top-level key is a standalone type** — no nesting of types within types

```yaml
# .agents/skills/designbook/design/schemas.yml

Component:
  type: object
  required: [component, group]
  properties:
    component: { type: string }
    slots:
      type: array
      items: { type: string }
      default: []
    group: { type: string }
    description: { type: string }

Issue:
  type: object
  required: [severity, description]
  properties:
    severity: { type: string, enum: [critical, major, minor] }
    description: { type: string }
```

## `$ref` Syntax

Task, rule, and blueprint frontmatter reference schema types via `$ref`:

```yaml
$ref: ../schemas.yml#/TypeName
```

- **Path** — relative to the referencing file
- **Fragment** (`#/TypeName`) — selects a PascalCase key from the schemas file
- **Resolution** — all `$ref` values are resolved and inlined at `workflow create` time. Unresolvable references cause a hard error.

### Cross-Skill References

```yaml
$ref: designbook-drupal/components/schemas.yml#/ComponentYml
```

Cross-skill paths are resolved relative to the `.agents/skills/` root.

### `$ref` in `params:`

A `$ref` at the top level of `params:` resolves a schema and merges its `properties` into the param declarations. Explicit sibling properties override or extend the resolved ones:

```yaml
params:
  $ref: ../../scenes/schemas.yml#/SceneFile  # SceneFile.properties are merged in
  type: object
  required: [scene]
  properties:
    order: { type: integer, default: 1 } # override: add default to existing property
    scene: { type: string }              # extend: add param not in schema
```

The `$ref` must point to an object schema with `properties`.

## File-Input Params (with `path:`)

Tasks declare file inputs as params with a `path:` extension field. The engine resolves these at instruction time — before the AI receives the task.

Resolution steps performed by the engine:

1. Expands environment variables in `path:` (e.g. `$DESIGNBOOK_DATA`)
2. Checks file existence (missing required file = hard error)
3. Parses file content (YAML or JSON)
4. Resolves any `$ref:` schema into `schema.definitions`
5. Delivers resolved content in `schema.params` to the AI

The AI receives resolved content directly — task body text never references filenames. Params and result entries use identical resolution logic.

```yaml
params:
  type: object
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: vision
      $ref: ../schemas.yml#/Vision
      type: object
```

> **`type:` is always required** — even when `$ref:` is present. The engine's `isJsonSchemaParam()` checks `'type' in value` for param validation and file-input detection. Without `type:`, `validateParamFormats` rejects the param and `validateAndMergeParams` fails to skip file inputs.

Two param classes, distinguished by `path:`:

| | CLI Params | File-Input Params |
|---|---|---|
| `path:` | absent | present |
| Source | `--params` / engine | Engine resolves at instruction time |
| Required | in `required:` = must be provided | in `required:` = file must exist |
| Optional | not in `required:`, has `default:` | not in `required:` = file may not exist |

### Extension Fields on Params

| Field | Purpose |
|-------|---------|
| `path:` | File/directory input path — engine resolves and reads |
| `workflow:` | Inter-workflow dependency tracking |
| `$ref:` | Schema reference — resolved into `schema.definitions` |
| `resolve:` | Name of a registered code resolver to run before the task starts |
| `from:` | Name of another param whose value feeds into the resolver (chained) |

### Code Resolvers (`resolve:` + `from:`)

Declare resolvers **on the task that needs the param** — not on the workflow. At `workflow create` the engine aggregates all task-level `resolve:` declarations and runs them once against the merged params; the resolved value is then available to every downstream stage.

```yaml
# task frontmatter
params:
  type: object
  required: [story_url]
  properties:
    story_url:
      type: string
      resolve: story_url      # registered resolver name
```

```yaml
# workflow frontmatter — supplies the input, no resolver info needed
params:
  story_url: { type: string, default: "shell" }
```

Use `from:` when one param derives from another:

```yaml
reference_folder:
  type: string
  resolve: reference_folder
  from: reference_url
```

Registered resolvers live in `packages/storybook-addon-designbook/src/resolvers/`. If the resolver returns an error, `workflow create` emits an `unresolved` response and stops — fix the input and retry.

### Directory Inputs

Use `type: string` for directory paths:

```yaml
components_dir:
  path: $DESIGNBOOK_DIRS_COMPONENTS
  type: string
  description: Available components — location resolved by the active framework skill
```

### Pattern Paths

Paths with placeholders stay as-is — the AI resolves the concrete path from context:

```yaml
section_scenes:
  path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
  workflow: debo-shape-section
  type: object
```

## `result:` Declarations

Task frontmatter declares all outputs in the `result:` field as a JSON Schema object. Each property is a stable identifier for one output.

```yaml
result:
  type: object
  required: [component-yml]
  properties:
    component-yml:
      ...
    issues:
      ...
```

### File Results (with `path:`)

Files written to disk. The engine auto-collects them from declared paths on `workflow done`.

```yaml
result:
  type: object
  required: [component-yml]
  properties:
    component-yml:
      path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
      validators: [data]
      $ref: ../schemas.yml#/ComponentYml
```

- `path:` — template with `$ENV` vars and `{{ param }}` substitution (resolved at plan time)
- `validators:` — semantic validators: `data`, `entity-mapping`, `scene`, `image`, `cmd:<command>`
- JSON Schema (inline or `$ref`) — optional, for structural validation

### Data Results (without `path:`)

Structured data returned via `--data` on `workflow done`. Flow into workflow scope at stage completion.

```yaml
result:
  type: object
  required: [issues]
  properties:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
    scene:
      type: string
      title: Scene
```

- JSON Schema type required (inline or `$ref`)
- `title:` — optional human-readable label
- `description:` — optional semantic help text
- `default:` — auto-filled if not provided on `workflow done`

### Validators

Semantic validators run in addition to JSON Schema validation:

| Validator | Purpose |
|-----------|---------|
| `data` | Generic JSON Schema validation |
| `entity-mapping` | Validates entity mapping structures |
| `scene` | Validates scene/story metadata |
| `image` | Validates image files |
| `cmd:<command>` | Arbitrary command validator |

Validation runs automatically on write and on `workflow done`. Empty `validators:` = auto-pass.

## Task Body Convention: `## Result: <key>`

When a result's semantics aren't obvious from the schema type alone, use a `## Result: <key>` section in the task body:

```markdown
---
params:
  type: object
  required: [scene]
  properties:
    scene: { type: string }
result:
  type: object
  required: [issues]
  properties:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
    scene:
      type: string
---
# Compare Screenshots

Compare each screenshot against its design reference.

## Result: issues

Collect all visual deviations between screenshot and reference.
Each issue needs a `severity`:
- `critical` — layout broken, content missing
- `major` — clearly visible deviation
- `minor` — cosmetic, only noticeable on close inspection
```

**Rules:**
- Each result key that needs semantic explanation gets its own `## Result: <key>` section
- Explains *what* goes into the result, never *how* it's returned (file write vs. `--data`)
- Keys whose schema type is self-explanatory need no section (e.g. `scene: { type: string }`)

## `each:` — Iteration Declaration

Tasks declare iteration over scope arrays via `each:` in frontmatter. Every `each:` names one or more **bindings**. The value is a JSONata expression evaluated against task scope. Each array item is bound to the scope under the binding name, and one task instance is emitted per item.

**Short form** (no schema):

```yaml
each:
  component: "components"
```

**Long form** (with schema):

```yaml
each:
  component:
    expr: "components"
    schema: { $ref: ../schemas.yml#/Component }
```

- Binding names are **singular** (`component`, `variant`, `check`, `issue`)
- Values are JSONata expressions evaluated against task scope — plain identifiers (`"issues"`), dotted paths (`"component.variants"`), filters (`"variants[published = true]"`), and functions (`"$filter(variants, function($v) { $v.order > 0 })"`) all work
- Optional `schema:` describes the item shape for validation/documentation
- Templates inside the task address iteration state through the binding: `{{ component.component }}`, `{{ variant.id }}`, **never** `{{ component }}` (which is the whole object)

### Dependent axes — cross-products

Inner bindings evaluate against the scope enriched with earlier bindings. This replaces dotpath-with-singularization:

```yaml
each:
  component:
    expr: "components"
    schema: { $ref: ../schemas.yml#/Component }
  variant:
    expr: "component.variants"
    schema: { $ref: ../schemas.yml#/Variant }
```

Semantics:

- Each axis evaluates its expression against scope extended with previously bound axes
- The engine emits one task per `(component, variant)` pair
- Independent axes (no reference to earlier bindings) produce the full cross-product
- Templates reference both axes:
  ```yaml
  result:
    variant-story:
      path: ${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.{{ variant.id }}.story.yml
  ```

### Iteration helpers

Inside each expanded task, two helpers are available in JSONata expressions:

- `$i` — zero-based iteration index across the cross-product
- `$total` — total number of emitted task instances
