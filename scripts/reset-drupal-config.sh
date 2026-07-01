#!/usr/bin/env bash
set -euo pipefail
# Reset the workspace's Drupal DB to the committed fixture baseline, so each
# sync case scores against a clean config state (the git reset alone does NOT
# revert the live DB/config).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:?usage: reset-drupal-config.sh <workspace-name>}"
WS="$REPO_ROOT/workspaces/$NAME"
[ -d "$WS" ] || { echo "No workspace $WS" >&2; exit 1; }
cd "$WS"
[ -f "$WS/db.sql.gz" ] || { echo "No baseline db.sql.gz in $WS" >&2; exit 1; }
ddev import-db --file="$WS/db.sql.gz"
# The committed baseline DB does not have the sync helper module enabled;
# re-enable it after every reset so sync-to's prepare/validate (designbook:config-schema /
# designbook:config-validate) keep working across per-case resets.
ddev drush pm:enable designbook_config_schema -y
echo "✓ Drupal config reset to baseline for workspace $NAME (helper module re-enabled)"
