---
when:
  extensions: canvas
  steps: [create-data-model]
---

# Rule: Canvas Extension

Applies when the Canvas module is active. Canvas manages pages through a visual component editor stored directly on the entity — no block_content indirection.

## Purpose: layout-builder

All `canvas_page` bundles always have `purpose: layout-builder`:

- Use `canvas_page` as the entity type — do NOT use `node` for Canvas-managed pages
- Set `view_modes.full.template: canvas`
- Set all other view modes (teaser, card, listing) to `template: field-map`

## Rules

- The `components` field stores the inline component tree — it is the single content field on a Canvas page
- Do NOT suggest `block_content` for Canvas pages — components are stored inline in `components`, not as separate entities
- The `component_tree` field type does not need a `field_` prefix — it is a base field provided by the module
