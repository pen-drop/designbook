#!/usr/bin/env bash
# Self-check for setup-workspace.sh scaffold selection (no install, no rebuild).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pick() { SETUP_WORKSPACE_DRY_RUN=1 ./scripts/setup-workspace.sh "$1" --into "$(mktemp -d)/ws" | sed -n 's/^SRC_APP=//p'; }
[[ "$(pick react-storybook)" == */packages/integrations/test-integration-react ]] || { echo "FAIL react"; exit 1; }
[[ "$(pick vue-storybook)" == */packages/integrations/test-integration-vue ]] || { echo "FAIL vue"; exit 1; }
if ./scripts/setup-workspace.sh react-storybook --into . >/dev/null 2>&1; then echo "FAIL repo root accepted"; exit 1; fi
echo "setup-workspace selection: ok"
