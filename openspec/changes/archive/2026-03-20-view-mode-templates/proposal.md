## Why

The current entity-mapping system requires understanding three concepts simultaneously: `composition: structured/unstructured`, `extensions: [layout_builder]`, and the routing between `compose-entity` and `map-entity` stages. This complexity is unnecessary — each view mode should simply declare *how* it maps, not rely on global flags and routing trees.

## What Changes

- **BREAKING** Replace `composition: structured | unstructured` on bundles with per-view-mode `template` key in a `view_modes` map
- **BREAKING** Remove `extensions` from `designbook.config.yml` — template selection replaces extension-based routing
- **BREAKING** Remove `compose-entity` stage entirely — `map-entity` is the only entity mapping stage
- `map-entity` stage loads the matching rule (`when: stages: [map-entity], template: {name}`) instead of routing between two stages — existing rule discovery mechanism, new `template` condition key
- `designbook.config.yml` gains `entity_mapping.templates` — a map of template name → `{ description }` declaring which templates are available in the project
- Skills register templates as rule files with `when: stages: [map-entity], template: {name}` — no new directory pattern, same rule discovery mechanism

## Capabilities

### New Capabilities

- `view-mode-template`: Each view_mode in data-model.yml declares a `template` key. The `map-entity` stage loads `entity-mapping/{template}.md` from skills to know how to generate the JSONata file.
- `entity-mapping-config`: `designbook.config.yml` supports `entity_mapping.templates` — a named map of available templates with descriptions.

### Modified Capabilities

- `bundle-composition`: **BREAKING** — `composition: structured | unstructured` removed. Replaced by per-view-mode `template` in `view_modes`. The concept of "unstructured" is now expressed by choosing a template like `layout-builder` or `canvas`.
- `extensions-config`: **BREAKING** — `extensions` array removed from config. Template declarations in the data model replace extension-based routing.

## Impact

- `packages/storybook-addon-designbook/src/validators/schemas/data-model.schema.yml` — add `view_modes` to bundle schema, remove `composition`
- `.agents/skills/designbook-scenes/` — remove `compose-entity` task, simplify `map-entity` to rule-based template loading, remove routing logic from `collect-entities`
- `.agents/skills/designbook-scenes/rules/` — add `field-map.md`, `view-entity.md` (with `when: template:` condition); remove `compose-view-entity.md`
- `.agents/skills/designbook-scenes-drupal/rules/` — rewrite `compose-layout-builder.md` → `layout-builder.md`, `compose-canvas.md` → `canvas.md` (with `when: template:` condition)
- `.agents/skills/designbook-data-model/` — update task to guide view_modes + template during dialog
- `.agents/skills/designbook-configuration/SKILL.md` — document `entity_mapping.templates` config key
- No runtime code changes — entity-builder.ts is unaffected; templates are AI-layer only
