#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_CONFIG_SCRIPT="$SCRIPT_DIR/load-config.cjs"

# Load config using the JS script
CONFIG_JSON=$(node "$LOAD_CONFIG_SCRIPT")

# Dynamically export all config keys as DESIGNBOOK_* environment variables.
# Nested YAML keys (e.g. drupal.theme) are flattened with underscores and uppercased.
# Example: drupal.theme → DESIGNBOOK_DRUPAL_THEME
eval "$(echo "$CONFIG_JSON" | node -e "
const config = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
for (const [key, value] of Object.entries(config)) {
  const envName = 'DESIGNBOOK_' + key.replace(/\./g, '_').toUpperCase();
  // Escape single quotes in values for safe shell export
  const escaped = String(value).replace(/'/g, \"'\\\\''\");
  console.log('export ' + envName + \"='\" + escaped + \"'\");
}
")"

# Fallbacks if config was empty or parsing failed
if [ -z "$DESIGNBOOK_DIST" ]; then export DESIGNBOOK_DIST="designbook"; fi
if [ -z "$DESIGNBOOK_TMP" ]; then export DESIGNBOOK_TMP="tmp"; fi
if [ -z "$DESIGNBOOK_TECHNOLOGY" ]; then export DESIGNBOOK_TECHNOLOGY="html"; fi
