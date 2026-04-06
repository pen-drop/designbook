---
type: data-mapping
name: layout-builder
priority: 10
when:
  steps: [map-entity]
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
