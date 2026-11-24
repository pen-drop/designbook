#!/usr/bin/env bash
# DESIGNBOOK-60 acceptance-criteria assertions.
# Each AC is an exit-coded check. Run a single AC (`ac-checks.sh --ac1`) or all
# (`ac-checks.sh`). Paths target the FINAL six-module layout; intermediate tasks
# may legitimately fail a check until the task that lands it.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
PKG="$(pwd)"
FAIL=0

# --- AC-8 baseline: named dist entries the fixture importPaths + exports pin ---
# Content-hashed chunk-*.js are intentionally excluded (not referenced by name).
BASELINE_TOP="cli.js config.cjs config.js index.js manager-helpers.js manager.js preset.js preview.js renderer-browser.js vitest-plugin-sdc.js"
BASELINE_PAGES="design-system.stories.js foundation.stories.js mount-react.js sections.stories.js theme-store.js theme-test.stories.js"
BASELINE_CMP_PAGES="DeboDesignSystemPage.js DeboFoundationPage.js DeboSectionPage.js DeboSectionsOverview.js"
FIXTURE="../integrations/test-integration-drupal/index.json"

pass() { echo "PASS  $1"; }
failc() { echo "FAIL  $1"; FAIL=1; }

ac1() {
  # AC-1: no file under src/validation imports the renderer build chain.
  if grep -rn "from '.*renderer/" src/validation 2>/dev/null; then
    failc "AC-1: src/validation still imports renderer/*"
  else
    pass "AC-1: src/validation imports no renderer/*"
  fi
}

ac2() {
  # AC-2: no src/validation/*.ts transitively reaches the Storybook daemon.
  if node scripts/module-graph.mjs reach src/validation storybook.ts; then
    pass "AC-2: validation cannot reach storybook.ts daemon"
  else
    failc "AC-2: validation reaches storybook.ts daemon"
  fi
}

ac3() {
  # AC-3: no import cycles anywhere in src.
  if node scripts/module-graph.mjs cycles src; then
    pass "AC-3: no import cycle in src"
  else
    failc "AC-3: import cycle present in src"
  fi
}

ac4() {
  # AC-4: resolvers live under tools; inspect does not import cli/.
  local ok=1
  if [ ! -d src/tools/resolvers ]; then
    failc "AC-4: src/tools/resolvers missing (resolvers not co-located with tools)"; ok=0
  fi
  if grep -rn "from '.*cli/" src/tools/inspect 2>/dev/null; then
    failc "AC-4: src/tools/inspect imports cli/*"; ok=0
  fi
  [ "$ok" = 1 ] && pass "AC-4: resolvers under tools; inspect has no cli/ edge"
}

ac5() {
  # AC-5: every *registry* file has >=1 non-test importer.
  local bad=0
  while IFS= read -r reg; do
    local base rel importers
    base="$(basename "$reg" .ts)"
    rel="${reg#src/}"; rel="${rel%.ts}"
    # non-test files importing this registry by basename specifier
    importers=$(grep -rln "from '[^']*/${base}\(\.js\)\?'" src \
      --include='*.ts' --include='*.tsx' \
      | grep -v '__tests__' | grep -v "\.test\." | grep -v "^${reg}\$")
    if [ -z "$importers" ]; then
      failc "AC-5: registry $reg has no non-test importer"; bad=1
    fi
  done < <(find src -name '*registry*.ts' ! -path '*__tests__*' ! -name '*.test.ts')
  [ "$bad" = 0 ] && pass "AC-5: every registry has a non-test importer"
}

ac7() {
  # AC-7: storybook + vite are optional peers.
  local sb vt
  sb=$(node -e "process.stdout.write(String(require('./package.json').peerDependenciesMeta?.storybook?.optional))")
  vt=$(node -e "process.stdout.write(String(require('./package.json').peerDependenciesMeta?.vite?.optional))")
  if [ "$sb" = true ] && [ "$vt" = true ]; then
    pass "AC-7: storybook + vite marked optional in peerDependenciesMeta"
  else
    failc "AC-7: storybook.optional=$sb vite.optional=$vt (both must be true)"
  fi
}

ac8() {
  # AC-8: named dist entries present + byte-identical fixture importPaths.
  local ok=1
  for f in $BASELINE_TOP; do
    [ -f "dist/$f" ] || { failc "AC-8: missing dist/$f"; ok=0; }
  done
  for f in $BASELINE_PAGES; do
    [ -f "dist/pages/$f" ] || { failc "AC-8: missing dist/pages/$f"; ok=0; }
  done
  for f in $BASELINE_CMP_PAGES; do
    [ -f "dist/components/pages/$f" ] || { failc "AC-8: missing dist/components/pages/$f"; ok=0; }
  done
  # fixture unchanged vs committed HEAD
  if [ -f "$FIXTURE" ]; then
    if ! git -C "$PKG" diff --quiet -- "$FIXTURE"; then
      failc "AC-8: fixture index.json changed vs HEAD"; ok=0
    fi
  fi
  # package.json name/bin/exports keys unchanged
  local nm bn
  nm=$(node -e "process.stdout.write(require('./package.json').name)")
  bn=$(node -e "process.stdout.write(Object.keys(require('./package.json').bin).join(','))")
  [ "$nm" = "storybook-addon-designbook" ] || { failc "AC-8: package name changed ($nm)"; ok=0; }
  [ "$bn" = "storybook-addon-designbook" ] || { failc "AC-8: bin key changed ($bn)"; ok=0; }
  [ "$ok" = 1 ] && pass "AC-8: named dist entries + fixture + name/bin intact"
}

run() {
  case "$1" in
    --ac1) ac1 ;;
    --ac2) ac2 ;;
    --ac3) ac3 ;;
    --ac4) ac4 ;;
    --ac5) ac5 ;;
    --ac7) ac7 ;;
    --ac8) ac8 ;;
    *) echo "unknown check: $1"; FAIL=1 ;;
  esac
}

if [ "$#" -eq 0 ]; then
  ac1; ac2; ac3; ac4; ac5; ac7; ac8
else
  for a in "$@"; do run "$a"; done
fi

exit "$FAIL"
