# Params Content Delivery — Engine Resolves File Inputs

Follow-up to `absorb-reads-into-params` and `task-schema-json-schema-compliance`. Makes the engine actively deliver param file contents and schemas, so task body text no longer needs to reference filenames.

## Problem

Params with `path:` declare file dependencies, but the engine only stores the declaration. The AI must:
1. Read the task body to learn which files to load
2. Manually resolve `$DESIGNBOOK_DATA` paths
3. Read each file itself
4. Find the schema separately (if any)

This causes:
- **Redundant body text** — every task repeats "Read vision.yml for product context"
- **Rename fragility** — `vision.md → vision.yml` required 20+ file changes across skills
- **No single source of truth** — the same file is referenced in frontmatter AND body

## Decision

The engine resolves all `path:`-params at instruction time: expands env vars, checks existence, reads content, resolves schemas. The response delivers everything the AI needs. Task body text describes only the task logic — never filenames.

## Canonical Format

Params and result use JSON Schema wrapper format, consistent with `task-schema-json-schema-compliance`:

```yaml
params:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: vision
      type: object
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
result:
  type: object
  required: [data-model]
  properties:
    data-model:
      path: $DESIGNBOOK_DATA/data-model.yml
      $ref: ../schemas.yml#/DataModel
```

**Fix needed:** `create-vision.md` was changed to flat map as a workaround during the `vision.md → vision.yml` migration. Must be reverted to wrapper format. The original error needs root-cause investigation (likely result validation, not params).

## New Response Structure

`workflow instructions` and `step_resolved` (from `workflow create`) deliver a unified `schema` object:

```json
{
  "task_file": "/abs/path/create-data-model.md",
  "rules": [...],
  "blueprints": [...],
  "schema": {
    "definitions": {
      "Vision": {
        "type": "object",
        "required": ["product_name", "description"],
        "properties": {
          "product_name": { "type": "string" },
          "description": { "type": "string" },
          "problems": { "type": "array", "items": { ... } },
          "features": { "type": "array", "items": { "type": "string" } },
          "design_reference": { "type": "object", "properties": { ... } },
          "references": { "type": "array", "items": { ... } }
        }
      },
      "DataModel": { ... }
    },
    "params": {
      "vision": {
        "path": "/abs/resolved/designbook/vision.yml",
        "exists": true,
        "content": {
          "product_name": "Leando",
          "description": "1:1-Migration von leando.de..."
        },
        "$ref": "#/definitions/Vision"
      },
      "data_model": {
        "path": "/abs/resolved/designbook/data-model.yml",
        "exists": false,
        "content": null
      }
    },
    "result": {
      "data-model": {
        "path": "$DESIGNBOOK_DATA/data-model.yml",
        "$ref": "#/definitions/DataModel"
      }
    }
  }
}
```

### Key Fields

| Field | Location | Purpose |
|-------|----------|---------|
| `definitions` | `schema.definitions` | All resolved schemas from `schemas.yml`, deduplicated. Referenced by `$ref` from params and result. |
| `params` | `schema.params` | One entry per declared param. File params include `path` (resolved), `exists`, `content` (parsed YAML/JSON or null). |
| `result` | `schema.result` | One entry per declared result. Includes `path` template and `$ref` to schema. |
| `$ref` | On any param or result entry | Points into `definitions`. Format: `#/definitions/TypeName`. |

### Behavior

- `path:` values are resolved: `$DESIGNBOOK_DATA` etc. expanded to absolute paths
- `exists: true` → file parsed (YAML/JSON) and delivered as `content`
- `exists: false` → `content: null`, no error (file may not exist yet)
- `$ref` from task frontmatter resolved once into `definitions`; param/result entries reference the definition
- If a schema is used by both a param and a result, it appears once in `definitions`
- Directory params (`type: string`, path ends with `/`) → `exists` check only, no `content`
- Pattern paths (containing `[placeholder]`) → not resolved at instruction time (runtime)

### Replaces

`merged_schema` is removed. Its function (composed result schema with blueprint extensions and rule constraints) moves into `schema.result` + `schema.definitions`. Schema composition (extends/constrains) modifies entries in `definitions`.

## Task Body Cleanup

### Remove from Body

- Filename references — `Read vision.yml`, `If data-model.yml exists`
- Format descriptions — `vision MUST contain product_name and description`
- Existence checks — `If the file does not exist → stop`
- Schema descriptions — `The result must have entities array`

### Keep in Body

- Task purpose — `Define content and config entities through dialog`
- Step-by-step logic — `Step 1: Propose, Step 2: Discuss`
- User interaction — `Ask for all missing in a single question`
- Runtime paths — `screenshots/{breakpoint}--{region}.png` (resolved at execution time)

### Example

**Before** (`create-data-model.md`):
```markdown
# Data Model
Define content and config entities through dialog.
Read vision.yml for product context. If data-model.yml exists, extend it.
```

**After:**
```markdown
# Data Model
Define content and config entities through dialog.
If an existing data model is provided, extend it.
```

## Missing Params to Add

### Static params (resolvable at instruction time)

Paths use only env vars (`$DESIGNBOOK_DATA`, `$DESIGNBOOK_DIRS_COMPONENTS`) — engine resolves them, reads content:

| File | Tasks that reference it | Proposed param name |
|------|------------------------|-------------------|
| `design-system.scenes.yml` | intake--design-shell (body reference) | Already param `design_scenes` in some tasks — add where missing |

### Runtime paths (stay in body)

Paths depend on param values or template variables — NOT resolvable at instruction time. These remain in body text:

