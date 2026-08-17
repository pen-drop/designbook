#!/usr/bin/env bash
# Layer fixtures onto an existing workspace created by setup-workspace.sh.
# Expects setup-workspace.sh to have already created the workspace with
# Storybook infrastructure, node_modules, and git init.
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

# Nested theme dir — Storybook + designbook data live here.
# designbook.config.yml for Drupal-layout workspaces lives at the WORKSPACE ROOT
# (setup-workspace.sh writes it there and deletes any theme-local copy).
THEME_REL="web/themes/custom/test_integration_drupal"
mkdir -p "$TARGET_DIR/$THEME_REL"

echo "Layering fixtures into workspace: $TARGET_DIR"
echo "  Suite: $SUITE"
echo "  Case:  $CASE"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Error: Workspace not found at $TARGET_DIR" >&2
  echo "Run ./scripts/setup-workspace.sh first to create the base workspace." >&2
  exit 1
fi

# 1. Reset workspace to init commit (clean slate for re-runs)
# git repo root is the theme dir (setup-workspace.sh runs git init there)
cd "$TARGET_DIR/$THEME_REL"
# SAFETY: the reset --hard/clean below MUST target THIS theme repo, never an enclosing
# checkout/worktree. If setup-workspace.sh did not `git init` here, git resolves upward and
# the reset would wipe the parent repo. Assert the toplevel is this dir; abort otherwise.
THEME_PWD="$(pwd -P)"
THEME_TOP="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$THEME_TOP" ]] && THEME_TOP="$(cd "$THEME_TOP" && pwd -P)"
if [[ "$THEME_TOP" != "$THEME_PWD" ]]; then
  echo "FATAL: $THEME_PWD is not its own git repo (git toplevel: ${THEME_TOP:-none})." >&2
  echo "       Refusing 'git reset --hard'/'git clean' — it would hit the enclosing repo." >&2
  echo "       Re-run ./scripts/setup-workspace.sh to (re)create the isolated theme repo." >&2
  exit 1
fi
# Robust against SIGPIPE under pipefail (git log --reverse | head closes the pipe early).
INIT_COMMIT=$(git rev-list --max-parents=0 HEAD | tail -1)
if [[ -n "$INIT_COMMIT" ]]; then
  git reset --hard "$INIT_COMMIT" --quiet
  git clean -fd --quiet
fi
cd - > /dev/null

# 2. Merge suite/case designbook.config into the WORKSPACE ROOT config.
# Theme-relative overrides (home: ., dirs.components: components, …) are rewritten to
# live under $THEME_REL so CLI commands run from the workspace root keep working.
# Never leave a theme-local designbook.config.yml — it would shadow the root config.
merge_designbook_config() {
  local SRC_CFG="$1"
  local ROOT_CFG="$TARGET_DIR/designbook.config.yml"
  local THEME_CFG="$TARGET_DIR/$THEME_REL/designbook.config.yml"
  NODE_PATH="$REPO_ROOT/node_modules" \
  SRC="$SRC_CFG" ROOT_CFG="$ROOT_CFG" THEME_REL="$THEME_REL" \
    node "$REPO_ROOT/scripts/lib/merge-designbook-config.mjs"
  rm -f "$THEME_CFG"
}

CONFIG_OVERRIDE=$(sed -n 's/^config: *//p' "$CASE_FILE" | head -1 | tr -d '\r')
if [[ -n "$CONFIG_OVERRIDE" && -f "$FIXTURES_DIR/config-overrides/$CONFIG_OVERRIDE" ]]; then
  echo "  Config override → workspace root: $CONFIG_OVERRIDE"
  merge_designbook_config "$FIXTURES_DIR/config-overrides/$CONFIG_OVERRIDE"
elif [[ -f "$FIXTURES_DIR/designbook.config.yml" ]]; then
  echo "  Suite config → workspace root: designbook.config.yml"
  merge_designbook_config "$FIXTURES_DIR/designbook.config.yml"
fi
# Fixtures may copy a theme-local designbook.config.yml — always remove after layering.
rm -f "$TARGET_DIR/$THEME_REL/designbook.config.yml"

# 3. Parse fixtures list from case YAML and layer them
# Uses a simple grep+sed approach to avoid yq dependency
FIXTURES=$(sed -n '/^fixtures:/,/^[^ ]/{ /^  - /p; }' "$CASE_FILE" | sed 's/^  - //')

for FIXTURE in $FIXTURES; do
  FIXTURE_DIR="$FIXTURES_DIR/$FIXTURE"
  if [[ ! -d "$FIXTURE_DIR" ]]; then
    echo "ERROR: case '$SUITE/$CASE' lists fixture '$FIXTURE' but $FIXTURE_DIR does not exist." >&2
    echo "       Refusing to build an incomplete workspace. Add the fixture or fix the case's fixtures: list." >&2
    exit 1
  fi
  echo "  Layering fixture: $FIXTURE"
  cp -r "$FIXTURE_DIR/." "$TARGET_DIR/$THEME_REL/"
  # Fixture trees must not reintroduce a shadowing theme-local config.
  rm -f "$TARGET_DIR/$THEME_REL/designbook.config.yml"
done

# 4. Commit fixture layer as baseline for diff tracking
# git repo root is the theme dir (setup-workspace.sh runs git init there)
cd "$TARGET_DIR/$THEME_REL"
git add -A
git commit -q -m "fixtures: $SUITE/$CASE" --allow-empty

echo ""
echo "✓ Workspace ready at $TARGET_DIR"
echo "  CLI cwd (workflows/sync-to): $TARGET_DIR"
echo "  Storybook cwd:              $TARGET_DIR/$THEME_REL"
echo ""

# 5. Print the prompt from the case file
echo "Prompt:"
echo "─────────────────────────────────────"
sed -n '/^prompt:/,/^[a-z]/{/^prompt:/d; /^[a-z]/d; p;}' "$CASE_FILE" | sed 's/^  //'
echo "─────────────────────────────────────"
