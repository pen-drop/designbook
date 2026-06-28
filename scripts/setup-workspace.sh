#!/usr/bin/env bash
# Setup a local Drupal-layout workspace for testing design-* integrations.
# Always rebuilds from scratch — removes any existing workspace first.
# Layout: Drupal fixture at workspace root, theme fixture at
#   web/themes/custom/test_integration_drupal (where Storybook/design-* run from).
# ddev is configured (worktree-namespaced project) but NOT started — use
#   ./scripts/start-drupal-workspace.sh <name> when you need Drupal running.
#
# Copies .agents, .claude, .cursor and .codex from the current working directory
# (CWD), so workspaces created from a git worktree reflect that worktree's skill
# state for Claude Code, Cursor and Codex alike.
#
# Usage: ./scripts/setup-workspace.sh [name] [--feature name=value]... [--features a=on,b=off]
#   name             Workspace name (default: drupal)
#   --feature k=v    Set a feature flag in the workspace's designbook.config.yml
#                    (repeatable). value: on/1/true/yes or off/0/false/no.
#   --features a=v,b=v   Comma-separated shorthand for several flags.
#
# Example: ./scripts/setup-workspace.sh ab-test --feature region_properties=off

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIX="$REPO_ROOT/packages/integrations/drupal-fixture"
WT_ID="$(printf '%s' "$REPO_ROOT" | cksum | cut -d' ' -f1)"   # stable per-worktree id
THEME="test_integration_drupal"

WORKSPACE_NAME=""
FEATURE_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --feature=*) FEATURE_ARGS+=("${1#*=}"); shift ;;
    --feature|-f) FEATURE_ARGS+=("${2:?--feature needs name=value}"); shift 2 ;;
    --features=*) IFS=',' read -ra _f <<< "${1#*=}"; FEATURE_ARGS+=("${_f[@]}"); shift ;;
    -*) echo "Unknown option: $1" >&2; exit 1 ;;
    *)
      if [ -z "$WORKSPACE_NAME" ]; then WORKSPACE_NAME="$1"; else
        echo "Unexpected argument: $1" >&2; exit 1
      fi
      shift ;;
  esac
done
WORKSPACE_NAME="${WORKSPACE_NAME:-drupal}"
WORKSPACE_DIR="$REPO_ROOT/workspaces/$WORKSPACE_NAME"
THEME_DIR="$WORKSPACE_DIR/web/themes/custom/$THEME"

echo "Setting up workspace: $WORKSPACE_DIR"

# Verify fixture is committed.
[ -d "$FIX" ] || { echo "Missing $FIX — fixture not committed" >&2; exit 1; }

# Ensure the fixture's gitignored composer tree is materialized (deterministic, once).
"$REPO_ROOT/scripts/prepare-drupal-fixture.sh"

# Clone the committed Drupal fixture into a fresh workspace.
rm -rf "$WORKSPACE_DIR"
mkdir -p "$WORKSPACE_DIR"
rsync -a --exclude='.git' "$FIX/" "$WORKSPACE_DIR/"

# Drop the (separate) fixture theme into the Drupal docroot.
mkdir -p "$THEME_DIR"
rsync -a --exclude='node_modules' --exclude='.git' \
  "$REPO_ROOT/packages/integrations/test-integration-drupal/" \
  "$THEME_DIR/"

# Configure ddev with a worktree-namespaced project name; DO NOT start it.
( cd "$WORKSPACE_DIR" && ddev config --project-name="db-$WT_ID-$WORKSPACE_NAME" --project-type=drupal11 --docroot=web )

