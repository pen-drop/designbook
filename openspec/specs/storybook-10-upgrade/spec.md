# Storybook 10 Upgrade Specification

## Purpose
Ensure all packages in the Designbook monorepo use Storybook 10 dependencies and function correctly after the upgrade.

## Requirements

### Requirement: Storybook 10 dependency versions in addon package

All Storybook-related dependencies in `packages/storybook-addon-designbook` SHALL reference Storybook 10 (`^10.0.0`).

#### Scenario: Addon package uses Storybook 10
- **WHEN** `packages/storybook-addon-designbook/package.json` is inspected
- **THEN** `storybook`, `@storybook/addon-docs`, `@storybook/react-vite`, `@storybook/addon-themes`, and `eslint-plugin-storybook` SHALL all resolve to `^10.x.x` versions (no `next` tags)

### Requirement: Storybook 10 dependency versions in integration package

All Storybook-related dependencies in `packages/integrations/test-integration-drupal` SHALL reference Storybook 10 (`^10.0.0`).

#### Scenario: Integration package uses Storybook 10
- **WHEN** `packages/integrations/test-integration-drupal/package.json` is inspected
- **THEN** `storybook`, `@storybook/html`, `@storybook/html-vite`, `@storybook/addon-docs`, and `@storybook/addon-themes` SHALL all resolve to `^10.x.x` versions

#### Scenario: No addon-vitest in integration package
- **WHEN** `packages/integrations/test-integration-drupal/package.json` is inspected
- **THEN** `@storybook/addon-vitest` SHALL NOT be listed as a dependency

### Requirement: Addon builds successfully on Storybook 10

After upgrading, the `storybook-addon-designbook` package SHALL compile without TypeScript errors or build failures.

#### Scenario: Clean build passes
- **WHEN** `pnpm --filter storybook-addon-designbook build` is run after upgrading deps
- **THEN** the build MUST complete with exit code 0 and no TypeScript errors

#### Scenario: No broken imports
- **WHEN** the built addon is loaded by a Storybook 10 instance
- **THEN** no module-not-found or missing-export errors SHALL appear in the browser console

### Requirement: Integration Storybook starts on Storybook 10

The `test-integration-drupal` package SHALL start its Storybook dev server without errors after the upgrade.

#### Scenario: Dev server starts
- **WHEN** `pnpm --filter test-integration-drupal storybook` is run
- **THEN** the dev server MUST start successfully and stories SHALL be visible in the browser

#### Scenario: Story index is populated
- **WHEN** the dev server is running
- **THEN** all `.story.yml` and `.scenes.yml` files SHALL be indexed without warnings about unknown story formats

### Requirement: Integration package has no test script

The `test-integration-drupal` package does not currently include a Vitest-based test script or `@storybook/addon-vitest`.

#### Scenario: No test script present
- **WHEN** `packages/integrations/test-integration-drupal/package.json` is inspected
- **THEN** there SHALL be no `test` script in the `scripts` section
