## 1. Setup

- [x] 1.1 Add `ajv` and `ajv-draft-04` to addon dependencies in `package.json`
- [x] 1.2 Create `src/validators/` directory structure
- [x] 1.3 Copy schemas into `src/validators/schemas/` (metadata.schema.json, data-model.schema.yml, design-tokens.schema.yml)
- [x] 1.4 Update `tsup.config.ts` to copy schema files to `dist/validators/schemas/`

## 2. Validator modules

- [x] 2.1 Create `src/validators/types.ts` — shared `ValidationResult` type (`{ valid, errors, warnings }`)
- [x] 2.2 Create `src/validators/data.ts` — sample data validator (port logic from `validate-sample-data.cjs`)
- [x] 2.3 Create `src/validators/tokens.ts` — design tokens schema validator (ajv draft-07)
- [x] 2.4 Create `src/validators/component.ts` — SDC component schema validator (ajv draft-04)
- [x] 2.5 Create `src/validators/data-model.ts` — data model schema validator (ajv draft-07)
- [x] 2.6 Create `src/validators/index.ts` — barrel export

## 3. CLI integration

- [x] 3.1 Add `validate` command group to `src/cli.ts` with subcommands: `data`, `tokens`, `component`, `data-model`
- [x] 3.2 Wire each subcommand to its validator module, using `loadConfig()` for path resolution
- [x] 3.3 Implement consistent output format (errors → warnings → summary)

## 4. Test fixtures

- [x] 4.1 Create `src/validators/__tests__/fixtures/data/valid/data-model.yml` — node.article with title (required), field_body, field_media (ref→media.image), field_category (ref→taxonomy_term.category)
- [x] 4.2 Create `src/validators/__tests__/fixtures/data/valid/data.yml` — matching records with valid references
- [x] 4.3 Create `src/validators/__tests__/fixtures/data/invalid-entity/data.yml` — entity type `unknown_type` not in data-model
- [x] 4.4 Create `src/validators/__tests__/fixtures/data/invalid-bundle/data.yml` — bundle `nonexistent` under valid entity type
- [x] 4.5 Create `src/validators/__tests__/fixtures/data/warning-field/data.yml` — extra field `field_extra` not in data-model
- [x] 4.6 Create `src/validators/__tests__/fixtures/data/warning-required/data.yml` — record missing required `title`
- [x] 4.7 Create `src/validators/__tests__/fixtures/data/warning-broken-ref/data.yml` — reference to nonexistent record ID
- [x] 4.8 Create `src/validators/__tests__/fixtures/tokens/valid.yml` — W3C tokens with color + fontFamily groups
- [x] 4.9 Create `src/validators/__tests__/fixtures/tokens/invalid-missing-value.yml` — token leaf missing `$value`
- [x] 4.10 Create `src/validators/__tests__/fixtures/tokens/invalid-missing-type.yml` — token leaf missing `$type`
- [x] 4.11 Create `src/validators/__tests__/fixtures/tokens/invalid-unknown-type.yml` — token with `$type: "invalid"`
- [x] 4.12 Create `src/validators/__tests__/fixtures/component/valid.component.yml` — valid SDC component with name, status, props, slots
- [x] 4.13 Create `src/validators/__tests__/fixtures/component/invalid-extra-prop.yml` — schema-violating structure
- [x] 4.14 Create `src/validators/__tests__/fixtures/data-model/valid.yml` — valid with content.node.article
- [x] 4.15 Create `src/validators/__tests__/fixtures/data-model/invalid-missing-content.yml` — missing required `content` key
- [x] 4.16 Create `src/validators/__tests__/fixtures/data-model/invalid-field-no-type.yml` — field missing required `type`

## 5. Test implementation

- [x] 5.1 Create `src/validators/__tests__/data.test.ts` — test valid data, unknown entity (error), unknown bundle (error), unknown field (warning), missing required (warning), broken ref (warning), missing file (error)
- [x] 5.2 Create `src/validators/__tests__/tokens.test.ts` — test valid tokens, missing $value (error), missing $type (error), unknown $type (error)
- [x] 5.3 Create `src/validators/__tests__/component.test.ts` — test valid component, invalid structure (error), missing file (error)
- [x] 5.4 Create `src/validators/__tests__/data-model.test.ts` — test valid model, missing content (error), field without type (error)
- [x] 5.5 Verify all tests pass with `pnpm test`

## 6. Skill doc cleanup

- [x] 6.1 Update `designbook-sample-data/SKILL.md` — replace `node validate-sample-data.cjs` with `designbook validate data`
- [x] 6.2 Update `designbook-components-sdc/resources/component-yml.md` — replace `npx js-yaml | npx ajv-cli@3` with `npx storybook-addon-designbook validate component`
- [x] 6.3 Update `designbook-tokens/SKILL.md` — add `npx storybook-addon-designbook validate tokens` reference
- [x] 6.4 Update `designbook-data-model/SKILL.md` — add `npx storybook-addon-designbook validate data-model` reference
- [x] 6.5 Delete `designbook-sample-data/scripts/validate-sample-data.cjs`
- [x] 6.6 Remove `metadata.schema.json` from `designbook-components-sdc/` (now bundled in addon)
- [x] 6.7 Remove schema files from `designbook-data-model/schema/` and `designbook-tokens/schema/` (now bundled in addon)
