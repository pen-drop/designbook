## MODIFIED Requirements

### Requirement: Storybook preview detects stale component index

The `storybook-preview.md` task SHALL detect when new components have been added since Storybook was last started. When new components are detected, it SHALL restart Storybook before proceeding.

#### Scenario: New components trigger restart
- **WHEN** the storybook-preview task runs and the component directory contains files created after Storybook's start time
- **THEN** the task stops the running Storybook instance and starts a fresh one

#### Scenario: No new components skip restart
- **WHEN** the storybook-preview task runs and no components were added since Storybook started
- **THEN** the task uses the existing Storybook instance without restarting

#### Scenario: Storybook not running starts fresh
- **WHEN** the storybook-preview task runs and Storybook is not running
- **THEN** the task starts Storybook normally (existing behavior unchanged)
