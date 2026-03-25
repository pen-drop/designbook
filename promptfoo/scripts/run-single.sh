#!/usr/bin/env bash
# Run a single promptfoo test by label.
#
# Usage: ./promptfoo/scripts/run-single.sh <label> [extra args...]
# Example: ./promptfoo/scripts/run-single.sh data-model-canvas
#          ./promptfoo/scripts/run-single.sh data-model-canvas --no-cache
#
# List available labels:
#   ./promptfoo/scripts/run-single.sh --list

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPTFOO_DIR="$(dirname "$SCRIPT_DIR")"
CONFIGS_DIR="$PROMPTFOO_DIR/configs"

if [ "${1:-}" = "--list" ] || [ -z "${1:-}" ]; then
  echo "Available tests:"
  for f in "$CONFIGS_DIR"/*.yaml; do
    label=$(basename "$f" .yaml)
    [ "$label" = "chain" ] || [ "$label" = "base" ] && continue
    echo "  ./promptfoo/scripts/run-single.sh $label"
  done
  exit 0
fi

LABEL="$1"
shift
CONFIG="$CONFIGS_DIR/$LABEL.yaml"

if [ "$LABEL" = "chain" ]; then
  echo "Error: Use run-chain.sh for chain tests."
  exit 1
fi

if [ ! -f "$CONFIG" ]; then
  echo "Error: No config found for '$LABEL'"
  echo "Run './promptfoo/scripts/run-single.sh --list' to see available tests."
  exit 1
fi

# Derive workspace id (debo-<label> convention)
WORKSPACE_ID="debo-$LABEL"
WORKSPACE_DIR="$PROMPTFOO_DIR/workspaces/$WORKSPACE_ID"

# Setup workspace if missing or stale — clean and recreate from fixtures
if [ -d "$WORKSPACE_DIR" ]; then
  echo "Cleaning workspace $WORKSPACE_ID..."
    rm -rf "$WORKSPACE_DIR"

fi
"$SCRIPT_DIR/setup-workspace.sh" "$WORKSPACE_DIR" "$WORKSPACE_ID"
BASE_CONFIG="$CONFIGS_DIR/base.yaml"
npx promptfoo eval -c "$BASE_CONFIG" -c "$CONFIG" "$@"
