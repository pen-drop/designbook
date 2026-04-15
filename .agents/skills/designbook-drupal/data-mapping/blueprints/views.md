---
type: data-mapping
name: views
priority: 10
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

## Validator Limitation

> ⚠️ The entity-mapping validator cannot look up `config.view` records in `data.yml` — it only checks the `content:` section. View entity mappings that use `$view.rows` will fail validation with "No sample records found." **Workaround:** use static `ComponentNode[]` arrays that the validator can check, or manually mark the task as done after verifying the output is correct.
