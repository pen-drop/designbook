#!/usr/bin/env bash
# Start the DDEV WordPress site of a backend: wordpress workspace (setup-workspace.sh).
# Idempotent: downloads/installs WordPress only when missing. The DDEV host is shared
# with other projects, so the project gets its own name and this script never powers
# ddev off.
#
# Usage: ./scripts/start-wordpress-workspace.sh [name] | --workspace <dir>
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
  KEY="$(basename "$WS")-$(printf '%s' "$WS" | cksum | cut -d' ' -f1)"
else
  NAME="${NAME:-wordpress}"
  WS="$REPO_ROOT/workspaces/$NAME"
  KEY="$NAME"
fi
KEY="$(printf '%s' "$KEY" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g; s/--*/-/g; s/^-//; s/-$//')"
THEME="test_integration_wordpress"
[ -d "$WS" ] || { echo "No workspace $WS — run setup-workspace.sh ${NAME:-<name>} first" >&2; exit 1; }
cd "$WS"

# Own project name through the gitignored overlay; the committed config.yaml stays pristine.
printf 'name: designbook-wp-%s\n' "$KEY" > .ddev/config.local.yaml
ddev start
ddev composer install --no-interaction

[ -d wp-includes ] || ddev wp core download --skip-content --force
if ! ddev wp core is-installed 2>/dev/null; then
  ddev wp core install --url="$(ddev describe -j | jq -r .raw.primary_url)" --title=Designbook \
    --admin_user=admin --admin_password=admin --admin_email=admin@example.com --skip-email
fi
ddev wp plugin install secure-custom-fields --activate
ddev wp theme activate "$THEME"
ddev wp rewrite structure '/%postname%/' --hard

echo "✓ WordPress up for workspace $WS ($(ddev describe -j | jq -r .raw.primary_url), admin/admin)"
