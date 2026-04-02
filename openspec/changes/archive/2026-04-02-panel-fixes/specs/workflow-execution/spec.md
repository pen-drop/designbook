## MODIFIED Requirements

### Requirement: Every debo workflow SHALL track progress via CLI

Every `debo-*` workflow SHALL call `workflow create` at start and `workflow update` after each step. The `workflow start` command SHALL NOT filter out intake stage steps — intake tasks created at `workflow create` time SHALL remain in the workflow and be included in step processing.

Applicable workflows: debo-vision, debo-sections, debo-shape-section, debo-design-tokens, debo-css-generate, debo-data-model, debo-sample-data, debo-design-shell, debo-design-component, debo-design-screen, debo-screenshot-design, debo-export-product.

#### Scenario: Spec mode creates tasks but does not execute
- **WHEN** a workflow is invoked with `--spec`
- **THEN** `workflow create` runs (generating tasks.yml), the plan is output, and execution stops

#### Scenario: Normal mode plans via CLI then executes via subagents
- **WHEN** a workflow runs without `--spec`
- **THEN** the AI calls `workflow plan` with `--workflow-file`, `--params`, and `--items`; the CLI resolves everything; then the AI starts DAG execution with subagents

#### Scenario: Intake tasks persist through workflow start
- **WHEN** `workflow start` processes steps from stage definitions
- **THEN** intake stage steps SHALL NOT be filtered out
- **AND** intake tasks created during `workflow create` SHALL remain visible in the task list
