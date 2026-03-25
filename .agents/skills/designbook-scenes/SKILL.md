---
name: Designbook Scenes
description: Generates scene files that compose UI components + entity data into full page views. Uses *.scenes.yml format with items arrays and scene references.
---

# Designbook Scenes

Scenes are complete pages in Storybook. A scene composes UI components with data into a renderable view. All scene nodes resolve to `ComponentNode[]` at build time.

## Concepts

### Shell

The shell is the page frame — the layout that stays the same on every page. It composes layout components (header, nav, footer) and defines a `$content` placeholder where page content is injected.

There is exactly one shell per project.

```yaml
# design-system/design-system.scenes.yml
group: "Designbook/Design System"
scenes:
  - name: shell
    items:
      - component: test_integration_drupal:page
        slots:
          header:
            - component: test_integration_drupal:header
              slots:
                logo:
                  - component: test_integration_drupal:logo
                    props:
                      src: /logo.svg
                navigation:
                  - component: test_integration_drupal:navigation
                    props:
                      items:
                        - label: Home
                          url: /
                        - label: Blog
                          url: /blog
          content: $content
          footer:
            - component: test_integration_drupal:footer
              slots:
                copyright: "&copy; 2026 Acme Inc."
```

### Section

A section is a page. It references the shell and fills `$content` with its own content — entities from the data model or direct components.

```yaml
# sections/blog/blog.section.scenes.yml
id: blog
title: Blog
group: "Designbook/Sections/Blog"
scenes:
  - name: Article Detail
    items:
      - scene: "design-system:shell"
        with:
          content:
            - entity: node.article
              view_mode: full

  - name: Article Overview
    items:
      - scene: "design-system:shell"
        with:
          content:
            - entity: view.recent_articles
              view_mode: default
```

### Entity-Mapping

Entities from the data model are mapped to components via JSONata expressions. Each expression takes a data record as input and returns `ComponentNode[]`.

```
data.yml record  →  JSONata expression  →  ComponentNode[]
```

One file per entity-type + bundle + view-mode:

```
entity-mapping/node.article.full.jsonata
entity-mapping/node.article.teaser.jsonata
entity-mapping/media.image.default.jsonata
```

Backend-specific mapping rules (e.g. Drupal field access patterns) come from `designbook-drupal/scenes/`.

## File Structure

```
$DESIGNBOOK_DIST/
├── design-system/
│   └── design-system.scenes.yml          # Shell
├── sections/
│   └── {section-id}/
│       └── {id}.section.scenes.yml       # Section pages
└── entity-mapping/
    └── {entity}.{bundle}.{view_mode}.jsonata
```

## Tasks

- [create-shell-scene](tasks/create-shell-scene.md) — Create the shell scene
- [create-section-scene](tasks/create-section-scene.md) — Create section scenes
- [plan-components](tasks/plan-components.md) — Identify required components from requirements
- [plan-entities](tasks/plan-entities.md) — Build entity-mapping work list
- [map-entity](tasks/map-entity.md) — Generate JSONata expression for an entity mapping

## Rules

- [scenes-constraints](rules/scenes-constraints.md) — Provider format, no type:element, shell slot inlining
- [listing-pattern](rules/listing-pattern.md) — Listings use view.* entities

## Resources

- [scenes-schema](resources/scenes-schema.md) — JSON Schema for `*.scenes.yml` format and ComponentNode output
- [jsonata-reference](resources/jsonata-reference.md) — JSONata expression format, syntax, and output structure
- [scenes-constraints](resources/scenes-constraints.md) — Constraint examples with correct/incorrect comparisons
