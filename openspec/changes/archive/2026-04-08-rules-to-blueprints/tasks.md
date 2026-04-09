## 1. Entity-type blueprints (designbook-drupal)

- [x] 1.1 Create `designbook-drupal/blueprints/node.md` — `type: entity-type`, `name: node`, `priority: 10`, `when: { backend: drupal, steps: [create-data-model] }`, body from `entity-types/rules/node.md`
- [x] 1.2 Create `designbook-drupal/blueprints/media.md` — same pattern from `entity-types/rules/media.md`
- [x] 1.3 Create `designbook-drupal/blueprints/taxonomy_term.md` — from `entity-types/rules/taxonomy_term.md`
- [x] 1.4 Create `designbook-drupal/blueprints/block_content.md` — with `when.extensions: layout_builder`, from `entity-types/rules/block_content.md`
- [x] 1.5 Create `designbook-drupal/blueprints/canvas_page.md` — with `when.extensions: canvas`, from `entity-types/rules/canvas_page.md`
- [x] 1.6 Create `designbook-drupal/blueprints/view.md` — from `entity-types/rules/view.md`
- [x] 1.7 Delete the 6 old rule files and empty `data-model/entity-types/rules/` directory

## 2. Data-mapping blueprints (designbook-drupal)

- [x] 2.1 Create `designbook-drupal/blueprints/field-map.md` — `type: data-mapping`, `name: field-map`, `priority: 10`, `when: { steps: [map-entity], template: field-map }`, body from `data-mapping/rules/field-map.md`
- [x] 2.2 Create `designbook-drupal/blueprints/canvas.md` — `type: data-mapping`, `name: canvas`, from `data-mapping/rules/canvas.md`
- [x] 2.3 Create `designbook-drupal/blueprints/layout-builder.md` — `type: data-mapping`, `name: layout-builder`, from `data-mapping/rules/layout-builder.md`
- [x] 2.4 Create `designbook-drupal/blueprints/views.md` — `type: data-mapping`, `name: views`, from `data-mapping/rules/views.md`
- [x] 2.5 Delete the 4 old rule files and empty `data-mapping/rules/` directory

## 3. CSS-mapping blueprints (designbook-css-tailwind, designbook-css-daisyui)

- [x] 3.1 Create `designbook-css-tailwind/blueprints/css-mapping.md` — `type: css-mapping`, `name: tailwind`, `priority: 10`, `when: { frameworks.css: tailwind, steps: [generate-jsonata, generate-css] }`, body from `rules/css-mapping.md`
- [x] 3.2 Create `designbook-css-daisyui/blueprints/css-mapping.md` — `type: css-mapping`, `name: daisyui`, same pattern from `rules/css-mapping.md`
- [x] 3.3 Delete old `css-mapping.md` rule files from both skills

## 4. CSS-naming blueprints (designbook-css-tailwind, designbook-css-daisyui)

- [x] 4.1 Create `designbook-css-tailwind/blueprints/css-naming.md` — `type: css-naming`, `name: tailwind`, `priority: 10`, `when: { frameworks.css: tailwind, steps: [create-tokens] }`, body from `rules/tailwind-naming.md`
- [x] 4.2 Create `designbook-css-daisyui/blueprints/css-naming.md` — `type: css-naming`, `name: daisyui`, same pattern from `rules/daisyui-naming.md`
- [x] 4.3 Delete old naming rule files from both skills

## 5. Update consuming tasks

- [x] 5.1 Update `designbook/data-model/tasks/create-data-model.md` — add instruction to read entity-type blueprints from `task.blueprints[]` filtered by `type: entity-type`
- [x] 5.2 Update `designbook/css-generate/tasks/generate-jsonata.md` — read css-mapping from `task.blueprints[]` filtered by `type: css-mapping` instead of "find the css-mapping rule in your resolved rules"
- [x] 5.3 Update token task(s) that consume naming rules — read css-naming from `task.blueprints[]` filtered by `type: css-naming`
- [x] 5.4 Update `map-entity` task (or its intake) — read data-mapping pattern from `task.blueprints[]` filtered by `type: data-mapping`

## 6. Sync spec and verify

- [x] 6.1 Sync delta spec for `drupal-entity-type-schemas`
- [x] 6.2 Run `pnpm check` — no type/lint/test regressions
