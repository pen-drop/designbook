#!/usr/bin/env bash
# Clean all promptfoo workspace output directories
# Usage: ./promptfoo/scripts/clean.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACES_DIR="$(dirname "$SCRIPT_DIR")/workspaces"

if [ -d "$WORKSPACES_DIR" ]; then
  rm -rf "$WORKSPACES_DIR"
  echo "✓ Removed $WORKSPACES_DIR"
else
  echo "✓ No workspaces to clean"
fi
