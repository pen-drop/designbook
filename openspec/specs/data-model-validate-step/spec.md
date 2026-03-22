# data-model-validate-step Specification

## Purpose
Defines requirements for the standalone `steps/validate.md` file in the `designbook-data-model` skill — encapsulating the schema validation command, expected output, and fix guidance as a referenceable step.

## Requirements

### Requirement: Validate step exists as standalone file
The `designbook-data-model` skill SHALL provide `steps/validate.md` encapsulating the schema validation command, expected output, and fix guidance.

#### Scenario: Step file is referenceable
- **WHEN** a workflow loads `@designbook-data-model/steps/validate.md`
- **THEN** the agent receives complete instructions to run the validate command and handle errors

#### Scenario: Step file contains exact CLI command
- **WHEN** an agent reads `steps/validate.md`
- **THEN** it finds `node packages/storybook-addon-designbook/dist/cli.js validate data-model`

#### Scenario: Fix loop is described
- **WHEN** the command exits with code 1
- **THEN** the step instructs the agent to read error output, fix `data-model.yml`, and re-run until exit 0
