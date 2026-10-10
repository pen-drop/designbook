---
type: data-mapping
name: field-map
priority: 10
trigger:
  domain: data-mapping
---

# Blueprint: Field Map

Applies when a view mode declares `template: field-map`. The plan names one target `component` and a `bindings` list; the generated JSONata expression maps those fields onto that component. `plan done` AST-compares the submitted expression to this compiled template. A mapping that needs a ComponentNode array, canvas tree, or layout-builder section list is rejected at `plan build` with the selected target and unsupported structure.

## Pattern

One wrapping component. Props read field paths. Reference slots `$map` the field ids and `$lookup` each id in the inlined sample-pool index (stable record id → array index).

```jsonata
(
  $fields := $;
  [
    {
      "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:teaser",
      "props": {
        "title": $fields.field_title,
        "text": $fields.field_teaser_text
      },
      "slots": {
        "items": $map($fields.field_items, function($id) {
          {
            "entity": "paragraph.item",
            "view_mode": "full",
            "record": $lookup({ "item-a": 0, "item-b": 1 }, $string($id))
          }
        })
      }
    }
  ]
)
```

The `$lookup` object is the referenced bundle's sample pool, keyed by record id in pool order.

## Image Field Mapping

> See rule: [image-fields](../rules/image-fields.md) for hard constraints.

### `type: image` — direct ImageNode

When the data-model declares `type: image`, image data lives on the entity. Emit an ImageNode in the component's image slot:

```jsonata
{
  "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:content-teaser",
  "props": {
    "title": $fields.title,
    "text": $fields.field_teaser_text
  },
  "slots": {
    "image": [
      { "image": "teaser", "alt": $fields.field_topic_image.alt }
    ]
  }
}
```

### `type: reference` — EntityNode

When the data-model declares `type: reference`, emit EntityNodes through the same `$map` / `$lookup` slot template. The referenced entity renders itself via its own mapping:

```jsonata
{
  "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:content-teaser",
  "props": { "title": $fields.field_title },
  "slots": {
    "image": $map($fields.field_image, function($id) {
      {
        "entity": "media.image",
        "view_mode": "teaser",
        "record": $lookup({ "img-1": 0, "img-2": 1 }, $string($id))
      }
    })
  }
}
```

## Rules

- Output is a JSONata array expression returning one wrapping `ComponentNode`
- Input (`$`) is the sample data record for this entity from `data.yml`
- Use `$fields.` plus dot notation for field access: `$fields.field_image.alt`
- Static values (no `$`): `"h1"`, `true`, `42`
- Provider prefix must be resolved at generation time: `DESIGNBOOK_COMPONENT_NAMESPACE:component-name`
- Reference fields (`type: reference`) emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": $lookup({ "<id>": <index> }, $string($id)) }` nodes as slot values of the wrapping component. The renderer resolves refs inside slots and at top level. The exception is a pure delegation parent that has no wrapping markup of its own (a landing page stacking its paragraph sections), which may emit the refs as top-level array items.
- Image fields: see [image-fields rule](../rules/image-fields.md) — `type: image` → ImageNode in slot, `type: reference` → EntityNode in slot

## Supported Settings

- `primary_image_field` — name of the entity's primary image field (e.g. `field_topic_image`). Determines which field is mapped to the component's main image slot. The field's data-model type (`image` vs `reference`) decides the mapping pattern — see Image Field Mapping above.
