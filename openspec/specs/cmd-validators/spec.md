## ADDED Requirements

### Requirement: cmd: prefix executes shell command as validator

When a validator key starts with `cmd:`, the system SHALL execute the remainder as a shell command with `{{ file }}` replaced by the absolute file path. Exit code 0 means valid, non-zero means invalid.

#### Scenario: Successful command validation
- **WHEN** a file is written with `validators: ["cmd:npx jsonata-w transform --dry-run {{ file }}"]`
- **AND** the command exits with code 0
- **THEN** the validation result is `valid: true`

#### Scenario: Failed command validation
- **WHEN** a file is written with `validators: ["cmd:npx jsonata-w transform --dry-run {{ file }}"]`
- **AND** the command exits with code 1 and stderr contains "JSONata error: unexpected token"
- **THEN** the validation result is `valid: false`
- **AND** the error message contains "JSONata error: unexpected token"

#### Scenario: Command with empty stderr on failure
- **WHEN** a command validator exits with code 2 and stderr is empty
- **THEN** the error message is "Command failed with exit code 2"

#### Scenario: Command timeout
- **WHEN** a command validator does not exit within 30 seconds
- **THEN** the validation result is `valid: false`
- **AND** the error message indicates a timeout

### Requirement: cmd: validators coexist with built-in validators

The `cmd:` prefix SHALL NOT interfere with existing built-in validator keys. Both types can be used in the same `validators` array.

#### Scenario: Mixed validators
- **WHEN** a file is written with `validators: ["tokens", "cmd:npx some-check {{ file }}"]`
- **THEN** the built-in `tokens` validator runs first
- **AND** the `cmd:` validator runs second
- **AND** the first failure stops the chain

### Requirement: cmd: validators accepted by getValidatorKeys check

The `write-file` CLI SHALL accept `cmd:` prefixed strings in the validators array without rejecting them as unknown keys.

#### Scenario: Unknown key check skips cmd: validators
- **WHEN** a task file declares `validators: ["cmd:npx some-check {{ file }}"]`
- **AND** the CLI validates known validator keys at plan time
- **THEN** the `cmd:` entry is accepted without error
