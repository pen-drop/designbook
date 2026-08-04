---
type: data-mapping
name: layout-builder
priority: 10
trigger:
  domain: data-mapping
---

# Blueprint: Layout Builder — Passthrough Mapping

Applies when `map-entity` runs for a view mode with `template: layout-builder` (i.e. a node bundle's full view mode that uses Layout Builder).

## Behavior

For Layout Builder full view mode, the sample data IS the component tree — no JSONata transformation is needed. The `layout_builder__layout` field on the node record contains an array of block_content entity references. Each entry is resolved to its full component tree via the standard entity node mechanism.

## JSONata Pattern

```jsonata
$.layout_builder__layout
```

## Rules

- Read `layout_builder__layout` directly — it is already a `ComponentNode[]`, no transformation needed
- Do NOT map, iterate, or restructure the entries — pass the array through as-is
- Do NOT generate a field-by-field JSONata mapping

## Content payload (sync-to Scene sync)

Starting point for the content payloads `transform-content` stages when a Scene's page uses
`build_form: layout-builder`. Two payload kinds, both keyed by the unit's deterministic
`content_ref` uuid so re-syncs stay idempotent:

- **`role: block`** — a `block_content` entity payload for the block the Scene renders. Embed
  `content_ref` as the entity `uuid`; carry the block's resolved component subtree as its field
  values.
- **`role: page`** — the node payload. Embed the page unit's `content_ref` as the node `uuid`;
  populate `layout_builder__layout` with one section per block, each referencing its block by the
  block unit's `content_ref` uuid, in the Scene's order.

Serialize in the backend's content-import format (e.g. a `default_content`-style export the
project's `content_import_cmd` consumes). This is an overridable starting point — a project with a
different content-import mechanism replaces it.
