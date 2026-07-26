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

The block has **two halves**:

- **Scene-intent** — how each prop is supplied: a literal, a field reference (`$fields.<field>`), a
  `[token]`, or attributes; which field; which prop-property. Only the scene/agent knows this. It
  stays here, in this blueprint.
- **Drupal-registry** — the `source_id` for a prop type, the `entity_field`/`field_property` block,
  and `variant_id`. This is deterministic and introspectable from UI Patterns 2's own plugin
  registry. **Do not hand-derive it** — the `designbook_ui_patterns` submodule emits it.

## Emit the block with the drush command

Given a ComponentNode (`{ component, props{}, slots{} }`, schema
`designbook/scenes/schemas.yml#/ComponentNode`), map each prop to its **scene-intent hint** and pass
the hints to the command in **one call** — it returns the whole `ui_patterns` block with the
registry half filled in:

```
{{ backend_cmd.ui_pattern_cmd }} '<set>:<component>' --props='<json>'
```

where `<json>` is `{ "props": { "<prop>": <hint> }, "slots": { … } }` and each `<hint>` is the
scene-intent for that prop:

| Scene-intent | Hint to pass |
|--------------|--------------|
| Literal value | `{ "literal": <value> }` (or the bare scalar) |
| Field reference `$fields.<field>` | `{ "field": "<et>:<bundle>:<field>" }` |
| A specific field property | `{ "field": "<et>:<bundle>:<field>:<property>" }` |
| A `[…]`-shaped token | `{ "token": "<token>" }` |
| The implicit `attributes` prop | `{ "literal": "" }` on the `attributes` prop |

The command derives the `source_id`, the `entity_field`/`field_property` structure, and `variant_id`
from the SDC prop type + UI Patterns' source registry. It never guesses which field or literal — that
is the scene-intent you pass in.

## `component_id`

`'<set>:<component>'`, taken from the ComponentNode `component` (`provider:name`) — `<set>` is the
SDC provider (theme/module machine name), `<component>` the SDC name. This is scene-derived; pass it
as the command's first argument.

## `variant_id`

Scene-intent decides only *whether* a variant is selected and, for a field-driven selector, *which*
field. Whether the component even has variants, and the resolved `{source_id, source}` shape, come
from the command (`null` when the SDC declares no `variants:`).

## `slots`

`{}` when slot content is placed by the consuming path via field-level regions. Inline slot content
(e.g. a nested component's own slot) is passed under `slots` in the command input, following the same
per-prop scene-intent hints.

## Reference shape (illustrative command output)

For a component with a field-derived prop, a static prop, and variants, the command emits, e.g.:

```yaml
component_id: '<set>:<component>'
variant_id:
  source_id: select
  source:
    value: null
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
          source_id: 'field_property:<et>:<bundle>:<field>'
  size:
    source_id: select
    source:
      value: lg
```

The exact `entity_field` leaf and `variant_id` shape are whatever the live registry returns — treat
the command output as authoritative, not this illustration.

## Reused by

This block is the shared UI Patterns 2 mechanism. It is consumed by `layout-builder-display.md`
(as `layout_settings.ui_patterns` and, nested, as a formatter's `settings.ui_patterns`) and by the
DESIGNBOOK-3 Display Builder path unchanged. Keep it free of Layout Builder / Display Builder keys
(`sections`, `field_block`, `enabled`, `allow_custom`, …).
