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
ddev start
ddev composer install
ddev stop
echo "✓ Drupal fixture materialized from composer.lock"
