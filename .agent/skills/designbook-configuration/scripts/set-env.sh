#!/bin/bash

# Load Designbook configuration as environment variables via the addon CLI.
# Usage: eval "$(npx storybook-addon-designbook config)"
#   or:  source .agent/skills/designbook-configuration/scripts/set-env.sh

eval "$(npx storybook-addon-designbook config)"

# Fallbacks if config was empty or parsing failed
if [ -z "$DESIGNBOOK_DIST" ]; then export DESIGNBOOK_DIST="designbook"; fi
if [ -z "$DESIGNBOOK_TMP" ]; then export DESIGNBOOK_TMP="tmp"; fi
if [ -z "$DESIGNBOOK_BACKEND" ]; then export DESIGNBOOK_BACKEND="drupal"; fi
