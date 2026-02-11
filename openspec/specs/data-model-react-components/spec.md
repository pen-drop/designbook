## Requirements

## Requirements

### Requirement: DeboDataModelCard Component
The system SHALL provide a `DeboDataModelCard` React component that displays data model entities and relationships. The component SHALL be composed from `DeboCard` and `DeboCollapsible` shared base components.

#### Scenario: Card displays data model summary
- **WHEN** `DeboDataModelCard` is rendered with valid data model JSON
- **THEN** it wraps content in a `DeboCard` component
- **AND** displays a summary of bundles grouped by entity type (e.g., Node: Article, Page)
- **AND** the interface clearly indicates that the model is **read-only** and managed by the AI assistant

#### Scenario: Card handles empty data gracefully
- **WHEN** `DeboDataModelCard` is rendered with no data
- **THEN** it does NOT render the card (or renders an empty state/instruction)

#### Scenario: Component uses debo: CSS prefix
- **WHEN** `DeboDataModelCard` is rendered
- **THEN** all Tailwind utility classes use the `debo:` prefix
- **AND** the component supports light and dark themes
