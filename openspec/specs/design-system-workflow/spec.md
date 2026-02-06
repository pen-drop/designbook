## Requirements

### Requirement: Design System Display Page (Read-Only)
The system SHALL provide an MDX documentation page at `.storybook/onboarding/design-system.mdx` with `<Meta title="Design System" />` that displays design tokens and references the AI command for input. The page SHALL use `DeboSection` shared components.

#### Scenario: User accesses design system page with no data
- **WHEN** user navigates to the Design System page in Storybook
- **AND** no design tokens exist at `designbook/design-system/design-tokens.md`
- **THEN** the page displays an empty state via `DeboSection` with a reference to the `/design-tokens` AI command

#### Scenario: User accesses design system page with existing data
- **WHEN** user navigates to the Design System page in Storybook
- **AND** design tokens exist at `designbook/design-system/design-tokens.md`
- **THEN** the page loads and displays colors and typography using `DeboSection`
- **AND** the data is rendered using the `DesignTokensCard` React component

#### Scenario: User updates design tokens
- **WHEN** user wants to update design tokens
- **THEN** the section footer references the `/design-tokens` AI command

### Requirement: AI Command for Design Tokens Input
The system SHALL provide a Cursor AI command at `.cursor/commands/design-tokens.md` that guides the user through choosing colors and typography.

#### Scenario: AI command reads product vision
- **WHEN** user runs the `/design-tokens` AI command
- **AND** product vision exists
- **THEN** the AI reads it to understand the product context and suggest fitting colors/fonts

#### Scenario: AI command handles missing prerequisites
- **WHEN** user runs the `/design-tokens` AI command
- **AND** no product vision exists
- **THEN** the AI suggests running `/product-vision` first

#### Scenario: AI guides color selection
- **WHEN** the AI helps choose colors
- **THEN** it presents Tailwind palette options for primary, secondary, and neutral
- **AND** suggestions are contextual to the product type

#### Scenario: AI guides typography selection
- **WHEN** the AI helps choose typography
- **THEN** it presents Google Fonts options for heading, body, and mono
- **AND** suggests popular pairings

#### Scenario: File output
- **WHEN** the user approves the final choices
- **THEN** the AI saves to `designbook/design-system/design-tokens.md`
- **AND** the file uses the structured Markdown format with `## Colors` and `## Typography` sections

### Requirement: Design Tokens Markdown File Format
The design tokens file SHALL follow a structured Markdown format.

#### Scenario: File format matches expected structure
- **WHEN** the AI command saves the file
- **THEN** it starts with `# Design Tokens`
- **AND** contains `## Colors` with `- Primary: [name]`, `- Secondary: [name]`, `- Neutral: [name]`
- **AND** contains `## Typography` with `- Heading: [font]`, `- Body: [font]`, `- Mono: [font]`
- **AND** color values are Tailwind palette names, font values are Google Fonts names
