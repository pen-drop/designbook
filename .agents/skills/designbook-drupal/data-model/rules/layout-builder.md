---
trigger:
  domain: data-model
filter:
  extensions: layout_builder
---

# Rule: Layout Builder Extension

Applies when the Layout Builder module is active. Layout Builder assembles pages from reusable blocks (`block_content` entities) arranged in a layout stored on the node entity.

## Purpose: landing-page

When a bundle has `purpose: landing-page`:

- Set `view_modes.full.template: layout-builder`
- Set all other view modes (teaser, card, listing, etc.) to `template: field-map`
- Always include the `layout_builder__layout` field on the bundle

## Rules

- `layout_builder__layout` is a base field — no `field_` prefix
- `block_content` bundles always use `view_modes.default.template: field-map` — regardless of purpose
- `block_content` sections are **one layer deep only** — no nested block_content references
