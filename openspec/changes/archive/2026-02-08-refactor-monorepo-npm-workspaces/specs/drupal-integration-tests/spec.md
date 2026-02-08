## ADDED Requirements

### Requirement: Drupal Integration Test Package
A dedicated package SHALL exist for running Drupal integration tests, isolated from the core framework-agnostic code.

#### Scenario: Package Existence
- **WHEN** checking the `packages/` directory
- **THEN** `test-integration-drupal` package exists in `packages/integrations/`

#### Scenario: Test Execution
- **WHEN** user runs `npm test` within `packages/integrations/test-integration-drupal`
- **THEN** Drupal-specific integration tests are executed (or placeholders run successfully)

### Requirement: Storybook Integration
The integration package SHALL support running Storybook to test components in the Drupal context.

#### Scenario: Storybook Execution
- **WHEN** user runs `npm run storybook` within `packages/integrations/test-integration-drupal`
- **THEN** Storybook starts successfully and loads the Designbook addon

### Requirement: Dependency Management
Integration test packages SHALL manage their own dependencies without polluting the root or other packages.

#### Scenario: Isolated Dependencies
- **WHEN** installing dependencies for `test-integration-drupal`
- **THEN** Drupal-related packages are installed only for this workspace
