#!/usr/bin/env bash
# Setup a local workspace from the test-integration-drupal template.
# Always rebuilds from scratch — removes any existing workspace first.
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
SOURCE_DIR="$REPO_ROOT/packages/integrations/test-integration-drupal"

echo "Setting up workspace: $WORKSPACE_DIR"

if [ -d "$WORKSPACE_DIR" ]; then
  echo "Removing existing workspace..."
  rm -rf "$WORKSPACE_DIR"
fi

mkdir -p "$WORKSPACE_DIR"

# Copy source files, excluding generated/build artifacts
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='storybook-static' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  --exclude='debug-storybook.log' \
  --exclude='tmp' \
  "$SOURCE_DIR/" "$WORKSPACE_DIR/"

# Apply feature-flag overrides into the copied designbook.config.yml.
# Note: this rewrites the YAML (comments are dropped) — only runs when flags
# are passed; a flag-less setup keeps the template config verbatim.
if [ ${#FEATURE_ARGS[@]} -gt 0 ]; then
  CONFIG_FILE="$WORKSPACE_DIR/designbook.config.yml" \
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

# Symlink agent directories so the CLI and every agent (Claude, Cursor, Codex)
# can resolve skills and commands from the workspace. The skills/commands inside
# .claude, .cursor and .codex are themselves relative symlinks into .agents, so
# .agents must also be present alongside them.
ln -sfn "$REPO_ROOT/.claude" "$WORKSPACE_DIR/.claude"
ln -sfn "$REPO_ROOT/.cursor" "$WORKSPACE_DIR/.cursor"
ln -sfn "$REPO_ROOT/.codex" "$WORKSPACE_DIR/.codex"
ln -sfn "$REPO_ROOT/.agents" "$WORKSPACE_DIR/.agents"

# Symlink openspec so changes are always stored at repo root
ln -sfn "$REPO_ROOT/openspec" "$WORKSPACE_DIR/openspec"

# Initialize git repo
cd "$WORKSPACE_DIR"
git init
git config user.email "workspace@designbook.local"
git config user.name "Designbook Workspace"
git add .
git commit -m "init: test-integration-drupal workspace"

rm -r -f node_modules

# Build the local addon so dist/ is current before the workspace install.
# Always build (deterministic beats fast) — tsup is fast and avoids stale-dist
# bugs when new CLI features exist only in source.
echo "Building storybook-addon-designbook..."
(cd "$REPO_ROOT/packages/storybook-addon-designbook" && pnpm run build)

# Install dependencies
pnpm install

# Link the LOCAL addon build into the workspace so that `npx storybook-addon-designbook`
# resolves the repo dist instead of falling back to the registry/cache.
echo "Linking local storybook-addon-designbook..."
pnpm add -D "file:$REPO_ROOT/packages/storybook-addon-designbook"

echo ""
echo "✓ Workspace ready at $WORKSPACE_DIR"
echo ""
echo "To use with the CLI:"
echo "  cd $WORKSPACE_DIR"
echo "  npx storybook-addon-designbook <command>"
echo "  # or directly: node $REPO_ROOT/packages/storybook-addon-designbook/dist/cli.js <command>"
