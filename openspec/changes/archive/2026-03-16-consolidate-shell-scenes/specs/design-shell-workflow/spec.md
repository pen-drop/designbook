## MODIFIED Requirements

### Requirement: AI Command for Design Shell Input

The `debo-design-shell` workflow SHALL produce shell components and `designbook/design-system/design-system.scenes.yml`. The workflow SHALL NOT create `spec.shell.scenes.yml` or use the `designbook/shell/` directory.

#### Scenario: Workflow output files

- **WHEN** the user completes the `/debo-design-shell` workflow
- **THEN** the workflow creates shell components (page, header, footer) and `designbook/design-system/design-system.scenes.yml`
- **AND** no files are written to `designbook/shell/`

#### Scenario: Workflow references Design System page

- **WHEN** the workflow completes and shows a summary
- **THEN** it directs the user to the Design System page to see their shell layout

### Requirement: Design Shell Display

The shell design SHALL be displayed as a sub-section within the Design System page, not as a standalone page.

#### Scenario: User views shell content

- **WHEN** user navigates to the Design System page in Storybook
- **AND** `designbook/design-system/design-system.scenes.yml` exists
- **THEN** the shell layout description and scene grid are displayed below the design tokens
