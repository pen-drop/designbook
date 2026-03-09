## Why

The `designbook.config.yml` resolution is currently duplicated: `load-config.cjs` (agent-side) walks up the directory tree, while `preset.ts` (addon-side) hardcodes `process.cwd()`. This inconsistency prevents workspace-based testing where each test gets its own config, and makes config resolution fragile for monorepo or nested project setups.

## What Changes

- Create a shared `resolveConfig()` function in the addon package (`packages/storybook-addon-designbook/src/config.ts`) that implements "walk up" directory traversal to find `designbook.config.yml`
- Refactor `preset.ts` to use the shared resolver instead of hardcoded `cwd()` path
- Refactor `load-config.cjs` to delegate to or be replaced by the shared resolver
- Update `set-env.sh` to use the new shared resolver

## Capabilities

### New Capabilities
- `config-walk-up`: Shared config resolution module that finds `designbook.config.yml` by walking up the directory tree from the current working directory. Exported from the addon package for use in both runtime (Storybook) and agent tooling (set-env.sh).

### Modified Capabilities
- `designbook-configuration`: The agent-side configuration loading (`set-env.sh` / `load-config.cjs`) will delegate to the shared addon resolver instead of maintaining its own implementation.

## Impact

- `packages/storybook-addon-designbook/src/preset.ts` — config reading refactored
- `packages/storybook-addon-designbook/src/config.ts` — new shared module
- `.agent/skills/designbook-configuration/scripts/load-config.cjs` — delegates to or replaced by shared resolver
- `.agent/skills/designbook-configuration/scripts/set-env.sh` — updated to use new resolver
- Enables promptfoo workspace isolation (each workspace gets its own `designbook.config.yml`)
