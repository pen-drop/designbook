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
