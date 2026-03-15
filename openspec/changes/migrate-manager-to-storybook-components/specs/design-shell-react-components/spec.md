## MODIFIED Requirements

### Requirement: Panel displays workflow activity with tabs
The Panel SHALL use Storybook `TabsState` component to render tabbed content. The first tab SHALL be "Workflows" showing the activity log. The second tab SHALL be "Status" showing milestone badges and section overview.

#### Scenario: Panel shows Workflows tab by default
- **WHEN** the Designbook panel is opened
- **THEN** the "Workflows" tab is active showing recent workflow activity

#### Scenario: Panel shows Status tab with badges
- **WHEN** the user clicks the "Status" tab in the panel
- **THEN** milestone badges (vision, tokens, data-model, shell, sections) are displayed
- **AND** per-section badges are shown below
