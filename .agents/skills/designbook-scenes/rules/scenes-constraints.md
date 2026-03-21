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
