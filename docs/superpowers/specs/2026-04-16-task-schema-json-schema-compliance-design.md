# Task Schema JSON Schema Compliance

## Problem

`params:` and `result:` in task frontmatter start directly with attributes (flat key maps). This prevents using JSON Schema's `required` keyword at the params/result level. The format is non-standard and not validatable with standard JSON Schema tools.

**Current format (flat):**
```yaml
params:
  scene_id: { type: string }
  reference_dir: { type: string, default: "" }
result:
  design-tokens:
    path: $DESIGNBOOK_DATA/design-tokens.yml
    type: object
    required: [primitive, semantic]
    properties:
      primitive: { type: object }
      semantic: { type: object }
```

## Decision

Restructure both `params:` and `result:` as proper JSON Schema object schemas with `type: object`, `required:`, and `properties:`. Breaking change — all task files are migrated, no backwards compatibility.

`each:` stays flat — it's a control directive, not a data schema. No `required` use-case exists for iteration declarations.

## New Format

### params

```yaml
params:
  type: object
  required: [scene_id]
  properties:
    scene_id: { type: string }
    reference_dir: { type: string, default: "" }
```

- `type: object` always present (explicit per standard)
- `required:` array is the source of truth for required/optional
- `default:` on properties remains as fallback value (standard JSON Schema)
- Params with no `required` entry and no `default` → engine warns (consistency check)

### result

```yaml
result:
  type: object
  required: [design-tokens]
  properties:
    design-tokens:
      path: $DESIGNBOOK_DATA/design-tokens.yml
      type: object
      required: [primitive, semantic]
      properties:
        primitive: { type: object }
        semantic: { type: object }
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
```

- `required:` at result level = these outputs MUST be produced by the task
- Not in `required:` = optional output
- `path:` and `validators:` remain as extension fields on individual result entries — the engine strips them before schema validation (as it does today)

### each (unchanged)

```yaml
each:
  component:
    $ref: ../schemas.yml#/Component
```

Stays flat. No `required` use-case for iteration.

## $ref Handling

### params $ref (simplified)

```yaml
# Before: $ref magically extracts .properties from target schema
params:
  $ref: ../schemas.yml#/Check
  scene_id: { type: string }

# After: target schema has same structure, merge is straightforward
params:
  $ref: ../schemas.yml#/Check
  required: [scene_id]
  properties:
    scene_id: { type: string }
```

Resolution: resolve `$ref` → merge `properties` maps (explicit wins) → concatenate `required` arrays.

`resolveParamsRef()` no longer needs to extract `properties` from the target schema — the target IS a complete object schema.

## Schema Composition (no change)

`extends:`, `provides:`, `constrains:` already address result keys directly via `properties:` paths. The new result structure matches 1:1:

```yaml
extends:
  design-tokens:
    properties:
      primitive:
        properties:
          color: { type: object }
```

These paths start at the result key level, not the `result:` wrapper level. No changes needed.

## Code Changes

### workflow-resolve.ts

**`resolveParamsRef()`** — simplified:
- Before: resolve `$ref` → extract `properties` → merge with explicit entries
- After: resolve `$ref` → merge full schema (`properties` maps merge, `required` arrays concatenate)

**`validateParamFormats()`** — shifted scope:
- Before: iterates flat map, checks each value has `{ type: ... }`
- After: checks params has `properties`, then iterates `params.properties`

**`validateAndMergeParams()`** — explicit required:
- Before: "required = no default" (implicit convention)
- After: `required` array is source of truth. `default` provides fallback values.

**`expandResultDeclarations()`** — one level deeper:
- Before: iterates `resultDecl` directly (each key = result entry)
- After: iterates `resultDecl.properties` (each key = result entry)
- Evaluates `required` array for validation at `workflow done`

### workflow-schema-merge.ts

No changes. `extends:`/`provides:`/`constrains:` already operate on result keys, not the `result:` wrapper.

## Migration

### Task files (~15 files)

All tasks under `.agents/skills/designbook/*/tasks/` are rewritten. Example:

```yaml
# Before
params:
  reference_dir: { type: string, default: "" }
result:
  data-model:
    path: $DESIGNBOOK_DATA/data-model.yml
    type: object
    required: [content]
    properties:
      content: { type: object, title: Content Entities }
      config: { type: object, title: Config Entities, default: {} }

# After
params:
  type: object
  properties:
    reference_dir: { type: string, default: "" }
result:
  type: object
  required: [data-model]
  properties:
    data-model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      required: [content]
      properties:
        content: { type: object, title: Content Entities }
        config: { type: object, title: Config Entities, default: {} }
```

### Skill-Creator documentation

- `resources/schemas.md` — update `params:` and `result:` format sections and examples
- `resources/schema-composition.md` — update examples to new format
- `rules/structure.md` — update frontmatter structure if referenced
- `rules/principles.md` — update format rules if referenced
- `resources/validate.md` — update validation rules to check new format

### Tests

- Existing tests in `workflow-resolve.test.ts` break → update to new format
- New test: `required` validation at `workflow done` (missing required result key → error)
- New test: `required` concatenation when merging params with `$ref`

## Out of Scope

- `extends:`/`provides:`/`constrains:` as separate file type ("extensions") — planned as follow-up change
- `each:` format change — stays flat
