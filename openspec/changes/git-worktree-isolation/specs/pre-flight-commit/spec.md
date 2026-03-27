## NEW Requirements

### Requirement: pre-flight commit check before worktree creation

Before creating a git worktree, `workflow plan` SHALL check for uncommitted changes under `outputs.root`. The user must have a clean working tree in that directory before a workflow branch is created.

#### Scenario: clean working tree — proceed
- **WHEN** `git status --porcelain -- <outputs.root>` returns no output
- **THEN** `workflow plan` proceeds to worktree creation without prompting

#### Scenario: uncommitted changes detected — abort with message
- **WHEN** uncommitted changes exist under `outputs.root`
- **THEN** `workflow plan` outputs the list of changed files and exits with:
  ```
  Error: Uncommitted changes found under outputs.root:
    M packages/integrations/test-integration-drupal/components/hero/hero.twig
    M packages/integrations/test-integration-drupal/css/tokens/tokens.css
  Commit or stash these changes before running workflow plan.
  ```

#### Scenario: pre-flight does not check outside outputs.root
- **WHEN** uncommitted changes exist outside `outputs.root` (e.g., in monorepo packages)
- **THEN** pre-flight passes — only changes under `outputs.root` are relevant

#### Scenario: pre-flight skipped when git not available
- **WHEN** `isGitRepo(rootDir)` returns false
- **THEN** pre-flight check is skipped entirely (plain directory fallback path)
