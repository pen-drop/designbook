## Why

There is no way to validate that a story renders correctly without a running Storybook dev server. The current `validate component` and `validate scene` CLI commands only check YAML structure and file references — they cannot catch rendering errors (missing Twig variables, broken slot composition, invalid props). This means errors are only discovered when manually opening the story in a browser. We need a way to render stories to HTML markup headlessly for validation, testing, and CI.

## What Changes

- Add `@storybook/addon-vitest` as a dependency of `storybook-addon-designbook`
- Configure the Vitest plugin to reuse Storybook's Vite config (including `storybook-addon-sdc`, `vite-plugin-twing-drupal`, and the designbook Vite plugin)
- Expose a `validate story` CLI command that renders a story to HTML and reports errors
- Enable integration projects to run `vitest` against their stories for CI validation

## Capabilities

### New Capabilities

- `story-validation`: Headless story rendering and validation via `@storybook/addon-vitest`. Covers CLI command (`validate story`), Vitest integration, and portable stories setup.

### Modified Capabilities

_None — this is additive. Existing validation commands (`validate component`, `validate scene`, `validate data`, `validate tokens`, `validate data-model`) remain unchanged._

## Impact

- **Dependencies**: `@storybook/addon-vitest` added to `storybook-addon-designbook`
- **Package exports**: New Vitest plugin config export from the addon
- **CLI**: New `validate story` subcommand
- **Integration projects**: Need a `vitest.workspace.ts` or Vitest config referencing the Storybook project
- **CI**: Enables `vitest --project=storybook` in CI pipelines
