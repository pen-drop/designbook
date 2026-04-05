#!/usr/bin/env bash
# Clean and prepare promptfoo workspace directories.
# Each test gets its own workspace seeded from fixtures via setup-test.sh.
# Usage: ./promptfoo/scripts/clean.sh [suite]
#   suite   Optional suite name (default: drupal-petshop)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SUITE="${1:-drupal-petshop}"
WORKSPACES_DIR="$REPO_ROOT/promptfoo/workspaces"
FIXTURES_DIR="$REPO_ROOT/fixtures/$SUITE"
SETUP_SCRIPT="$REPO_ROOT/scripts/setup-test.sh"

if [[ ! -d "$FIXTURES_DIR" ]]; then
  echo "Error: Suite '$SUITE' not found at $FIXTURES_DIR" >&2
  exit 1
fi

# 1. Remove old workspaces
if [ -d "$WORKSPACES_DIR" ]; then
  rm -rf "$WORKSPACES_DIR"
  echo "✓ Removed old workspaces"
fi
mkdir -p "$WORKSPACES_DIR"

# 2. Create fresh workspaces from case files
count=0
for case_file in "$FIXTURES_DIR"/cases/*.yaml; do
  [[ -f "$case_file" ]] || continue
  case_name=$(basename "$case_file" .yaml)
  workspace="$WORKSPACES_DIR/debo-$case_name"
  "$SETUP_SCRIPT" "$SUITE" "$case_name" --into "$workspace" > /dev/null
  echo "✓ Created workspace: debo-$case_name"
  count=$((count + 1))
done

echo "✓ All workspaces ready ($count total)"
