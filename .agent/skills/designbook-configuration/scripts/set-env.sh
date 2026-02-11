#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_CONFIG_SCRIPT="$SCRIPT_DIR/load-config.cjs"

# Load config using the JS script
CONFIG_JSON=$(node "$LOAD_CONFIG_SCRIPT")

# Parse JSON using node and export variables
# We use node to avoid jq dependency if possible, though jq is cleaner.
# Assuming node is available since we used it above.

export DESIGNBOOK_DIST=$(echo "$CONFIG_JSON" | node -e "console.log(JSON.parse(fs.readFileSync(0, 'utf-8')).dist)" 2>/dev/null)
export DESIGNBOOK_TMP=$(echo "$CONFIG_JSON" | node -e "console.log(JSON.parse(fs.readFileSync(0, 'utf-8')).tmp)" 2>/dev/null)
export DESIGNBOOK_TECHNOLOGY=$(echo "$CONFIG_JSON" | node -e "console.log(JSON.parse(fs.readFileSync(0, 'utf-8')).technology)" 2>/dev/null)

# Fallbacks if parsing failed (though load-config should handle defaults)
if [ -z "$DESIGNBOOK_DIST" ]; then export DESIGNBOOK_DIST="designbook"; fi
if [ -z "$DESIGNBOOK_TMP" ]; then export DESIGNBOOK_TMP="tmp"; fi
if [ -z "$DESIGNBOOK_TECHNOLOGY" ]; then export DESIGNBOOK_TECHNOLOGY="html"; fi
