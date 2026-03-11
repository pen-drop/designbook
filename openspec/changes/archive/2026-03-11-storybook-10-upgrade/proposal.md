## Why

Storybook 10 is the next major release with breaking API changes. The addon (`storybook-addon-designbook`) already tracks the `next` channel, but the integration package (`test-integration-drupal`) is pinned to `^9.1.x`. Upgrading aligns both to Storybook 10 stable, reduces maintenance overhead from version skew, and unlocks new platform features.

## What Changes

- Bump `storybook`, `@storybook/addon-docs`, `@storybook/react-vite`, and related peer deps in `packages/storybook-addon-designbook` from `next` to `^10.0.0`
- Bump `storybook`, `@storybook/html`, `@storybook/html-vite`, `@storybook/addon-docs`, `@storybook/addon-themes`, `@storybook/addon-vitest` in `packages/integrations/test-integration-drupal` from `^9.1.x` to `^10.0.0`
- Migrate any breaking API usages in addon source (decorators, parameters, manager/preview API)
- Update `.storybook/` config files in both packages if required by Storybook 10 migration guide
- Verify build, dev server, and Vitest integration still work after upgrade

## Capabilities

### New Capabilities

- `storybook-10-upgrade`: Upgrade all Storybook dependencies to v10 and resolve breaking changes across addon and integration packages

### Modified Capabilities

- `story-validation`: Storybook 10 may change how story files are indexed and validated — review and update if requirements change

## Impact

- `packages/storybook-addon-designbook/package.json` — peer dep versions
- `packages/integrations/test-integration-drupal/package.json` — dep versions
- `.storybook/` config in both packages
- Addon source code (manager, preview, decorators)
- CI/CD pipeline (pnpm install + build steps)
