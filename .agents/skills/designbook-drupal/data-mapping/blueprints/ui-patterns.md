---
type: data-mapping
name: ui-patterns
priority: 5
trigger:
  domain: data-mapping
---

# Blueprint: UI Patterns 2 — `{source_id, source}` Sub-Pattern

Path-neutral starting point for the **UI Patterns 2** config block —
`{ component_id, variant_id, props{}, slots{} }`. It carries **no** Layout Builder or Display
Builder specifics, so the Layout-Builder display path references it, and the Display Builder path
(DESIGNBOOK-3) references the same block unchanged.

Given a ComponentNode (`{ component, props{}, slots{} }`, schema
`designbook/scenes/schemas.yml#/ComponentNode`) and the component's SDC `.component.yml` (its `props`
types, `variants`, and `slots`), produce the `ui_patterns` block. `<set>` is the SDC provider
(theme/module machine name), `<component>` the SDC name, `<et>`/`<bundle>` the entity type and
bundle, `<field>` a mapped field.

## `component_id`

`'<set>:<component>'`, taken from the ComponentNode `component` (`provider:name`).

## `props` — each a `{source_id, source}` pair

For each ComponentNode prop, pick the `source_id` from how the value is supplied and, for a literal,
the SDC prop's declared type:

- Literal value + SDC prop type `boolean` → `source_id: checkbox`, `source: { value: <literal> }`.
- Literal value + SDC prop enum `string` → `source_id: select`, `source: { value: <literal> }`.
- Literal value + SDC prop enum `integer`/`number` → `source_id: select`, `source: { value: <literal> }`.
- Literal value + SDC prop non-enum `string` → `source_id: textfield`, `source: { value: <literal> }`.
- Literal value + SDC prop `$ref: "ui-patterns://url"` → `source_id: url`, `source: { value: <literal> }`.
- The implicit `attributes` prop (or a literal attribute string) → `source_id: attributes`,
  `source: { value: <literal or ''> }`.
- A `[…]`-shaped token literal → `source_id: token`, `source: { value: '<token>' }`.
- A field-reference value (`$fields.<field>`) → `source_id: entity_field` with:

  ```yaml
  source:
    derivable_context: 'field:<et>:<bundle>:<field>'
    'field:<et>:<bundle>:<field>':
      value:
        source_id: 'ui_patterns_source:<et>:<field>'
  ```

  For a specific field property, the leaf becomes `source_id: 'field_property:<et>:<field>:<prop>'`.

## `variant_id`

`null` when the SDC `.component.yml` declares no `variants:`. When it does, and the ComponentNode
supplies a field-reference selector, emit a field-derived `{source_id, source}` (the `entity_field`
shape above); when it supplies a literal, emit a static `{ source_id: select, source: { value:
<literal> } }`.

## `slots`

`{}` when slot content is placed by the consuming path via field-level regions. Inline slot content
(e.g. a nested component's own slot) uses `slots.<name>.sources[]`, each a `{ source_id, … }` — a
field-property leaf uses `source_id: 'field_property:<et>:<field>:<prop>'`.

## Reference shape (generic)

A field-derived prop, a static prop, and a derived `variant_id`, in the target shape:

```yaml
component_id: '<set>:<component>'
variant_id:
  source_id: entity_field
  source:
    derivable_context: 'field:<et>:<bundle>:field_component'
    'field:<et>:<bundle>:field_component':
      value:
        source_id: 'ui_patterns_source:<et>:field_component'
slots: {  }
props:
  attributes:
    source_id: attributes
    source:
      value: ''
  heading_level:
    source_id: entity_field
    source:
      derivable_context: 'field:<et>:<bundle>:<field>'
      'field:<et>:<bundle>:<field>':
        value:
          source_id: 'ui_patterns_source:<et>:<field>'
  size:
    source_id: select
    source:
      value: lg
```

When the SDC declares no `variants:`, `variant_id` is the literal `null` instead of the derived
block above.

## Reused by

This block is the shared UI Patterns 2 mechanism. It is consumed by `layout-builder-display.md`
(as `layout_settings.ui_patterns` and, nested, as a formatter's `settings.ui_patterns`) and by the
DESIGNBOOK-3 Display Builder path unchanged. Keep it free of Layout Builder / Display Builder keys
(`sections`, `field_block`, `enabled`, `allow_custom`, …).
