## MODIFIED Requirements

### Requirement: workflow plan creates git worktree for isolation

`workflow plan` SHALL create a full-checkout git worktree at `$DESIGNBOOK_WORKSPACES/designbook-[workflow-name]/` on a new branch `workflow/[workflow-name]`, store branch and path in `tasks.yml`, and remap `DESIGNBOOK_OUTPUTS_*` env vars to point inside the worktree.

#### Scenario: full git worktree created at plan time
- **WHEN** `workflow plan --workflow <name> --items <json>` is called and pre-flight passes
- **THEN** `git worktree add $DESIGNBOOK_WORKSPACES/designbook-<name> -b workflow/<name>` is executed from `rootDir` (full checkout, no sparse-checkout)

#### Scenario: worktree_branch stored in tasks.yml
- **WHEN** the worktree is created
- **THEN** `tasks.yml` contains `write_root: $DESIGNBOOK_WORKSPACES/designbook-<name>` and `worktree_branch: workflow/<name>`

#### Scenario: OUTPUTS vars remapped to worktree
- **WHEN** a task file declares `files: [$DESIGNBOOK_OUTPUTS_CONFIG/sections/hero/hero.scenes.yml]`
- **THEN** `DESIGNBOOK_OUTPUTS_CONFIG` resolves to the worktree path, so the file path points inside the worktree

---

### Requirement: workflow done commits outputs to worktree branch on final task

When the last non-test task is marked `done`, `workflow done` SHALL stage and commit declared output files to the worktree branch, then start the preview Storybook and run any declared test tasks.

#### Scenario: output files staged and committed in worktree
- **WHEN** all non-test tasks are done and `worktree_branch` is set in `tasks.yml`
- **THEN** all file paths from `tasks[].files[]` (non-test tasks) are staged with `git -C <writeRoot> add` and committed with a message referencing the workflow name

#### Scenario: worktree branch kept after commit — no auto-merge
- **WHEN** the commit in the worktree succeeds
- **THEN** the branch `workflow/<name>` is NOT merged automatically; it remains for user review
- **THEN** the worktree directory is removed (`git worktree remove <path> --force`)
- **THEN** the CLI outputs the branch name and instructs the user to run `workflow merge <name>` when ready

#### Scenario: no worktree_branch falls back to direct copy
- **WHEN** `tasks.yml` has `write_root` but no `worktree_branch`
- **THEN** existing `commitWorktree` copy+touch behavior is used (backwards compatibility for in-flight workflows)

---

### Requirement: workflow merge merges the worktree branch on user command

`workflow merge <name>` SHALL merge the workflow branch into the current working branch, kill the preview process, and clean up the branch.

#### Scenario: merge succeeds
- **WHEN** `workflow merge --workflow <name>` is called
- **THEN** `git merge --no-ff workflow/<name>` is executed in `rootDir`
- **THEN** any running preview Storybook process (`preview_pid` from `tasks.yml`) is killed
- **THEN** `git branch -d workflow/<name>` cleans up the branch

#### Scenario: merge conflict aborts cleanly
- **WHEN** `git merge` exits with a non-zero code
- **THEN** `git merge --abort` is called, the branch is kept, and an error is thrown describing the conflict

#### Scenario: workflow merge without pre-existing worktree
- **WHEN** `workflow merge` is called after `workflow done` has already removed the worktree
- **THEN** only `git merge --no-ff` and branch cleanup run (no worktree removal needed)
