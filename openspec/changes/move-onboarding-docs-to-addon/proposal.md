# Proposal: Move Onboarding Docs to Addon

## Why
The onboarding documentation (`onboarding/*.mdx`) is currently located in the integration test project. Moving it to the addon package ensures it is distributed with the addon, making it available to all consumers of the `storybook-addon-designbook`.

## What Changes
- Move `.storybook/onboarding` and related assets from `packages/integrations/test-integration-drupal` to `packages/storybook-addon-designbook`.
- Configure the addon to expose these documentation stories.
- Update consumers (integration tests) to load documentation from the addon.

## Capabilities

### New Capabilities
- `onboarding-documentation`: The addon provides built-in onboarding and product documentation stories.

### Modified Capabilities
<!-- No modified capabilities -->

## Impact
- **Dependencies**: None.
- **Breaking Changes**: Integration projects relying on local `onboarding` folder will need to update configuration.
