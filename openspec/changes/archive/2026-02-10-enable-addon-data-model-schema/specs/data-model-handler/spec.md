## ADDED Requirements

### Requirement: Handler Validates and Persists Data Model
The `designbook-data-model` skill SHALL validate the input data against the `schema/data-model.json` schema and save it to `designbook/data-model.json` if valid.

#### Scenario: Valid Data Input
- **WHEN** the skill receives a JSON object or file path representing the data model
- **AND** the input validates against `schema/data-model.json`
- **THEN** the skill saves the data to `designbook/data-model.json` (creating directories if needed)
- **AND** returns a success status

#### Scenario: Invalid Data Input
- **WHEN** the skill receives data that does NOT validate against `schema/data-model.json`
- **THEN** the skill returns an error message detailing the validation failures
- **AND** does NOT modify `designbook/data-model.json`
