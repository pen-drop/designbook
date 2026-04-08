## ADDED Requirements

### Requirement: CLI binary entry point
The package SHALL expose a CLI binary `storybook-addon-designbook` via `bin` in `package.json`.

- `npx storybook-addon-designbook config` executes the config subcommand
- No arguments prints usage and exits with code 1

### Requirement: Config subcommand outputs shell exports
`config` loads `designbook.config.yml` via `loadConfig()` and outputs `export` statements to stdout.

- Exports include `DESIGNBOOK_BACKEND`, `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_FRAMEWORK_CSS`, `DESIGNBOOK_DIST` (absolute path)
- SDC provider derived from `outputs.root` basename (hyphens → underscores): `DESIGNBOOK_SDC_PROVIDER`
- No config file: defaults applied (e.g. `DESIGNBOOK_DIST='<cwd>/designbook'`, `DESIGNBOOK_TMP='tmp'`)
- Output is `eval`-compatible: `eval "$(npx storybook-addon-designbook config)"`

### Requirement: Environment variable naming convention
- Prefix: `DESIGNBOOK_`
- Dot-separated keys → underscore-separated (`outputs.root` → `DESIGNBOOK_OUTPUTS_ROOT`)
- `frameworks` prefix becomes `FRAMEWORK` singular (`frameworks.css` → `DESIGNBOOK_FRAMEWORK_CSS`)
- All parts uppercased; object values skipped (leaf values only)

### Requirement: CLI build
CLI entry point compiled by tsup as node-platform ESM with `#!/usr/bin/env node` shebang. Build produces `dist/cli.js`.

### Requirement: storybook start --force reuses existing port
Without explicit `--port`, `start --force` reuses the running instance's port. Explicit `--port` overrides. No existing instance picks a free port via OS allocation.

### Requirement: storybook restart reuses existing port
Without explicit `--port`, `restart` reuses the running instance's port. Port is captured from PID file BEFORE `stop()` removes it.
