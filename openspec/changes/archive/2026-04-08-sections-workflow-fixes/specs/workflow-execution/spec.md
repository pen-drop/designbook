## ADDED Requirements

### Requirement: workflow plan SHALL auto-complete intake tasks

`workflow plan` SHALL automatically mark all intake-stage tasks as `done` after successful plan expansion. Intake tasks are data-gathering steps completed during conversation — they do not produce validated files.

#### Scenario: Single intake task auto-completed
- **WHEN** `workflow plan` completes successfully for a workflow with one intake step
- **THEN** the CLI marks the intake task as `done` in tasks.yml
- **AND** the plan output reflects the intake task as already complete

#### Scenario: Multiple intake tasks auto-completed with each
- **WHEN** `workflow plan` expands intake tasks per iterable item (e.g., `intake-getting-started`, `intake-workflows`)
- **THEN** the CLI marks ALL intake tasks as `done` in tasks.yml

## MODIFIED Requirements

### Requirement: Every debo workflow SHALL track progress via CLI

Every `debo-*` workflow SHALL call `workflow create` at start and `workflow update` after each step. The `workflow start` command SHALL NOT filter out intake stage steps — intake tasks created at `workflow create` time SHALL remain in the workflow and be included in step processing.

Applicable workflows: debo-vision, debo-sections, debo-shape-section, debo-design-tokens, debo-css-generate, debo-data-model, debo-sample-data, debo-design-shell, debo-design-component, debo-design-screen, debo-screenshot-design, debo-export-product.

#### Scenario: Spec mode creates tasks but does not execute
- **WHEN** a workflow is invoked with `--spec`
- **THEN** `workflow create` runs (generating tasks.yml), the plan is output, and execution stops

#### Scenario: Normal mode plans via CLI then executes via subagents
- **WHEN** a workflow runs without `--spec`
- **THEN** the agent calls `workflow plan` and then executes tasks in stage order

#### Scenario: Intake tasks marked done after plan
- **WHEN** `workflow plan` completes
- **THEN** the agent marks all intake-stage tasks as `done` before entering Phase 2
