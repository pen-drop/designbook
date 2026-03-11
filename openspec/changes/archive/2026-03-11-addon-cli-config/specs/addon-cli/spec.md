## ADDED Requirements

### Requirement: CLI binary entry point
The `storybook-addon-designbook` package SHALL expose a CLI binary named `storybook-addon-designbook` via the `bin` field in `package.json`.

#### Scenario: CLI is invocable via npx
- **WHEN** a user runs `npx storybook-addon-designbook config`
- **THEN** the CLI executes the `config` subcommand and outputs environment variable exports

#### Scenario: CLI with no subcommand shows usage
- **WHEN** a user runs `npx storybook-addon-designbook` with no arguments
- **THEN** the CLI prints available subcommands and exits with code 1

### Requirement: Config subcommand outputs shell exports
The `config` subcommand SHALL load `designbook.config.yml` using the existing `loadConfig()` function and output shell `export` statements to stdout.

#### Scenario: Config values are exported
- **WHEN** a user runs `npx storybook-addon-designbook config`
- **AND** a `designbook.config.yml` exists with `backend: drupal`, `frameworks.component: sdc`, `frameworks.css: daisyui`, `dist: packages/integrations/test-integration-drupal/designbook`
- **THEN** stdout contains lines including `export DESIGNBOOK_BACKEND='drupal'`, `export DESIGNBOOK_FRAMEWORK_COMPONENT='sdc'`, `export DESIGNBOOK_FRAMEWORK_CSS='daisyui'`, `export DESIGNBOOK_DIST='<absolute-path>'`

#### Scenario: SDC provider is derived
- **WHEN** config contains `drupal.theme: packages/integrations/test-integration-drupal`
- **THEN** stdout includes `export DESIGNBOOK_SDC_PROVIDER='test_integration_drupal'` (basename with hyphens converted to underscores)

#### Scenario: Defaults applied when config is missing
- **WHEN** no `designbook.config.yml` exists
- **THEN** stdout includes `export DESIGNBOOK_DIST='<cwd>/designbook'` and `export DESIGNBOOK_TMP='tmp'`

#### Scenario: Output is eval-compatible
- **WHEN** a user runs `eval "$(npx storybook-addon-designbook config)"`
- **THEN** all `DESIGNBOOK_*` environment variables are set in the current shell

### Requirement: Environment variable naming convention
The CLI SHALL convert config keys to environment variables using these rules:
- Prefix: `DESIGNBOOK_`
- Dot-separated keys become underscore-separated (e.g., `drupal.theme` → `DESIGNBOOK_DRUPAL_THEME`)
- The `frameworks` prefix becomes `FRAMEWORK` (singular) (e.g., `frameworks.css` → `DESIGNBOOK_FRAMEWORK_CSS`)
- All parts are uppercased
- Object values are skipped (only leaf values are exported)

#### Scenario: Nested key conversion
- **WHEN** config contains `frameworks: { component: sdc, css: daisyui }`
- **THEN** stdout includes `export DESIGNBOOK_FRAMEWORK_COMPONENT='sdc'` and `export DESIGNBOOK_FRAMEWORK_CSS='daisyui'`

### Requirement: CLI is built as part of the addon build
The CLI entry point SHALL be compiled by tsup as a node-platform ESM entry with a `#!/usr/bin/env node` shebang.

#### Scenario: Build produces executable CLI
- **WHEN** `pnpm run build` is executed in the addon package
- **THEN** `dist/cli.js` exists and starts with `#!/usr/bin/env node`
