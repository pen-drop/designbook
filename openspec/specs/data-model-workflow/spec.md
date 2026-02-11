## Requirements

### Requirement: Data Model Display Page (Read-Only)
The system SHALL provide an MDX documentation page at `.storybook/onboarding/data-model.mdx` with `<Meta title="Data Model" />` that displays the data model and references the AI command for data input. Storybook SHALL NOT provide write access — all data entry happens exclusively through the `/data-model` AI command. The page SHALL use `DeboSection` shared components.

#### Scenario: User accesses data model page with no data
- **WHEN** user navigates to the Data Model page in Storybook
- **AND** no data model exists at `designbook/data-model.json`
- **THEN** the page displays an empty state via `DeboSection` with a reference to the `/data-model` AI command

#### Scenario: User accesses data model page with existing data
- **WHEN** user navigates to the Data Model page in Storybook
- **AND** data model data exists at `designbook/data-model.json`
- **THEN** the page loads and displays entities and relationships using `DeboSection`
- **AND** the data is rendered using the `DeboDataModelCard` React component via `renderContent` prop
- **AND** a reload button allows refreshing the data without page navigation

#### Scenario: User updates data model
- **WHEN** user wants to update the data model
- **THEN** the section footer displays a reference to the `/data-model` AI command
- **AND** the user runs the AI command in their editor (not in Storybook)
- **AND** after the AI command completes, the user clicks reload to see updated data

### Requirement: AI Command for Data Model Input
The system SHALL provide a Cursor AI command at `.agent/workflows/debo-data-model.md` with `id: debo-data-model`. This command handles the conversational data model workflow, reads the existing product vision and roadmap for context, and uses the `designbook-data-model` skill to save results to `designbook/data-model.json`.

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

#### Scenario: File output via skill
- **WHEN** the user approves the final data model
- **THEN** the AI command invokes the `designbook-data-model` skill with the structured data
- **AND** the skill saves the result to `designbook/data-model.json` validating against `schema/data-model.json`
