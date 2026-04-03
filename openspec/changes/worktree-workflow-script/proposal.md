## Why

Setting up worktrees for changes manually requires multiple git commands and path navigation. A simple CLI tool (`wt`) wraps the worktree lifecycle into four commands: create, switch, overview, finish.

## What Changes

- **NEW** Fish function `wt` as entry point (enables `cd` into worktree from the shell)
- **NEW** Bash script `scripts/wt.sh` for git operations (start, finish, status)
- **NEW** `wt start <branch>` — creates worktree under `.worktrees/<branch>`, runs `setup-workspace.sh`, cd into it
- **NEW** `wt switch [branch]` — cd into existing worktree; no argument: interactive numbered list
- **NEW** `wt status` — table of all active manual worktrees (branch, path, last commit)
- **NEW** `wt finish` — `pnpm check`, commit, push, remove worktree

## Capabilities

### New Capabilities

- `worktree-cli`: Fish function + Bash script for worktree lifecycle (start, switch, status, finish)

### Modified Capabilities

(none)

## Impact

- New files: `scripts/wt.sh`, `scripts/wt.fish`
- Dependencies: `git`, `pnpm`, Fish shell
- `.worktrees/` directory created (added to `.gitignore`)
