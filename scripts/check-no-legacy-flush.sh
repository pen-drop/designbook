#!/usr/bin/env bash
# Fails if any legacy flush value appears in skill or addon source files.
#
# Legitimate references to the legacy values exist in the migration itself:
#   - the rejection logic in workflow-resolve.ts (error messages)
#   - the tests that verify the rejection (workflow-write-file.test.ts)
#   - CLI help text and doc comments that explain the migration
# These are excluded below. Any other occurrence indicates a regression.
set -euo pipefail

PATTERN='flush:[[:space:]]*(immediately|external)'
ROOTS=(.agents/skills packages/storybook-addon-designbook/src)

# Files exempt from the guard (migration implementation + its tests/docs).
EXCLUDES=(
  'packages/storybook-addon-designbook/src/workflow-resolve.ts'
  'packages/storybook-addon-designbook/src/workflow.ts'
  'packages/storybook-addon-designbook/src/cli/workflow.ts'
  'packages/storybook-addon-designbook/src/validators/__tests__/workflow-write-file.test.ts'
)

ALL_MATCHES=$(grep -rEn "$PATTERN" "${ROOTS[@]}" || true)

# Filter out exempt files by exact path.
MATCHES=""
if [[ -n "$ALL_MATCHES" ]]; then
  while IFS= read -r line; do
    file="${line%%:*}"
    skip=0
    for ex in "${EXCLUDES[@]}"; do
      if [[ "$file" == "$ex" ]]; then
        skip=1
        break
      fi
    done
    if [[ $skip -eq 0 ]]; then
      MATCHES+="$line"$'\n'
    fi
  done <<< "$ALL_MATCHES"
fi

if [[ -n "$MATCHES" ]]; then
  echo "ERROR: legacy flush values found. Replace 'flush: immediately' with 'flush: immediate'" >&2
  echo "and 'flush: external' with 'submission: direct':" >&2
  printf '%s' "$MATCHES" >&2
  exit 1
fi

echo "OK: no legacy flush values in repo"
