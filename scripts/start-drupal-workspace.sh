#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:?usage: start-drupal-workspace.sh <name>}"
WS="$REPO_ROOT/workspaces/$NAME"
THEME="test_integration_drupal"
[ -d "$WS" ] || { echo "No workspace $WS — run setup-workspace.sh $NAME first" >&2; exit 1; }
cd "$WS"
ddev start
[ -f "$WS/db.sql.gz" ] && ddev import-db --file="$WS/db.sql.gz"
ddev drush theme:enable "$THEME" -y
ddev drush pm:enable designbook_config_schema -y
ddev drush status
echo "✓ Drupal up for workspace $NAME (theme $THEME enabled)"
