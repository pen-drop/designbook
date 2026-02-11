## ADDED Requirements

### Requirement: Viewer Displays Data Model
The Storybook addon SHALL read and display the contents of the `designbook/data-model.json` file using a dedicated card component.

#### Scenario: Display Valid Data Model
- **WHEN** the `designbook/data-model.json` file exists and contains valid JSON data matching the schema
- **THEN** the addon renders a "Data Model" card
- **AND** the card displays a **summary of bundles grouped by entity type** (e.g., Node: Article, Page)
- **AND** the interface clearly indicates that the model is **read-only** and managed by the AI assistant

#### Scenario: Handle Missing Data Model
- **WHEN** the `designbook/data-model.json` file does not exist
- **THEN** the addon does NOT render the "Data Model" card (or renders an empty state/instruction)
