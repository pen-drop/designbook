#!/usr/bin/env bash
# Setup a promptfoo workspace for a test run.
# Copies shared fixtures + per-workflow fixtures into a workspace directory.
#
# Usage: ./promptfoo/scripts/setup-workspace.sh <workspace-dir> [workflow-id]
# Example: ./promptfoo/scripts/setup-workspace.sh promptfoo/workspaces/product-vision debo-product-vision

set -euo pipefail

WORKSPACE_DIR="$1"
WORKFLOW_ID="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPTFOO_DIR="$(dirname "$SCRIPT_DIR")"
FIXTURES_DIR="$PROMPTFOO_DIR/fixtures"

# Create workspace
mkdir -p "$WORKSPACE_DIR"
# Copy workflow-specific fixtures (override shared)
if [ -n "$WORKFLOW_ID" ] && [ -d "$FIXTURES_DIR/$WORKFLOW_ID" ]; then
  cp -r "$FIXTURES_DIR/$WORKFLOW_ID/." "$WORKSPACE_DIR/"
fi
echo "✓ Workspace ready at $WORKSPACE_DIR"
