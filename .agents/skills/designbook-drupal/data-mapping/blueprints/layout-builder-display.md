---
type: data-mapping
name: layout-builder-display
priority: 20
trigger:
  domain: data-mapping
  config_name: 'core.entity_view_display.*'
filter:
  extensions: layout_builder
---

# Blueprint: Layout Builder + UI Patterns 2 Display

Starting point for the `### to_drupal` pattern that authors a
`core.entity_view_display.<et>.<bundle>.<view_mode>` on the **Layout Builder** path: each section is
a `ui_patterns:<set>:<component>` layout and each mapped field is placed as a `field_block` in its
slot region. `<set>` is the SDC provider, `<component>` the SDC name, `<et>`/`<bundle>` the entity
type and bundle, `<field>` a mapped field, `<view_mode>` the display's view mode.

Distinct from `layout-builder.md` (the renderer sample-data passthrough) — this authors the Drupal
export config, not the ComponentNode array.

This blueprint self-selects for `core.entity_view_display.*` config units via `trigger.config_name`;
`filter.extensions: layout_builder` gates it to Layout-Builder projects.

## View-mode template — config display vs content override

This pattern authors sections only for a **`field-map`** view mode — the config-managed display
(`allow_custom: false`, sections in `core.entity_view_display.*`). A **`layout-builder`**-template
view mode is a per-entity content override: its sections live in the entity's `layout_builder__layout`
base field (content, not config). For such a unit author only:

```yaml
third_party_settings:
  layout_builder:
    enabled: true
    allow_custom: true
    sections: {  }   # empty map or empty list — never component sections
```

Never author component sections into config for a `layout-builder` template. Never emit
`inline_block:*` with `block_serialized` (PHP-serialized arrays or entities) in display config —
Drupal expects a real block content entity revision when materialising inline blocks; a hand-built
`block_serialized` breaks `config:import` and bare entity seeds. Place hero / block_content /
views_block sections on the entity override (fixture seed or content path), not in this config unit.

## Input resolution

Read the bundle's `entity-mapping/<et>.<bundle>.<view_mode>.jsonata` for the ComponentNode(s), and
each referenced component's SDC `.component.yml` (prop types, `variants`, slot names). No
resolve-filter change — the display unit already carries `entity_type`, `bundle`, and the view-mode
`def`; the rest is derived from these artifacts on disk.

## `third_party_settings.layout_builder`

```yaml
third_party_settings:
  layout_builder:
    enabled: true
    allow_custom: false
    sections: [ … ]
```

One ComponentNode → one section. A block_content SDC-as-layout display yields one section; a
node/full Layout Builder display yields one-or-more sections (each a UI Patterns layout carrying the
node's fields as `field_block`s) — never sections that reference block_content entities.

## Section

```yaml
layout_id: 'ui_patterns:<set>:<component>'
layout_settings:
  label: ''
  ui_patterns: <the shared ui-patterns.md block for this ComponentNode>
  context_mapping:
    entity: layout_builder.entity
components: { <uuid>: <field_block>, … }
third_party_settings: {  }
```

`layout_settings.ui_patterns` is the shared UI Patterns 2 block — `{ component_id, variant_id,
props, slots }` produced by the `ui-patterns.md` sub-pattern.

## `field_block` component — one per field-filled slot

Each mapped field that fills a slot becomes one UUID-keyed entry under the section's `components`:

```yaml
<uuid>:
  uuid: <uuid>
  region: <slot name>
  weight: <order within the region>
  additional: {  }
  configuration:
    id: 'field_block:<et>:<bundle>:<field>'
    label: <field label>
    label_display: '0'
    provider: layout_builder
    context_mapping:
      entity: layout_builder.entity
      view_mode: view_mode
    formatter: <by field type — see below>
```

`region` equals the target SDC slot name. `weight` orders components within one region.

Which mapped values belong here as `field_block` slots at all — every field-rendered value, incl.
single-value `title` and `link`/CTA — versus the few that stay scalar props is governed by
*Field-Rendered Content Maps to a Slot, Not a Scalar Prop* in
`../../components/rules/reference-field-semantics.md`.

### `formatter.type` by field type

- string / title field → `string`
- formatted (long) text → `text_default`
- link field → `link`
- entity-reference media → a media reference formatter
- a field that itself renders **as a nested SDC** (its slot value is a nested ComponentNode /
  EntityNode) → `ui_patterns_component_per_item`, whose `settings.ui_patterns` is the **same shared
  `ui-patterns.md` block again**, nested for the inner component.

## Top-level `content` / `hidden`

Every field placed as a `field_block` is listed under `hidden: { <field>: true }`. A
component-settings field (when the model carries one) sits under `content` with `type:
ui_patterns_source`.

## Identity + standard keys

Author the identity keys — `uuid`, `langcode: en`, `status: true`, `id:
<bundle>.<view_mode>` scoped as `<et>.<bundle>.<view_mode>`, `targetEntityType: <et>`, `bundle:
<bundle>`, `mode: <view_mode>`. Drupal computes `dependencies` at import; do not hand-author the full
dependency graph.

## UUID rule — deterministic, idempotent

`sections[].components` are UUID-keyed and re-running `sync-to` must not churn UUIDs (idempotent
`config:import`). Mint each component UUID **at authoring time** as
`uuid5(<url-namespace>, config_name + '/' + region + '/' + field)` and emit it as a literal string
in the authored `.jsonata`. Stable inputs → stable UUID across re-syncs. JSONata has no UUID
primitive; because the mapping is authored per config name, the literal is computed by the author,
not at runtime — no runtime helper is required.

## Reference shape (generic)

One section with a `string` field_block and a nested-SDC action field_block:

```yaml
third_party_settings:
  layout_builder:
    enabled: true
    allow_custom: false
    sections:
      -
        layout_id: 'ui_patterns:<set>:hero'
        layout_settings:
          label: ''
          ui_patterns:
            component_id: '<set>:hero'
            variant_id: null
            slots: {  }
            props:
              attributes: { source_id: attributes, source: { value: '' } }
          context_mapping:
            entity: layout_builder.entity
        components:
          <uuid-a>:
            uuid: <uuid-a>
            region: title
            weight: 0
            additional: {  }
            configuration:
              id: 'field_block:<et>:hero:field_title'
              label: Title
              label_display: '0'
              provider: layout_builder
              context_mapping: { entity: layout_builder.entity, view_mode: view_mode }
              formatter:
                type: string
                label: hidden
                settings: { link_to_entity: false }
                third_party_settings: {  }
          <uuid-b>:
            uuid: <uuid-b>
            region: button
            weight: 0
            additional: {  }
            configuration:
              id: 'field_block:<et>:hero:field_action'
              label: Action
              label_display: '0'
              provider: layout_builder
              context_mapping: { entity: layout_builder.entity, view_mode: view_mode }
              formatter:
                type: ui_patterns_component_per_item
                label: hidden
                settings:
                  ui_patterns:
                    component_id: '<set>:button'
                    variant_id: { source_id: select, source: { value: primary } }
                    props:
                      url:
                        source_id: entity_field
                        source:
                          derivable_context: 'field:<et>:hero:field_action'
                          'field:<et>:hero:field_action':
                            value: { source_id: 'field_property:<et>:field_action:uri' }
                    slots:
                      label:
                        sources:
                          - source_id: 'field_property:<et>:field_action:title'
                third_party_settings: {  }
hidden:
  field_action: true
  field_title: true
```
