---
name: designbook-scenes-drupal
description: Drupal-specific entity mapping template rules for map-entity stage. Load this skill when DESIGNBOOK_BACKEND is drupal.
---

# Designbook Scenes — Drupal

Drupal-specific template rules for the `map-entity` stage. Loaded automatically alongside `designbook-scenes` when `DESIGNBOOK_BACKEND=drupal`.

## Template Rules

- [layout-builder.md](rules/layout-builder.md) — `when: template: layout-builder` — section components with `block_content` entity refs in column slots
- [canvas.md](rules/canvas.md) — `when: template: canvas` — flat component tree with direct component nodes
