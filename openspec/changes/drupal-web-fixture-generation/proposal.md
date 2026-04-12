## Why

The `drupal-web` fixture suite was created to test designbook workflows against a real-world Drupal project (LEANDO — the BIBB vocational training portal) without Stitch/Canvas extensions. All 15 test cases need to be executed, validated, and their outputs saved as fixtures for subsequent dependent cases. Additionally, each workflow run needs a `--research` pass to identify skill/task improvements and generate corresponding specs.

## What Changes

- Execute all 15 drupal-web test cases in dependency order (vision → data-model → design-guideline → tokens → css-generate → sections → design-shell → design-verify-shell → sample-data → design-screen → design-verify-screen)
- Save workflow outputs as fixture subdirectories in `fixtures/drupal-web/`
- Run `--research` after each workflow to capture skill execution diagnostics
- Generate specs from research findings without executing them
- Fix the ContextAction dropdown bug (`stopPropagation` blocking `WithTooltip` trigger)

## Capabilities

### New Capabilities
- `drupal-web-fixtures`: Complete fixture data for all 15 test cases of the drupal-web suite, based on the real LEANDO Drupal data model

### Modified Capabilities
- `context-action-dropdown`: Fix `stopPropagation` placement in ContextAction.jsx that prevented WithTooltip from opening

## Impact

- `fixtures/drupal-web/` — 15 new fixture subdirectories with workflow outputs
- `packages/storybook-addon-designbook/src/components/ui/ContextAction.jsx` — dropdown fix
- Workflow skill files — potential improvements identified via `--research` passes
