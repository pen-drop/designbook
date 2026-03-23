---
when:
  stages: [create-shell-scene, create-scene, map-entity]
---

# Scenes Critical Constraints

> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `test_integration_drupal:header`, NEVER just `header`.
> `$DESIGNBOOK_SDC_PROVIDER` is set by the workflow bootstrap (Rule 0).

> ⛔ **No `type: element` in scenes.** Never use `type: element` nodes inside slots.
> Use plain string values for text content. `type: element` is only valid in component `*.story.yml` files.

> ⛔ **Shell scenes: inline all slots.** Header and footer MUST inline ALL their sub-component slots — `logo`, `navigation` (with `items` populated), `actions`, `copyright`. Never write `story: default` alone.

## Entity Reference Format

> ⛔ **Entity references use three-part dotted format: `entity_type.bundle.view_mode`.**
>
> ```yaml
> # Correct — all three parts required
> - entity: "block_content.maintenance_log.default"
>   record: 0
>
> # Wrong — missing view_mode (causes JSONata resolution failure)
> - entity: "block_content.maintenance_log"
>   record: 0
> ```
>
> The renderer resolves entity references by loading the JSONata file at:
> `$DESIGNBOOK_DIST/entity-mapping/{entity_type}.{bundle}.{view_mode}.jsonata`
>
> If any part is missing, the file path becomes malformed (e.g. `block_content.maintenance_log..jsonata` with double dot).
>
> **`record:`** is an optional integer (default: 0) — selects which record from `data.yml` to use as input for the JSONata expression.