| File | Depends on | Tasks |
|------|-----------|-------|
| `extract.json` | `$reference_dir` (param value) | extract-reference, create-tokens, create-scene, intake--design-screen, intake--design-shell |
| `meta.yml` | `{{ story_id }}` (template var) | setup-compare, configure-meta, compare-screenshots, verify |
| Screenshot paths | `{{ story_id }}`, `{{ breakpoint }}` | capture-storybook, compare-screenshots |

These are candidates for future "deferred param resolution" — resolving at task start time when dependent params have values. Out of scope for this change.

## workflow-execution.md Updates

### Step 2a (Load Task Instructions)

Replace current documentation with:

> The `schema` field contains all inputs and outputs for the task:
> - `schema.params` — file inputs with resolved content and existence status
> - `schema.result` — expected outputs with schema references
> - `schema.definitions` — all referenced schemas, resolved once
>
> The AI uses param content directly from the response. File names and paths are never mentioned in task body text.

### merged_schema

Remove all references. Replaced by `schema.result` + `schema.definitions`.

### Example JSON

Update the example response to show the new `schema` structure.

## Skill Creator Updates

### resources/schemas.md

- Add section: "File-Input Params (with `path:`)" — engine resolves content, AI does not read files
- Update param format examples to show `path:`, `workflow:`, `$ref:`
- Remove any mention of body text referencing filenames
- Clarify: `$ref` in params/result points to `schemas.yml`, engine resolves into `definitions`

### Validation Rule (new)

New rule in the validate step of `designbook-skill-creator`. Checks existing task files for violations:

1. **Hardcoded paths in body** — Grep for `$DESIGNBOOK_DATA`, `.yml`, `.md`, `Read ... .yml` patterns below frontmatter. Warn if a file reference is found that is not a runtime path.
2. **Missing params** — File referenced in body but not declared in `params.properties`. Error.
3. **Missing `$ref`** — Result with `path:` but no `$ref` to a schema. Warn (schema should be referenced).
4. **Redundant body references** — Filename in body that matches an existing param's `path:` basename. Warn.

Output as a numbered list of findings with severity (error/warn) and suggested fix.

## Code Changes

### workflow-resolve.ts

**`resolveAllStages()`** — build `schema` object in `step_resolved`:
- For each step, iterate `params.properties`:
  - If `path:` present: resolve env vars, check `existsSync`, parse file if exists
  - If `$ref:` present: resolve from `schemas.yml`, add to `definitions`
- Iterate `result.properties`:
  - If `$ref:` present: resolve, add to `definitions`
- Attach `schema: { definitions, params, result }` to each `ResolvedStep`

**`ResolvedStep` interface** — add `schema` field:
```typescript
export interface ResolvedStep {
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
  schema?: {
    definitions: Record<string, object>;
    params: Record<string, { path?: string; exists?: boolean; content?: unknown; $ref?: string }>;
    result: Record<string, { path?: string; $ref?: string }>;
  };
}
```

Remove `merged_schema` from `ResolvedStep`.

### cli/workflow.ts — `workflow instructions` command

Update to include `schema` from step_resolved in response. Remove `merged_schema` and `expected_params` from response (both subsumed by `schema`).

### Schema composition (workflow-schema-merge.ts)

`extends:`, `provides:`, `constrains:` currently modify `merged_schema`. Retarget to modify entries in `schema.definitions` instead. The composition logic stays the same — only the target location changes.

## Tests

### Update existing tests

- `workflow-resolve.test.ts` — update `step_resolved` assertions to expect `schema` instead of `merged_schema`
- `workflow-resolve.test.ts` — update `validateAndMergeParams` tests for `$ref` resolution into `definitions`
- `workflow-result.test.ts` — update result validation to use `schema.result`
- `workflow-schema-composition.test.ts` — retarget from `merged_schema` to `schema.definitions`

### New tests

- Param with `path:` on existing file → `exists: true`, `content` populated with parsed YAML
- Param with `path:` on missing file → `exists: false`, `content: null`
- Param with `$ref` → schema resolved into `definitions`, param has `$ref` pointer
- Same schema type used in param and result → appears once in `definitions`
- Directory param (path ends with `/`) → `exists` only, no `content`
- Pattern path (with `[placeholder]`) → not resolved, passed through as-is
- Schema composition modifies `definitions` entry, not top-level `merged_schema`
- Chained param resolution (`extract_reference` depends on `reference_dir`)

## Task File Migration

All task files under `.agents/skills/designbook/*/tasks/` and integration skills:

1. Verify params use wrapper format (`type: object, properties: {}`)
2. Add missing file params (extract.json, meta.yml, design-system.scenes.yml)
3. Add `$ref` to params/results that reference `schemas.yml` types
4. Remove body text that references filenames already covered by params
5. Revert `create-vision.md` from flat map back to wrapper format

Estimated: ~25 task files affected.

## No Fallback Logic

This change is a clean cut. There is no backward compatibility, no fallback, no dual-format support:

- **No flat map fallback** — `validateParamFormats` must reject params without `type: object` + `properties:`. The current silent pass for missing `properties` is removed.
- **No `merged_schema` fallback** — old field is deleted, not deprecated. Code that reads it is removed.
- **No body text fallback** — the AI does not read files that are not declared as params. If a file is needed, it must be a param.
- **No format detection** — the engine does not guess whether params use flat map or wrapper. Wrapper is the only format.

All task files are migrated in one pass. No shims, no aliases, no transition period.

## Out of Scope

- `each:` format — stays flat, not a file dependency
- Deferred param resolution — paths depending on param values (`$reference_dir/extract.json`, `{{ story_id }}`) cannot be resolved at instruction time. Future enhancement: resolve at task start when dependent params have values in workflow scope.
- Runtime screenshot paths — stay in body text
