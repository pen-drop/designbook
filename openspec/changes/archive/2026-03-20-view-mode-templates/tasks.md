## 1. Schema: data-model.yml

- [x] 1.1 Add `view_modes` to `bundle` definition in `data-model.schema.yml` — map of view mode name → `{ template: string (required), settings: object (optional, additionalProperties: true) }`
- [x] 1.2 Remove `composition` property from `bundle` definition
- [x] 1.3 Update schema `$id` / description to reflect changes
- [x] 1.4 Update `data-model.yml` test fixtures — replace `composition: unstructured` with `view_modes` + `template` keys

## 2. Config: entity_mapping.templates

- [x] 2.1 Add `entity_mapping.templates` to config schema / loader — map of template name → `{ description: string }`
- [x] 2.2 Remove `extensions` from config schema / loader and `DESIGNBOOK_EXTENSIONS` env var export
- [x] 2.3 Update `designbook-configuration` SKILL.md — document `entity_mapping.templates`, remove `extensions` documentation
- [x] 2.4 Update `designbook.config.yml` in test integration — add `entity_mapping.templates`, remove `extensions`

## 3. Skill: designbook-scenes — map-entity

- [x] 3.1 Update `tasks/map-entity.md` — remove routing logic, add: read `template` and `settings` from bundle's `view_modes`, load matching rule (`when: stages: [map-entity], template: {name}`), pass settings as context
- [x] 3.2 Update `tasks/collect-entities.md` — remove routing decision (compose-entity vs map-entity), keep entity collection; add warning if template has no matching rule
- [x] 3.3 Delete `tasks/compose-entity.md`
- [x] 3.4 Remove `compose-entity` from `stages:` in any workflow frontmatter that references it
- [x] 3.5 Update `SKILL.md` — remove compose-entity/map-entity routing table, document rule-based template approach

## 4. Skill: Template rules

- [x] 4.1 Create `designbook-scenes/rules/field-map.md` — `when: stages: [map-entity], template: field-map`; instructions for structured field-based JSONata mapping; document supported settings
- [x] 4.2 Create `designbook-scenes/rules/view-entity.md` — `when: stages: [map-entity], template: view-entity`; instructions for view entity JSONata (no record input, inline entity refs)
- [x] 4.3 Rewrite `designbook-scenes-drupal/rules/compose-layout-builder.md` → `layout-builder.md` — `when: stages: [map-entity], template: layout-builder`; move content from compose-layout-builder rule
- [x] 4.4 Rewrite `designbook-scenes-drupal/rules/compose-canvas.md` → `canvas.md` — `when: stages: [map-entity], template: canvas`; move content from compose-canvas rule
- [x] 4.5 Delete `rules/compose-layout-builder.md` and `rules/compose-canvas.md` from `designbook-scenes-drupal`
- [x] 4.6 Delete `rules/compose-view-entity.md` from `designbook-scenes`

## 5. Skill: designbook-data-model — dialog update

- [x] 5.1 Update `tasks/create-data-model.md` — guide authors to declare `view_modes` with `template` per view mode during dialog; remove `composition` guidance; read available templates from `entity_mapping.templates` in config

## 6. Test integration fixtures

- [x] 6.1 Update `test-integration-drupal/designbook/data-model.yml` — replace `composition` with `view_modes` + templates
- [x] 6.2 Update `test-integration-drupal/designbook.config.yml` — add `entity_mapping.templates`, remove `extensions`
