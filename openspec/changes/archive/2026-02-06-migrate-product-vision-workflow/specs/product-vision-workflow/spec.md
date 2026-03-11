## ADDED Requirements

### Requirement: Product Vision Display Page (Read-Only)
The system SHALL provide an MDX documentation page at `.storybook/onboarding/product-vision.mdx` that **displays** the product vision data and references the AI command for data input. Storybook itself SHALL NOT provide write access — all data entry happens exclusively through AI commands.

#### Scenario: User accesses product vision page with no data
- **WHEN** user navigates to the product vision page in Storybook
- **AND** no product vision data exists at `designbook/product/vision.md`
- **THEN** the page displays an empty state with a reference to the `/product-vision` AI command
- **AND** instructions explain how to run the AI command in the editor

#### Scenario: User accesses product vision page with existing data
- **WHEN** user navigates to the product vision page in Storybook
- **AND** product vision data exists at `designbook/product/vision.md`
- **THEN** the page loads and displays the saved product vision data
- **AND** the data is rendered using the `ProductOverviewCard` React component
- **AND** a reload button allows refreshing the data without page navigation

#### Scenario: User updates product vision
- **WHEN** user wants to update the product vision
- **THEN** the page displays a reference to the `/product-vision` AI command
- **AND** the user runs the AI command in their editor (not in Storybook)
- **AND** after the AI command completes, the user clicks reload to see updated data

### Requirement: AI Command for Product Vision Input
The system SHALL provide a Cursor AI command at `.cursor/commands/product-vision.md` that handles the conversational product vision workflow and saves results to `designbook/product/vision.md`.

#### Scenario: Conversational data gathering
- **WHEN** user runs the `/product-vision` AI command in the editor
- **THEN** the AI guides the user through a multi-step conversation
- **AND** the conversation covers product name, description, problems/solutions, and key features

#### Scenario: Clarifying questions
- **WHEN** the AI receives initial input from the user
- **THEN** it asks 3-5 targeted follow-up questions to refine the product vision
- **AND** questions are conversational and help shape the vision

#### Scenario: File output
- **WHEN** the user approves the final product vision draft
- **THEN** the AI command saves the result to `designbook/product/vision.md`
- **AND** the file follows a structured Markdown format (heading, description, problems/solutions, key features)

### Requirement: Data Loading via Vite Plugin Middleware
The system SHALL provide a Vite plugin at `.storybook/source/vite-plugin-designbook-save.js` that serves as middleware for loading files from the `designbook/` directory.

#### Scenario: Load existing product vision data
- **WHEN** the MDX page requests data via `GET /__designbook/load?path=product/vision.md`
- **THEN** the Vite middleware reads the file from `designbook/product/vision.md`
- **AND** returns the file content as plain text

#### Scenario: File not found
- **WHEN** the MDX page requests data for a file that does not exist
- **THEN** the Vite middleware returns HTTP 404
- **AND** the MDX page displays the empty state with AI command reference

### Requirement: Read-Only Storybook Display with React Components
The product vision MDX page SHALL embed the `ProductOverviewCard` React component from `.storybook/source/components/` to display saved product vision data in a structured format.

#### Scenario: ProductOverviewCard renders saved data
- **WHEN** product vision data is loaded from the Markdown file
- **THEN** the MDX page parses the Markdown and passes structured data as props to `ProductOverviewCard`
- **AND** the component displays product name, description, problems/solutions, and key features

#### Scenario: React component renders in MDX
- **WHEN** the MDX page imports the `ProductOverviewCard` component
- **THEN** the component renders correctly within Storybook's MDX context
- **AND** the component uses `debo:` prefixed Tailwind classes for CSS isolation

### Requirement: Storybook Integration
The product vision page SHALL integrate seamlessly with Storybook's MDX rendering, theme system, and documentation structure.

#### Scenario: Theme support
- **WHEN** user switches between light and dark themes in Storybook
- **THEN** the product vision page adapts to the selected theme
- **AND** all UI elements remain visible and readable in both themes

#### Scenario: MDX file discovery
- **WHEN** Storybook loads
- **THEN** the product vision MDX file is discovered from `.storybook/onboarding/*.mdx` pattern
- **AND** the page appears in Storybook's navigation structure

### Requirement: Agent Browser Validation
The product vision page SHALL be validated using the Agent Browser tool.

#### Scenario: Agent Browser validates data display
- **WHEN** the Agent Browser tool is used to validate the product vision page
- **THEN** it verifies that saved product vision data is loaded and displayed correctly
- **AND** it confirms that the `ProductOverviewCard` component renders the data

#### Scenario: Agent Browser validates empty state
- **WHEN** the Agent Browser tool tests the page with no saved data
- **THEN** it verifies that the empty state is displayed with the AI command reference
- **AND** it confirms the `/product-vision` command reference is visible

#### Scenario: Agent Browser validates reload
- **WHEN** the Agent Browser tool clicks the reload button
- **THEN** it verifies that the data is refreshed from the file system
