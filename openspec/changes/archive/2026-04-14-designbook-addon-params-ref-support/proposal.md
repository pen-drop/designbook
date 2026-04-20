## Why

Task files that iterate over schema-typed items (`each:`) must re-declare the same fields in `params:`. For example, `create-section.md` declares `each: { section: { $ref: ../schemas.yml#/Section } }` where `Section` has `id`, `title`, `description`, `order` — then duplicates those exact fields in `params:` as `id: { type: string }`, `title: { type: string }`, etc.

This duplication causes two problems:

1. **Name drift** — The original `create-section.md` used `section_id`/`section_title` in `params:` while the schema used `id`/`title`. The engine validated intake data against the schema (requiring `id`/`title`) but expanded params using the task's `params:` declarations (requiring `section_id`/`section_title`). The AI had to send both field sets to satisfy both checks.

2. **Maintenance burden** — Any schema change (new field, renamed field, changed type) must be mirrored manually in every task that iterates over that schema. With 11 tasks using `each:`, this is error-prone.

## What Changes

- **`$ref` in `params:`**: Task frontmatter gains support for `$ref` at the `params:` level. The engine resolves the reference at `workflow create` time, extracts `properties` from the resolved schema, and uses them as param declarations. Explicit `params:` entries can extend or override individual properties from the ref.

## Capabilities

### New Capabilities
- `params-ref-resolution`: `params:` accepts a top-level `$ref` key pointing to a schema in `schemas.yml`. The engine resolves it at `workflow create` time, extracts `properties` from the referenced schema object, and inlines them as param declarations. Explicit sibling entries in `params:` override or extend the resolved properties.

### Modified Capabilities
- `workflow-resolve`: `resolveAllStages()` resolves `$ref` in `params:` before calling `validateParamFormats()`. The resolved properties are used for `expected_params` aggregation and `validateAndMergeParams()`.
- `workflow-format`: `params:` documentation updated to show `$ref` usage alongside inline declarations.

## Impact

- **Part 2 (storybook-addon-designbook)**: `workflow-resolve.ts` gains `$ref` resolution in `resolveAllStages()` param handling. `validateParamFormats()` receives already-resolved params. `collectAndResolveSchemas()` extended to collect refs from `params:`.
- **Part 1 (core skill)**: Task files with `each:` can replace duplicated `params:` entries with a `$ref` to the same schema. Immediate candidates: `create-section.md`, `capture-reference.md`, `compare-screenshots.md`, `create-scene--design-screen.md`.
- **Part 3 (integration skills)**: No direct impact — integration rules use `extends:`/`provides:`/`constrains:` on result schemas, not on params.

## Dependencies

- `schema-driven-tasks` (completed) — provides the `$ref` resolution infrastructure (`resolveSchemaRef`, `collectAndResolveSchemas`) and the inline JSON Schema param format that this change extends.
