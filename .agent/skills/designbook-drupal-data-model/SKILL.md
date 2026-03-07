---
name: designbook-data-model-drupal
description: Guidelines for creating Drupal-compatible data models. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal.
---

# Drupal Data Model Best Practices

This skill provides guidelines for creating data models compatible with Drupal. It **SHOULD** be loaded and referenced when:
1.  You are creating or modifying a data model.
2.  The `DESIGNBOOK_TECHNOLOGY` is set to `drupal`.

It describes the expected entity types (`node`, `media`) and field naming conventions (`field_` prefix) that the author (Agent or User) must apply manually.

## Entity Mapping

Drupal uses specific entity types for different kinds of data. Map generic concepts as follows:

-   **Content** &rarr; **Node**: Primary content (articles, pages, products) should be defined under the `node` entity type.
    -   *Model Path*: `content.node.[bundle]`
-   **Assets** &rarr; **Media**: Files, images, and videos should be defined under the `media` entity type.
    -   *Model Path*: `content.media.[bundle]` (or potentially `assets` mapped to media bundles)

## Field Naming Conventions

Drupal requires machine names for fields to follow strict patterns to avoid conflicts with reserved base properties.

### 1. Base Fields (Do Not Prefix)
Do **NOT** prefix standard entity base properties. Use them directly:
-   `title` (Node title, Media name)
-   `status` (Published/Unpublished)
-   `uid` (Author)
-   `created`, `changed`
-   `langcode`
-   `path` (URL alias)

### 2. Configurable Fields (Must Prefix)
All other custom fields **MUST** be prefixed with `field_`.
-   *Yes*: `field_body`, `field_tags`, `field_image`, `field_subtitle`
-   *No*: `body` (unless referring to the core body field, but explicit `field_body` is safer), `subtitle`, `tags`

### Example Structure

```json
{
  "content": {
    "node": {
      "article": {
        "title": "Article",
        "description": "Standard news article",
        "fields": {
          "title": { "type": "string", "label": "Title" },
          "field_body": { "type": "text", "label": "Body" },
          "field_tags": { "type": "reference", "label": "Tags" }
        }
      }
    }
  }
}
```

## View Mode Display Mappings

Bundles can define `view_modes` to map entity fields to UI components. Each view mode contains an ordered `mapping[]` array. The `entityRenderer` (a `storyNodesRenderer`) resolves these at Storybook runtime.

### Format

```json
{
  "content": {
    "node": {
      "article": {
        "fields": { ... },
        "view_modes": {
          "full": {
            "mapping": [
              {
                "component": "figure",
                "props": {
                  "src": "$field_media.url",
                  "alt": "$field_media.alt",
                  "full_width": true
                }
              },
              {
                "component": "heading",
                "props": { "level": "h1" },
                "slots": { "text": "$title" }
              },
              {
                "component": "text-block",
                "slots": { "content": "$field_body" }
              }
            ]
          }
        }
      }
    }
  }
}
```

### Drupal Mapping Rules

1. **Base fields** use their name directly: `$title`, `$status`, `$created`
2. **Custom fields** use the `field_` prefix: `$field_body`, `$field_media.url`
3. **Nested values** use dot notation: `$field_media.url`, `$field_category.name`
4. **Static values** have no `$` prefix: `true`, `"h1"`, `42`
5. **Slots** are for rendered content, **props** are for data/configuration
6. **Slots can contain nested components** as arrays

### Cross-Entity Includes

To render data from related entity types (e.g., a contact block on an article page):

```json
{
  "includes": [
    {
      "component": "contact-card",
      "entity": "block_content.contact_person",
      "record": 0,
      "props": {
        "name": "$field_name",
        "email": "$field_email"
      }
    }
  ]
}
```

`$field_name` refs in `includes` resolve against the **referenced** entity record, not the current entity.
