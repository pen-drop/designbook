#!/usr/bin/env bash
set -euo pipefail
# Provision an isolated git worktree + Drupal workspace for a parallel research
# run. Each run gets its own theme-dir git root (so `git reset --hard` is
# independent) and its own worktree-namespaced ddev project (no port clash).
#
# Usage: ./scripts/init-research-worktree.sh <run-id> [suite]
#   run-id   Short identifier for this run (e.g. "run-a", "exp-1"). Used as the
#            worktree directory name under .research-worktrees/.
#   suite    Workspace suite name passed to setup-workspace.sh (default: drupal-web).
#
# The ddev project name is "db-$WT_ID-$SUITE" where WT_ID is the cksum of the
# worktree's repo root — distinct from the parent worktree's project and from any
# other research worktree because each has a different REPO_ROOT.
#
# Cleanup: git worktree remove --force .research-worktrees/<run-id>

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="${1:?usage: init-research-worktree.sh <run-id> [suite]}"
SUITE="${2:-drupal-web}"
WT_DIR="$REPO_ROOT/.research-worktrees/$RUN_ID"

git -C "$REPO_ROOT" worktree add "$WT_DIR" HEAD
( cd "$WT_DIR" && ./scripts/setup-workspace.sh "$SUITE" )
( cd "$WT_DIR" && ./scripts/start-drupal-workspace.sh "$SUITE" )
echo "✓ Research worktree ready: $WT_DIR (ddev db-$(printf '%s' "$WT_DIR" | cksum | cut -d' ' -f1)-$SUITE)"
echo "  Run the loop with this worktree as CWD."
