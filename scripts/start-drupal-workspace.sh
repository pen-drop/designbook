#!/usr/bin/env bash
set -euo pipefail
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
THEME="test_integration_drupal"
[ -d "$WS" ] || { echo "No workspace $WS — run setup-workspace.sh ${NAME:-<name>} first" >&2; exit 1; }
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

# Build the theme CSS. The theme library attaches dist/css/app.css, which is the vite build
# output and is gitignored — so without this step Drupal attaches a file that does not exist
# and every page renders with browser default styles. Storybook does NOT need it (its vite
# plugin compiles Tailwind in-process), so the absence is invisible on the reference side and
# only corrupts the backend candidate — a sync-verify fidelity score that looks plausible and
# means nothing. Fail loudly rather than let that through.
THEME_DIR="$WS/web/themes/custom/$THEME"
echo "→ building theme CSS ($THEME)"
(cd "$THEME_DIR" && npm run build >/dev/null)
[ -f "$THEME_DIR/dist/css/app.css" ] || {
  echo "✗ theme CSS build produced no $THEME_DIR/dist/css/app.css" >&2
  exit 1
}
ddev drush cr

ddev drush status
echo "✓ Drupal up for workspace $DISPLAY_NAME (theme $THEME enabled, CSS built)"
