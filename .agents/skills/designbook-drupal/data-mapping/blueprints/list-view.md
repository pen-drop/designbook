---
type: data-mapping
name: list-view
priority: 10
trigger:
  domain: data-mapping
filter:
  backend: drupal
---

# Blueprint: List View

Applies when a view mode declares `template: list-view` on a bundle that names its `row`
(`entity_type`, `bundle`, `view_mode`) — a `config.view.<id>` entry. The plan names no `bindings`
and at most one wrapper `component` with a `rows` slot. `plan instructions` for the map-entity step
includes `expected_mapping`, the compiled JSONata `plan done` AST-compares against.

`plan build` requires the row bundle with that view mode, its own mapping, and at least one sample
record of the row bundle.

## The mapping is self-contained

A view scene node (`entity: "view.<id>"`) is resolved with an **empty context**: the mapping is
evaluated against `{}`, not against a sample record. So the mapping lists its rows directly — one
entry per sample record of the row bundle, by index — and reads nothing from `$`.

## Pattern — flat list

Without a wrapper component:

```jsonata
[
  { "type": "entity", "entity_type": "<row_entity_type>", "bundle": "<row_bundle>", "view_mode": "<row_view_mode>", "record": 0 },
  { "type": "entity", "entity_type": "<row_entity_type>", "bundle": "<row_bundle>", "view_mode": "<row_view_mode>", "record": 1 }
]
```

## Pattern — wrapper component

With a wrapper `component`, the same list fills its `rows` slot:

```jsonata
{
  "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:list-view",
  "slots": {
    "rows": [
      { "type": "entity", "entity_type": "<row_entity_type>", "bundle": "<row_bundle>", "view_mode": "<row_view_mode>", "record": 0 },
      { "type": "entity", "entity_type": "<row_entity_type>", "bundle": "<row_bundle>", "view_mode": "<row_view_mode>", "record": 1 }
    ]
  }
}
```

Each entry renders the row bundle in its listed view mode. The pager region binds through its own
dedicated binding (see `pager.md`), not through this wrapper.
