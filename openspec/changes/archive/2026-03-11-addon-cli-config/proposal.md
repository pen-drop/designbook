## Why

The `designbook-configuration` skill currently references `.agent/skills/` paths for config loading and env export. When the addon is deployed as an npm package, these paths don't exist. The config loading and env export should be self-contained CLI commands in the `storybook-addon-designbook` package.

## What Changes

- Add a CLI entry point to `storybook-addon-designbook` that exposes config utilities as shell commands
- The CLI `config` subcommand outputs shell `export` statements for all config values, replacing `set-env.sh`
- Add a `bin` field to the addon's `package.json` so the CLI is available via `npx storybook-addon-designbook`
- Update `designbook-configuration` skill to reference the CLI instead of `.agent/` paths

## Capabilities

### New Capabilities
- `addon-cli`: CLI entry point for storybook-addon-designbook with a `config` subcommand that outputs shell export statements

### Modified Capabilities
- `designbook-configuration`: Replace `.agent/` path references with CLI-based usage (`npx storybook-addon-designbook config`)

## Impact

- `packages/storybook-addon-designbook/`: new CLI source file, `bin` field in package.json, tsup config update
- `.agent/skills/designbook-configuration/`: SKILL.md updated, `set-env.sh` updated to use CLI, `load-config.cjs` simplified
