## ADDED Requirements

### Requirement: Validation is a hard gate before task completion
After a file is registered via `!WORKFLOW_FILE`, validation MUST pass (exit 0) before the task can be marked done. This is a blocking check.

#### Scenario: Validation required after file registration
- **WHEN** a file is registered via `designbook-workflow update --files <path>`
- **THEN** `designbook-workflow validate` MUST be run immediately

#### Scenario: Task cannot be marked done with failing validation
- **WHEN** a task attempts to mark `--status done` but registered files have `valid: false`
- **THEN** the CLI rejects the update with an error message listing the failures

#### Scenario: AI must fix errors before continuing
- **WHEN** `designbook-workflow validate` returns exit code != 0
- **THEN** the AI MUST fix the specific errors, re-run validate, and repeat until exit 0

### Requirement: Validation failures are reported clearly
When validation fails, the system SHALL provide specific, actionable error messages.

#### Scenario: Error message includes file path and reason
- **WHEN** a file fails validation
- **THEN** the error message includes the file path, the validation type, and the specific failure reason (e.g., "Missing required field: $value")

#### Scenario: AI reads and acts on validation errors
- **WHEN** validation output lists specific errors
- **THEN** the AI updates the file to correct the errors before re-validating

### Requirement: Validation success unblocks task completion
When all registered files validate (exit 0), the task can proceed to done status.

#### Scenario: All files valid allows done
- **WHEN** `designbook-workflow validate` returns exit code 0 for all files
- **THEN** `designbook-workflow update --status done` is allowed to succeed

#### Scenario: No partial success
- **WHEN** some files are valid but others fail
- **THEN** the entire task remains in `in-progress` until ALL files are valid
