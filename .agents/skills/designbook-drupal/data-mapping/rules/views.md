---
when:
  stages: [map-entity]
---

# Rule: List View — Wrapper Mapping

Applies when `map-entity` runs for `entity_type: view` (i.e. a `config.view` bundle).

## Behavior

Wraps the resolved rows in a wrapper component. The wrapper provides slots for the row list, an optional summary, and a pager. 
If you not sure which you want to use ask the user.

## JSONata Pattern

```jsonata
(
  $view := $;
  {
    "component": "$COMPONENT_NAMESPACE:list-view",
    "props": {
      "items_per_page": $view.items_per_page
    },
    "slots": {
      "rows": $view.rows,
      "summary": {
        "component": "$COMPONENT_NAMESPACE:view-summary",
        "props": {
          "count": $count($view.rows),
          "items_per_page": $view.items_per_page
        }
      },
      "pager": {
        "component": "$COMPONENT_NAMESPACE:pager",
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
- `$PROVIDER` is resolved at generation time from `COMPONENT_NAMESPACE`
- `items_per_page` comes from the view record in `data.yml`
