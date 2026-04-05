## ADDED Requirements

### Requirement: Promptfoo consumes case files
Promptfoo configs SHALL reference case files from `fixtures/<suite>/cases/`. The promptfoo provider or setup script SHALL read the case YAML and set up the workspace accordingly.

#### Scenario: Promptfoo eval from case file
- **WHEN** promptfoo evaluates with a config referencing `fixtures/drupal-petshop/cases/design-screen.yaml`
- **THEN** the workspace SHALL be set up using the same `setup-test.sh` script
- **THEN** the `prompt` field SHALL be used as the model prompt
- **THEN** the `assert` field SHALL be evaluated against the output

### Requirement: Shared setup script
Both the `debo-test` skill and promptfoo SHALL use the same `scripts/setup-test.sh` for workspace creation. There SHALL be one code path for workspace setup.

#### Scenario: Identical workspace from both paths
- **WHEN** `setup-test.sh drupal-stitch design-screen` is run manually
- **WHEN** promptfoo runs `setup-test.sh drupal-stitch design-screen --into promptfoo/workspaces/x`
- **THEN** both workspaces SHALL contain identical file content

### Requirement: Migration of existing promptfoo fixtures
Existing fixtures in `promptfoo/fixtures/` SHALL be migrated to `fixtures/drupal-petshop/`. Existing promptfoo configs SHALL be updated to reference the new structure.

#### Scenario: PetMatch fixtures migration
- **WHEN** migration is complete
- **THEN** `promptfoo/fixtures/_shared/` content SHALL exist as individual fixture layers under `fixtures/drupal-petshop/`
- **THEN** per-workflow fixtures (e.g., `promptfoo/fixtures/debo-design-component/`) SHALL be merged into the case files
- **THEN** existing promptfoo configs SHALL reference `fixtures/drupal-petshop/cases/` for workspace setup
