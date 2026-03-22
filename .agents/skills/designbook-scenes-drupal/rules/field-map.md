---
when:
  stages: [map-entity]
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
      "component": "provider:heading",
      "props": { "level": "h1" },
      "slots": { "text": $fields.title }
    },
    {
      "component": "provider:text-block",
      "slots": { "content": $fields.field_body }
    },
    /* Reference field → recursive entity node */
    $fields.field_author ? {
      "type": "entity",
      "entity_type": "user",
      "bundle": "user",
      "view_mode": "avatar",
      "record": 0
    }
  ]
)
```

## Rules

- Output is a JSONata array expression returning `ComponentNode[]`
- Input (`$`) is the sample data record for this entity from `data.yml`
- Use dot notation for field access: `$fields.field_media.url`
- Static values (no `$`): `"h1"`, `true`, `42`
- Provider prefix must be resolved at generation time: `$DESIGNBOOK_SDC_PROVIDER:component-name`
- Reference fields (`type: reference`) emit `{ "type": "entity", ... }` nodes — resolved recursively
- Conditional components: use `$fields.field_x ? { ... }` to omit when field is empty

## Supported Settings

- `primary_image_field` — name of the main image field to use as the first visual component
