## NEW Requirements

### Requirement: user controls merge via workflow merge command

After the test stage completes (or if no test stage), the CLI outputs a structured review status. The AI agent presents this to the user in the conversation. When the user approves, the agent runs `workflow merge <name>`, which squash-merges the branch into the working branch.

#### Scenario: review status output after tests pass
- **WHEN** all test tasks pass (or no test tasks declared)
- **THEN** `workflow done` outputs:
  ```
  ✓ Workflow <name> ready for review
    Branch:   workflow/<name>
    Preview:  http://localhost:<port>
    Changes:  +3 files, ~1 modified
  Run: workflow merge --workflow <name>
  ```

#### Scenario: review status output when tests fail
- **WHEN** one or more test tasks report failures
- **THEN** the review status includes test results and flags the failures
- **THEN** the user can still choose to merge (bypassing test results) or decline

#### Scenario: workflow merge squash-merges the branch
- **WHEN** `workflow merge --workflow <name>` is called
- **THEN** `git merge --squash workflow/<name>` is executed in `rootDir` (squashes all worktree commits into staged changes)
- **THEN** `git commit -m "workflow: <name>"` creates a single clean commit
- **THEN** the preview process is killed, the branch and worktree are cleaned up

#### Scenario: multiple workflow branches can coexist
- **WHEN** two workflows are running in parallel (e.g., `workflow/debo-design-shell` and `workflow/debo-hero-component`)
- **THEN** each has its own branch and worktree
- **THEN** `workflow merge` for one does not affect the other
- **THEN** they can be merged in any order

#### Scenario: decline to merge — branch kept
- **WHEN** the user decides not to merge after review
- **THEN** the branch `workflow/<name>` remains intact
- **THEN** the preview continues running (or was already stopped)
- **THEN** the user can revisit with `workflow merge` at any time
