# ensure-sample-data Specification

## Purpose
Defines requirements for the `sample-data` stage in `debo-design-screen` and the standalone `debo-sample-data` workflow that generate sample data records for a section. The `create-sample-data` step is idempotent: it checks existing records and only appends what is missing.

## Requirements

### Requirement: sample-data stage runs within design-screen after component and before entity-mapping
The `debo-design-screen` workflow SHALL include a `sample-data` stage with a `create-sample-data` step. This stage MUST execute after the `component` stage and before the `entity-mapping` stage. The standalone `debo-sample-data` workflow SHALL provide the same `create-sample-data` step with an intake stage for independent use.

#### Scenario: stage runs when data.yml is missing
- **WHEN** the `sample-data` stage runs and `sections/[section-id]/data.yml` does not exist
- **THEN** the step SHALL generate a complete `data.yml` for all entity types identified from `data-model.yml`

#### Scenario: stage runs when data.yml exists but is incomplete
- **WHEN** `sections/[section-id]/data.yml` exists but has fewer records than required
- **THEN** the step SHALL append only the missing records without modifying existing ones

#### Scenario: stage skips when data is sufficient
- **WHEN** all entity types have at least the required number of records
- **THEN** the step SHALL complete without writing any files

### Requirement: record count derives from view mode and template
The number of content records generated per bundle SHALL depend on the view mode template configuration in `data-model.yml`.

#### Scenario: non-full view mode generates 6 records
- **WHEN** a bundle has a non-full view mode (listing, teaser, card, etc.)
- **THEN** `required_count` SHALL be 6

#### Scenario: full view mode with layout-builder or canvas template preserves existing and ensures minimum 3
- **WHEN** a bundle has `view_modes.full.template: layout-builder` or `canvas`
- **THEN** `required_count` SHALL be `max(existing_count, 3)`

#### Scenario: full view mode with other templates generates 1 record
- **WHEN** a bundle has a full view mode with a template other than layout-builder or canvas (e.g. `field-map`)
- **THEN** `required_count` SHALL be 1

#### Scenario: config entity generates 1 record
- **WHEN** a bundle is under `config:` in data-model.yml
- **THEN** `required_count` SHALL be 1 unless the bundle already has records

### Requirement: content and config sections mirror data-model.yml structure
The generated `data.yml` MUST use `content:` and `config:` as top-level section keys matching `data-model.yml`. Entity types SHALL be nested under their section. Entity types SHALL NOT appear as root-level keys.

#### Scenario: content entity placed under content section
- **WHEN** `data-model.yml` defines `content.node.article`
- **THEN** generated records SHALL appear under `content.node.article` in `data.yml`

#### Scenario: config entity placed under config section
- **WHEN** `data-model.yml` defines `config.view.docs_list`
- **THEN** generated records SHALL appear under `config.view.docs_list` in `data.yml`

### Requirement: existing records are never overwritten
The `create-sample-data` step SHALL only append new records. Existing records in `data.yml` SHALL remain unchanged.

#### Scenario: partial data exists
- **WHEN** `node.article` has 2 records and 4 more are needed
- **THEN** new records SHALL be appended with ids continuing from the highest existing id

### Requirement: purpose landing-page bundles skipped when entities list excludes them
When `entities` is provided (from `plan-entities`) and a bundle declares `purpose: landing-page` in `data-model.yml` but is NOT present in the `entities` list, the `create-sample-data` step SHALL skip it entirely.

#### Scenario: landing-page bundle not in entities list
- **WHEN** a bundle has `purpose: landing-page` in data-model.yml
- **AND** `entities` is provided and does not include that bundle
- **THEN** no records SHALL be generated for that bundle
