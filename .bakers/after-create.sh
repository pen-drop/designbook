#!/bin/sh
set -e
# Frozen: the lockfile lists local-only workspaces/*; a plain install prunes them and leaves the run clone dirty.
pnpm install --frozen-lockfile
