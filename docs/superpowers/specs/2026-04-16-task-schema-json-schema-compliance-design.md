# Task Schema JSON Schema Compliance

## Problem

`params:`, `result:`, and `reads:` in task frontmatter have inconsistent structures. `params:` and `result:` start directly with attributes (flat key maps), preventing JSON Schema's `required` keyword. `reads:` is a separate array of file inputs with its own format. The overall model is non-standard and asymmetric.

**Current format:**
```yaml
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    workflow: /debo-vision
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
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

1. Restructure `params:` and `result:` as proper JSON Schema object schemas with `type: object`, `required:`, and `properties:`.
2. Absorb `reads:` into `params:` — file inputs become params with a `path:` extension field, symmetric to file outputs in `result:`.
3. Breaking change — all task files are migrated, no backwards compatibility.

`each:` stays flat — it's a control directive, not a data schema.

## New Format

### params (value inputs + file inputs)

```yaml
params:
  type: object
  required: [scene_id, vision]
  properties:
    # Value inputs (passed by caller)
    scene_id: { type: string }
    reference_dir: { type: string, default: "" }
    # File inputs (loaded from disk — replaces reads:)
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- `type: object` always present (explicit per standard)
- `required:` array is the source of truth — replaces both implicit "no default = required" for value params and `optional: true` for file inputs
- `default:` on properties remains as fallback value (standard JSON Schema)
- `path:` on a param = file input (engine loads from disk). Without `path:` = value input (provided by caller)
- `workflow:` extension field for dependency tracking (which workflow produces this file)

**Symmetry with result:** `result` has outputs with `path:` (file outputs) and without (data outputs). `params` now has inputs with `path:` (file inputs) and without (value inputs).

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

## Extension Fields

Both `params` and `result` entries are JSON Schema objects with additional engine-specific fields. These are stripped before schema validation:

| Field | Where | Purpose |
|-------|-------|---------|
| `path:` | params, result | File path (disk I/O) |
| `workflow:` | params | Dependency — which workflow produces this file |
| `validators:` | result | Semantic validators run after schema validation |

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

**reads: handling removed:**
- Remove `reads:` parsing and the `files:` fallback path
- File inputs are now discovered from `params.properties` entries that have `path:`
- `workflow:` field extracted for dependency tracking
- `optional` logic replaced by checking `required` array membership

### workflow-schema-merge.ts

No changes. `extends:`/`provides:`/`constrains:` already operate on result keys, not the `result:` wrapper.

## Migration

### Task files (~25 files)

All tasks under `.agents/skills/designbook/*/tasks/` are rewritten. `reads:` entries become params with `path:`. Example:

```yaml
# Before
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
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
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
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

- `resources/schemas.md` — update `params:` and `result:` format sections, remove `reads:` documentation, add `path:` on params
- `resources/schema-composition.md` — update examples to new format
- `rules/structure.md` — update frontmatter structure if referenced
- `rules/principles.md` — update format rules if referenced
- `resources/validate.md` — update validation rules to check new format

### Tests

- Existing tests in `workflow-resolve.test.ts` break → update to new format
- New test: `required` validation at `workflow done` (missing required result key → error)
- New test: `required` concatenation when merging params with `$ref`
- New test: file input params (with `path:`) are loaded from disk
- Remove: tests for `reads:` parsing

## Out of Scope

- `extends:`/`provides:`/`constrains:` as separate file type ("extensions") — planned as follow-up change
- `each:` format change — stays flat
- Structured-data-only I/O (vision.yml, eliminate directory reads) — planned as follow-up change
