## ADDED Requirements

### Requirement: Storybook 10 dependency versions

All Storybook-related dependencies in `packages/storybook-addon-designbook` and `packages/integrations/test-integration-drupal` SHALL reference Storybook 10 (`^10.0.0`) instead of pre-release (`next`) or v9 version ranges.

#### Scenario: Addon package uses Storybook 10

- **WHEN** `packages/storybook-addon-designbook/package.json` is inspected
- **THEN** `storybook`, `@storybook/addon-docs`, and `@storybook/react-vite` all resolve to a `^10.x.x` version (no `next` tags)

#### Scenario: Integration package uses Storybook 10

- **WHEN** `packages/integrations/test-integration-drupal/package.json` is inspected
- **THEN** `storybook`, `@storybook/html`, `@storybook/html-vite`, `@storybook/addon-docs`, `@storybook/addon-themes`, and `@storybook/addon-vitest` all resolve to a `^10.x.x` version

### Requirement: Addon builds successfully on Storybook 10

After upgrading, the `storybook-addon-designbook` package SHALL compile without TypeScript errors or build failures.

#### Scenario: Clean build passes

- **WHEN** `pnpm --filter storybook-addon-designbook build` is run after upgrading deps
- **THEN** the build completes with exit code 0 and no TypeScript errors

#### Scenario: No broken imports

- **WHEN** the built addon is loaded by a Storybook 10 instance
- **THEN** no module-not-found or missing-export errors appear in the browser console

### Requirement: Integration Storybook starts on Storybook 10

The `test-integration-drupal` package SHALL start its Storybook dev server without errors after the upgrade.

#### Scenario: Dev server starts

- **WHEN** `pnpm --filter test-integration-drupal storybook` is run
- **THEN** the dev server starts successfully and stories are visible in the browser

#### Scenario: Story index is populated

- **WHEN** the dev server is running
- **THEN** all `.story.yml` and `.scenes.yml` files are indexed without warnings about unknown story formats

### Requirement: Story validation tests pass on Storybook 10

The Vitest-based story validation integration SHALL continue to function correctly after the upgrade.

#### Scenario: Vitest test run succeeds

- **WHEN** `pnpm --filter test-integration-drupal test` is run
- **THEN** all story validation tests pass with exit code 0

#### Scenario: Rendering errors are still reported

- **WHEN** a story contains a deliberately broken Twig template
- **THEN** the Vitest test fails with a descriptive error message (regression guard)
