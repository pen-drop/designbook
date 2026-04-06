## ADDED Requirements

### Requirement: Skill invocation
The skill SHALL be invokable as `/debo-test <suite> <case>`. It SHALL be a standalone skill at `.agents/skills/designbook-test/`.

#### Scenario: Basic invocation
- **WHEN** the user runs `/debo-test drupal-stitch design-screen`
- **THEN** the skill SHALL read `fixtures/drupal-stitch/cases/design-screen.yaml`

#### Scenario: Missing case file
- **WHEN** the user runs `/debo-test drupal-stitch nonexistent`
- **THEN** the skill SHALL report that `fixtures/drupal-stitch/cases/nonexistent.yaml` does not exist

### Requirement: Workspace setup
The skill SHALL create a fresh workspace by calling `scripts/setup-test.sh` (or equivalent logic). The workspace SHALL be a new directory with git initialized and a "base" commit containing all layered fixtures.

#### Scenario: Fresh workspace creation
- **WHEN** `/debo-test drupal-stitch design-screen` is invoked
- **THEN** a workspace directory SHALL be created
- **THEN** `designbook.config.yml` from the suite SHALL be copied in
- **THEN** fixture directories listed in the case SHALL be layered in order
- **THEN** `.agents/` and `.claude/` SHALL be symlinked into the workspace
- **THEN** `git init` + `git add -A` + `git commit -m "base"` SHALL be run

### Requirement: Prompt display and execution
After workspace setup, the skill SHALL display the prompt from the case file and ask the user whether to execute it.

#### Scenario: User confirms execution
- **WHEN** the workspace is ready and the prompt is displayed
- **THEN** the skill SHALL ask the user to confirm
- **WHEN** the user confirms
- **THEN** the skill SHALL execute the prompt (run the workflow in the workspace)

#### Scenario: User declines execution
- **WHEN** the user declines execution
- **THEN** the skill SHALL leave the workspace intact for manual use

### Requirement: Snapshot offer after workflow
After a workflow completes, the skill SHALL offer to save the workspace diff as a fixture.

#### Scenario: User accepts snapshot
- **WHEN** a workflow completes successfully
- **THEN** the skill SHALL run `git diff --name-only` and `git ls-files --others --exclude-standard` in the workspace
- **THEN** the skill SHALL display the list of changed/new files
- **THEN** the skill SHALL ask whether to save as a fixture and suggest the workflow name as default
- **WHEN** the user confirms
- **THEN** changed/new files SHALL be copied to `fixtures/<suite>/<fixture-name>/` preserving path structure

#### Scenario: User declines snapshot
- **WHEN** the user declines the snapshot offer
- **THEN** no fixture SHALL be created
- **THEN** the workspace SHALL remain for further manual work

### Requirement: List available cases
When invoked with only a suite name and no case, the skill SHALL list available cases.

#### Scenario: List cases
- **WHEN** the user runs `/debo-test drupal-stitch`
- **THEN** the skill SHALL list all `.yaml` files in `fixtures/drupal-stitch/cases/`
