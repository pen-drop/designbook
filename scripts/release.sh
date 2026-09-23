#!/usr/bin/env bash
# pnpm-native release for the storybook-addon-designbook package.
# @auto-it/npm only speaks npm and chokes on pnpm `workspace:` deps, so we use
# `auto` ONLY to derive the bump from the merged PR labels (skipped when an
# explicit version/bump is passed as $1), then do the version bump + publish with
# pnpm (which understands the `workspace:` protocol).
#
# Usage:
#   pnpm release            # bump derived from merged PR labels (needs GH_TOKEN)
#   pnpm release 0.11.0     # explicit target version
#   pnpm release minor      # explicit bump type (patch|minor|major)
set -euo pipefail

# `auto` needs a GitHub token in the env. Fall back to the gh CLI's token when
# GH_TOKEN isn't already exported.
if [ -z "${GH_TOKEN:-}" ] && command -v gh >/dev/null 2>&1; then
  GH_TOKEN="$(gh auth token 2>/dev/null || true)"
  export GH_TOKEN
fi

PKG="storybook-addon-designbook"
DIR="packages/${PKG}"

# 1. Determine the next version.
#    An explicit argument ($1) overrides `auto` and may be either a full version
#    (e.g. 0.11.0) or a bump type (patch|minor|major). Without an argument we
#    fall back to deriving the bump from merged PR labels via `auto` (needs
#    GH_TOKEN).
CUR="$(node -p "require('./${DIR}/package.json').version")"
ARG="${1:-}"
if [ -n "${ARG}" ]; then
  case "${ARG}" in
    patch|minor|major)
      BUMP="${ARG}"
      NEW="$(cd "${DIR}" && node -e "process.stdout.write(require('semver').inc('${CUR}', '${BUMP}'))")"
      echo "explicit bump = ${BUMP}"
      ;;
    *)
      # Treat as an explicit target version; validate it with semver.
      NEW="$(cd "${DIR}" && node -e "const v=require('semver').valid('${ARG}'); if(!v){console.error('invalid version: ${ARG}');process.exit(1)} process.stdout.write(v)")"
      echo "explicit version = ${NEW}"
      ;;
  esac
else
  # Derive the release type (patch|minor|major) from merged PR labels.
  BUMP="$(pnpm exec auto version 2>/dev/null || true)"
  if [ -z "${BUMP}" ]; then
    echo "auto: no release needed (no labelled PRs since last release)"
    exit 0
  fi
  echo "auto: bump = ${BUMP}"
  NEW="$(cd "${DIR}" && node -e "process.stdout.write(require('semver').inc('${CUR}', '${BUMP}'))")"
fi

# 2. Build the addon.
pnpm --filter "${PKG}" run build

# 3. Bump the version WITHOUT npm. Both `npm version` and `pnpm version` shell
#    out to npm internally, which chokes on the root package's `workspace:*` dep
#    (EUNSUPPORTEDPROTOCOL). We write the computed version with `pnpm pkg set`
#    (pure package.json edit, no npm invocation).
( cd "${DIR}" && pnpm pkg set "version=${NEW}" )
echo "new version: v${NEW} (was v${CUR})"

# 4. Publish with pnpm (rewrites workspace: -> real versions; auth via .npmrc).
#    Log in interactively beforehand with `npm login` so ~/.npmrc holds a fresh,
#    2FA-verified token — publish then needs no OTP prompt. We run inside the
#    package dir (NOT `pnpm --filter … publish`): the workspace runner swallows
#    npm's interactive prompts, which is what made the script appear to hang
#    after login. Running directly keeps stdin/stdout attached.
( cd "${DIR}" && pnpm publish --no-git-checks --access public )

# 5. Changelog + commit + tag + push back to main.
pnpm exec auto changelog --no-commit || true
git add -A
git commit -m "v${NEW} [skip ci]" || true
git tag "v${NEW}"
git push --follow-tags origin HEAD:main

# 6. Create the GitHub release from the new tag.
pnpm exec auto release --use-version "v${NEW}" || true
