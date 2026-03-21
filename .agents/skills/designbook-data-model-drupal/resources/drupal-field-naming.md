---
when:
  backend: drupal
  stage: create-data-model
---

# Drupal Field Naming Rules

## Entity Types

Map concepts to Drupal entity types:
- **Content** → `node` (articles, pages, products)
- **Assets** → `media` (images, video, files)
- **Categories** → `taxonomy_term`
- **Reusable blocks** → `block_content`

## Field Naming

### Base Fields (no prefix)

Do NOT prefix standard entity base properties:
- `title`, `status`, `uid`, `created`, `changed`, `langcode`, `path`

### Custom Fields (must prefix with `field_`)

All other fields MUST use the `field_` prefix:
- `field_body`, `field_tags`, `field_image`, `field_subtitle`
- Never: `body`, `subtitle`, `tags` (without prefix)

## Composition per Bundle

| Bundle type | composition |
|-------------|-------------|
| Content types with fields | `structured` (default) |
| Landing pages with Layout Builder | `unstructured` |
| Landing pages with Canvas/Experience Builder | `unstructured` |
| Block content, Media, Taxonomy | `structured` |

> `unstructured` only affects `view_mode: full`. Unstructured bundles still need fields for teaser/card view modes.
