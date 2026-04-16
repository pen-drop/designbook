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
  $ref: ../schemas.yml#/Section       # Section.properties are merged in
  type: object
  required: [scene]
  properties:
    order: { type: integer, default: 1 } # override: add default to existing property
    scene: { type: string }              # extend: add param not in schema
```

The `$ref` must point to an object schema with `properties`.

## File-Input Params (with `path:`)

Tasks declare file inputs as params with a `path:` extension field. These are read from disk by the AI agent, not provided via CLI.

```yaml
params:
  type: object
  required: [reference_dir, vision]
  properties:
    reference_dir: { type: string }
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

Two param classes, distinguished by `path:`:

| | CLI Params | File-Input Params |
|---|---|---|
| `path:` | absent | present |
| Source | `--params` / engine | AI reads from disk |
| Required | in `required:` = must be provided | in `required:` = file must exist |
| Optional | not in `required:`, has `default:` | not in `required:` = file may not exist |

### Extension Fields on Params

| Field | Purpose |
|-------|---------|
| `path:` | File/directory input path |
| `workflow:` | Inter-workflow dependency tracking |
| `description:` | Semantic description for AI |

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

Tasks declare iteration over scope arrays via `each:` in frontmatter:

```yaml
each:
  component:
    $ref: ../schemas.yml#/Component
```

The engine expands one task instance per item in the scope array. Scope is populated when the preceding stage completes and its data results are collected.

- Keys reference scope entries from completed stages
- Values are JSON Schema (inline or `$ref`) describing the expected item shape
