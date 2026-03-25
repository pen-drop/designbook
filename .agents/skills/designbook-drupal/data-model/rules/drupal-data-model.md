---
when:
  backend: drupal
  stages: [designbook-data-model:intake, create-data-model]
---

# Drupal Data Model Rules


## Entity Mapping

Map generic content concepts to Drupal entity types:

| Content concept             | Entity type     | Path in data-model.yml              |
|-----------------------------|-----------------|-------------------------------------|
| Content (articles, pages)   | `node`          | `content.node.[bundle]`             |
| Files, images, videos       | `media`         | `content.media.[bundle]`            |
| Categories, tags            | `taxonomy_term` | `content.taxonomy_term.[bundle]`    |

**Do NOT suggest `block_content` by default.** It is only appropriate when the `layout_builder` extension is active. Extension-specific entity types (`block_content`, `canvas_page`, `paragraph`) are introduced by extension rule files loaded via `when.extensions`.

## Extension-Aware Rules

Extension-specific entity types, fields, and `view_modes` templates are defined in dedicated rule files that load automatically when an extension is active. This rule file defines the base (no-extension) behavior only.

**How extension rules are loaded:**

- Rule files with `when: extensions: <id>` load automatically when that extension ID is in `DESIGNBOOK_EXTENSIONS`
- Extensions with a `skill:` field in `designbook.config.yml` inject a full skill as a `config_instruction` — appropriate for complex extensions like Paragraphs

**Known extension rule files in this skill:**
- `rules/layout-builder.md` — active when `extensions` contains `layout_builder`
- `rules/canvas.md` — active when `extensions` contains `canvas`

**Paragraphs** is an example of a skill-based extension — configure it with `skill: designbook-data-model-paragraphs` in `designbook.config.yml`. No rule file needed here.

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
