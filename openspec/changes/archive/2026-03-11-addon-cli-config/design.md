## Context

The `designbook-configuration` skill uses `.agent/skills/` filesystem paths for config loading (`load-config.cjs`) and env export (`set-env.sh`). The `load-config.cjs` currently tries `require('storybook-addon-designbook/config')` with a fallback to a relative `../../../../packages/` path. The `set-env.sh` sources from `.agent/skills/` paths. When the addon is deployed as an npm package, these `.agent/` paths don't exist.

The addon already has a `./config` export with `loadConfig()` and dual ESM+CJS output. It just needs a CLI entry point.

## Goals / Non-Goals

**Goals:**
- Add a CLI binary to `storybook-addon-designbook` with a `config` subcommand
- The `config` subcommand outputs shell `export` statements that can be `eval`'d
- Update skill references to use `npx storybook-addon-designbook config` instead of `.agent/` paths

**Non-Goals:**
- Adding other CLI subcommands beyond `config` (future work)
- Changing the `loadConfig()` API or config file format
- Removing the `./config` package export (it stays for programmatic use)

## Decisions

### CLI entry point using Commander
Add `src/cli.ts` that uses `commander` for argument parsing and imports `loadConfig` from `./config`. Commander provides structured subcommand handling, built-in help generation, and a clean foundation for adding future subcommands.

**Rationale**: Commander is a lightweight, well-established CLI framework. Using it from the start avoids refactoring later when more subcommands are added.

### Output format for `config` subcommand
Output `export KEY=VALUE` lines, one per config key. The env variable naming follows the existing convention: `DESIGNBOOK_` prefix, dots become `_`, `frameworks` becomes `FRAMEWORK` (singular), uppercase.

Derived values like `DESIGNBOOK_SDC_PROVIDER` are also included in the output.

**Rationale**: Matches existing `set-env.sh` behavior exactly, ensuring drop-in replacement.

### bin field in package.json
Add `"bin": { "storybook-addon-designbook": "./dist/cli.js" }` to package.json. Usage: `npx storybook-addon-designbook config`.

### tsup build config
Add CLI entry as a separate node config with `format: ['esm']` and a shebang banner (`#!/usr/bin/env node`).

## Risks / Trade-offs

- [Node resolution] `npx` requires the package to be installed or fetched. In monorepo dev, it resolves via workspace. In deployed projects, it resolves from `node_modules`. → No mitigation needed, this is standard npm behavior.
- [Shell compatibility] `export` syntax works in bash/zsh. Fish shell uses `set -gx` instead. → Start with bash/zsh `export` format. Fish users can use the Node.js API directly or a wrapper.
