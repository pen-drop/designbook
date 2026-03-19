# Approach Summary

## Task

Create a compose mapping for `view.recent_articles` — a view entity — producing `view-modes/view.recent_articles.default.jsonata`.

## Skill Files Consulted

- `SKILL.md` — identified that `entity_type: view` routes to the `compose-entity` task
- `tasks/compose-entity.md` — confirmed view entities use the `compose-view-entity` rule
- `rules/compose-view-entity.md` — provided the exact JSONata pattern: wrapper component with inline entity refs in slots
- `resources/view-entity.md` — confirmed input is always `{}`, no data.yml record, and the file naming convention

## Approach

1. Identified entity type as `view` (bundle: `recent_articles`, view_mode: `default`), which routes to `compose-entity` → `compose-view-entity` rule.
2. Applied the rule pattern: a single wrapper component object with a `slots` key containing inline entity refs.
3. Used `my_drupal_theme:article-list` as the wrapper component (in `provider:component` format per the critical rule).
4. Placed 3 article entity refs in the `items` slot, each with `entity_type: node`, `bundle: article`, `view_mode: teaser`, and sequential `record` indices (0, 1, 2).
5. The file receives `{}` as input at runtime; `resolveEntityRefs` resolves each entity ref via the `map-entity` pipeline.

## Key Decisions

- **No `record:` at the top level** — view entities have no sample data instances.
- **3 items** — requested count; each uses a distinct `record` index so distinct sample data records are resolved.
- **`view_mode: teaser`** — articles are rendered in teaser view mode as specified.
- **Component format** — `my_drupal_theme:article-list` follows the mandatory `provider:component` format.
