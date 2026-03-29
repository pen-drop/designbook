#!/usr/bin/env bash
# Setup a local workspace from the test-integration-drupal template.
# The workspace is a standalone git repo in workspaces/<name>/ with adjusted config paths.
#
# Usage: ./scripts/setup-workspace.sh [name]
#   name  Workspace name (default: drupal)
#
# The workspace is gitignored — run this script once to set it up locally.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_NAME="${1:-drupal}"
WORKSPACE_DIR="$REPO_ROOT/workspaces/$WORKSPACE_NAME"
SOURCE_DIR="$REPO_ROOT/packages/integrations/test-integration-drupal"

echo "Setting up workspace: $WORKSPACE_DIR"

if [ -d "$WORKSPACE_DIR/.git" ]; then
  echo "Workspace already exists. Remove $WORKSPACE_DIR to recreate."
  exit 1
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

# Symlink .agents and .claude so the CLI and Claude can resolve skills from the workspace
ln -sfn "$REPO_ROOT/.agents" "$WORKSPACE_DIR/.agents"
ln -sfn "$REPO_ROOT/.claude" "$WORKSPACE_DIR/.claude"

# Initialize git repo
cd "$WORKSPACE_DIR"
git init
git config user.email "workspace@designbook.local"
git config user.name "Designbook Workspace"
git add .
git commit -m "init: test-integration-drupal workspace"

# Install dependencies
pnpm install

echo ""
echo "✓ Workspace ready at $WORKSPACE_DIR"
echo ""
echo "To use with the CLI:"
echo "  cd $WORKSPACE_DIR"
echo "  node $REPO_ROOT/packages/storybook-addon-designbook/dist/cli.js <command>"
