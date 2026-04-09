## ADDED Requirements

### Requirement: Import workflow definition exists in the core skill

The core designbook skill SHALL contain an `import` workflow at `designbook/import/workflows/import.md` with an intake stage and an execute stage that iterates over sub-workflows.

#### Scenario: Workflow file structure

- **WHEN** the import workflow is loaded
- **THEN** it SHALL have `stages.intake.steps: [intake]`
- **AND** `stages.execute.each: workflow`
- **AND** `stages.execute.steps: [run-workflow]`
- **AND** `engine: direct`

### Requirement: Import intake resolves design reference and generates sub-workflow list

The intake task (`intake--import.md`) SHALL resolve a design reference, let the user select screens, and produce a `workflow` iterable where each entry is a sub-workflow call with pre-filled params.

#### Scenario: Stitch project with multiple screens

- **WHEN** the user provides a Stitch project URL
- **AND** the project has 3 screens (homepage, docs-overview, docs-detail)
- **THEN** the intake SHALL present all screens for selection
- **AND** the user SHALL select which screens to import
- **AND** the intake SHALL produce a `workflow` iterable containing: vision, design-guidelines, tokens, css-generate, design-shell, and one design-screen entry per selected screen

#### Scenario: Pre-filled params for vision sub-workflow

- **WHEN** the intake produces the vision sub-workflow entry
- **THEN** it SHALL include `params.product_name` derived from the project name
- **AND** it SHALL include `params.description` derived from available project metadata

#### Scenario: Pre-filled params for guidelines sub-workflow

- **WHEN** the intake produces the design-guidelines sub-workflow entry
- **THEN** it SHALL include the design reference URL in params so the guidelines workflow can set `design_reference` without asking the user

#### Scenario: Pre-filled params for design-screen sub-workflows

- **WHEN** the intake produces design-screen sub-workflow entries
- **THEN** each entry SHALL include the screen reference (URL/ID) in params
- **AND** each entry SHALL include the section mapping (which section this screen belongs to)

#### Scenario: No extension loaded — manual fallback

- **WHEN** no design reference extension is configured (no Stitch, no devtools)
- **THEN** the intake SHALL ask the user for the design reference URL manually
- **AND** the workflow SHALL still produce the sub-workflow list with whatever data is available

#### Scenario: User confirms the import plan

- **WHEN** the intake has resolved all screens and built the sub-workflow list
- **THEN** it SHALL present a summary showing all sub-workflows that will run with their params
- **AND** the user SHALL confirm before execution begins

### Requirement: Execute stage runs sub-workflows in sequence

The `run-workflow` task SHALL instruct the agent to execute the referenced sub-workflow using the standard workflow execution flow with pre-filled params as defaults.

#### Scenario: Sub-workflow executes with pre-filled intake

- **WHEN** the execute stage processes a sub-workflow task
- **THEN** the agent SHALL start the referenced workflow via `workflow create`
- **AND** the sub-workflow's intake SHALL use the pre-filled params as defaults
- **AND** the user SHALL confirm or modify the defaults
- **AND** the sub-workflow SHALL execute to completion before the next task begins

#### Scenario: Sub-workflow with no params (css-generate)

- **WHEN** the execute stage processes a sub-workflow task with empty params
- **THEN** the agent SHALL run the workflow normally without pre-filled defaults

#### Scenario: Fixed execution order

- **WHEN** the execute stage runs
- **THEN** sub-workflows SHALL execute in this order: vision → design-guidelines → tokens → css-generate → design-shell → design-screen (per screen)

### Requirement: Import workflow uses parent tracking

The import workflow SHALL use the `--parent` flag when starting sub-workflows so they are linked to the import workflow for tracking purposes.

#### Scenario: Sub-workflow linked to parent

- **WHEN** a sub-workflow is started from the import execute stage
- **THEN** `workflow create` SHALL include `--parent <import-workflow-name>`
