#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:?usage: start-drupal-workspace.sh <name>}"
WS="$REPO_ROOT/workspaces/$NAME"
THEME="test_integration_drupal"
[ -d "$WS" ] || { echo "No workspace $WS — run setup-workspace.sh $NAME first" >&2; exit 1; }
cd "$WS"
ddev start

# Prefer pipe import — `ddev import-db --file=…` has been flaky with gzip paths
# under some ddev/router versions (empty extract dir).
if [ -f "$WS/db.sql.gz" ]; then
  gzip -dc "$WS/db.sql.gz" | ddev import-db --no-progress
elif [ -f "$WS/db.sql" ]; then
  ddev import-db --file="$WS/db.sql" --no-progress
fi

ddev drush theme:enable "$THEME" -y
# designbook_config_schema was folded into designbook — only enable real modules.
ddev drush pm:enable ui_patterns designbook designbook_ui_patterns -y
# Layout Builder + UI Patterns layouts are required by scene/sync-to fixtures that
# set extensions: layout_builder (ignore failures when already enabled).
ddev drush pm:enable layout_builder layout_discovery ui_patterns_layouts ui_patterns_views ui_patterns_blocks ui_patterns_field_formatters -y 2>/dev/null || true
ddev drush status
echo "✓ Drupal up for workspace $NAME (theme $THEME enabled)"
