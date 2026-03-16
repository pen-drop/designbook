# story-sort-order Specification

## Purpose
TBD - created by archiving change story-sort-order. Update Purpose after archive.
## Requirements
### Requirement: Preset exports storySort configuration
The addon preset SHALL export a `preview` async function that includes `parameters.options.storySort` so Storybook applies the Designbook story order to all projects using the addon without any user configuration.

#### Scenario: Built-in pages appear in correct order
- **WHEN** a project uses the Designbook addon
- **THEN** Foundation appears before Design System in the sidebar, and Design System appears before Sections

#### Scenario: Scenes sub-group appears last within Design System
- **WHEN** the Design System group has a Scenes sub-group
- **THEN** the Scenes sub-group appears after all other stories in the Design System group

#### Scenario: Scenes sub-group appears last within any Section
- **WHEN** a user section has a Scenes sub-group
- **THEN** the Scenes sub-group appears after all other stories in that section

#### Scenario: Non-Designbook stories are unaffected
- **WHEN** a project has its own component stories outside the Designbook group
- **THEN** those stories appear after the Designbook group in the sidebar

