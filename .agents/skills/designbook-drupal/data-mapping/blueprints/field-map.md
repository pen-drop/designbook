---
type: data-mapping
name: field-map
priority: 10
domain: data-mapping
---

# Blueprint: Field Map

Applies when a view mode declares `template: field-map`. Generates a JSONata expression that maps entity fields to a `ComponentNode[]` array.

## Pattern

```jsonata
(
  $fields := $;
  [
    {
      "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:heading",
      "props": { "level": "h1" },
      "slots": { "text": $fields.title }
    },
    {
      "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:text_block",
      "slots": { "content": $fields.field_body }
    },
    /* Reference field → entity node in slot */
    $fields.field_author ? {
      "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:author_card",
      "slots": {
        "avatar": [
          { "entity": "user.user", "view_mode": "avatar", "record": 0 }
        ]
      }
    }
  ]
)
```

## Image Field Mapping

> See rule: [image-fields](../rules/image-fields.md) for hard constraints.

### `type: image` — direct ImageNode

When the data-model declares `type: image`, image data lives on the entity. Emit an ImageNode in the component's image slot:

```jsonata
{
  "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:content-teaser",
  "props": {
    "title": title,
    "text": field_teaser_text
  },
  "slots": {
    "image": [
      { "image": "leando_teaser", "alt": field_topic_image.alt }
    ]
  }
}
```

### `type: reference` (Media) — EntityNode

When the data-model declares `type: reference` pointing to a media entity, emit an EntityNode. The media entity renders itself via its own mapping:

```jsonata
{
  "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:content-teaser",
  "props": { "title": field_title },
  "slots": {
    "image": [
      { "entity": "media.image", "view_mode": "leando_teaser", "record": $number(field_image) - 1 }
    ]
  }
}
```

The record index is derived from the reference field value (entity ID) mapped to the sample data array index.

## Rules

- Output is a JSONata array expression returning `ComponentNode[]`
- Input (`$`) is the sample data record for this entity from `data.yml`
- Use dot notation for field access: `$fields.field_image.alt`
- Static values (no `$`): `"h1"`, `true`, `42`
- Provider prefix must be resolved at generation time: `DESIGNBOOK_COMPONENT_NAMESPACE:component-name`
- Reference fields (`type: reference`) emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": N }` — typically as slot values inside a wrapper component. **Exception:** parent entities that orchestrate child sections (e.g. a landing page emitting its paragraph sections) MAY emit entity refs as top-level array items.
- Image fields: see [image-fields rule](../rules/image-fields.md) — `type: image` → ImageNode in slot, `type: reference` → EntityNode in slot
- Conditional components: use `$fields.field_x ? { ... }` to omit when field is empty

## Supported Settings

- `primary_image_field` — name of the entity's primary image field (e.g. `field_topic_image`). Determines which field is mapped to the component's main image slot. The field's data-model type (`image` vs `reference`) decides the mapping pattern — see Image Field Mapping above.
