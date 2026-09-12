#!/usr/bin/env bash
# One case through Promptfoo; config generation is shared with debo-test research.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$SCRIPT_DIR/run-single.mjs" "$@"
