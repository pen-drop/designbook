---
name: designbook-drupal
description: Unified Drupal/SDC skill root. Contains all Drupal-backend and SDC-framework content organized by concern.
---

# Designbook — Drupal

Unified skill root for all Drupal-specific and SDC-framework content. Sub-directories are organized by concern: data model conventions, data mapping, sample data generation, and SDC component creation.

## Data Model

Rules and resources for Drupal-compatible data model creation (`when: backend: drupal`).

- [data-model/rules/conventions.md](data-model/rules/conventions.md) — Entity mapping, `composition` per bundle, `field_` prefix convention
- [data-model/rules/canvas.md](data-model/rules/canvas.md) — Canvas-specific data model rules
- [data-model/rules/layout-builder.md](data-model/rules/layout-builder.md) — Layout Builder data model rules
- [data-model/resources/drupal-views.md](data-model/resources/drupal-views.md) — Drupal Views as `config.view.<name>` entities
- [data-model/resources/drupal-field-naming.md](data-model/resources/drupal-field-naming.md) — Field naming conventions reference

## Data Mapping

Rules and resources for mapping Drupal fields to component props in the `map-entity` stage (`when: backend: drupal`).

- [data-mapping/rules/field-map.md](data-mapping/rules/field-map.md) — Template rule for `template: field-map`; generates JSONata mapping Drupal fields to `ComponentNode[]`
- [data-mapping/rules/canvas.md](data-mapping/rules/canvas.md) — Canvas-specific mapping rules
- [data-mapping/rules/layout-builder.md](data-mapping/rules/layout-builder.md) — Layout Builder mapping rules
- [data-mapping/resources/field-mapping.md](data-mapping/resources/field-mapping.md) — Drupal field type → component mapping guide

## Sample Data

Rules for generating Drupal-compatible sample data (`when: backend: drupal`).

- [sample-data/rules/sample-canvas.md](sample-data/rules/sample-canvas.md) — Sample data rules for Canvas
- [sample-data/rules/sample-layout-builder.md](sample-data/rules/sample-layout-builder.md) — Sample data rules for Layout Builder
- [sample-data/rules/sample-formatted-text.md](sample-data/rules/sample-formatted-text.md) — Sample formatted text field data
- [sample-data/rules/sample-image.md](sample-data/rules/sample-image.md) — Sample image field data
- [sample-data/rules/sample-link.md](sample-data/rules/sample-link.md) — Sample link field data

## Components

Rules, tasks, and resources for creating Drupal SDC components (`when: frameworks.component: sdc`).

- [components/rules/sdc-conventions.md](components/rules/sdc-conventions.md) — Naming, slot rules, variants, placeholder images, error handling
- [components/rules/component-discovery.md](components/rules/component-discovery.md) — Component discovery rules
- [components/tasks/create-component.md](components/tasks/create-component.md) — Creates all three SDC files; phase-based generation with per-component validation
- [components/resources/twig.md](components/resources/twig.md) — Twig template structure and rules
- [components/resources/story-yml.md](components/resources/story-yml.md) — Story YAML structure
- [components/resources/component-yml.md](components/resources/component-yml.md) — Component YAML structure
- [components/resources/component-patterns.md](components/resources/component-patterns.md) — Slot/variant/prop detection heuristics
- [components/resources/layout-reference.md](components/resources/layout-reference.md) — Layout components — full definitions for container, grid, section
