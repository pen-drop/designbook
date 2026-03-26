## 1. Schema

- [x] 1.1 Add optional `purpose: string` to bundle definition in `data-model.schema.yml`

## 2. Data Model Rules

- [x] 2.1 Update `designbook-data-model:intake` — prompt for purpose per bundle; present known purpose values from active extension rules as suggestions
- [x] 2.2 Update `layout-builder.md` — add purpose-conditional section: if `purpose: landing-page` → set `view_modes.full.template: layout-builder`, all other view modes → `field-map`
- [x] 2.3 Update `canvas.md` — add purpose-conditional section: if `purpose: landing-page` → set `view_modes.full.template: canvas`, all other view modes → `field-map`

## 3. Sample Data Rules

- [x] 3.1 Update `sample-layout-builder.md` — migrate trigger from `sample_template.template: layout_builder` to bundle `purpose: landing-page` (extensions: layout_builder active)
- [x] 3.2 Update `sample-canvas.md` — migrate trigger from `sample_template.template: canvas` to bundle `purpose: landing-page` (extensions: canvas active)
