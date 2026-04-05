#!/usr/bin/env bash
# Set up a test workspace from fixtures and a case definition.
# Layers fixture directories in order, initializes git for diff tracking.
#
# Usage: ./scripts/setup-test.sh <suite> <case> [--into <dir>]
#   suite   Fixture suite name (e.g., drupal-petshop, drupal-stitch)
#   case    Case name (e.g., design-screen, vision)
#   --into  Target directory (default: workspaces/<suite>-<case>)
#
# Examples:
#   ./scripts/setup-test.sh drupal-petshop design-screen
#   ./scripts/setup-test.sh drupal-stitch vision --into promptfoo/workspaces/stitch-vision

set -euo pipefail

# --- Resolve repo root (works from worktrees too) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# In a worktree, SCRIPT_DIR/../ is the worktree root, not the main repo.
# The fixtures/ dir lives in the main repo or is symlinked — we use SCRIPT_DIR parent.
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SUITE="${1:-}"
CASE="${2:-}"
TARGET_DIR=""

# Parse remaining args
[[ -n "$SUITE" ]] && shift
[[ -n "$CASE" ]] && shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --into)
      TARGET_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$SUITE" ]]; then
  echo "Usage: setup-test.sh <suite> <case> [--into <dir>]" >&2
  echo "" >&2
  echo "Available suites:" >&2
  for d in "$REPO_ROOT"/fixtures/*/; do
    [[ -d "$d" ]] && echo "  $(basename "$d")" >&2
  done
  exit 1
fi

FIXTURES_DIR="$REPO_ROOT/fixtures/$SUITE"

if [[ ! -d "$FIXTURES_DIR" ]]; then
  echo "Error: Suite '$SUITE' not found at $FIXTURES_DIR" >&2
  exit 1
fi

if [[ -z "$CASE" ]]; then
  echo "Available cases for $SUITE:" >&2
  for f in "$FIXTURES_DIR"/cases/*.yaml; do
    [[ -f "$f" ]] && echo "  $(basename "$f" .yaml)" >&2
  done
  exit 1
fi

CASE_FILE="$FIXTURES_DIR/cases/$CASE.yaml"

if [[ ! -f "$CASE_FILE" ]]; then
  echo "Error: Case '$CASE' not found at $CASE_FILE" >&2
  exit 1
fi

# Default target
if [[ -z "$TARGET_DIR" ]]; then
  TARGET_DIR="$REPO_ROOT/workspaces/${SUITE}-${CASE}"
fi

# Make target absolute
if [[ "$TARGET_DIR" != /* ]]; then
  TARGET_DIR="$REPO_ROOT/$TARGET_DIR"
fi

echo "Setting up test workspace: $TARGET_DIR"
echo "  Suite: $SUITE"
echo "  Case:  $CASE"

# Clean and create target
if [[ -d "$TARGET_DIR" ]]; then
  echo "  Removing existing workspace..."
  rm -rf "$TARGET_DIR"
fi
mkdir -p "$TARGET_DIR"

# 1. Copy suite base config
if [[ -f "$FIXTURES_DIR/designbook.config.yml" ]]; then
  cp "$FIXTURES_DIR/designbook.config.yml" "$TARGET_DIR/"
fi

# 2. Parse fixtures list from case YAML and layer them
# Uses a simple grep+sed approach to avoid yq dependency
FIXTURES=$(sed -n '/^fixtures:/,/^[^ ]/{ /^  - /p; }' "$CASE_FILE" | sed 's/^  - //')

for FIXTURE in $FIXTURES; do
  FIXTURE_DIR="$FIXTURES_DIR/$FIXTURE"
  if [[ ! -d "$FIXTURE_DIR" ]]; then
    echo "  Warning: Fixture '$FIXTURE' not found at $FIXTURE_DIR, skipping" >&2
    continue
  fi
  echo "  Layering fixture: $FIXTURE"
  cp -r "$FIXTURE_DIR/." "$TARGET_DIR/"
done

# 3. Symlink .agents and .claude
ln -sfn "$REPO_ROOT/.claude" "$TARGET_DIR/.claude"
ln -sfn "$REPO_ROOT/.agents" "$TARGET_DIR/.agents"

# 4. Symlink openspec
ln -sfn "$REPO_ROOT/openspec" "$TARGET_DIR/openspec"

# 5. Git init + base commit for diff tracking
cd "$TARGET_DIR"
git init -q
git config user.email "test@designbook.local"
git config user.name "designbook-test"
git add -A
git commit -q -m "base" --allow-empty

echo ""
echo "✓ Workspace ready at $TARGET_DIR"
echo ""

# 6. Print the prompt from the case file
echo "Prompt:"
echo "─────────────────────────────────────"
sed -n '/^prompt:/,/^[a-z]/{/^prompt:/d; /^[a-z]/d; p;}' "$CASE_FILE" | sed 's/^  //'
echo "─────────────────────────────────────"
