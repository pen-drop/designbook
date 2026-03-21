---
name: Designbook Scenes
description: Generates scene files that compose UI components + entity data into full page views. Uses *.scenes.yml format with items arrays and scene references.
---

# Designbook Scenes

Creates `*.scenes.yml` files that compose UI components and entity data into full page views. Each file contains one or more **scenes** — each scene becomes a Storybook story.

## Output Structure

```
$DESIGNBOOK_DIST/
├── design-system/
│   └── design-system.scenes.yml       # Shell layout (base for inheritance)
└── sections/
    └── blog/
        └── blog.section.scenes.yml    # Section metadata + all blog scenes
```

## Task Files

- [create-shell-scene.md](tasks/create-shell-scene.md) — Create `design-system/design-system.scenes.yml`
- [create-scene.md](tasks/create-scene.md) — Create `sections/{id}/{id}.section.scenes.yml`
- [collect-entities.md](tasks/collect-entities.md) — Build the full (entity, view_mode) work list with template lookup before any files are written
- [map-entity.md](tasks/map-entity.md) — Create `entity-mapping/{entity_type}.{bundle}.{view_mode}.jsonata` via template rule

## Rules

- [scenes-constraints.md](rules/scenes-constraints.md) — Critical output constraints (provider format, no type:element, shell slot inlining)

## Resources

- [field-reference.md](resources/field-reference.md) — File-level and scene-level field tables
- [entry-types.md](resources/entry-types.md) — All entry types: component, entity, records (demo-only), view entity, scene-ref
- [view-entity.md](resources/view-entity.md) — View entity convention: `entity: view.*`, JSONata with inline entity refs
- [jsonata-reference.md](resources/jsonata-reference.md) — JSONata expression format, ComponentNode structure, conditional components, nested entity refs
- [field-mapping.md](resources/field-mapping.md) — Field type to component mapping guide

## Drupal Template Rules

For Drupal backends (`DESIGNBOOK_BACKEND=drupal`), also load `designbook-scenes-drupal` which provides:
- `layout-builder` rule (`when: template: layout-builder`) — sections + `block_content` entity refs
- `canvas` rule (`when: template: canvas`) — flat component tree

## Validation

```bash
npx jsonata-w inspect entity-mapping/node.article.teaser.jsonata --input sections/blog/data.yml
npx jsonata-w transform entity-mapping/node.article.teaser.jsonata --input sections/blog/data.yml
```
