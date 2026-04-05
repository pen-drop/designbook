## ADDED Requirements

### Requirement: Fixture directory structure
The system SHALL store test fixtures at `fixtures/` in the repository root. Each test suite SHALL be a top-level directory named `<integration>-<project>` (e.g., `drupal-stitch`, `drupal-petshop`).

#### Scenario: Suite directory exists
- **WHEN** a test suite `drupal-stitch` is created
- **THEN** a directory `fixtures/drupal-stitch/` SHALL exist at the repo root

### Requirement: Suite base config
Each suite directory SHALL contain a `designbook.config.yml` at its root. This config is copied into the workspace before any fixture layers.

#### Scenario: Base config is applied first
- **WHEN** a workspace is set up for suite `drupal-stitch`
- **THEN** `fixtures/drupal-stitch/designbook.config.yml` SHALL be copied into the workspace root before any fixture layers are applied

### Requirement: Delta-only fixture layers
Each fixture directory within a suite SHALL contain only the files produced or changed by that workflow step. Files SHALL preserve their workspace-relative path structure.

#### Scenario: Vision fixture contains only vision artifacts
- **WHEN** a `vision` fixture exists in `drupal-stitch`
- **THEN** `fixtures/drupal-stitch/vision/` SHALL contain only files produced by the vision workflow (e.g., `designbook/vision.md`)
- **THEN** it SHALL NOT contain files from other workflow steps

#### Scenario: Path structure is preserved
- **WHEN** a workflow produces `designbook/design-system/design-tokens.yml`
- **THEN** the fixture SHALL store it at `fixtures/<suite>/tokens/designbook/design-system/design-tokens.yml`

### Requirement: Alternative fixture variants
A suite MAY contain multiple fixture directories for the same workflow step with different content (e.g., `data-model` and `data-model-canvas`). Case files select which variant to use.

#### Scenario: Two data-model variants
- **WHEN** suite `drupal-stitch` has both `data-model/` and `data-model-canvas/` fixture directories
- **THEN** a case file MAY reference either `data-model` or `data-model-canvas` in its fixtures list

### Requirement: Snapshot from git diff
The system SHALL support creating fixture layers by capturing the git diff of a workspace after a workflow run. New and modified files SHALL be copied to the fixture directory preserving path structure.

#### Scenario: Snapshot after workflow
- **WHEN** a workflow completes in a workspace with a "base" commit
- **THEN** `git diff --name-only` and `git ls-files --others --exclude-standard` SHALL identify changed/new files
- **THEN** those files SHALL be copyable to `fixtures/<suite>/<fixture-name>/` preserving their workspace-relative paths
