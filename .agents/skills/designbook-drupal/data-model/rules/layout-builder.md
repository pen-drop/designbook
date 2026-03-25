---
when:
  extensions: layout_builder
  stages: [designbook-data-model:intake, create-data-model]
---

# Rule: Layout Builder Extension

Applies when the Layout Builder module is active. Layout Builder assembles pages from reusable blocks (`block_content` entities) arranged in a layout stored on the node entity.

## Entity Types

Layout Builder introduces `block_content` as a valid entity type for reusable layout sections:

| Content concept          | Entity type     | Path in data-model.yml              |
|--------------------------|-----------------|-------------------------------------|
| Landing pages with layout| `node`          | `content.node.[bundle]`             |
| Reusable layout sections | `block_content` | `content.block_content.[bundle]`    |

## View Mode Templates

- Node bundles used as landing pages **MUST** have `view_modes.full.template: layout-builder` set
- `block_content` bundles **MUST** have `view_modes.default.template: field-map` (their own display uses standard field mapping)
- All non-full view modes (teaser, card, listing, etc.) on landing page nodes MUST use `template: field-map`

## Example

```yaml
content:
  node:
    landing_page:
      title: Landing Page
      description: Page assembled from layout sections
      fields:
        title:
          type: string
          title: Title
        layout_builder__layout:
          type: layout_builder__layout
          title: Layout
      view_modes:
        full:
          template: layout-builder
        teaser:
          template: field-map
  block_content:
    hero:
      title: Hero Section
      description: Full-width hero block
      fields:
        body:
          type: text
          title: Body
        field_media:
          type: media
          title: Media
      view_modes:
        default:
          template: field-map
```

## Rules

- The `layout_builder__layout` field stores the layout — always include it on landing page node bundles
- `layout_builder__layout` is a base field — no `field_` prefix
- `block_content` sections are **one layer deep only** — no nested block_content references
- Set `view_modes.full.template: layout-builder` on landing page node bundles
- Set `view_modes.default.template: field-map` on all block_content bundles
