#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_CONFIG_SCRIPT="$SCRIPT_DIR/load-config.cjs"

# Load config using the JS script
CONFIG_JSON=$(node "$LOAD_CONFIG_SCRIPT")

# Dynamically export all config keys as DESIGNBOOK_* environment variables.
# The loadConfig() function returns flat dot-notation keys (e.g. "frameworks.component").
# We convert these to uppercase underscore-separated env variable names.
# Special case: "frameworks" prefix becomes "FRAMEWORK" (singular).
# Example: frameworks.component → DESIGNBOOK_FRAMEWORK_COMPONENT
#          drupal.theme → DESIGNBOOK_DRUPAL_THEME
eval "$(echo "$CONFIG_JSON" | node -e "
const config = JSON.parse(require('fs').readFileSync(0, 'utf-8'));

for (const [key, value] of Object.entries(config)) {
  if (typeof value === 'object' && value !== null) continue; // skip objects
  const parts = key.split('.');
  const envParts = parts.map(p => p === 'frameworks' ? 'FRAMEWORK' : p.toUpperCase());
  const envName = 'DESIGNBOOK_' + envParts.join('_');
  const escaped = String(value).replace(/'/g, \"'\\\\''\" );
  console.log('export ' + envName + \"='\" + escaped + \"'\");
}
")"

# Fallbacks if config was empty or parsing failed
if [ -z "$DESIGNBOOK_DIST" ]; then export DESIGNBOOK_DIST="designbook"; fi
if [ -z "$DESIGNBOOK_TMP" ]; then export DESIGNBOOK_TMP="tmp"; fi
if [ -z "$DESIGNBOOK_BACKEND" ]; then export DESIGNBOOK_BACKEND="drupal"; fi
