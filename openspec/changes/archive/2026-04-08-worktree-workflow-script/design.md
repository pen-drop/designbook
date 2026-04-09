## Context

Worktrees are currently created manually with `git worktree add`. Claude Code agent worktrees go under `.claude/worktrees/`. There's no quick entry point for manual work.

## Goals / Non-Goals

**Goals:**
- Four commands: `wt start`, `wt switch`, `wt status`, `wt finish`
- `cd` into worktree directly from the shell (Fish function)
- `finish` validates (lint/typecheck/test) before push
- Manual worktrees separate from agent worktrees (`.worktrees/` instead of `.claude/worktrees/`)

**Non-Goals:**
- Merge back to main (that happens via GitHub PR)
- Conflict resolution
- Support for other shells (Bash/Zsh) — Fish only

## Decisions

### Decision: Two files — Fish function + Bash script

**Chosen:** `scripts/wt.fish` (Fish function for `cd`) + `scripts/wt.sh` (Bash for git operations).

**Rationale:** `cd` only works in the calling shell → must be a Fish function. Git operations are shell-agnostic → Bash script is more portable and testable.

**Alternative:** Everything in Fish. Rejected: Fish syntax for git scripting is more cumbersome, and the Bash script can also be used standalone.

### Decision: Worktrees under `.worktrees/`

**Chosen:** `.worktrees/<branch-name>/` in repo root.

**Rationale:** Separate from `.claude/worktrees/` (agent worktrees). Clear distinction between manual vs. automatic. `.worktrees/` added to `.gitignore`.

### Decision: `wt switch` without argument → numbered list

**Chosen:** Numbered list of active worktrees, user enters a number. With only one worktree → switch directly without asking.

**Rationale:** No `fzf` dependency needed. Simple and functional.

### Decision: `wt finish` auto-detects current worktree

**Chosen:** `finish` without argument detects via `git worktree list` + `pwd` whether the user is in a `.worktrees/` worktree.

**Rationale:** You're already in the worktree — specifying the branch name again would be redundant.

### Decision: Fish function loaded via `source`

**Chosen:** `source scripts/wt.fish` in the shell or via `.config/fish/conf.d/`. No auto-install.

**Rationale:** Simple. User decides whether to make it persistent or per-session.

## Risks / Trade-offs

- **Uncommitted changes on finish** → `pnpm check` fails → script aborts, worktree stays. User fixes and runs `wt finish` again.
- **Branch already exists** → `git worktree add -b` fails → clear error message, user uses `wt switch`.
- **Fish only** → Bash/Zsh users must `cd` manually. Acceptable for this project.
