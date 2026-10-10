---
type: data-mapping
name: field-map
priority: 10
trigger:
  domain: data-mapping
---

# Blueprint: Field Map

Applies when a view mode declares `template: field-map`. The plan names one target `component` and a `bindings` list. `plan instructions` for the map-entity step includes `expected_mapping`, the compiled JSONata `plan done` AST-compares against. A mapping whose view-mode template is canvas, layout-builder, or another non-field-map structure is rejected at `plan build` with the selected target and unsupported structure.

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

Map a media entity reference (`type: reference`) into the image slot with `entity`, using the same `$map` / `$lookup` template as other reference slots. `plan instructions` `expected_mapping` is this compiled wrapper:

```jsonata
(
  $fields := $;
  [
    {
      "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:content-teaser",
      "props": {
        "title": $fields.field_title
      },
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
  ]
)
```

## Rules

- Output is a JSONata array expression returning one wrapping `ComponentNode`
- Input (`$`) is the sample data record for this entity from `data.yml`
- Use `$fields.` plus dot notation for field access: `$fields.field_image.alt`
- Every bound value comes from a declared field path (`$fields.<field>`)
- Provider prefix must be resolved at generation time: `DESIGNBOOK_COMPONENT_NAMESPACE:component-name`
- Reference fields (`type: reference`) emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": $lookup({ "<id>": <index> }, $string($id)) }` nodes as slot values of the wrapping component. The renderer resolves refs inside slots and at top level.
- Image slots use that same reference-slot template; `plan instructions` `expected_mapping` is the expression to submit

## Supported Settings

- `primary_image_field` — name of the media reference field mapped to the component's image slot with the reference-slot template above.
