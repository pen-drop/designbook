#!/usr/bin/env bash
# Run a single promptfoo test by case name.
# Generates a temporary config from the case file with assertions included.
#
# Usage: ./promptfoo/scripts/run-single.sh <case> [--suite <suite>] [extra args...]
# Example: ./promptfoo/scripts/run-single.sh data-model-canvas
#          ./promptfoo/scripts/run-single.sh data-model-canvas --suite drupal-petshop --no-cache
#
# List available cases:
#   ./promptfoo/scripts/run-single.sh --list [--suite <suite>]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPTFOO_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$PROMPTFOO_DIR/.." && pwd)"
CONFIGS_DIR="$PROMPTFOO_DIR/configs"
SUITE="drupal-petshop"
LABEL=""
EXTRA_ARGS=()

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --suite) SUITE="$2"; shift 2 ;;
    --list) LABEL="--list"; shift ;;
    -*) EXTRA_ARGS+=("$1"); shift ;;
    *) [[ -z "$LABEL" ]] && LABEL="$1" || EXTRA_ARGS+=("$1"); shift ;;
  esac
done

FIXTURES_DIR="$REPO_ROOT/fixtures/$SUITE"

if [[ "$LABEL" == "--list" ]] || [[ -z "$LABEL" ]]; then
  echo "Available cases for $SUITE:"
  for f in "$FIXTURES_DIR"/cases/*.yaml; do
    [[ -f "$f" ]] && echo "  ./promptfoo/scripts/run-single.sh $(basename "$f" .yaml)"
  done
  exit 0
fi

if [[ "$LABEL" == "chain" ]]; then
  echo "Error: Use run-chain.sh for chain tests."
  exit 1
fi

CASE_FILE="$FIXTURES_DIR/cases/$LABEL.yaml"
if [[ ! -f "$CASE_FILE" ]]; then
  echo "Error: No case found for '$LABEL' at $CASE_FILE"
  echo "Run './promptfoo/scripts/run-single.sh --list' to see available cases."
  exit 1
fi

# Generate a single-test config from the case file
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const base = yaml.load(fs.readFileSync('$CONFIGS_DIR/base.yaml', 'utf-8'));
const caseData = yaml.load(fs.readFileSync('$CASE_FILE', 'utf-8'));

// Resolve relative file:// provider paths to absolute paths based on configs dir
const resolveProviderPath = (provider) => {
  if (typeof provider === 'string' && provider.startsWith('file://')) {
    const relPath = provider.slice('file://'.length);
    return 'file://' + path.resolve('$CONFIGS_DIR', relPath);
  }
  if (provider && typeof provider === 'object' && typeof provider.id === 'string' && provider.id.startsWith('file://')) {
    const relPath = provider.id.slice('file://'.length);
    provider.id = 'file://' + path.resolve('$CONFIGS_DIR', relPath);
  }
  return provider;
};

if (base.providers) base.providers = base.providers.map(resolveProviderPath);
if (base.defaultTest?.options?.provider) resolveProviderPath(base.defaultTest.options.provider);

const config = {
  description: 'Designbook workflow evaluation — $LABEL',
  outputPath: 'promptfoo/reports/$LABEL.json',
  prompts: ['{{prompt}}'],
  providers: base.providers,
  evaluateOptions: base.evaluateOptions,
  defaultTest: base.defaultTest,
  tests: [{
    description: '$LABEL: $SUITE',
    vars: { suite: '$SUITE', case: '$LABEL' },
    assert: caseData.assert || [],
  }],
};

fs.writeFileSync('/tmp/promptfoo-$LABEL.yaml', yaml.dump(config, { lineWidth: 120, noRefs: true }));
"

npx promptfoo eval -c "/tmp/promptfoo-$LABEL.yaml" "${EXTRA_ARGS[@]}"
