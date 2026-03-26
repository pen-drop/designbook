#!/usr/bin/env bash
# Run designbook workflow chain — sequential tests in a shared workspace.
#
# Usage:
#   ./promptfoo/scripts/run-chain.sh                     # run all
#   ./promptfoo/scripts/run-chain.sh --clean              # clean workspace, then run all
#   ./promptfoo/scripts/run-chain.sh --clean --until debo-css-generate
#   ./promptfoo/scripts/run-chain.sh debo-vision          # run only debo-vision
#   ./promptfoo/scripts/run-chain.sh debo-vision --deps   # run debo-vision + its dependencies
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPTFOO_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$PROMPTFOO_DIR")"
WORKSPACE="$PROMPTFOO_DIR/workspaces/chain"
CONFIG="$PROMPTFOO_DIR/configs/chain.yaml"

# Dependency graph — ordered list (index = execution order)
WORKFLOWS=(
  debo-vision          # 01
  debo-sections        # 02
  debo-design-tokens   # 03
  debo-css-generate    # 04
  debo-data-model      # 05
  debo-shape-section   # 06
  debo-design-component # 07
  debo-sample-data     # 08
  debo-design-screen   # 09
  debo-design-shell    # 10
)

# Dependency map: workflow -> space-separated list of required workflows
declare -A DEPS=(
  [debo-vision]=""
  [debo-sections]="debo-vision"
  [debo-design-tokens]="debo-vision"
  [debo-css-generate]="debo-vision debo-design-tokens"
  [debo-data-model]="debo-vision"
  [debo-shape-section]="debo-vision debo-sections"
  [debo-design-component]="debo-vision debo-design-tokens debo-css-generate"
  [debo-sample-data]="debo-vision debo-sections debo-data-model"
  [debo-design-screen]="debo-vision debo-sections debo-design-tokens debo-css-generate debo-data-model debo-sample-data debo-design-component"
  [debo-design-shell]="debo-vision debo-sections debo-design-tokens debo-css-generate"
)

# --- Parse args ---
CLEAN=false
TARGET=""
WITH_DEPS=false
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)  CLEAN=true; shift ;;
    --deps)   WITH_DEPS=true; shift ;;
    --until)  TARGET="$2"; WITH_DEPS=true; shift 2 ;;
    --*)      EXTRA_ARGS+=("$1"); shift ;;
    *)        TARGET="$1"; shift ;;
  esac
done

# --- Clean workspace ---
if $CLEAN; then
  echo "🧹 Cleaning workspace..."
  rm -rf "$WORKSPACE/designbook" "$WORKSPACE/components" "$WORKSPACE/css"
  mkdir -p "$WORKSPACE/designbook"
  echo "✓ Workspace cleaned"
fi

# Ensure .agents symlink exists so skills/workflows are found
if [ ! -e "$WORKSPACE/.agents" ]; then
  ln -s "$PROJECT_DIR/.agents" "$WORKSPACE/.agents"
  echo "✓ Linked .agents into workspace"
fi

# --- Build filter ---
if [[ -n "$TARGET" ]]; then
  if $WITH_DEPS; then
    # Collect target + all transitive deps
    collect_deps() {
      local wf="$1"
      echo "$wf"
      for dep in ${DEPS[$wf]:-}; do
        collect_deps "$dep"
      done
    }
    NEEDED=$(collect_deps "$TARGET" | sort -u)

    # Build ordered list preserving execution order
    FILTER_PARTS=()
    for wf in "${WORKFLOWS[@]}"; do
      if echo "$NEEDED" | grep -qx "$wf"; then
        # Get index (01-based)
        for i in "${!WORKFLOWS[@]}"; do
          if [[ "${WORKFLOWS[$i]}" == "$wf" ]]; then
            IDX=$(printf "%02d" $((i + 1)))
            FILTER_PARTS+=("\\[$IDX\\]")
            break
          fi
        done
      fi
    done
    FILTER=$(IFS='|'; echo "${FILTER_PARTS[*]}")
  else
    # Single workflow, no deps
    for i in "${!WORKFLOWS[@]}"; do
      if [[ "${WORKFLOWS[$i]}" == "$TARGET" ]]; then
        IDX=$(printf "%02d" $((i + 1)))
        FILTER="\\[$IDX\\]"
        break
      fi
    done
  fi

  echo "▶ Running: $(echo "$FILTER" | sed 's/\\[//g; s/\\]//g; s/|/, /g')"
  cd "$PROJECT_DIR"
  npx promptfoo eval -c "$CONFIG" --filter-pattern "$FILTER" "${EXTRA_ARGS[@]}"
else
  echo "▶ Running full chain (all 10 workflows)"
  cd "$PROJECT_DIR"
  npx promptfoo eval -c "$CONFIG" "${EXTRA_ARGS[@]}"
fi
