## ADDED Requirements

### Requirement: storybook start --force reuses existing port

When `storybook start --force` is called without an explicit `--port` flag, the CLI SHALL reuse the port from the existing Storybook instance.

#### Scenario: Force restart preserves port
- **WHEN** Storybook is running on port 44073
- **AND** `storybook start --force` is called without `--port`
- **THEN** the new Storybook instance SHALL start on port 44073

#### Scenario: Explicit port overrides existing
- **WHEN** Storybook is running on port 44073
- **AND** `storybook start --force --port 6006` is called
- **THEN** the new Storybook instance SHALL start on port 6006

#### Scenario: No existing instance picks free port
- **WHEN** no Storybook instance is running
- **AND** `storybook start` is called without `--port`
- **THEN** the CLI SHALL pick a free port via OS port allocation

### Requirement: storybook restart reuses existing port

When `storybook restart` is called without an explicit `--port` flag, the CLI SHALL reuse the port from the existing Storybook instance.

#### Scenario: Restart preserves port
- **WHEN** Storybook is running on port 44073
- **AND** `storybook restart` is called without `--port`
- **THEN** the new Storybook instance SHALL start on port 44073

#### Scenario: Port read before stop
- **WHEN** `restart` or `start --force` reads the existing port
- **THEN** the port SHALL be captured from the PID file BEFORE `stop()` removes it
