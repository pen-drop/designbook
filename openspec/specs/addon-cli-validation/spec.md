## ADDED Requirements

### Requirement: CLI validate command group

The CLI SHALL expose a `validate` command group under the existing `designbook` binary. Each subcommand validates a specific artifact type against its schema.

#### Scenario: validate with no subcommand
- **WHEN** the user runs `designbook validate` without a subcommand
- **THEN** the CLI SHALL print usage help listing available validation subcommands

### Requirement: Validate sample data

The `designbook validate data <section-id>` command SHALL validate a section's `data.yml` against the project's `data-model.yml`.

The validator SHALL:
- Resolve paths using `loadConfig()` — data-model at `<dist>/data-model.yml`, section data at `<dist>/sections/<section-id>/data.yml`
- Report hard errors (exit 1) for: entity type not in data-model, bundle not in data-model
- Report warnings (exit 0) for: field not in data-model, required field missing, broken references
- Print a summary line with error and warning counts

#### Scenario: valid sample data
- **WHEN** the user runs `designbook validate data orders` and all entities, bundles, and fields match the data model
- **THEN** the CLI SHALL print "All entities, bundles, and fields valid" and exit 0

#### Scenario: unknown entity type
- **WHEN** a data.yml contains an entity type not defined in data-model.yml
- **THEN** the CLI SHALL print a hard error and exit 1

#### Scenario: broken reference
- **WHEN** a reference field points to a record ID that does not exist in the sample data
- **THEN** the CLI SHALL print a warning and exit 0

#### Scenario: missing files
- **WHEN** data-model.yml or data.yml does not exist at the resolved path
- **THEN** the CLI SHALL print an error message and exit 1

### Requirement: Validate design tokens

The `designbook validate tokens` command SHALL validate `<dist>/design-system/design-tokens.yml` against the W3C design tokens schema.

The validator SHALL:
- Resolve the tokens path using `loadConfig()`
- Use JSON Schema draft-07 validation
- Report schema violations as errors (exit 1)

#### Scenario: valid tokens
- **WHEN** the tokens file conforms to the W3C design tokens schema
- **THEN** the CLI SHALL print "Design tokens valid" and exit 0

#### Scenario: invalid token structure
- **WHEN** a token leaf is missing `$value` or `$type`
- **THEN** the CLI SHALL print the validation error and exit 1

### Requirement: Validate component YAML

The `designbook validate component <name>` command SHALL validate a component's `.component.yml` against the Drupal SDC metadata schema.

The validator SHALL:
- Resolve the component path at `<outputs.root>/components/<name>/<name>.component.yml`
- Use JSON Schema draft-04 validation (Drupal SDC requirement)
- Report schema violations as errors (exit 1)

#### Scenario: valid component
- **WHEN** the component YAML conforms to the Drupal SDC metadata schema
- **THEN** the CLI SHALL print "Component <name> valid" and exit 0

#### Scenario: component file not found
- **WHEN** the component directory or YAML file does not exist
- **THEN** the CLI SHALL print an error and exit 1

### Requirement: Validate data model

The `designbook validate data-model` command SHALL validate `<dist>/data-model.yml` against the data model schema.

The validator SHALL:
- Resolve the path using `loadConfig()`
- Use JSON Schema draft-07 validation
- Report schema violations as errors (exit 1)

#### Scenario: valid data model
- **WHEN** the data model conforms to the schema
- **THEN** the CLI SHALL print "Data model valid" and exit 0

#### Scenario: missing required content key
- **WHEN** the data model is missing the required `content` top-level key
- **THEN** the CLI SHALL print the validation error and exit 1

### Requirement: Consistent output format

All validate subcommands SHALL output **newline-delimited JSON** to stdout. Each validation item is one JSON object per line.

Single-item validators output one line:
```json
{ "valid": true, "label": "button", "warnings": [] }
{ "valid": false, "label": "button", "errors": ["/ missing required property 'name'"] }
```

Multi-item validators (`validate story`, `validate data`) output one line per item:
```json
{ "valid": true, "label": "button.default", "html": "<button>Click</button>" }
{ "valid": false, "label": "button.outline", "error": "button.twig:5: Variable 'label' not defined" }
```

Exit code is 0 if all items are valid, 1 if any item is invalid.

#### Scenario: output format — valid result

- **WHEN** validation succeeds with no warnings
- **THEN** the CLI SHALL print `{ "valid": true, "label": "<name>" }` and exit 0

#### Scenario: output format — validation errors

- **WHEN** validation produces errors
- **THEN** the CLI SHALL print `{ "valid": false, "label": "<name>", "errors": [...] }` and exit 1

#### Scenario: output format — story render result

- **WHEN** `validate story` renders a story successfully
- **THEN** the CLI SHALL include `"html"` in the JSON output containing the rendered HTML string

### Requirement: Schema bundling

All validation schemas SHALL be bundled inside the addon package under `src/validators/schemas/`. Skills SHALL NOT own schema files.

#### Scenario: schema availability after build
- **WHEN** the addon is built via `tsup`
- **THEN** schema files SHALL be available in the `dist/` output for runtime use

