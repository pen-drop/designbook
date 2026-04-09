## Why

The current `designbook.config.yml` uses a flat, inconsistent structure: `outputs.*` paths are absolute and redundant with each other, `storybook_root/url/cmd` use underscore flat-keys instead of nested YAML, and there is no single canonical "project root" variable. This makes worktree remapping fragile (multiple vars to update) and the config hard to read. A layered config model with clear separation between workspace, home, data, and per-type output dirs fixes this.

## What Changes

- **BREAKING** Replace `outputs.root` with top-level `workspace` key — the git project root; defaults to the directory containing `designbook.config.yml`
- **BREAKING** Replace `storybook_root`, `storybook_url`, `storybook_cmd` flat keys with nested `designbook.home`, `designbook.url`, `designbook.cmd`
- **BREAKING** Replace `dist` / `config` top-level key with `designbook.data` (relative to `designbook.home`), exposed as `DESIGNBOOK_DATA`
- **BREAKING** Rename `DESIGNBOOK_ROOT` → `DESIGNBOOK_HOME`, introduce `DESIGNBOOK_WORKSPACE` and `DESIGNBOOK_DATA`
- **BREAKING** Replace `outputs.components`, `outputs.css`, `outputs.config` (absolute paths) with `dirs.*` — short directory names relative to `workspace`
- `dirs.*` values are plain strings (directory paths only, no nested objects)
- `css.app` remains under `css:` section (it is a file path, not a directory)
- `component.namespace` remains under `component:` section
- Worktree remapping becomes a single variable swap: `DESIGNBOOK_WORKSPACE` → worktree path; all `DESIGNBOOK_DIRS_*` follow automatically
- Default workspace path for worktrees: `DESIGNBOOK_DATA/workspaces/<workflow-name>`
- All `.agents/skills/` task files updated to use new env vars — no backwards-compat aliases

## Capabilities

### New Capabilities

- `config-layers`: Layered config model — `workspace`, `designbook.home/data/url/cmd`, `dirs.*` — and their corresponding env vars (`DESIGNBOOK_WORKSPACE`, `DESIGNBOOK_HOME`, `DESIGNBOOK_DATA`, `DESIGNBOOK_DIRS_*`)

### Modified Capabilities

- `designbook-configuration`: Config keys and env vars are changing — `dist`→`designbook.data`, `storybook_root`→`designbook.home`, `outputs.*`→`dirs.*`
- `workflow-plan-resolution`: Worktree env remapping uses `DESIGNBOOK_WORKSPACE` as single swap point instead of multiple `outputs.*` vars

## Impact

- `src/config.ts` — new key parsing and resolution logic
- `src/cli.ts` — env var names, worktree path default, `storybook start` cwd
- `src/workflow-resolve.ts` — `buildWorktreeEnvMap`, `buildEnvMap`
- `designbook.config.yml` (root + workspace)
- `scripts/setup-workspace.sh`
- All `.agents/skills/` task files that reference `DESIGNBOOK_OUTPUTS_*`, `DESIGNBOOK_ROOT`, `DESIGNBOOK_DIST`
