## 1. config.ts — new key parsing

- [x] 1.1 Parse `workspace` key → resolve absolute, default to config dir → `config.root` (= `DESIGNBOOK_WORKSPACE`)
- [x] 1.2 Parse `designbook.home` → resolve relative to workspace, default to workspace → expose as `DESIGNBOOK_HOME`
- [x] 1.3 Parse `designbook.data` → resolve as `home/<data>`, default to `home/designbook` → expose as `DESIGNBOOK_DATA`; keep `config.dist` pointing to same value
- [x] 1.4 Parse `designbook.url` → expose as `DESIGNBOOK_URL`
- [x] 1.5 Parse `designbook.cmd` → expose as `DESIGNBOOK_CMD`
- [x] 1.6 Parse `dirs.*` keys → resolve each relative to workspace → expose as `DESIGNBOOK_DIRS_<KEY>`
- [x] 1.7 Remove old key parsing: `storybook_root`, `storybook_url`, `storybook_cmd`, `outputs.*`, `dist`
- [x] 1.8 Remove `DESIGNBOOK_ROOT` export from `config` CLI command (cli.ts:101); emit `DESIGNBOOK_WORKSPACE`, `DESIGNBOOK_HOME`, `DESIGNBOOK_DATA`, `DESIGNBOOK_DIRS_*` instead

## 2. cli.ts — worktree path + storybook cwd + preflight

- [x] 2.1 Change worktree path default: `DESIGNBOOK_WORKSPACES ?? resolve(config.dist, 'workspaces')`
- [x] 2.2 `storybook start` cwd: use `DESIGNBOOK_HOME` (`config['DESIGNBOOK_HOME']`) instead of `storybook_root`
- [x] 2.3 `storybook start`: read cmd from `DESIGNBOOK_CMD` instead of `storybook_cmd`
- [x] 2.4 `storybook start`: read url from `DESIGNBOOK_URL` instead of `storybook_url` (screenshot.ts:193 also)
- [x] 2.5 `workflow plan` preflight: use `DESIGNBOOK_WORKSPACE` instead of `outputs.root` (cli.ts:373–377)
- [x] 2.6 `storybook diff` (`themePath`): use `DESIGNBOOK_HOME` instead of `outputs.root` (cli.ts:135)

## 3. workflow-resolve.ts — single-var worktree remap

- [x] 3.1 `buildEnvMap`: emit `DESIGNBOOK_WORKSPACE`, `DESIGNBOOK_HOME`, `DESIGNBOOK_DATA` from config; expose `dirs.*` as `DESIGNBOOK_DIRS_*`; remove `DESIGNBOOK_OUTPUTS_*` / `DESIGNBOOK_ROOT` / `DESIGNBOOK_DIST`
- [x] 3.2 `buildWorktreeEnvMap`: compute relative paths of all `DESIGNBOOK_DIRS_*` from workspace, re-resolve against worktree path; re-resolve `DESIGNBOOK_HOME` and `DESIGNBOOK_DATA` the same way
- [x] 3.3 Update `WorkflowPlan.root` / `WorkflowFile.root` JSDoc: `DESIGNBOOK_ROOT` → `DESIGNBOOK_HOME` (workflow.ts:68, workflow-types.ts:67)
- [x] 3.4 Update `workflow.ts:650` comment: `DESIGNBOOK_ROOT` → `DESIGNBOOK_HOME`

## 4. preset.ts — configDir fallback

- [x] 4.1 Replace `outputs.root` with `DESIGNBOOK_WORKSPACE` (or `DESIGNBOOK_HOME`) as `.storybook` base in `preset.ts:74`

## 5. Config files

- [x] 5.1 Update root `designbook.config.yml`: replace `storybook_root/url/cmd` with `designbook.home/url/cmd`; replace `outputs.*` with `dirs.*`; add `workspace` key
- [x] 5.2 Update `workspaces/drupal/designbook.config.yml`: same restructuring with workspace-relative paths
- [x] 5.3 Update `scripts/setup-workspace.sh`: write new config structure in generated workspace

## 6. Tests — update to new vars

- [x] 6.1 `workflow-resolve.test.ts`: replace `outputs.root`/`DESIGNBOOK_OUTPUTS_*`/`DESIGNBOOK_ROOT`/`DESIGNBOOK_DIST` fixtures with `DESIGNBOOK_WORKSPACE`/`DESIGNBOOK_DIRS_*`/`DESIGNBOOK_HOME`/`DESIGNBOOK_DATA`
- [x] 6.2 Add `loadConfig` unit tests: workspace, designbook.home, designbook.data, dirs.* (covered by updated baseConfig fixture + buildEnvMap tests)
- [x] 6.3 Add `buildWorktreeEnvMap` test: remaps only via workspace swap; all dirs follow

## 7. Skill task files — env var rename

- [x] 7.1 `DESIGNBOOK_ROOT` → `DESIGNBOOK_HOME` (13 occurrences)
- [x] 7.2 `DESIGNBOOK_DIST` → `DESIGNBOOK_DATA` (skill files referencing dist)
- [x] 7.3 `DESIGNBOOK_OUTPUTS_CONFIG` → `DESIGNBOOK_DIRS_CONFIG` (106 occurrences)
- [x] 7.4 `DESIGNBOOK_OUTPUTS_ROOT` → `DESIGNBOOK_DIRS_ROOT` (11 occurrences)
- [x] 7.5 `DESIGNBOOK_OUTPUTS_COMPONENTS` → `DESIGNBOOK_DIRS_COMPONENTS` (9 occurrences)
- [x] 7.6 `DESIGNBOOK_OUTPUTS_CSS` → `DESIGNBOOK_DIRS_CSS` (1 occurrence)
- [x] 7.7 Verify no remaining `DESIGNBOOK_OUTPUTS_*`, `DESIGNBOOK_ROOT`, `DESIGNBOOK_DIST` references in skill files or addon source
