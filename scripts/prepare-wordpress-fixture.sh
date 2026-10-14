#!/usr/bin/env bash
# Materializes the committed WordPress fixture's gitignored tree: WordPress core (pinned) and the
# composer.lock packages (Timber, Secure Custom Fields). Idempotent: skips if already present.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIX="$REPO_ROOT/packages/integrations/wordpress-fixture"
WP_VERSION="7.1.3"
if [ -f "$FIX/wp-includes/version.php" ] && [ -d "$FIX/vendor" ] && [ -d "$FIX/wp-content/plugins/secure-custom-fields" ]; then
  echo "Fixture already materialized"; exit 0
fi
cd "$FIX"
# Worktree-namespaced ddev project name (same scheme as prepare-drupal-fixture.sh); removed on
# exit so it is never cloned into a workspace.
WT_ID="$(printf '%s' "$REPO_ROOT" | cksum | cut -d' ' -f1)"
trap 'rm -f "$FIX/.ddev/config.local.yaml"' EXIT
printf 'name: wpfix-%s\n' "$WT_ID" > .ddev/config.local.yaml
ddev start
ddev composer install --no-interaction
ddev wp core download --version="$WP_VERSION" --skip-content --force
ddev stop
echo "✓ WordPress fixture materialized (core $WP_VERSION + composer.lock)"
