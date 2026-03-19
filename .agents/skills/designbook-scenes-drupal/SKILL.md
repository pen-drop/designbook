---
name: designbook-scenes-drupal
description: Drupal-specific compose rules for unstructured full view modes. Load this skill when DESIGNBOOK_BACKEND is drupal.
---

# Designbook Scenes — Drupal

Drupal-specific rules for `compose-entity`. Provides per-extension composition patterns for unstructured full view modes.

Loaded automatically when `DESIGNBOOK_BACKEND=drupal` alongside `designbook-scenes`.

## Rules

- [compose-layout-builder.md](rules/compose-layout-builder.md) — Layout Builder composition: section components with `block_content` entity refs in column slots (loaded during `compose-entity` when `extensions: [layout_builder]`)
- [compose-canvas.md](rules/compose-canvas.md) — Canvas composition: flat component tree with direct component nodes (loaded during `compose-entity` when `extensions: [canvas]`)
