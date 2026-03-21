## 1. Schema — data-model.schema.yml

- [x] 1.1 Add `sample_template` as optional property to `field` definition in `src/validators/schemas/data-model.schema.yml` — object with `template` (string, required) and `settings` (object, additionalProperties: true, optional), `additionalProperties: false`
- [x] 1.2 Copy updated schema to `dist/schemas/data-model.schema.yml` and `dist/schemas/schemas/data-model.schema.yml`

## 2. Core Skill — designbook-sample-data

- [x] 2.1 Update `create-sample-data.md` task: for each field, check `sample_template.template` — if present, load rules matching `when: template: <name>` and `when: field_type: <type>` as fallback; document precedence (explicit `sample_template` > `field_type` rule > plain string)
- [x] 2.2 Update `designbook-sample-data/SKILL.md`: document `sample_template` field key, `settings.hint`, and the `field_type` rule fallback

## 3. Data Model Creation Rule

- [x] 3.1 Create `.agents/skills/designbook-data-model/rules/sample-template-mapping.md` — fires on stages `[debo-data-model:dialog, create-data-model]`; instructs AI to read `sample_data.field_types` from config and set `sample_template.template` on matching fields (do not overwrite existing `sample_template`)

## 4. Drupal Skill — designbook-sample-data-drupal

- [x] 4.1 Create `.agents/skills/designbook-sample-data-drupal/SKILL.md` — describes the skill, lists provided templates, documents when it is loaded (`DESIGNBOOK_BACKEND=drupal`)
- [x] 4.2 Create rule `rules/sample-formatted-text.md` — `when: { stages: [create-sample-data], backend: drupal, template: formatted-text }` and `when: { field_type: formatted_text }` variant; output: `{ value: "<p>...</p>", format: "basic_html" }`; supports `settings.hint`, `settings.format`
- [x] 4.3 Create rule `rules/sample-link.md` — `when: { stages: [create-sample-data], backend: drupal, template: link }` and `field_type: link` variant; output: `{ uri: "https://...", title: "..." }`; supports `settings.hint`
- [x] 4.4 Create rule `rules/sample-image.md` — `when: { stages: [create-sample-data], backend: drupal, template: image }` and `field_type: image` variant; output: `{ uri: "public://filename.jpg", alt: "..." }`; supports `settings.hint`

## 5. Configuration Skill

- [x] 5.1 Update `.agents/skills/designbook-configuration/SKILL.md`: document `sample_data.field_types` config key with example YAML and explanation
