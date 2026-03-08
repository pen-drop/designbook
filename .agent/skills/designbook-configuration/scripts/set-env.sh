#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_CONFIG_SCRIPT="$SCRIPT_DIR/load-config.cjs"

# Load config using the JS script
CONFIG_JSON=$(node "$LOAD_CONFIG_SCRIPT")

# Dynamically export all config keys as DESIGNBOOK_* environment variables.
# Nested YAML keys (e.g. drupal.theme, frameworks.component) are flattened
# with underscores and uppercased.
# Example: drupal.theme → DESIGNBOOK_DRUPAL_THEME
#          frameworks.component → DESIGNBOOK_FRAMEWORK_COMPONENT
eval "$(echo "$CONFIG_JSON" | node -e "
const config = JSON.parse(require('fs').readFileSync(0, 'utf-8'));

function flatten(obj, prefix) {
  for (const [key, value] of Object.entries(obj)) {
    // Special case: 'frameworks' key uses singular 'FRAMEWORK' prefix
    const part = key === 'frameworks' ? 'FRAMEWORK' : key.toUpperCase();
    const envName = prefix + '_' + part;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flatten(value, envName);
    } else {
      const escaped = String(value).replace(/'/g, \"'\\\\''\" );
      console.log('export ' + envName + \"='\" + escaped + \"'\");
    }
  }
}

flatten(config, 'DESIGNBOOK');
")"

# Fallbacks if config was empty or parsing failed
if [ -z "$DESIGNBOOK_DIST" ]; then export DESIGNBOOK_DIST="designbook"; fi
if [ -z "$DESIGNBOOK_TMP" ]; then export DESIGNBOOK_TMP="tmp"; fi
if [ -z "$DESIGNBOOK_BACKEND" ]; then export DESIGNBOOK_BACKEND="drupal"; fi
