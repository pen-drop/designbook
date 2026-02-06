## MODIFIED Requirements

### Requirement: Product Vision Display Page (Read-Only)
The system SHALL provide an MDX documentation page at `.storybook/onboarding/product-vision.mdx` that **displays** the product vision data and references the AI command for data input. The page SHALL also contain a product roadmap section below the product vision. Storybook itself SHALL NOT provide write access — all data entry happens exclusively through AI commands. The page SHALL use `DeboSection` shared components instead of inline fetch/loading/display logic.

#### Scenario: User accesses product vision page with no data
- **WHEN** user navigates to the product vision page in Storybook
- **AND** no product vision data exists at `designbook/product/product-overview.md`
- **THEN** the page displays an empty state via `DeboSection` with a reference to the `/product-vision` AI command
- **AND** instructions explain how to run the AI command in the editor

#### Scenario: User accesses product vision page with existing data
- **WHEN** user navigates to the product vision page in Storybook
- **AND** product vision data exists at `designbook/product/product-overview.md`
- **THEN** the page loads and displays the saved product vision data using `DeboSection`
- **AND** the data is rendered using the `ProductOverviewCard` React component via `renderContent` prop
- **AND** a reload button allows refreshing the data without page navigation

#### Scenario: User updates product vision
- **WHEN** user wants to update the product vision
- **THEN** the section footer displays a reference to the `/product-vision` AI command
- **AND** the user runs the AI command in their editor (not in Storybook)
- **AND** after the AI command completes, the user clicks reload to see updated data

#### Scenario: Page contains both vision and roadmap sections
- **WHEN** user opens the product vision MDX page
- **THEN** the product vision section appears first
- **AND** the product roadmap section appears below
- **AND** each section uses its own `DeboSection` component with independent data loading

#### Scenario: MDX page uses shared components instead of inline logic
- **WHEN** the MDX page is rendered
- **THEN** it uses `DeboSection` for data loading, empty state, and content display
- **AND** it does NOT contain inline `useState`, `useEffect`, or `fetch` logic for data loading
- **AND** the page code is significantly shorter than the inline implementation
