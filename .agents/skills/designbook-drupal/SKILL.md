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

Rules, tasks, and blueprints for creating Drupal SDC components (`when: frameworks.component: sdc`).

- [components/schemas.yml](components/schemas.yml) — `SdcComponent` / `SdcStory` / `SdcStoryNode` / `SdcTemplate` — naming, slot rules, YAML quoting, variants, placeholder images, Twig conventions (single source)
- [components/tasks/create-component.md](components/tasks/create-component.md) — Creates all three SDC files; phase-based generation with per-component validation
- [components/rules/sdc-components.md](components/rules/sdc-components.md) — Constraints for `.component.yml`, `.twig`, `.story.yml` (global naming + per-file-type rules)
- [components/rules/layout-constraints.md](components/rules/layout-constraints.md) — Layout component constraints

## Blueprints

Layout component blueprints with tokens, props/slots summary (`when: steps: [create-component]`).

- [blueprints/container.md](blueprints/container.md) — Universal structural wrapper (max-width, padding, header, background)
- [blueprints/grid.md](blueprints/grid.md) — Responsive column grid layout
- [blueprints/section.md](blueprints/section.md) — Layout Builder adapter (container + grid + column slots)

## Install

Backend-specific install steps, dispatched from the core install flow
(`designbook/install/install.md`).

- [install/install.md](install/install.md) — Step index: detect → theme → storybook → config
- [install/detect.md](install/detect.md) — Confirm Drupal codebase, determine docroot
- [install/theme.md](install/theme.md) — Find or scaffold the target custom theme
- [install/storybook.md](install/storybook.md) — Fresh Storybook setup or extend existing
- [install/config.md](install/config.md) — Write designbook.config.yml
- [install/templates/](install/templates/) — `.storybook/` file templates
