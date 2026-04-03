## 1. Setup

- [ ] 1.1 Add `.worktrees/` to `.gitignore`

## 2. Bash script `scripts/wt.sh`

- [ ] 2.1 `wt.sh start <branch>` — `git worktree add .worktrees/<branch> -b <branch>`, fallback without `-b` if branch exists; error if worktree already exists; then run `./scripts/setup-workspace.sh` in the worktree
- [ ] 2.2 `wt.sh switch <branch>` — print path if worktree exists; without argument: print numbered list (only `.worktrees/` entries from `git worktree list`)
- [ ] 2.3 `wt.sh status` — table: branch, path, last commit; "No active worktrees" if empty
- [ ] 2.4 `wt.sh finish` — detect current worktree via `pwd`, run `pnpm check`, `git add -A && git commit`, `git push -u origin <branch>`, print repo root path; abort if not in `.worktrees/`
- [ ] 2.5 `wt.sh cleanup` — after finish: `git worktree remove`, print branch info

## 3. Fish function `scripts/wt.fish`

- [ ] 3.1 `wt` function: delegates to `scripts/wt.sh`, on `start`/`switch` does `cd` to the printed path, on `finish` does `cd` back to repo root after cleanup
- [ ] 3.2 Interactive selection on `switch` without argument: reads numbered list from `wt.sh`, `read` prompt, returns chosen path
