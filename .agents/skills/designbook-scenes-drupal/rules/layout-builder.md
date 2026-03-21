---
when:
  stages: [map-entity]
  template: layout-builder
  view_mode: 
---

# Rule: Layout Builder

Applies when a view mode declares `template: layout-builder`. Generates a JSONata expression for Drupal Layout Builder — sections as layout containers with `block_content` entity refs in column slots.

## Pattern

```jsonata
(
  $fields := $;
  [
    {
      "component": "provider:section",
      "props": { "columns": 2, "max_width": "lg" },
      "slots": {
        "column_1": [
          { "type": "entity", "entity_type": "block_content", "bundle": "hero", "view_mode": "full", "record": 0 }
        ],
        "column_2": [
          { "type": "entity", "entity_type": "block_content", "bundle": "card_group", "view_mode": "full", "record": 0 }
        ]
      }
    },
    {
      "component": "provider:section-full-width",
      "slots": {
        "content": [
          { "type": "entity", "entity_type": "block_content", "bundle": "cta", "view_mode": "full", "record": 0 }
        ]
      }
    }
  ]
)
```

## Rules

- Output is a JSONata array of section components
- Sections are components from the design system (`provider:section`, `provider:section-full-width`, etc.)
- Column slots contain only `block_content` entity refs — NEVER direct component nodes
- Each block entity ref resolves recursively via `map-entity` (block_content bundles use `field-map` template)
- `record: N` selects which sample data record from `data.yml → block_content.{bundle}`
- A landing page typically has 1–4 sections; keep it realistic
- No nesting sections inside sections
- Provider prefix must be resolved: `$DESIGNBOOK_SDC_PROVIDER:component-name`

## Supported Settings

- `wrapper` — override the default section wrapper component (e.g. `my_theme:page-content`)
