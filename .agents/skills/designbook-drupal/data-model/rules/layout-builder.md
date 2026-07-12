---
trigger:
  domain: data-model
filter:
  extensions: layout_builder
---

# Rule: Layout Builder Extension

Applies when the Layout Builder module is active. Layout Builder assembles a display from UI-Patterns component sections. A view mode's `template` decides whether those sections are **config-managed** (exported in `core.entity_view_display.*`) or a **per-entity content override** (stored in the entity's `layout_builder__layout` base field).

## Template semantics under Layout Builder

- `template: field-map` → a **config-managed** display: `allow_custom: false`, sections authored into `core.entity_view_display.*`, identical for every entity. `sync-to` authors these (the `layout-builder-display` mapping).
- `template: layout-builder` → a **per-entity content override**: `allow_custom: true`, sections live per entity in the `layout_builder__layout` base field. This is content, not config — `sync-to` does not author its sections.

## Purpose: landing-page

When a bundle has `purpose: landing-page`:

- Set `view_modes.full.template: field-map` for a config-managed Layout Builder display; reserve `template: layout-builder` for a view mode whose layout is edited per entity (a content override)
- Set all other view modes (teaser, card, listing, etc.) to `template: field-map`
- Always include the `layout_builder__layout` field on the bundle

## Rules

- `layout_builder__layout` is a base field — no `field_` prefix
- `block_content` bundles always use `view_modes.default.template: field-map` — regardless of purpose
- `block_content` sections are **one layer deep only** — no nested block_content references
- Per-entity Layout Builder overrides are out of scope — config-managed displays are authored with `allow_custom: false`
- On export, only a `field-map` view mode under an active `layout_builder` extension renders as a UI-Patterns-section display (the `layout-builder-display` mapping); a `layout-builder`-template view mode is a content override and gets no authored sections
