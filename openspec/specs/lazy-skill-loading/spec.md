# Lazy Skill Loading

## Purpose

Defines the just-in-time skill loading pattern for Designbook workflows. Skills are loaded only at the execution step where needed, not upfront.

---

## Requirement: Just-in-time skill loading
The `debo-design-screen` workflow SHALL load each skill only at the execution step where it is needed, not upfront.

#### Scenario: Component creation loads components-sdc skill
- **WHEN** the workflow reaches the UI component creation step
- **THEN** it SHALL read `designbook-components-sdc/SKILL.md` and its resources at that point
- **AND** it SHALL NOT have loaded this skill in any prior step

#### Scenario: View mode creation loads view-modes skill
- **WHEN** the workflow reaches the view mode creation step
- **THEN** it SHALL read `designbook-view-modes/SKILL.md` at that point
- **AND** it SHALL NOT have loaded this skill in any prior step

#### Scenario: Scenes creation loads scenes skill
- **WHEN** the workflow reaches the scenes file creation step
- **THEN** it SHALL read `designbook-scenes/SKILL.md` at that point
- **AND** it SHALL NOT have loaded this skill in any prior step

---

## Requirement: No upfront skill loading step
The workflow SHALL NOT contain a step that reads all skills before execution begins.

#### Scenario: Old Step 3 removed
- **WHEN** the workflow is executed
- **THEN** there SHALL be no step titled "Read All Design Skills & Resources"
- **AND** the workflow SHALL NOT reference `daisyui-llms.txt`

---

## Requirement: Shell as prerequisite
The workflow SHALL check for the existence of `shell.scenes.yml` and page/header/footer components. If any are missing, it SHALL stop and tell the user to run `/debo-design-shell` first.

#### Scenario: Shell exists
- **WHEN** `shell.scenes.yml` and shell components exist
- **THEN** the workflow proceeds normally

#### Scenario: Shell missing
- **WHEN** `shell.scenes.yml` or shell components are missing
- **THEN** the workflow SHALL stop with a message pointing to `/debo-design-shell`
- **AND** it SHALL NOT attempt to create shell components

---

## Requirement: Direct execution without plan approval
The workflow SHALL execute component creation, view mode generation, scenes generation, and CSS generation immediately after section selection without a plan-and-approve step.

#### Scenario: Normal execution
- **WHEN** user runs `/debo-design-screen` without `--spec`
- **THEN** the workflow SHALL execute all steps directly after section selection

#### Scenario: Spec mode dry run
- **WHEN** user runs `/debo-design-screen --spec`
- **THEN** the workflow SHALL output what WOULD be created (file paths and content summaries) without writing any files

---

## Requirement: CSS generation via delegation
The workflow SHALL delegate CSS generation to the `//debo-css-generate` workflow instead of loading CSS skills inline.

#### Scenario: CSS generation delegated
- **WHEN** the workflow reaches the CSS generation step
- **THEN** it SHALL invoke the `//debo-css-generate` workflow
- **AND** it SHALL NOT load `designbook-css-daisyui` or `designbook-css-generate` skills directly

---

## Requirement: Framework-aware skill resolution
The workflow SHALL source `designbook-configuration` (`set-env.sh`) to resolve `$DESIGNBOOK_FRAMEWORK_COMPONENT` and `$DESIGNBOOK_FRAMEWORK_CSS`. It SHALL load the component skill matching the configured framework: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`.

#### Scenario: Component skill resolved from config
- **WHEN** `designbook.config.yml` has `frameworks.component: sdc`
- **THEN** the workflow SHALL load `designbook-components-sdc/SKILL.md`
- **AND** it SHALL NOT hardcode the skill name `designbook-components-sdc`

#### Scenario: CSS framework resolved by delegation
- **WHEN** the workflow delegates to `//debo-css-generate`
- **THEN** the CSS workflow SHALL resolve `$DESIGNBOOK_FRAMEWORK_CSS` internally
- **AND** the screen workflow SHALL NOT load any CSS framework skill directly

---

## Requirement: Dead references removed
The workflow SHALL NOT reference `components-entity-sdc`, `generate-stories.js`, or `designbook-web-reference`.

#### Scenario: No dead skill references
- **WHEN** the workflow file is inspected
- **THEN** it SHALL NOT contain references to `designbook-components-entity-sdc`
- **AND** it SHALL NOT contain references to `designbook-web-reference`
