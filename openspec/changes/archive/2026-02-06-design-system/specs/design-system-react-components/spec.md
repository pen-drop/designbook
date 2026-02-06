## ADDED Requirements

### Requirement: DesignTokensCard Component
The system SHALL provide a `DesignTokensCard` React component at `.storybook/source/components/DesignTokensCard.jsx` that displays color swatches and typography information. Composed from `DeboCard` and `DeboCollapsible`.

#### Scenario: Card displays color swatches
- **WHEN** `DesignTokensCard` is rendered with color data
- **THEN** it shows primary, secondary, and neutral colors inside a `DeboCollapsible`
- **AND** each color is displayed as a three-shade swatch (light/base/dark) with the color name

#### Scenario: Card displays typography
- **WHEN** `DesignTokensCard` is rendered with typography data
- **THEN** it shows heading, body, and mono fonts inside a `DeboCollapsible`
- **AND** each font is displayed with its name and role

#### Scenario: Card handles partial data
- **WHEN** only colors or only typography are defined
- **THEN** only the available section is rendered

#### Scenario: Component uses debo: CSS prefix
- **WHEN** `DesignTokensCard` is rendered
- **THEN** all Tailwind utility classes use the `debo:` prefix
