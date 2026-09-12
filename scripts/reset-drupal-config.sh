#!/usr/bin/env bash
set -euo pipefail
# Reset the workspace's Drupal DB to the committed fixture baseline, so each
# sync case scores against a clean config state (the git reset alone does NOT
# revert the live DB/config).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME=""
WORKSPACE_OVERRIDE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace) WORKSPACE_OVERRIDE="${2:?--workspace needs a directory}"; shift 2 ;;
    --workspace=*) WORKSPACE_OVERRIDE="${1#*=}"; shift ;;
    -*) echo "Unknown option: $1" >&2; exit 1 ;;
    *) [[ -z "$NAME" ]] || { echo "Unexpected argument: $1" >&2; exit 1; }; NAME="$1"; shift ;;
  esac
done
if [[ -n "$WORKSPACE_OVERRIDE" ]]; then
  [[ "$WORKSPACE_OVERRIDE" = /* ]] && WS="$WORKSPACE_OVERRIDE" || WS="$REPO_ROOT/$WORKSPACE_OVERRIDE"
  WS="$(realpath -m "$WS")"
  DISPLAY_NAME="$WS"
else
  NAME="${NAME:-drupal}"
  WS="$REPO_ROOT/workspaces/$NAME"
  DISPLAY_NAME="$NAME"
fi
[ -d "$WS" ] || { echo "No workspace $WS" >&2; exit 1; }
[ -f "$WS/db.sql.gz" ] || { echo "No baseline db.sql.gz in $WS" >&2; exit 1; }
cd "$WS"
ddev import-db --file="$WS/db.sql.gz"
# The committed baseline DB does not have the designbook modules enabled;
# re-enable them after every reset so sync-to's prepare/validate (designbook:config-schema /
# designbook:config-validate / designbook:ui-pattern) keep working across per-case resets.
# Keep in sync with the enable list in scripts/start-drupal-workspace.sh.
ddev drush pm:enable ui_patterns designbook designbook_ui_patterns -y
echo "✓ Drupal config reset to baseline for workspace $DISPLAY_NAME (helper modules re-enabled)"