# Apply feature-flag overrides into the theme's designbook.config.yml.
# Note: this rewrites the YAML (comments are dropped) — only runs when flags
# are passed; a flag-less setup keeps the template config verbatim.
if [ ${#FEATURE_ARGS[@]} -gt 0 ]; then
  CONFIG_FILE="$THEME_DIR/designbook.config.yml" \
  FEATURE_PAIRS="${FEATURE_ARGS[*]}" \
  NODE_PATH="$REPO_ROOT/node_modules" \
  node -e '
    const fs = require("fs");
    const yaml = require("js-yaml");
    const file = process.env.CONFIG_FILE;
    const cfg = (fs.existsSync(file) ? yaml.load(fs.readFileSync(file, "utf8")) : {}) || {};
    cfg.features = cfg.features || {};
    const truthy = new Set(["on", "1", "true", "yes"]);
    const falsy = new Set(["off", "0", "false", "no"]);
    for (const pair of (process.env.FEATURE_PAIRS || "").split(/\s+/).filter(Boolean)) {
      const i = pair.indexOf("=");
      const k = i === -1 ? pair : pair.slice(0, i);
      const v = (i === -1 ? "true" : pair.slice(i + 1)).toLowerCase();
      if (truthy.has(v)) cfg.features[k] = true;
      else if (falsy.has(v)) cfg.features[k] = false;
      else { console.error(`Invalid feature value in "${pair}" (use on/off)`); process.exit(1); }
    }
    fs.writeFileSync(file, yaml.dump(cfg, { lineWidth: -1 }));
    console.log("Applied feature flags:", JSON.stringify(cfg.features));
  '
fi

# Symlink agent directories into the theme dir so the CLI and every agent
# (Claude, Cursor, Codex) can resolve skills and commands from there.
# The skills/commands inside .claude, .cursor and .codex are themselves relative
# symlinks into .agents, so .agents must also be present alongside them.
ln -sfn "$REPO_ROOT/.claude" "$THEME_DIR/.claude"
ln -sfn "$REPO_ROOT/.cursor" "$THEME_DIR/.cursor"
ln -sfn "$REPO_ROOT/.codex" "$THEME_DIR/.codex"
ln -sfn "$REPO_ROOT/.agents" "$THEME_DIR/.agents"

# Initialize git repo in the theme dir (where Storybook runs from).
cd "$THEME_DIR"
git init
git config user.email "workspace@designbook.local"
git config user.name "Designbook Workspace"
git add .
git commit -m "init: test_integration_drupal workspace"

rm -r -f node_modules

# Build the local addon so dist/ is current before the workspace install.
# Always build (deterministic beats fast) — tsup is fast and avoids stale-dist
# bugs when new CLI features exist only in source.
echo "Building storybook-addon-designbook..."
(cd "$REPO_ROOT/packages/storybook-addon-designbook" && pnpm run build)

# Install dependencies in the theme dir.
# workspaces/* is a pnpm workspace member, so this resolves the whole monorepo.
#   --no-frozen-lockfile: a fresh workspace name is not yet in pnpm-lock.yaml; the
#     lockfile MUST be allowed to update (frozen is the default under CI=true and
#     would abort with ERR_PNPM_OUTDATED_LOCKFILE).
#   --config.confirmModulesPurge=false: a public-hoist-pattern diff in a stale
#     root node_modules otherwise triggers an interactive purge prompt that hangs
#     in a non-TTY script, leaving deps unlinked (e.g. @tailwindcss/vite missing →
#     Storybook fails to boot).
cd "$THEME_DIR"
pnpm install --no-frozen-lockfile --config.confirmModulesPurge=false

# Link the LOCAL addon build into the theme workspace so that
# `npx storybook-addon-designbook` resolves the repo dist instead of falling
# back to the registry/cache.
#
# Use `link:` (symlink), NOT `file:` (hard copy). A `file:` dep is copied into
# node_modules/.pnpm/storybook-addon-designbook@file+.../, so a later
# `pnpm run build` in the package does NOT propagate to the workspace — the
# workspace keeps running the stale copy. That staleness is a silent footgun:
# a fixed-and-rebuilt addon looks "still broken" in the workspace, which sends
# you chasing the wrong cause. `link:` symlinks the package dir instead, so
# every rebuild is picked up immediately (the build at the top of this script
# keeps dist current; the vite watcher already ignores the symlinked tree).
echo "Linking local storybook-addon-designbook..."
pnpm add -D "link:$REPO_ROOT/packages/storybook-addon-designbook"

echo ""
echo "✓ Workspace ready (Drupal layout, ddev NOT started)"
echo ""
echo "  Workspace root : $WORKSPACE_DIR"
echo "  Theme dir      : $THEME_DIR"
echo ""
echo "For Storybook / design-* commands:"
echo "  cd $THEME_DIR"
echo "  npx storybook-addon-designbook <command>"
echo "  # or directly: node $REPO_ROOT/packages/storybook-addon-designbook/dist/cli.js <command>"
echo ""
echo "To boot Drupal for sync/verify:"
echo "  ./scripts/start-drupal-workspace.sh $WORKSPACE_NAME"
