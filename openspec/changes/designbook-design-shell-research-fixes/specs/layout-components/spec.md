## MODIFIED Requirements

### Requirement: Blueprint reference links are valid

All blueprint files (section.md, grid.md, container.md) SHALL contain correct relative links to their reference documentation. The link path MUST be `../resources/<name>-reference.md`, not `../components/resources/<name>-reference.md`.

#### Scenario: Section blueprint link resolves
- **WHEN** the agent reads `designbook-drupal/components/blueprints/section.md`
- **THEN** the markup reference link `../resources/section-reference.md` resolves to an existing file

#### Scenario: Grid blueprint link resolves
- **WHEN** the agent reads `designbook-drupal/components/blueprints/grid.md`
- **THEN** the markup reference link `../resources/grid-reference.md` resolves to an existing file

#### Scenario: Container blueprint link resolves
- **WHEN** the agent reads `designbook-drupal/components/blueprints/container.md`
- **THEN** the markup reference link `../resources/container-reference.md` resolves to an existing file
