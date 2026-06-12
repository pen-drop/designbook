#!/usr/bin/env bash
# pnpm-native release for the storybook-addon-designbook package.
# @auto-it/npm only speaks npm and chokes on pnpm `workspace:` deps, so we use
# `auto` ONLY to derive the bump from the merged PR labels, then do the version
# bump + publish with pnpm (which understands the `workspace:` protocol).
set -euo pipefail

PKG="storybook-addon-designbook"
DIR="packages/${PKG}"

# 1. Derive the release type (patch|minor|major) from merged PR labels.
BUMP="$(pnpm exec auto version 2>/dev/null || true)"
if [ -z "${BUMP}" ]; then
  echo "auto: no release needed (no labelled PRs since last release)"
  exit 0
fi
echo "auto: bump = ${BUMP}"

# 2. Build the addon.
pnpm --filter "${PKG}" run build

# 3. Bump the version with pnpm (no git tag yet).
( cd "${DIR}" && pnpm version "${BUMP}" --no-git-tag-version )
NEW="$(node -p "require('./${DIR}/package.json').version")"
echo "new version: v${NEW}"

# 4. Publish with pnpm (rewrites workspace: -> real versions; auth via .npmrc).
pnpm --filter "${PKG}" publish --no-git-checks --access public

# 5. Changelog + commit + tag + push back to main.
pnpm exec auto changelog --no-commit || true
git add -A
git commit -m "v${NEW} [skip ci]" || true
git tag "v${NEW}"
git push --follow-tags origin HEAD:main

# 6. Create the GitHub release from the new tag.
pnpm exec auto release --use-version "v${NEW}" || true
