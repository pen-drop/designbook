## Context

The `view-mode-template` spec (already archived) replaced `composition: structured | unstructured` with per-view-mode `template` keys in a `view_modes` map, and `extensions` config with template-based routing. The schema (`data-model.schema.yml`) reflects this. However, six skill/rule files were never updated and still instruct the AI to use the old model. This causes the AI to produce `composition: unstructured` in `data-model.yml` despite the schema not requiring it (it's `additionalProperties: true`), and failing to set `view_modes`.

There is also a dangling `view-mode-templates` change directory with only a `proposal.md` and status `no-tasks` — it should be archived.

## Goals / Non-Goals

**Goals:**
- Every skill/rule that mentions `composition` or `extensions` is updated to the current model
- AI guided to write `view_modes.<mode>.template: <name>` for Layout Builder / Canvas bundles
- `ensure-sample-data` no longer branches on `composition: unstructured`
- Orphan change archived

**Non-Goals:**
- No spec changes — existing specs are correct
- No runtime code changes
- No new capabilities

## Decisions

### Per-file replacement strategy

Each file has a targeted replacement — no structural rewrites:

| File | Change |
|---|---|
| `designbook-data-model/SKILL.md` | Remove `composition` from schema tree, add `view_modes` |
| `designbook-data-model/rules/drupal-field-naming.md` | Replace unstructured table with `view_modes.full.template` guidance |
| `designbook-data-model-drupal/rules/drupal-data-model.md` | Replace `composition`/`extensions` section with `view_modes` + template table |
| `designbook-scenes/resources/jsonata-reference.md` | Remove `unstructured bundles` paragraph |
| `designbook-scenes/resources/view-entity.md` | Replace `composition: unstructured` in data-model example |
| `designbook-sample-data/tasks/ensure-sample-data.md` | Replace `composition` branches with view_mode template check |

### ensure-sample-data: replace composition with template check

Current logic branches on `composition: structured` vs `composition: unstructured`. New logic:

- `view_mode: full` AND template is `layout-builder` or `canvas` → treat as layout entity (was "unstructured") → `required_count = max(existing_count, 1)`
- `view_mode: full` AND template is `field-map` or similar → detail entity → `required_count = 1`
- `view_mode` is not `full` → listing entity → `required_count = 6`
- view entities (`entity_type: view`) → unchanged (reads items_per_page)
