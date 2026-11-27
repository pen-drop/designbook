---
type: data-mapping
name: entity-binding
priority: 10
trigger:
  domain: data-mapping
filter:
  backend: drupal
  frameworks.component: vue
---

# Blueprint: Entity Binding — Vue Component

Applies when a view mode declares `builder: entity-binding` in a Vue project with a Drupal backend. The
mapping turns one Drupal sample record into one Vue component node for a Storybook scene: field
values bind to the component's `defineProps` names, referenced entities fill its named `<slot>`s.
`plan instructions` for the map-entity step carries `expected_mapping`, the compiled JSONata
`plan done` AST-compares against.

## Pattern

One wrapping component, addressed as `$DESIGNBOOK_COMPONENT_NAMESPACE:<kebab-case-name>`. Prop and
slot keys are the SFC's own names, so a snake_case Drupal field binds to its camelCase prop
(`field_teaser_text` → `teaserText`). Reference slots `$map` the field ids and `$lookup` each id in
the inlined sample-pool index (stable record id → array index).

```jsonata
(
  $fields := $;
  [
    {
      "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:teaser",
      "props": {
        "title": $fields.field_title,
        "teaserText": $fields.field_teaser_text,
        "imageAlt": $fields.field_image.alt
      },
      "slots": {
        "relatedItems": $map($fields.field_related_items, function($id) {
          {
            "entity": "paragraph.item",
            "view_mode": "teaser",
            "record": $lookup({ "item-a": 0, "item-b": 1 }, $string($id))
          }
        })
      }
    }
  ]
)
```

Each reference slot entry is an entity node; the renderer resolves it through the referenced
bundle's own view-mode mapping, so the nested Vue component comes from that bundle's `entity-binding`.
A media reference fills an image slot the same way.

## Views

A view's rows are entity nodes of its row bundle in the row view mode — the view mapping enumerates
them, and each row renders through that bundle's `entity-binding` above. The Vue component a row becomes
is therefore decided by the row bundle's view mode, not by the view.