### Requirement: Test fixtures

Each validator SHALL have dedicated test fixtures under `src/validators/__tests__/fixtures/`. Fixtures SHALL cover valid and invalid variants for each artifact type.

Required fixtures:

**Sample data (`fixtures/data/`):**
- `valid/data-model.yml` — data model with node.article (fields: title, field_body, field_media ref, field_category ref)
- `valid/data.yml` — matching sample data with valid records and references
- `invalid-entity/data.yml` — contains entity type `unknown_type` not in data-model
- `invalid-bundle/data.yml` — contains bundle `nonexistent` under a valid entity type
- `warning-field/data.yml` — contains field `field_extra` not defined in data-model
- `warning-required/data.yml` — missing required field `title` on a record
- `warning-broken-ref/data.yml` — reference field pointing to nonexistent record ID

**Design tokens (`fixtures/tokens/`):**
- `valid.yml` — valid W3C tokens with color and fontFamily groups
- `invalid-missing-value.yml` — token leaf missing `$value`
- `invalid-missing-type.yml` — token leaf missing `$type`
- `invalid-unknown-type.yml` — token leaf with `$type: "invalid"`

**Component YAML (`fixtures/component/`):**
- `valid.component.yml` — valid Drupal SDC component (name, status, props, slots)
- `invalid-extra-prop.yml` — component with schema-violating structure

**Data model (`fixtures/data-model/`):**
- `valid.yml` — valid data model with content.node.article
- `invalid-missing-content.yml` — missing required `content` key
- `invalid-field-no-type.yml` — field definition missing required `type`

#### Scenario: fixtures cover all validator scenarios
- **WHEN** each validator test file runs
- **THEN** it SHALL use fixtures from the `fixtures/` directory and NOT inline test data

#### Scenario: fixture reuse from existing tests
- **WHEN** existing test fixtures at `src/renderer/__tests__/fixtures/` match the needed structure
- **THEN** validators MAY reference or copy them as baseline for valid cases

### Requirement: Unit test coverage

Each validator module SHALL have a corresponding test file at `src/validators/__tests__/<validator>.test.ts`.

Tests SHALL cover:
- Valid input → `{ valid: true, errors: [], warnings: [] }`
- Invalid input → correct error messages in `errors[]`
- Warning cases → correct warning messages in `warnings[]`
- Missing file → error with descriptive message
- Each test SHALL assert on the `ValidationResult` returned by the validator function (not CLI output)

#### Scenario: data tests
- **WHEN** `data.test.ts` runs
- **THEN** it SHALL test: valid data, unknown entity type (error), unknown bundle (error), unknown field (warning), missing required field (warning), broken reference (warning), missing data file (error)

#### Scenario: tokens tests
- **WHEN** `tokens.test.ts` runs
- **THEN** it SHALL test: valid tokens, missing $value (error), missing $type (error), unknown $type (error)

#### Scenario: component tests
- **WHEN** `component.test.ts` runs
- **THEN** it SHALL test: valid component, invalid structure (error), missing file (error)

#### Scenario: data-model tests
- **WHEN** `data-model.test.ts` runs
- **THEN** it SHALL test: valid data model, missing content key (error), field without type (error)

#### Scenario: test execution
- **WHEN** `pnpm test` is run in the addon package
- **THEN** all validator tests SHALL pass

### Requirement: Validate view-mode mappings

The `designbook validate view-mode <name>` command SHALL validate a `.jsonata` view-mode mapping file by executing it against sample entity data and verifying the output is a valid `ComponentNode[]`.

The validator SHALL:
- Resolve the file at `<dist>/view-modes/<name>.jsonata`
- Load matching sample data from `<dist>/sections/**/data.yml` (or `<dist>/data.yml`)
- Execute the JSONata expression against the sample data using the `jsonata` package
- Validate the output shape is an array of `ComponentNode` objects (each has `component: string`, optional `props: object`, optional `slots: object`)
- Print one JSON result line per entity record tested

#### Scenario: Valid view-mode mapping

- **WHEN** user runs `validate view-mode node.article.teaser` and the JSONata expression produces valid `ComponentNode[]` for all sample article records
- **THEN** the CLI SHALL output `{ "valid": true, "label": "node.article.teaser", "recordCount": 3 }` and exit 0

#### Scenario: Invalid ComponentNode output

- **WHEN** the JSONata expression output is missing the required `component` field
- **THEN** the CLI SHALL output `{ "valid": false, "label": "node.article.teaser", "error": "Output[0].component is required" }` and exit 1

#### Scenario: JSONata syntax error

- **WHEN** the `.jsonata` file contains a syntax error
- **THEN** the CLI SHALL output `{ "valid": false, "label": "node.article.teaser", "error": "JSONata parse error: ..." }` and exit 1

#### Scenario: Missing view-mode file

- **WHEN** the specified `.jsonata` file does not exist
- **THEN** the CLI SHALL output `{ "valid": false, "label": "node.article.teaser", "error": "File not found: ..." }` and exit 1
