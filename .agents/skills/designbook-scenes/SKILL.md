---
name: Designbook Scenes
description: Generates scene files that compose UI components + entity data into full page views. Uses *.scenes.yml format with items arrays and scene references.
---

# Designbook Scenes

Creates `*.scenes.yml` files that compose UI components and entity data into full page views. Each file contains one or more **scenes** — each scene becomes a Storybook story.

> **Multiple scenes per file.** Group related pages together.
>
> | File | Scenes |
> |------|---------|
> | `design-system/design-system.scenes.yml` | `shell`, `minimal` |
> | `sections/blog/blog.section.scenes.yml` | `Blog Detail`, `Blog Listing` |

## Output Structure

```
$DESIGNBOOK_DIST/
├── design-system/
│   └── design-system.scenes.yml       # Shell layout (base for inheritance)
└── sections/
    └── blog/
        └── blog.section.scenes.yml    # Section metadata + all blog scenes
```

## Critical Rules

> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `test_integration_drupal:header`, NEVER just `header`.
> Resolve `$DESIGNBOOK_SDC_PROVIDER` from `@designbook-configuration` at generation time.

> ⛔ **No `type: element` in scenes.** Never use `type: element` nodes inside slots.
> Use plain string values for text content. `type: element` is only valid in component `*.story.yml` files.

> ⛔ **Shell scenes: inline all slots.** Header and footer MUST inline ALL their sub-component slots — `logo`, `navigation` (with `items` populated), `actions`, `copyright`. Never write `story: default` alone.

## Entity Rendering Stages

Every entity node in a scene routes to one of two stages:

| Condition | Stage | Task |
|-----------|-------|------|
| `entity_type: view` | `compose-entity` | `compose-entity.md` |
| `view_mode != full` | `map-entity` | `map-entity.md` |
| `view_mode = full`, `composition: structured` | `map-entity` | `map-entity.md` |
| `view_mode = full`, `composition: unstructured` | `compose-entity` | `compose-entity.md` |

**`map-entity`** is recursive: reference fields emit `type: entity` nodes, which trigger `map-entity` again for the referenced entity + view_mode.

**`compose-entity`** is extension-specific: the `compose-view-entity` rule applies for view entities; Drupal extension rules are provided by `designbook-scenes-drupal`.

## Task Files

- [create-shell-scene.md](tasks/create-shell-scene.md) — Create `design-system/design-system.scenes.yml`
- [create-scene.md](tasks/create-scene.md) — Create `sections/{id}/{id}.section.scenes.yml`
- [collect-entities.md](tasks/collect-entities.md) — Build the full (entity, view_mode) work list with routing decisions before any files are written
- [map-entity.md](tasks/map-entity.md) — Create `view-modes/{entity_type}.{bundle}.{view_mode}.jsonata` for structured entity mapping
- [compose-entity.md](tasks/compose-entity.md) — Compose component tree for unstructured full view modes and view entities

## Resources

- [field-reference.md](resources/field-reference.md) — File-level and scene-level field tables
- [entry-types.md](resources/entry-types.md) — All entry types: component, entity, records (demo-only), view entity, scene-ref
- [view-entity.md](resources/view-entity.md) — View entity convention: `entity: view.*`, JSONata with inline entity refs
- [jsonata-reference.md](resources/jsonata-reference.md) — JSONata expression format, ComponentNode structure, conditional components, nested entity refs
- [field-mapping.md](resources/field-mapping.md) — Field type to component mapping guide

## Drupal Extension Rules

For Drupal backends (`DESIGNBOOK_BACKEND=drupal`), also load `designbook-scenes-drupal` which provides:
- `compose-layout-builder` rule — sections + `block_content` entity refs
- `compose-canvas` rule — flat component tree

## Validation

Test view-mode expressions against sample data using `jsonata-w`:

```bash
# Inspect — see the output structure
npx jsonata-w inspect view-modes/node.article.teaser.jsonata \
  --input sections/blog/data.yml

# Transform — full transform with output
npx jsonata-w transform view-modes/node.article.teaser.jsonata \
  --input sections/blog/data.yml
```
