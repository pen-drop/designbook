# ensure-sample-data Specification

## Purpose
Defines requirements for the `ensure-sample-data` stage in `debo-design-screen` that checks and generates missing sample data records before entity mapping begins.

## Requirements

### Requirement: ensure-sample-data stage runs after collect-entities
`debo-design-screen` SHALL include an `ensure-sample-data` stage that executes after `collect-entities` and before `map-entity`. The stage SHALL check existing sample data and generate missing records based on design intent.

#### Scenario: stage runs when data.yml is missing
- **WHEN** `collect-entities` completes and `sections/[section-id]/data.yml` does not exist
- **THEN** the stage generates a complete `data.yml` for all entity types identified by `collect-entities`

#### Scenario: stage runs when data.yml exists but is incomplete
- **WHEN** `sections/[section-id]/data.yml` exists but has fewer records than required
- **THEN** the stage appends only the missing records without modifying existing ones

#### Scenario: stage skips when data is sufficient
- **WHEN** all entity types have at least the required number of records
- **THEN** the stage completes without writing any files

### Requirement: view config entities are generated with items_per_page
When a scene includes a view entity, the `ensure-sample-data` stage SHALL generate or extend `config.view.<bundle>` with `items_per_page` and `sort_field`.

#### Scenario: view config does not exist
- **WHEN** `config.view.<bundle>` has no records in data.yml
- **THEN** a config record is generated with a meaningful `items_per_page` (default: 6) and `sort_field`

#### Scenario: view config exists but lacks items_per_page
- **WHEN** `config.view.<bundle>` exists but `items_per_page` is absent or zero
- **THEN** `items_per_page` is set to the default (6) and the record is updated

### Requirement: content record count derives from view items_per_page
The number of content records generated for a view's target entity type SHALL be at least `items_per_page` from that view's config.

#### Scenario: fewer records than items_per_page
- **WHEN** `config.view.docs_list.items_per_page` is 6 and `content.node.docs_page` has 2 records
- **THEN** 4 additional `node.docs_page` records are generated to reach 6

#### Scenario: non-view listing entity (no view config)
- **WHEN** an entity type is used in a listing view mode but is not backed by a view config entity
- **THEN** the stage generates at least 6 records as default

### Requirement: existing records are never overwritten
The `ensure-sample-data` stage SHALL only append new records. Existing records in `data.yml` SHALL remain unchanged.

#### Scenario: partial data exists
- **WHEN** `node.article` has 2 records and 4 more are needed
- **THEN** new records are appended with ids continuing from the highest existing id
