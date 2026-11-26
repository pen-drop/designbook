---
type: data-mapping
name: field-map
priority: 10
trigger:
  domain: data-mapping
filter:
  backend: drupal
  frameworks.component: sdc
---

# Blueprint: Field Map

Applies when a view mode declares `template: field-map`. The plan names one target `component` and a `bindings` list. `plan instructions` for the map-entity step includes `expected_mapping`, the compiled JSONata `plan done` AST-compares against. A bundle with a `component_tree` field maps by passing that field through instead; a mapping whose view-mode template is layout-builder or another non-field-map structure without such a field is rejected at `plan build` with the selected target and unsupported structure.

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

## Several Fields in One Slot

Several bindings may name the same slot; the slot then holds one array in binding order. A binding with `wrap` places its field inside a wrapper component with fixed props, in the wrapper prop or slot that `wrap` names:

```yaml
bindings:
  - { field: field_title, prop: title }
  - { field: field_tagline, slot: meta }
  - field: field_version
    slot: meta
    wrap: { component: "$DESIGNBOOK_COMPONENT_NAMESPACE:list_cell", props: { caption: Version }, prop: value }
```

compiles to

```jsonata
(
  $fields := $;
  [
    {
      "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:teaser",
      "props": {
        "title": $fields.field_title
      },
      "slots": {
        "meta": [$fields.field_tagline, { "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:list_cell", "props": { "caption": "Version", "value": $fields.field_version } }]
      }
    }
  ]
)
```

A `wrap.props` value `{ field, path? }` reads that field of the mapped bundle instead of a literal. A nested `wrap` goes into the outer wrapper's `prop` or `slot`; the binding's field goes into the innermost wrapper:

```yaml
  - field: field_version
    slot: meta
    wrap:
      component: "$DESIGNBOOK_COMPONENT_NAMESPACE:list_cell"
      props: { caption: Version }
      slot: content
      wrap:
        component: "$DESIGNBOOK_COMPONENT_NAMESPACE:badge"
        props: { tone: { field: field_channel } }
        prop: label
```

compiles its `meta` item to

```jsonata
{ "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:list_cell", "props": { "caption": "Version" }, "slots": { "content": { "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:badge", "props": { "tone": $fields.field_channel, "label": $fields.field_version } } } }
```

## Rules

- Output is a JSONata array expression returning one wrapping `ComponentNode`
- Input (`$`) is the sample data record for this entity from `data.yml`
- Use `$fields.` plus dot notation for field access: `$fields.field_image.alt`
- Every bound value comes from a declared field path (`$fields.<field>`)
- Provider prefix must be resolved at generation time: `DESIGNBOOK_COMPONENT_NAMESPACE:component-name`
- Reference fields (`type: reference`) emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": $lookup({ "<id>": <index> }, $string($id)) }` nodes as slot values of the wrapping component. The renderer resolves refs inside slots and at top level.
- Image slots use that same reference-slot template; `plan instructions` `expected_mapping` is the expression to submit
- A slot with one binding keeps that binding's single value; a slot with several bindings is one array of their items in binding order, image and reference `$map` items unwrapped inside it
- A prop takes exactly one binding
- `wrap` sits on a slot binding only; image and reference fields go into the innermost `wrap.slot` and never into a field-valued `wrap.props` entry

## Supported Settings

- `primary_image_field` — name of the media reference field mapped to the component's image slot with the reference-slot template above.
- `formatters` — map `<field>: { type, settings }` in `view_modes.<vm>.settings`; overrides the formatter derived for `<field>` where it fills a slot in that view mode.

```yaml
view_modes:
  full:
    template: field-map
    settings:
      formatters:
        field_rating: { type: number_unformatted, settings: {} }
```
