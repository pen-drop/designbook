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

## Config expansion (sync-to Scene sync)

Starting point for the config units `sync-to` emits when a Scene's page uses
`build_form: layout-builder`. A Scene resolves to **config only** — never a content entity,
never a content payload, never a backend content step:

- **Page layout config** — `core.entity_view_display.<et>.<bundle>.<full>`. Its
  `third_party_settings.layout_builder.sections` hold the page's ordered sections; each
  component in a section carries the Scene's SDC props inline in its `configuration`, so the
  visible content lives in the config itself, not in a referenced entity.
- **Block config** — the block-type config (and any per-block config) for each block the Scene
  places into a section, expanded through the standard content-bundle config rules.

The Scene's resolved component subtree becomes the inline `configuration` of the section
components; the ordering matches the Scene. This is an overridable starting point — a project
whose Layout-Builder config export differs replaces it.
