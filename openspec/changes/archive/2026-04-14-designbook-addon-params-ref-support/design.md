## Overview

`params:` gains an optional `$ref` key that points to a schema in `schemas.yml`. At `workflow create` time, the engine resolves the reference, extracts `properties` from the schema object, and inlines them as param declarations. Explicit entries in `params:` override or extend the resolved properties. After resolution, the existing validation and merge pipeline sees only flat `{ key: { type: ... } }` entries — no downstream changes needed.

## Resolution Model

### Before (duplicated)

```yaml
params:
  id: { type: string, title: Section ID }
  title: { type: string, title: Section Title }
  description: { type: string, title: Description }
  order: { type: integer, title: Order }
each:
  section:
    $ref: ../schemas.yml#/Section
```

### After (single source of truth)

```yaml
params:
  $ref: ../schemas.yml#/Section
each:
  section:
    $ref: ../schemas.yml#/Section
```

### With overrides

Explicit entries override resolved properties. Additional entries extend them:

```yaml
params:
  $ref: ../schemas.yml#/Section
  order: { type: integer, default: 1 }     # override: add default
  extra_flag: { type: boolean, default: false }  # extend: new param
```

Resolved result (what `validateParamFormats` sees):

```yaml
id: { type: string }
title: { type: string }
description: { type: string }
order: { type: integer, default: 1 }       # overridden
extra_flag: { type: boolean, default: false }  # added
```

## Resolution Pipeline

### Step 1: Detect `$ref` in `params:`

In `resolveAllStages()`, after reading `taskFm.params`, check for a `$ref` key:

```typescript
// workflow-resolve.ts, inside the params aggregation loop (~line 1245)
let params = taskFm?.params as Record<string, unknown> | undefined;
if (params && '$ref' in params) {
  params = resolveParamsRef(params, taskFile, skillsRoot);
}
```

### Step 2: Resolve and flatten

New function `resolveParamsRef()`:

```typescript
export function resolveParamsRef(
  params: Record<string, unknown>,
  taskFilePath: string,
  skillsRoot: string,
): Record<string, unknown> {
  const ref = params['$ref'] as string;
  const { schema } = resolveSchemaRef(ref, taskFilePath, skillsRoot);

  // Extract properties from the resolved schema
  const schemaObj = schema as Record<string, unknown>;
  const properties = schemaObj.properties as Record<string, unknown> | undefined;
  if (!properties) {
    throw new Error(
      `$ref '${ref}' in params: resolved to a schema without 'properties'. ` +
      `params: $ref must point to an object schema with properties.`
    );
  }

  // Merge: resolved properties first, then explicit overrides
  const resolved: Record<string, unknown> = { ...properties };
  for (const [key, value] of Object.entries(params)) {
    if (key === '$ref') continue;
    resolved[key] = value;  // explicit entry wins
  }

  return resolved;
}
```

### Step 3: Continue existing pipeline

After resolution, `params` is a flat `Record<string, { type: string, ... }>`. The existing `validateParamFormats()` and `expected_params` aggregation work unchanged.

## Schema Collection

`collectAndResolveSchemas()` already collects refs from `result:` and `each:`. Add a third collection point for `params:`:

```typescript
// In collectAndResolveSchemas(), after the each: collection block
if (taskFm?.params && typeof taskFm.params === 'object' && '$ref' in taskFm.params) {
  const ref = (taskFm.params as Record<string, unknown>)['$ref'] as string;
  const { typeName, schema } = resolveSchemaRef(ref, taskFilePath, skillsRoot);
  schemas[typeName] = schema;
}
```

## Edge Cases

| Case | Behavior |
|------|----------|
| `$ref` resolves to schema without `properties` | Hard error at `workflow create` time |
| `$ref` + explicit key with same name as schema property | Explicit wins (override) |
| `$ref` + explicit key not in schema | Added as extra param (extend) |
| `$ref` only (no explicit keys) | All params come from schema properties |
| Schema property has `required` in parent schema | Not used for param required/optional — only `default:` presence determines this (existing behavior) |
| No `$ref` in `params:` | Existing behavior, no change |

## Skill File Migration

After the engine change, migrate task files that duplicate `each:` schema fields in `params:`:

| Task file | Current `params:` | After |
|-----------|------------------|-------|
| `sections/tasks/create-section.md` | `id`, `title`, `description`, `order` | `$ref: ../schemas.yml#/Section` |
| `design/tasks/capture-reference.md` | `scene`, `storyId`, `breakpoint`, `region` | `$ref: ../schemas.yml#/Check` + `scene: { type: string }` |
| `design/tasks/compare-screenshots.md` | `scene`, `storyId`, `breakpoint`, `region` | `$ref: ../schemas.yml#/Check` + `scene: { type: string }` |

Only migrate when `params:` fields are an exact subset of the `each:` schema properties. Keep explicit entries for fields that don't come from the schema (e.g., `scene` in capture tasks comes from a different scope, not from the `Check` schema).
