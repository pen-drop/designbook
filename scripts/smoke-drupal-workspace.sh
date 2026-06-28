#!/usr/bin/env bash
# Smoke test: asserts the unified Drupal-layout workspace works both ways —
#   (a) design-* path: theme + .storybook present, ddev NOT running after setup
#   (b) start path: ddev boots, config_inspector enabled, theme enabled
#
# Worktree-safe naming (uses PID); self-cleans via trap.
# Exits non-zero on any failure.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="smoke-$$"
WS="$REPO_ROOT/workspaces/$NAME"
THEME="test_integration_drupal"

cleanup() {
  echo ""
  echo "--- cleanup ---"
  # Delete ddev project if the workspace directory exists
  if [ -d "$WS" ]; then
    ( cd "$WS" && ddev delete -Oy 2>/dev/null ) || true
  fi
  rm -rf "$WS"
  echo "--- cleanup done ---"
}
trap cleanup EXIT

# ── Phase (a): design-* path ─────────────────────────────────────────────────
echo "==> setup-workspace $NAME"
"$REPO_ROOT/scripts/setup-workspace.sh" "$NAME"

# Theme + .storybook must be present in the Drupal docroot.
ls "$WS/web/themes/custom/$THEME/.storybook" >/dev/null \
  || { echo "FAIL: theme/.storybook missing after setup"; exit 1; }
echo "✓ theme/.storybook present"

# ddev must NOT be running (containers stopped/never started).
# We run `ddev describe -j` inside the workspace dir — it exits 0 and emits
# JSON with "status":"running" only when containers are actually up.
# For a freshly-configured project the status is "stopped"; we treat any
# non-"running" status (and any error from describe) as "not running".
# The OR-true at the end ensures set -e doesn't trip on the grep exit-1.
if ( cd "$WS" && ddev describe -j 2>/dev/null | grep -q '"status":"running"' ); then
  echo "FAIL: ddev should not be running after setup"
  exit 1
fi
echo "✓ ddev not running after setup (design-* path OK)"

# ── Phase (b): start path ────────────────────────────────────────────────────
echo "==> start-drupal-workspace $NAME"
"$REPO_ROOT/scripts/start-drupal-workspace.sh" "$NAME"

cd "$WS"

DRUSH_STATUS="$(ddev drush status 2>&1)"
echo "$DRUSH_STATUS" | grep -q "Drupal bootstrap : Successful" \
  || { echo "FAIL: Drupal bootstrap not successful"; echo "$DRUSH_STATUS"; exit 1; }
echo "✓ Drupal bootstrap successful"

PM_LIST="$(ddev drush pm:list --status=enabled --field=name 2>&1)"
echo "$PM_LIST" | grep -qx "config_inspector" \
  || { echo "FAIL: config_inspector not enabled"; exit 1; }
echo "✓ config_inspector enabled"

PM_THEMES="$(ddev drush pm:list --type=theme --status=enabled --field=name 2>&1)"
echo "$PM_THEMES" | grep -qx "$THEME" \
  || { echo "FAIL: theme $THEME not enabled"; exit 1; }
echo "✓ theme $THEME enabled"

echo ""
echo "✓ Drupal workspace smoke passed (design-path no-ddev + start-path)"
