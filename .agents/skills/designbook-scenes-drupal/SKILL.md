---
name: designbook-scenes-drupal
description: Drupal-specific entity mapping template rules for map-entity stage. Load this skill when DESIGNBOOK_BACKEND is drupal.
---

# Designbook Scenes — Drupal

Adds Drupal-specific entity mapping rules to the base `designbook-scenes` skill. Loaded automatically when `DESIGNBOOK_BACKEND=drupal`.

The base skill defines the scenes concept (Shell, Section, Entity-Mapping). This skill provides the Drupal field access patterns and field-to-component mapping used when generating JSONata expressions in the `map-entity` stage.

## Rules

- [field-map](rules/field-map.md) — Template rule for `template: field-map`. Generates JSONata that maps Drupal fields (`$fields.field_body`, `$fields.field_media.url`) to `ComponentNode[]`

## Resources

- [field-mapping](resources/field-mapping.md) — Drupal field type → component mapping guide (string, text_long, reference, datetime, etc.)
