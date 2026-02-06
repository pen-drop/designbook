## ADDED Requirements

### Requirement: DataModelCard Component
The system SHALL provide a `DataModelCard` React component at `.storybook/source/components/DataModelCard.jsx` that displays data model entities and relationships. The component SHALL be composed from `DeboCard` and `DeboCollapsible` shared base components.

#### Scenario: Card displays entities in a grid
- **WHEN** `DataModelCard` is rendered with data model data containing entities
- **THEN** it wraps content in a `DeboCard` component
- **AND** entities are displayed inside a `DeboCollapsible` with the entity count as badge
- **AND** entities are shown in a responsive 2-column grid (single column on mobile)
- **AND** each entity shows its name as a heading and description as text

#### Scenario: Card displays relationships as a list
- **WHEN** `DataModelCard` is rendered with data model data containing relationships
- **THEN** relationships are displayed inside a `DeboCollapsible` with the relationship count as badge
- **AND** each relationship is rendered as a bullet-point list item

#### Scenario: Card handles empty data gracefully
- **WHEN** `DataModelCard` is rendered with no entities or no relationships
- **THEN** missing sections are not rendered
- **AND** the component does not crash

#### Scenario: Component uses debo: CSS prefix
- **WHEN** `DataModelCard` is rendered
- **THEN** all Tailwind utility classes use the `debo:` prefix
- **AND** the component supports light and dark themes
