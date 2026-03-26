## ADDED Requirements

### Requirement: content: and config: are generation buckets
`data.yml` has two optional top-level keys — `content:` and `config:`. Both use the identical nested structure `entity_type → bundle → [records]`. The generation logic is the same for both; differences between entity types come exclusively from field types and `sample_template` declarations.

#### Scenario: config entity generated with same loop as content
- **WHEN** `data-model.yml` declares `config.view.pet_listing`
- **THEN** `create-sample-data` generates records under `config.view.pet_listing` using the same field generation loop as content entities
- **AND** no special-case branching is used for the `config:` bucket

#### Scenario: missing config section is not an error
- **WHEN** `data-model.yml` has only a `content:` section and no `config:` section
- **THEN** the skill completes successfully with no config records generated
- **AND** no error or warning is emitted about missing config

#### Scenario: missing content section is not an error
- **WHEN** `data-model.yml` has only a `config:` section and no `content:` section
- **THEN** the skill completes successfully with no content records generated

### Requirement: two-pass generation order
The `create-sample-data` stage SHALL generate `content:` entities in a first pass and `config:` entities in a second pass. Config generation may depend on content record indices being known.

#### Scenario: config rows reference content record indices
- **WHEN** `config.view.pet_listing` has a `rows` field with `sample_template: template: views`
- **AND** content entities have been generated in pass 1
- **THEN** the `views` template generates `rows[]` entries with `record: N` indices into the already-generated content bundle
- **AND** `N` is within bounds of the generated record count

#### Scenario: content entities complete before config generation starts
- **WHEN** both `content.node.pet` and `config.view.pet_listing` need records
- **THEN** all `content:` bundle records are written before any `config:` bundle records are generated

### Requirement: _meta is never written
The `create-sample-data` stage SHALL NOT write a `_meta` block to `data.yml`. The top-level keys of a valid `data.yml` are `content:` and/or `config:` only.

#### Scenario: generated data.yml has no _meta key
- **WHEN** the skill generates a new `data.yml`
- **THEN** the file starts with `content:` or `config:` as the first key
- **AND** no `_meta:` key is present at any level of the output

### Requirement: intake reads data-model.yml directly
The `intake` stage SHALL enumerate entities for sample data generation by reading `data-model.yml` directly. It SHALL NOT infer entity needs from scenes files.

#### Scenario: all data-model bundles are candidates
- **WHEN** intake runs and `data-model.yml` declares `content.node.pet`, `content.node.shelter`, and `config.view.pet_listing`
- **THEN** all three bundles are presented as candidates for sample data generation

#### Scenario: bundles without scenes coverage are still included
- **WHEN** `data-model.yml` declares `content.node.article`
- **AND** no current scene references `node.article`
- **THEN** `node.article` is still included in the generation candidates
