# Lazy Skill Loading

## Purpose
Defines the just-in-time skill and task loading pattern for Designbook workflows. Task files, rules, and blueprints are loaded only at the execution step where they are needed, not upfront. All designbook workflows are part of the unified `designbook` skill (command `/debo`).

## Requirements

### Requirement: Just-in-time task and rule loading
Designbook workflows SHALL load task files and rule files only at the execution step where they are needed, not upfront. The CLI resolves which files to load at each step via `when` frontmatter matching.

#### Scenario: Component creation loads matching tasks at step time
- **WHEN** the `design-screen` workflow reaches the `create-component` step
- **THEN** the CLI resolves task files matching `when: { steps: [create-component] }` at that point
- **AND** matching rules are loaded before the task file
- **AND** no task or rule files for later steps have been loaded yet

#### Scenario: Extension skill tasks loaded only when matched
- **WHEN** the `design-screen` workflow reaches a step and `designbook-drupal` has a task with matching `when.steps`
- **THEN** the extension task is loaded at that step
- **AND** it was NOT loaded in any prior step

### Requirement: No upfront skill loading step
The workflow SHALL NOT contain a step that reads all skills before execution begins.

#### Scenario: No bulk skill loading
- **WHEN** the workflow is executed
- **THEN** there SHALL be no step titled "Read All Design Skills & Resources"
- **AND** the workflow SHALL NOT reference `daisyui-llms.txt`

### Requirement: Before hooks for prerequisite workflows
Design workflows SHALL use `before:` hooks in workflow frontmatter to declare prerequisite workflows that must run first. The `execute: if-never-run` condition ensures the prerequisite runs only if it has never completed.

#### Scenario: CSS generation as prerequisite
- **WHEN** `design-screen.md` declares `before: [{ workflow: css-generate, execute: if-never-run }]`
- **AND** `css-generate` has never been run
- **THEN** the `css-generate` workflow runs before `design-screen` begins its own stages

#### Scenario: Prerequisite already satisfied
- **WHEN** `design-screen.md` declares `before: [{ workflow: css-generate, execute: if-never-run }]`
- **AND** `css-generate` has previously completed
- **THEN** the `css-generate` workflow is skipped and `design-screen` proceeds directly

#### Scenario: Multiple design workflows share the same prerequisite
- **WHEN** `design-screen.md`, `design-shell.md`, and `design-component.md` all declare `before: [{ workflow: css-generate, execute: if-never-run }]`
- **THEN** each workflow independently checks if `css-generate` has been run

### Requirement: Direct execution without plan approval
The workflow SHALL execute steps directly via the CLI response-driven loop without a plan-and-approve step, unless `--spec` mode is enabled.

#### Scenario: Normal execution
- **WHEN** user runs `/debo design-screen` without `--spec`
- **THEN** the workflow executes all steps directly via the CLI loop

#### Scenario: Spec mode dry run
- **WHEN** user runs `/debo design-screen --spec`
- **THEN** the workflow outputs what WOULD be created (file paths and content summaries) without writing any files

### Requirement: Dead references removed
The workflow SHALL NOT reference deleted or renamed skills.

#### Scenario: No dead skill references
- **WHEN** any workflow file in the `designbook` skill is inspected
- **THEN** it SHALL NOT contain references to `designbook-view-modes`, `designbook-scenes`, `designbook-css-daisyui`, `designbook-components-sdc`, `designbook-components-entity-sdc`, or `designbook-web-reference`
