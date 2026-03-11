## Why

Validation logic is scattered across skill scripts (`.cjs` files, inline `npx ajv-cli` calls) with fragile YAML parser fallbacks and inconsistent invocation patterns. The addon already owns config loading and has a CLI (`commander`) — validation belongs there too, giving skills a single reliable `designbook validate <type>` command.

## What Changes

- Add `designbook validate` subcommands to the addon CLI: `data`, `tokens`, `component`, `data-model`
- Bundle JSON/YAML schemas inside the addon package
- Add unit tests for each validator
- Simplify skill docs to call `designbook validate ...` instead of inline scripts
- Remove `validate-sample-data.cjs` from skill scripts
- Remove inline `npx ajv-cli` / `npx js-yaml` validation commands from skill docs

## Capabilities

### New Capabilities
- `addon-cli-validation`: Unified validation subcommands in the Designbook addon CLI with schema bundling and test coverage

### Modified Capabilities
_(none — this is a new capability; existing skill docs will be updated in tasks but no spec-level behavior changes)_

## Impact

- **Code**: `packages/storybook-addon-designbook/src/cli.ts` (new validate commands), new `src/validators/` directory
- **Dependencies**: `ajv` added to addon dependencies (replaces ad-hoc `npx ajv-cli` usage)
- **Skills**: `designbook-sample-data`, `designbook-components-sdc`, `designbook-tokens`, `designbook-data-model` skill docs updated to use CLI
- **Removed**: `.agent/skills/designbook-sample-data/scripts/validate-sample-data.cjs`
