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
`build_form: layout-builder` / view-mode `template: layout-builder`. A Scene resolves to
**config only** — never a content entity, never a content payload, never a backend content step:

- **Page layout config** — `core.entity_view_display.<et>.<bundle>.<full>` with Layout Builder
  **enabled** and `allow_custom: true`, and **empty** `sections` (see `layout-builder-display.md`).
  The page's visible section tree is a **per-entity content override** on
  `layout_builder__layout`, not default sections in this config file. Do not stuff
  `inline_block` / `block_serialized` / Scene props into display-config sections.
- **Layout-override field config** — `field.storage.<et>.layout_builder__layout` and
  `field.field.<et>.<bundle>.layout_builder__layout`. A real Layout-Builder config export
  includes them and `config:import` does not synthesise them, so both are emitted as units.
- **Block config** — the block-type config (and field/display units) for each `block_content`
  bundle the Scene uses, plus view config for any `views_block` / `block_plugin`, expanded
  through the standard content-bundle and config-slice rules.

The Scene still drives *which* bundles and views become config units (resolve-filter). The
section *composition* for a `layout-builder` template is not authored into the display YAML;
tests that need a reachable rendered page seed the override layout after import (fixture seed).
This is an overridable starting point — a project whose Layout-Builder export differs replaces it.
