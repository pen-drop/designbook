## Requirements

### Requirement: Product Roadmap Display Section (Read-Only)
The system SHALL display the product roadmap as a section below the product vision on the existing `.storybook/onboarding/product-vision.mdx` page, using `DeboSection` and `DeboNumberedList` shared components. Storybook SHALL NOT provide write access — roadmap data input happens exclusively through the `/product-roadmap` AI command.

#### Scenario: User views roadmap section with no data
- **WHEN** user scrolls to the roadmap section on the product vision page
- **AND** no roadmap data exists at `designbook/product/product-roadmap.md`
- **THEN** the section displays an empty state via `DeboEmptyState`
- **AND** the empty state references the `/product-roadmap` AI command

#### Scenario: User views roadmap section with existing data
- **WHEN** user scrolls to the roadmap section on the product vision page
- **AND** roadmap data exists at `designbook/product/product-roadmap.md`
- **THEN** the section loads and displays the roadmap sections via `DeboNumberedList`
- **AND** each section shows its numbered position, title, and description
- **AND** a reload button allows refreshing the data

#### Scenario: User updates roadmap
- **WHEN** user wants to update the product roadmap
- **THEN** the section footer references the `/product-roadmap` AI command
- **AND** the user runs the AI command in their editor (not in Storybook)
- **AND** after the AI command completes, the user clicks reload to see updated data

### Requirement: AI Command for Product Roadmap Input
The system SHALL provide a Cursor AI command at `.cursor/commands/product-roadmap.md` that handles the conversational product roadmap workflow, reads the existing product vision for context, and saves results to `designbook/product/product-roadmap.md`.

#### Scenario: AI command reads product vision
- **WHEN** user runs the `/product-roadmap` AI command
- **AND** product vision data exists at `designbook/product/vision.md`
- **THEN** the AI reads the product vision first
- **AND** uses it to inform roadmap section proposals

#### Scenario: AI command handles missing product vision
- **WHEN** user runs the `/product-roadmap` AI command
- **AND** no product vision data exists
- **THEN** the AI informs the user that a product vision should be defined first
- **AND** suggests running `/product-vision` before defining the roadmap

#### Scenario: AI proposes development sections
- **WHEN** the AI has context from the product vision
- **THEN** it proposes 3-5 development sections based on the product's problems, features, and goals
- **AND** each section has a title and one-sentence description
- **AND** sections are ordered by development priority

#### Scenario: AI iterates on sections with user
- **WHEN** the AI presents proposed sections
- **THEN** the user can add, remove, reorder, or modify sections
- **AND** the AI asks clarifying questions to refine the breakdown

#### Scenario: File output
- **WHEN** the user approves the final roadmap
- **THEN** the AI command saves the result to `designbook/product/product-roadmap.md`
- **AND** the file follows the structured Markdown format with numbered sections (`### 1. Title`)

### Requirement: Roadmap Markdown File Format
The product roadmap Markdown file at `designbook/product/product-roadmap.md` SHALL follow a structured format compatible with the roadmap parser.

#### Scenario: File format matches expected structure
- **WHEN** the AI command saves the roadmap file
- **THEN** the file starts with `# Product Roadmap`
- **AND** contains a `## Sections` heading
- **AND** lists sections as `### N. Title` followed by a description line

#### Scenario: Parser extracts sections
- **WHEN** the MDX page parses the roadmap Markdown
- **THEN** it extracts an array of `{ title, description }` objects
- **AND** sections are ordered by their number in the Markdown

### Requirement: Roadmap Section Positioned Below Product Vision
The product roadmap section SHALL appear below the product vision section on the same MDX page, separated by a clear heading.

#### Scenario: Page layout shows vision then roadmap
- **WHEN** user opens the product vision MDX page in Storybook
- **THEN** the product vision section appears first
- **AND** the product roadmap section appears below it
- **AND** both sections load their data independently

#### Scenario: Each section operates independently
- **WHEN** one section has data and the other does not
- **THEN** the section with data displays its content
- **AND** the section without data displays its empty state
- **AND** neither section depends on the other for rendering
