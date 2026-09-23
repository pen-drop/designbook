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

# Blueprint: View Mapping — Build-Form Decision

Applies when `map-entity` runs for a View (`entity_type: view` — a `config.view` bundle). The same
blueprint also binds the view's Drupal config at `sync-to:transform` through its
`trigger.config_name: 'views.view.*'` — the config-name binding `form-display` and
`layout-builder-display` use — so a view binds like the other displays, not by prose alone.

## The view's build form decides its composition

A view's `build_form` (the same backend-neutral `template` axis every other surface uses, sourced
from `entity_mapping.templates`) splits into two branches. Resolve the branch first — it decides
whether a view-presenter exists at all.

### Branch: Display Builder

When the view's page build form is a Display Builder form, the view binds **directly** through
the Display Builder page config — the same mechanism a Canvas or Layout-Builder page uses for its
own build form. The concrete config owner is the page's own config entity (the `page_layout`-style
config the Display Builder build form emits), carrying the view binding inline or by reference.

**No view-presenter exists in this branch.** The view wrapper, its rows, its pager, and its
exposed filter are all expressed through that one config owner — there is no separate Twig
wrapper to author.

### Branch: without Display Builder

Without a Display Builder build form, the view wrapper **is** a presenter-template: theme methods
are the only way to produce the wrapper markup, so `sync-to` generates a presenter-template
(Twig) for it. That presenter-template **composes** the view component — it does not reimplement
the view — and passes each of the following through as rendered slots, each supplied by its own
binding rather than reconstructed in the wrapper:

- **rows** — the enumerated row output (see "Row rendering" below);
- **empty-state** — the view's no-results presentation;
- **exposed form** — the exposed-filter form markup;
- **pager** — the pager markup.

The presenter-template's only job is composition — routing each already-rendered region into its
slot. It never rebuilds a region's markup itself.

## Row rendering is its own declarative contract

In both branches, row rendering binds through **UI Patterns**: the view's style/row plugin carries
the shared `{component_id, variant_id, props, slots}` block, so each row is an SDC component
render, not a raw view field. This is the declarative half and it stays identical across both
branches — a view template names it once, on the row/style plugin, and neither branch's wrapper
(presenter-template or Display Builder config) reconstructs a row component from field output.

So a view declares `template: list-view` (or the project's row-style value) in its
`config.view.<id>` `view_modes` entry — that value is the UI-Patterns row-style binding, resolved
the same way regardless of which build-form branch owns the wrapper around it.

## Container ownership

Exactly one owner sits beneath the view entity — the Display Builder config owner in that branch,
or the presenter-template wrapper in the other. A Scene that renders a view as its main content
carries the view entity **unwrapped**: the Scene node names the view; it does not itself introduce
a second container around it. Whichever branch applies supplies the one container the rendered
view lives in.

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

## Optional wrapper (summary)

When a `list-view` / `view-summary` component exists, wrap the same enumerated array in the
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

The pager region itself binds through its own dedicated binding, not through this wrapper slot.

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
content — base table, row bundle/view-mode, filters, sort, and the row-style template.

Bind the view's **row output to its SDC component through the shared UI Patterns block** — the
`{component_id, variant_id, props, slots}` mechanism (see `ui-patterns.md`): the view's row/style
plugin carries that block, so a rendered list is a component render — the same UI-Patterns
manifestation a `field-map` display uses — not a raw view row. The view's row-style `template`
names the component the rows bind to.

This authors only the **UI-Patterns half** (the row style). Which unit emits the **wrapper** —
the Display Builder page config, or a generated presenter-template with pager and exposed filter
passed through as slots — follows the build-form branch above. A view is the combination of the
row-style config and its wrapper; neither half is a whole view on its own.

The concrete config keys come from `prepared`; treat the row-binding intent here as the starting
point, not a fixed key layout.
