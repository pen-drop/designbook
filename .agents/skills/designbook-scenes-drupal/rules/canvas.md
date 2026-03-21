---
when:
  stages: [map-entity]
  template: canvas
---

# Rule: Canvas

Applies when a view mode declares `template: canvas`. Generates a JSONata expression for Drupal Canvas — a flat component tree with direct component nodes, no section wrappers.

## Pattern

```jsonata
(
  $fields := $;
  [
    {
      "component": "provider:hero",
      "props": { "background": "dark" },
      "slots": {
        "heading": $fields.title,
        "subheading": $fields.field_summary,
        "cta": [
          {
            "component": "provider:button",
            "props": { "variant": "primary" },
            "slots": { "text": "Get started" }
          }
        ]
      }
    },
    {
      "component": "provider:feature-grid",
      "props": { "columns": 3 },
      "slots": {
        "items": [
          { "component": "provider:feature-card", "slots": { "title": "Feature 1", "body": "Description" } },
          { "component": "provider:feature-card", "slots": { "title": "Feature 2", "body": "Description" } }
        ]
      }
    }
  ]
)
```

## Rules

- Output is a JSONata array of component nodes (no section wrappers)
- Components may be nested via slots — unlike Layout Builder, no block_content constraint
- All component values use `provider:component` format — resolve `$DESIGNBOOK_SDC_PROVIDER`
- Keep the component tree realistic to what Canvas would actually author
- Slot values can be strings (text content) or nested component arrays
- Field values accessed via `$fields.field_name`
