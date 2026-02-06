## Requirements

### Requirement: Data Model Display Page (Read-Only)
The system SHALL provide an MDX documentation page at `.storybook/onboarding/data-model.mdx` with `<Meta title="Data Model" />` that displays the data model and references the AI command for data input. Storybook SHALL NOT provide write access — all data entry happens exclusively through the `/data-model` AI command. The page SHALL use `DeboSection` shared components.

#### Scenario: User accesses data model page with no data
- **WHEN** user navigates to the Data Model page in Storybook
- **AND** no data model exists at `designbook/data-model/data-model.md`
- **THEN** the page displays an empty state via `DeboSection` with a reference to the `/data-model` AI command

#### Scenario: User accesses data model page with existing data
- **WHEN** user navigates to the Data Model page in Storybook
- **AND** data model data exists at `designbook/data-model/data-model.md`
- **THEN** the page loads and displays entities and relationships using `DeboSection`
- **AND** the data is rendered using the `DataModelCard` React component via `renderContent` prop
- **AND** a reload button allows refreshing the data without page navigation

#### Scenario: User updates data model
- **WHEN** user wants to update the data model
- **THEN** the section footer displays a reference to the `/data-model` AI command
- **AND** the user runs the AI command in their editor (not in Storybook)
- **AND** after the AI command completes, the user clicks reload to see updated data

### Requirement: AI Command for Data Model Input
The system SHALL provide a Cursor AI command at `.cursor/commands/data-model.md` that handles the conversational data model workflow, reads the existing product vision and roadmap for context, and saves results to `designbook/data-model/data-model.md`.

#### Scenario: AI command reads product vision and roadmap
- **WHEN** user runs the `/data-model` AI command
- **AND** product vision and roadmap data exist
- **THEN** the AI reads both files first
- **AND** uses them to propose initial entities based on the product's problems, features, and sections

#### Scenario: AI command handles missing prerequisites
- **WHEN** user runs the `/data-model` AI command
- **AND** no product vision data exists
- **THEN** the AI informs the user that a product vision should be defined first
- **AND** suggests running `/product-vision` before defining the data model

#### Scenario: AI proposes entities and relationships
- **WHEN** the AI has context from the product vision and roadmap
- **THEN** it proposes core entities based on the product's domain
- **AND** each entity has a name and plain-language description
- **AND** it suggests relationships between entities

#### Scenario: AI iterates on data model with user
- **WHEN** the AI presents proposed entities and relationships
- **THEN** the user can add, remove, or modify entities and relationships
- **AND** the AI asks clarifying questions to refine the model

#### Scenario: File output
- **WHEN** the user approves the final data model
- **THEN** the AI command saves the result to `designbook/data-model/data-model.md`
- **AND** the file follows the structured Markdown format with `## Entities` and `## Relationships` sections

### Requirement: Data Model Markdown File Format
The data model Markdown file at `designbook/data-model/data-model.md` SHALL follow a structured format compatible with the data model parser, matching the Design OS format.

#### Scenario: File format matches expected structure
- **WHEN** the AI command saves the data model file
- **THEN** the file starts with `# Data Model`
- **AND** contains a `## Entities` section with `### EntityName` headings followed by descriptions
- **AND** contains a `## Relationships` section with bullet-point relationship descriptions
- **AND** entity names are singular (User, not Users)

#### Scenario: Parser extracts entities and relationships
- **WHEN** the MDX page parses the data model Markdown
- **THEN** it extracts an array of `{ name, description }` entity objects
- **AND** it extracts an array of relationship strings
