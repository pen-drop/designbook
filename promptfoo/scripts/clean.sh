#!/usr/bin/env bash
# Clean and prepare promptfoo workspace directories
# Each test gets its own workspace seeded from fixtures
# Usage: ./promptfoo/scripts/clean.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPTFOO_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACES_DIR="$PROMPTFOO_DIR/workspaces"
FIXTURES_DIR="$PROMPTFOO_DIR/fixtures"

# 1. Remove old workspaces
if [ -d "$WORKSPACES_DIR" ]; then
  rm -rf "$WORKSPACES_DIR"
  echo "✓ Removed old workspaces"
fi

# 2. Create fresh workspaces from fixtures
mkdir -p "$WORKSPACES_DIR"

for fixture_dir in "$FIXTURES_DIR"/debo-*/; do
  test_name=$(basename "$fixture_dir")
  workspace="$WORKSPACES_DIR/$test_name"
  cp -r "$fixture_dir" "$workspace"
  echo "✓ Created workspace: $test_name"
done

echo "✓ All workspaces ready ($(ls -d "$WORKSPACES_DIR"/debo-* 2>/dev/null | wc -l) total)"
