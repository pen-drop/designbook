---
when:
  backend: drupal
  stages: [create-data-model]
---

# Drupal Data Model Rules

## Composition per Bundle

Set `composition` on each bundle based on how Drupal manages its content:

| Bundle type | composition | Example |
|-------------|-------------|---------|
| Content types with fields | `structured` (default) | `node.article`, `node.event` |
| Landing pages with Layout Builder | `unstructured` | `node.landing_page` |
| Landing pages with Canvas/Experience Builder | `unstructured` | `node.campaign` |
| Block content (for Layout Builder) | `structured` | `block_content.hero`, `block_content.card` |
| Media entities | `structured` | `media.image`, `media.video` |
| Taxonomy terms | `structured` | `taxonomy_term.tags` |

> `unstructured` only affects `view_mode: full`. Unstructured bundles still need fields for teaser/card view modes.

The project's `extensions` config determines what `unstructured` means:
- `layout_builder` — full view mode renders sections with block entity slots
- `canvas` / `experience_builder` — full view mode renders a component tree directly

## Entity Mapping

Map generic content concepts to Drupal entity types:

| Content concept | Entity type | Path in data-model.yml |
|-----------------|-------------|------------------------|
| Content (articles, pages, products) | `node` | `content.node.[bundle]` |
| Files, images, videos | `media` | `content.media.[bundle]` |
| Reusable blocks | `block_content` | `content.block_content.[bundle]` |
| Categories, tags | `taxonomy_term` | `content.taxonomy_term.[bundle]` |

## Field Naming Conventions

### Base Fields — No Prefix

Do **not** prefix standard entity base properties:

- `title` — Node title / Media name
- `status` — Published/Unpublished
- `uid` — Author
- `created`, `changed`
- `langcode`
- `path` — URL alias

### Custom Fields — Must Use `field_` Prefix

All other fields **must** be prefixed with `field_`:

- `field_body`, `field_tags`, `field_image`, `field_subtitle` ✅
- `body`, `subtitle`, `tags` ❌

### Example

```yaml
content:
  node:
    article:
      title: Article
      description: Standard news article
      fields:
        title:
          type: string
          title: Title
        field_body:
          type: text
          title: Body
        field_tags:
          type: reference
          title: Tags
          multiple: true
```
