## ADDED Requirements

### Requirement: Design System page includes shell layout section

The `DeboDesignSystemPage` component SHALL display the shell layout as a sub-section below the design tokens section. It SHALL load scene data from `design-system/design-system.scenes.yml` (relative to the designbook directory) and render the description and scene grid.

#### Scenario: Design System page with no generated scenes file

- **WHEN** user navigates to the Design System page
- **AND** no file exists at `designbook/design-system/design-system.scenes.yml`
- **THEN** the page displays design tokens (if present) followed by a shell empty state via `DeboSection` referencing the `/debo-design-shell` command

#### Scenario: Design System page with generated scenes file

- **WHEN** user navigates to the Design System page
- **AND** `designbook/design-system/design-system.scenes.yml` exists with scenes data
- **THEN** the page displays design tokens followed by the shell description and scene grid

#### Scenario: Design System page renders both sections

- **WHEN** both design tokens and design-system scenes data exist
- **THEN** the page renders two `DeboSection` blocks in order: (1) tokens, (2) shell/layout scenes
