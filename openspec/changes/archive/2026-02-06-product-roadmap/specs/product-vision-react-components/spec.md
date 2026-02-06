## MODIFIED Requirements

### Requirement: ProductOverviewCard Component (Primary Display Component)
The system SHALL provide a ProductOverviewCard React component that displays a summary of the defined product vision including name, description, problems/solutions, and key features. The component SHALL be composed from `DeboCard` and `DeboCollapsible` shared base components instead of inline card/collapsible implementations.

#### Scenario: Card displays product information
- **WHEN** ProductOverviewCard is rendered with product data
- **THEN** it wraps content in a `DeboCard` component with the product name as title
- **AND** it shows the product description

#### Scenario: Card shows problems and solutions
- **WHEN** ProductOverviewCard receives problems/solutions data
- **THEN** it displays problems and solutions inside a `DeboCollapsible` component
- **AND** the `DeboCollapsible` shows the count of problems as a badge
- **AND** users can expand/collapse the problems section

#### Scenario: Card shows key features
- **WHEN** ProductOverviewCard receives key features data
- **THEN** it displays the list of key features inside a `DeboCollapsible` component
- **AND** the `DeboCollapsible` shows the count of features as a badge
- **AND** features are presented in a clear, scannable format

#### Scenario: Component is significantly smaller after refactoring
- **WHEN** the refactored `ProductOverviewCard` is compared to the original
- **THEN** it uses `DeboCard` and `DeboCollapsible` instead of inline card/toggle implementations
- **AND** the component source code is reduced from ~130 lines to ~30 lines
