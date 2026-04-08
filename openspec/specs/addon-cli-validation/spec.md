## Purpose

Defines CLI validation commands for the `designbook` binary. Each subcommand validates a specific artifact type against its schema or sample data.

## Requirements

### Requirement: CLI validate command group

The CLI SHALL expose a `validate` command group. Running `designbook validate` without a subcommand SHALL print usage help.

### Requirement: Validate sample data

`designbook validate data <section-id>` SHALL validate `data.yml` against `data-model.yml`, resolving paths via `loadConfig()`.

- Hard errors (exit 1): entity type not in data-model, bundle not in data-model
- Warnings (exit 0): field not in data-model, required field missing, broken references
- Prints summary line with error/warning counts

#### Scenario: valid sample data
- **WHEN** all entities, bundles, and fields match the data model
- **THEN** print "All entities, bundles, and fields valid" and exit 0

#### Scenario: unknown entity type
- **WHEN** data.yml contains an undefined entity type → hard error, exit 1

#### Scenario: broken reference
- **WHEN** a reference field points to a nonexistent record ID → warning, exit 0

#### Scenario: missing files
- **WHEN** data-model.yml or data.yml does not exist → error, exit 1

### Requirement: Validate design tokens

`designbook validate tokens` SHALL validate `<dist>/design-system/design-tokens.yml` against the W3C design tokens schema (JSON Schema draft-07). Schema violations are errors (exit 1).

#### Scenario: valid tokens
- **WHEN** tokens conform to schema → print "Design tokens valid", exit 0

#### Scenario: invalid token structure
- **WHEN** a token leaf is missing `$value` or `$type` → print error, exit 1

### Requirement: Validate component YAML

`designbook validate component <name>` SHALL validate `<designbook.home>/components/<name>/<name>.component.yml` against the Drupal SDC metadata schema (JSON Schema draft-04). Schema violations are errors (exit 1).

#### Scenario: valid component
- **WHEN** YAML conforms to schema → print "Component <name> valid", exit 0

#### Scenario: component file not found
- **WHEN** component directory or YAML file does not exist → error, exit 1

### Requirement: Validate data model

`designbook validate data-model` SHALL validate `<dist>/data-model.yml` against the data model schema (JSON Schema draft-07). Schema violations are errors (exit 1).

#### Scenario: valid data model
- **WHEN** data model conforms to schema → print "Data model valid", exit 0

#### Scenario: missing required content key
- **WHEN** missing the required `content` top-level key → print error, exit 1

### Requirement: Validate entity-mapping

`designbook validate entity-mapping <name>` SHALL validate a `.jsonata` file by executing it against sample data and verifying output is valid `ComponentNode[]` or `EntityRefNode[]`.

The validator SHALL:
- Resolve file at `<dist>/entity-mapping/<name>.jsonata`, parse `entity_type.bundle.view_mode` from filename
- Load matching sample data from `<dist>/sections/**/data.yml` and `<dist>/data.yml`
- Execute JSONata against each matching record; validate output nodes have `component: string` or `type: 'entity'` (null/undefined allowed for conditional nodes)
- Error (exit 1) for: missing file, JSONata syntax errors, invalid output shape, no sample records

#### Scenario: Valid entity-mapping
- **WHEN** JSONata produces valid output nodes → output `{ "valid": true, "label": "..." }`, exit 0

#### Scenario: Invalid output node
- **WHEN** output missing both `component` and `type: 'entity'` → output `{ "valid": false, ... }`, exit 1

#### Scenario: JSONata syntax error
- **WHEN** `.jsonata` file has syntax error → `{ "valid": false, ... }` with parse error, exit 1

#### Scenario: Missing entity-mapping file
- **WHEN** `.jsonata` file does not exist → `{ "valid": false, ... }` with "File not found", exit 1

#### Scenario: No sample data
- **WHEN** no sample data files exist → `{ "valid": false, ... }` with "No sample data found", exit 1

### Requirement: Consistent output format

All subcommands SHALL output JSON via `printJson()`: `{ valid, label, errors?, warnings? }`. Exit 0 if valid, 1 if invalid.

#### Scenario: valid result
- **WHEN** validation succeeds → `{ "valid": true, "label": "<name>" }`, exit 0

#### Scenario: validation errors
- **WHEN** validation fails → `{ "valid": false, "label": "<name>", "errors": [...] }`, exit 1

### Requirement: Schema bundling

Schemas SHALL be bundled under `src/validators/schemas/`: `metadata.schema.json`, `data-model.schema.yml`, `design-tokens.schema.yml`. After `tsup` build, schemas SHALL be available in `dist/`.

### Requirement: Validation registry

`validation-registry.ts` SHALL map validator keys (`component`, `data-model`, `tokens`, `data`, `entity-mapping`, `scene`) to validator functions. `cmd:` prefixed keys execute shell commands (with `{{ file }}` substitution). `validateByKeys()` runs validators in sequence, returning first failure or last success. Empty keys return auto-pass with `skipped: true`.

#### Scenario: Unknown validator key
- **WHEN** called with unregistered key → return failure listing available keys

#### Scenario: cmd: prefix
- **WHEN** key starts with `cmd:` → execute remaining string as shell command

### Requirement: Test fixtures

Each validator SHALL have fixtures under `src/validators/__tests__/fixtures/`:

| Directory | Fixtures |
|-----------|----------|
| `data/` | `valid/{data-model,data}.yml`, `invalid-entity/`, `invalid-bundle/`, `invalid-config/`, `warning-field/`, `warning-required/`, `warning-broken-ref/` |
| `tokens/` | `valid.yml`, `invalid-missing-value.yml`, `invalid-missing-type.yml`, `invalid-unknown-type.yml` |
| `component/` | `valid.component.yml`, `invalid-extra-prop.yml` |
| `data-model/` | `valid.yml`, `valid-with-list.yml`, `invalid-missing-content.yml`, `invalid-field-no-type.yml`, `invalid-list-no-sources.yml`, `invalid-list-empty-sources.yml` |
| `scene/` | `valid.scenes.yml`, `invalid-yaml.scenes.yml`, `broken-build.scenes.yml`, `unknown-type.scenes.yml`, `unknown-in-slot.scenes.yml`, `element-missing-value.scenes.yml`, `scene-ref-missing-ref.scenes.yml` |

Tests SHALL use fixtures (not inline data).

### Requirement: Unit test coverage

Each validator SHALL have tests at `src/validators/__tests__/<validator>.test.ts` covering: valid input, invalid input with correct errors, warning cases, and missing files. Tests assert on `ValidationResult` (not CLI output).

#### Scenario: test matrix

| Test file | Cases |
|-----------|-------|
| `data.test.ts` | valid, unknown entity (error), unknown bundle (error), unknown field (warning), missing required (warning), broken ref (warning), missing file (error) |
| `tokens.test.ts` | valid, missing $value (error), missing $type (error), unknown $type (error) |
| `component.test.ts` | valid, invalid structure (error), missing file (error) |
| `data-model.test.ts` | valid, valid with lists, missing content (error), field no type (error), list no sources (error), list empty sources (error) |
| `scene.test.ts` | valid (build succeeds), invalid YAML (error), broken build (error), unknown type (error), unknown in slot (error), element missing value (error), scene ref missing ref (error) |

All tests SHALL pass when running `pnpm test`.
