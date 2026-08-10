---
type: data-mapping
name: views
priority: 10
trigger:
  domain: data-mapping
  config_name: 'views.view.*'
filter:
  backend: drupal
---

# Blueprint: List View Mapping

Applies when `map-entity` runs for a View (`entity_type: view` — a `config.view` bundle). The same
blueprint also binds the view's Drupal config at `sync-to:transform` through its
`trigger.config_name: 'views.view.*'` — the config-name binding `form-display` and
`layout-builder-display` use — so a view binds like the other displays, not by prose alone.

## The view-template is a declared template

A view is declared like every other display: its `config.view.<id>` carries a `view_modes` entry
with `template: list-view` — the view-template. Its **rows** are UI-Patterns-bindable, so the view
uses this declarative template (config); its **pager** and **exposed filter** are theme-methods-only
surfaces that carry `template: presenter` and render through a presenter-template (Twig), not
UI-Patterns config.

## A view mapping is self-contained

A view scene node (`entity: "view.<id>"`, with no `record`/`select`) is resolved with an **empty
context**: the entity builder evaluates the view mapping against `{}`, not against a sample record.
So a view mapping MUST be **self-contained** — it enumerates the rows it lists directly and reads
nothing from `$`. A mapping that dereferences `$` (e.g. `$view.rows`, `$.items_per_page`) resolves
to empty and the listing renders blank.

The rows a view lists are the records of its **row bundle** — the content `entity_type`/`bundle`/
`view_mode` the view's `row` declares. The `design-screen` intake adds that row bundle to
`sample_data_bundles`, so its records exist; the mapping then references those records by index.
Because the rows are real row-bundle records, the entity-mapping validator finds them (no
"No sample records found") and the same enumeration renders the list.

## JSONata Pattern — flat list

Emit a flat array, one entry per listed row-bundle record. Top-level entries use the
`{ "type": "entity", … }` form (at the mapping's top level the validator accepts a `component` node
or a `type: "entity"` node; the `entity: "type.bundle"` string form is a scene-node shorthand, not a
mapping-output top-level form):

```jsonata
[
  { "type": "entity", "entity_type": "<row_entity_type>", "bundle": "<row_bundle>", "view_mode": "<row_view_mode>", "record": 0 },
  { "type": "entity", "entity_type": "<row_entity_type>", "bundle": "<row_bundle>", "view_mode": "<row_view_mode>", "record": 1 }
  /* one entry per row-bundle record the view lists */
]
```

Each entry renders the row bundle in its listed view-mode; the entity builder resolves each record.

## Optional wrapper (summary / pager)

When `list-view` / `view-summary` / `pager` components exist, wrap the same enumerated array in the
wrapper's `rows` slot — still self-contained (rows are enumerated, never read from `$`):

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

## A View's Display Type Decides Its Role

The same view can be a page's main content or beiwerk beside it — its **display type** decides:

- A view **page display** owns a route and can be a screen's route-bearing main content.
- A view **block** (`views_block:*`) owns no route; it is a block that sits beside the main content.

A View that a screen renders as its main content is modelled as a `config.view.<id>` bundle (its own
`view_modes` entry) so the renderer resolves it; the Drupal config-object name `views.view.<id>`
stays the sync/export address.

## Drupal config export — the `### to_drupal` pattern

At `sync-to:transform` this blueprint authors the `views.view.<id>` config. `prepared` (the
prepare-fetched schema) is authoritative for the shape; the view's data-model `def` supplies the
content — base table, row bundle/view-mode, filters, sort, and the `list-view` template.

Bind the view's **row output to its SDC component through the shared UI Patterns block** — the
`{component_id, variant_id, props, slots}` mechanism (see `ui-patterns.md`): the view's row/style
plugin carries that block, so a rendered list is a component render — the same UI-Patterns
manifestation a `field-map` display uses — not a raw view row. The view's `template: list-view`
names the component the rows bind to.

A view's **pager** and **exposed filter** are theme-methods-only: where present they carry
`template: presenter` and their markup is a presenter-template (Twig), authored alongside — never
UI-Patterns config.

The concrete config keys come from `prepared`; treat the row-binding intent here as the starting
point, not a fixed key layout.
