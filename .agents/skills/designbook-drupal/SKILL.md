---
name: designbook-drupal
disable-model-invocation: true
user-invocable: false
description: Unified Drupal/SDC skill root. Contains all Drupal-backend and SDC-framework content organized by concern.
---

# Designbook — Drupal

Unified skill root for all Drupal-specific and SDC-framework content. Sub-directories are organized by concern: data model conventions, data mapping, sample data generation, and SDC component creation.

## Data Model

Rules and resources for Drupal-compatible data model creation (`when: backend: drupal`).

- [data-model/rules/conventions.md](data-model/rules/conventions.md) — Entity mapping, `composition` per bundle, `field_` prefix convention
- [data-model/rules/canvas.md](data-model/rules/canvas.md) — Canvas-specific data model rules
- [data-model/rules/layout-builder.md](data-model/rules/layout-builder.md) — Layout Builder data model rules

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

- [components/schemas.yml](components/schemas.yml) — `SdcComponent` / `SdcStory` / `SdcStoryNode` / `SdcTemplate` — naming, slot rules, YAML quoting, variants, placeholder images, Twig conventions (single source)
- [components/tasks/create-component.md](components/tasks/create-component.md) — Creates all three SDC files; phase-based generation with per-component validation
- [components/resources/twig.md](components/resources/twig.md) — Twig template examples
- [components/resources/component-patterns.md](components/resources/component-patterns.md) — Slot/variant/prop detection heuristics
- [components/resources/container-reference.md](components/resources/container-reference.md) — Container markup (component.yml, Twig, stories)
- [components/resources/grid-reference.md](components/resources/grid-reference.md) — Grid markup (component.yml, Twig, stories)
- [components/resources/section-reference.md](components/resources/section-reference.md) — Section markup (component.yml, Twig, stories)

## Blueprints

Layout component blueprints with tokens, props/slots summary (`when: steps: [create-component]`). Full markup in resources above.

- [blueprints/container.md](blueprints/container.md) — Universal structural wrapper (max-width, padding, header, background)
- [blueprints/grid.md](blueprints/grid.md) — Responsive column grid layout
- [blueprints/section.md](blueprints/section.md) — Layout Builder adapter (container + grid + column slots)
