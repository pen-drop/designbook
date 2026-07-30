---
type: data-mapping
name: form-display
priority: 20
trigger:
  domain: data-mapping
  config_name: 'core.entity_form_display.*'
filter:
  backend: drupal
---

# Blueprint: Entity Form Display

Starting point for the `### to_drupal` pattern that authors a
`core.entity_form_display.<et>.<bundle>.<form_mode>` — the **editing** half of a bundle, reached over an
edit route (`/node/add/{type}`, `/node/{node}/edit`, `/user/{user}/edit`, `/user/register`,
`comment/reply/{et}/{entity}/{field}`). It is the form-side counterpart of `layout-builder-display.md`
(which authors the read-side `core.entity_view_display.*`).

This blueprint self-selects for `core.entity_form_display.*` config units via `trigger.config_name`;
`filter.backend: drupal` gates it to Drupal projects.

## Two paired config names

For a bundle's `form_modes`, `sync-to`'s resolve-filter emits up to two config names per mode:

- `core.entity_form_display.<et>.<bundle>.<form_mode>` — the display authored by this blueprint.
- `core.entity_form_mode.<et>.<form_mode>` — the mode *definition*, emitted only for **non-default**
  form modes (the `default` mode is built in). This blueprint's display references that mode; the
  definition unit is authored from its own name and `label` and must import before the display.

## Scope — the display binding, not the widget layout

This blueprint authors the **existence and binding** of a form display for a form mode, not its per-field
widget layout. Author the identity keys — `uuid`, `langcode: en`, `status: true`,
`id: <et>.<bundle>.<form_mode>`, `targetEntityType: <et>`, `bundle: <bundle>`, `mode: <form_mode>` — and
leave `content` and `hidden` empty: Drupal assigns each field its default widget at runtime, so an empty
form display imports cleanly and stays out of the field-selection / widget-configuration semantics that
are out of scope. Which component renders the form is a theme-layer concern (the form mode's `template`
maps to the form SDC there), not a member of this config. Drupal computes `dependencies` at import; do
not hand-author the full dependency graph.

## Reference shape (generic)

```yaml
uuid: <uuid>
langcode: en
status: true
dependencies: {  }
id: '<et>.<bundle>.<form_mode>'
targetEntityType: <et>
bundle: <bundle>
mode: <form_mode>
content: {  }
hidden: {  }
```

The `mode` value is `default` for the built-in edit form, or the non-default form-mode machine name
(e.g. `register`) whose paired `core.entity_form_mode.<et>.<form_mode>` definition carries the
human-readable `label`.
