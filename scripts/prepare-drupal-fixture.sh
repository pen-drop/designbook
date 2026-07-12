#!/usr/bin/env bash
# Materializes the committed Drupal fixture's gitignored composer tree from the
# committed composer.lock (deterministic). Idempotent: skips if already present.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIX="$REPO_ROOT/packages/integrations/drupal-fixture"
if [ -f "$FIX/web/core/core.api.php" ] && [ -d "$FIX/vendor" ]; then
  echo "Fixture already materialized"; exit 0
fi
cd "$FIX"
# Worktree-namespaced ddev project name so parallel worktrees don't collide on the fixed
# committed name (ddev refuses a name already bound to another path). Same WT_ID scheme as
# setup-workspace.sh. config.local.yaml is ddev-gitignored; committed config.yaml untouched.
# Cleaned up on exit so it is never cloned into a workspace (where it would override the
# workspace's own db-<WT_ID>-<name> project name and conflict).
WT_ID="$(printf '%s' "$REPO_ROOT" | cksum | cut -d' ' -f1)"
trap 'rm -f "$FIX/.ddev/config.local.yaml"' EXIT
printf 'name: dbfix-%s\n' "$WT_ID" > .ddev/config.local.yaml
ddev start
ddev composer install
ddev stop
echo "✓ Drupal fixture materialized from composer.lock"
