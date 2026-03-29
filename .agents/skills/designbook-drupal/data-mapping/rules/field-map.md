---
when:
  steps: [map-entity]
  template: field-map
---

# Rule: Field Map

Applies when a view mode declares `template: field-map`. Generates a JSONata expression that maps entity fields to a `ComponentNode[]` array.

## Pattern

```jsonata
(
  $fields := $;
  [
    {
      "component": "$COMPONENT_NAMESPACE:heading",
      "props": { "level": "h1" },
      "slots": { "text": $fields.title }
    },
    {
      "component": "$COMPONENT_NAMESPACE:text_block",
      "slots": { "content": $fields.field_body }
    },
    /* Reference field → entity node goes into a slot of a wrapper component */
    $fields.field_author ? {
      "component": "$COMPONENT_NAMESPACE:author_card",
      "slots": {
        "avatar": {
          "type": "entity",
          "entity_type": "user",
          "bundle": "user",
          "view_mode": "avatar",
          "record": 0
        }
      }
    }
  ]
)
```

## Rules

- Output is a JSONata array expression returning `ComponentNode[]`
- Input (`$`) is the sample data record for this entity from `data.yml`
- Use dot notation for field access: `$fields.field_media.url`
- Static values (no `$`): `"h1"`, `true`, `42`
- Provider prefix must be resolved at generation time: `COMPONENT_NAMESPACE:component-name`
- Reference fields (`type: reference`) emit `{ "type": "entity", ... }` nodes as slot values inside a wrapper component — never as top-level array items
- Conditional components: use `$fields.field_x ? { ... }` to omit when field is empty

## Supported Settings

- `primary_image_field` — name of the main image field to use as the first visual component
