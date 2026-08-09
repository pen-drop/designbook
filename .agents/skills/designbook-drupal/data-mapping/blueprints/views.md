---
type: data-mapping
name: views
priority: 10
trigger:
  domain: data-mapping
---

# Blueprint: List View — Wrapper Mapping

Applies when `map-entity` runs for `entity_type: view` (i.e. a `config.view` bundle).

## Behavior

Wraps the resolved rows in a wrapper component. The wrapper provides slots for the row list, an optional summary, and a pager.
If you not sure which you want to use ask the user.

## JSONata Pattern

```jsonata
(
  $view := $;
  {
    "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:list-view",
    "props": {
      "items_per_page": $view.items_per_page
    },
    "slots": {
      "rows": $view.rows,
      "summary": {
        "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:view-summary",
        "props": {
          "count": $count($view.rows),
          "items_per_page": $view.items_per_page
        }
      },
      "pager": {
        "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:pager",
        "props": {
          "items_per_page": $view.items_per_page,
          "current_page": 1
        }
      }
    }
  }
)
```

## Slots

| Slot      | Content                                           | Required |
|-----------|---------------------------------------------------|----------|
| `rows`    | `ComponentNode[]` of resolved entity references   | yes      |
| `summary` | Result count component (e.g. "Showing 6 of 24")   | optional |
| `pager`   | Pager component                                   | optional |

## Rules

- Output is a single `ComponentNode` wrapping the rows — not a bare array
- `rows` slot receives `$view.rows` directly — entity builder resolves each entry
- Include `summary` and `pager` slots — the SDC component decides whether to render them
- `$PROVIDER` is resolved at generation time from `DESIGNBOOK_COMPONENT_NAMESPACE`
- `items_per_page` comes from the view record in `data.yml`

## Fallback: Inline ComponentNode Array

When `list-view`, `view-summary`, and `pager` components do not exist in the project, use a flat `ComponentNode[]` array instead of the wrapper pattern. Map each row directly to its target component:

```jsonata
(
  $view := $;
  $map($view.rows, function($row) {
    { "entity": $row.entity_type & "." & $row.bundle, "view_mode": $row.view_mode, "record": $row.record }
  })
)
```

If rows reference entities via `entity` objects, emit them directly. If rows contain inline data, map each to a `ComponentNode` with the appropriate component.

## A View's Display Type Decides Its Role

The same view can be a page's main content or beiwerk beside it — its **display type** decides:

- A view **page display** owns a route and can be a screen's route-bearing main content.
- A view **block** (`views_block:*`) owns no route; it is a block that sits beside the main content.

## Sample Data for View Rows

The `design-screen` intake resolves a view node (`entity: "view.<id>"`) to its **row bundle** — the
content `entity_type`/`bundle`/`view_mode` the view lists — and draws concrete records from that
bundle's content sample data. The view's rows are then content-section records the entity-mapping
validator already checks, so a `$view.rows` mapping validates against real sample records.
