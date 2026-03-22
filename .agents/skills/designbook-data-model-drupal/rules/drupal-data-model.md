---
when:
  backend: drupal
  stages: [designbook-data-model:intake, create-data-model]
---

# Drupal Data Model Rules


## Entity Mapping

Map generic content concepts to Drupal entity types:

| Content concept                           | Entity type | Path in data-model.yml |
|-------------------------------------------|-------------|------------------------|
| Content (articles, pages, products)       | `node` | `content.node.[bundle]` |
| Files, images, videos                     | `media` | `content.media.[bundle]` |
| Reusable blocks (Only for layout_builder) | `block_content` | `content.block_content.[bundle]` |
| Categories, tags                          | `taxonomy_term` | `content.taxonomy_term.[bundle]` |

## Field Naming Conventions

### Base Fields — No Prefix

Do **not** prefix standard entity base properties:

- `title` — Node title / Media name
- `status` — Published/Unpublished
- `uid` — Author
- `created`, `changed`
- `langcode`
- `path` — URL alias
- `body` — The main content node.

### Custom Fields — Must Use `field_` Prefix

All other fields **must** be prefixed with `field_`:

- `field_tags`, `field_media`, `field_subtitle` ✅


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
        body:
          type: text
          title: Body
        field_tags:
          type: reference
          title: Tags
          multiple: true
```
