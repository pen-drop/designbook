## Requirements

### Requirement: ShellSpecCard Component
The system SHALL provide a `ShellSpecCard` React component at `.storybook/source/components/ShellSpecCard.jsx` that displays the application shell specification. Composed from `DeboCard` and `DeboCollapsible`.

#### Scenario: Card displays overview
- **WHEN** `ShellSpecCard` is rendered with shell spec data containing an overview
- **THEN** it shows the overview text at the top of the card

#### Scenario: Card displays navigation structure
- **WHEN** `ShellSpecCard` is rendered with navigation items
- **THEN** navigation items are shown in a `DeboCollapsible` as a bullet list with count badge

#### Scenario: Card displays layout and responsive info
- **WHEN** `ShellSpecCard` is rendered with layout pattern and responsive behavior
- **THEN** layout pattern is shown in a `DeboCollapsible`
- **AND** responsive behavior is shown in a `DeboCollapsible`

#### Scenario: Component uses debo: CSS prefix
- **WHEN** `ShellSpecCard` is rendered
- **THEN** all Tailwind utility classes use the `debo:` prefix
