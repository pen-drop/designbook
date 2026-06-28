# Task 4 Report: setup-workspace.sh — unified Drupal layout

## Script changes

**File:** `scripts/setup-workspace.sh`

### Added at top (after REPO_ROOT):
```bash
FIX="$REPO_ROOT/packages/integrations/drupal-fixture"
WT_ID="$(printf '%s' "$REPO_ROOT" | cksum | cut -d' ' -f1)"   # stable per-worktree id
THEME="test_integration_drupal"
```
Also added `THEME_DIR="$WORKSPACE_DIR/web/themes/custom/$THEME"` after WORKSPACE_DIR resolution.

### Replaced body (was: single rsync from test-integration-drupal; now: Drupal layout):
1. Fixture guard: `[ -d "$FIX" ] || exit 1`
2. Materialize composer tree: `"$REPO_ROOT/scripts/prepare-drupal-fixture.sh"`
3. rsync fixture → workspace root (excluding `.git`)
4. `mkdir -p "$THEME_DIR"` + rsync theme → `web/themes/custom/test_integration_drupal/` (excluding `node_modules`, `.git`)
5. `ddev config --project-name="db-$WT_ID-$WORKSPACE_NAME" --project-type=drupal11 --docroot=web` (no `ddev start`)
6. Feature-flag config rewrite now targets `$THEME_DIR/designbook.config.yml`
7. Agent-dir symlinks (`.claude/.cursor/.codex/.agents`) now point into `$THEME_DIR`
8. `git init` + `git add . / git commit` now runs in `$THEME_DIR`
9. `pnpm install` + `pnpm add -D link:...` now runs in `$THEME_DIR`

### Updated final message:
- "Workspace ready (Drupal layout, ddev NOT started)"
- Tells user to `cd web/themes/custom/$THEME` for Storybook/design-*
- Refers to `./scripts/start-drupal-workspace.sh <name>` for booting Drupal

## Verification run output

```
Setting up workspace: .../workspaces/ws1
Fixture already materialized
Configuring a 'drupal11' project named 'db-444788650-ws1' with docroot 'web'...
Configuration complete. You may now run 'ddev start'.
[git init + commit in theme dir — 68 files]
Building storybook-addon-designbook... [success]
pnpm install + pnpm add -D link:... [success]
Workspace ready (Drupal layout, ddev NOT started)
```

### Assertions:
- `ls workspaces/ws1/web/themes/custom/test_integration_drupal/.storybook` → PASS (defs.js main.js preview.js refRenderer.js renderer.js twing-hooks.js)
- `ls workspaces/ws1/.ddev/config.yaml` → PASS
- `ddev list` for `db-444788650-ws1` → status: "stopped" (configured, NOT running) — PASS
- ddev config.yaml values: `name: db-444788650-ws1`, `type: drupal11`, `docroot: web` — PASS

## Cleanup

- `cd workspaces/ws1 && ddev delete -Oy` — project deleted from ddev
- `rm -rf /home/cw/projects/designbook/.claude/worktrees/export/workspaces/ws1` — workspace dir removed

## Concerns

**Minor fix applied during implementation:** The drupal-fixture's `web/themes/` only contains a `README.txt` — there is no `custom/` subdirectory. The `rsync` destination for the theme would fail without `mkdir -p "$THEME_DIR"` first. Added that line before the theme rsync (not in the brief but required for the rsync to work).

**No other concerns.** The script is clean, no backwards-compat code, works for the unified Drupal layout only.

## Fix: pnpm workspace + cleanup

### pnpm-workspace.yaml change

Added pattern `"workspaces/*/web/themes/custom/*"` to `pnpm-workspace.yaml` (repo root). This covers the theme dir `workspaces/<name>/web/themes/custom/test_integration_drupal` where `pnpm install` now runs, ensuring workspace-protocol resolution against the monorepo.

**test-integration-drupal workspace:* deps:** `package.json` has `"storybook-addon-designbook": "workspace:*"` in `devDependencies` — this is the exact dep that requires the new pattern to resolve correctly.

### Comment fix (scripts/setup-workspace.sh)

Replaced stale comment:
```
# workspaces/* is a pnpm workspace member, so this resolves the whole monorepo.
```
With accurate comment:
```
# workspaces/*/web/themes/custom/* is a pnpm workspace member, so this resolves
# workspace:* deps (e.g. storybook-addon-designbook) against the monorepo.
```

### Dead code removed

Removed `rm -r -f node_modules` line that appeared after `git commit`. The theme rsync already excludes `node_modules` (`--exclude='node_modules'`), so there was never a `node_modules` dir to remove at that point — the line was a no-op.

### Redundant cd removed

Removed second `cd "$THEME_DIR"` before `pnpm install`. The first `cd "$THEME_DIR"` at the git-init block already set the working directory; no subshell or directory change occurs between it and `pnpm install`, so the second cd was dead.

### Setup run result

`./scripts/setup-workspace.sh fixcheck` completed without error. Key output:
- `storybook-addon-designbook 0.6.0 <- ../../../../../../packages/storybook-addon-designbook` — workspace:* resolved to monorepo package
- `pnpm install` + `pnpm add -D link:...` — both succeeded (Done in 10.4s / 4.4s)

### Addon symlink check

```
/home/cw/projects/designbook/.claude/worktrees/export/workspaces/fixcheck/web/themes/custom/test_integration_drupal/node_modules/storybook-addon-designbook -> ../../../../../../../packages/storybook-addon-designbook
```
Symlink resolves to the repo package. PASS.

### Cleanup

- `ddev delete -Oy` — `db-444788650-fixcheck` deleted
- `rm -rf workspaces/fixcheck` — workspace directory removed
