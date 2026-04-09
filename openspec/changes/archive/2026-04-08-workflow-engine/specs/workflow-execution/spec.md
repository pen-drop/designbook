## MODIFIED Requirements

### Requirement: workflow plan creates isolation context
`workflow plan` SHALL resolve the write isolation strategy (engine) before expanding tasks, and store the result in tasks.yml. The strategy is determined by precedence: `--engine` CLI flag > workflow frontmatter `engine:` > `auto` (git-worktree if git repo, direct otherwise).

For `git-worktree` engine: runs preflight check, creates git worktree on branch `workflow/<name>`, remaps env vars via `buildWorktreeEnvMap`, stores `write_root` and `worktree_branch` in tasks.yml.

For `direct` engine: does not create any worktree or tmpdir; env vars are not remapped; `write_root` and `worktree_branch` are not set in tasks.yml.

#### Scenario: git-worktree engine creates worktree and remaps env vars
- **WHEN** `workflow plan` resolves engine as `git-worktree`
- **THEN** a git worktree is created at `$DESIGNBOOK_WORKSPACES/<workflow-name>`
- **AND** `write_root`, `worktree_branch`, and `engine` are set in tasks.yml
- **AND** file paths in tasks are expanded using the remapped (WORKTREE) env vars

#### Scenario: direct engine skips worktree, uses real paths
- **WHEN** `workflow plan` resolves engine as `direct`
- **THEN** no worktree or tmpdir is created
- **AND** `write_root` and `worktree_branch` are absent from tasks.yml
- **AND** `engine: direct` is stored in tasks.yml
- **AND** file paths in tasks are expanded using real (non-remapped) env vars

#### Scenario: --engine flag accepted by workflow plan
- **WHEN** `workflow plan --engine direct` is called
- **THEN** engine resolves to `direct` regardless of frontmatter or git repo status

#### Scenario: Dry-run skips worktree creation for any engine
- **WHEN** `workflow plan --dry-run` is called
- **THEN** no worktree or tmpdir is created regardless of resolved engine
