## Requirements

### Requirement: Design Shell Display Page (Read-Only)
The system SHALL provide an MDX documentation page at `.storybook/onboarding/design-shell.mdx` with `<Meta title="Design Shell" />` that displays the shell specification. The page SHALL use `DeboSection` shared components.

#### Scenario: User accesses shell page with no data
- **WHEN** user navigates to the Design Shell page in Storybook
- **AND** no shell spec exists at `designbook/design-system/design-system.scenes.yml`
- **THEN** the page displays an empty state via `DeboSection` with a reference to the `/design-shell` AI command

#### Scenario: User accesses shell page with existing data
- **WHEN** user navigates to the Design Shell page in Storybook
- **AND** shell spec exists at `designbook/design-system/design-system.scenes.yml`
- **THEN** the page loads and displays the shell specification using `ShellSpecCard`

#### Scenario: User updates shell spec
- **WHEN** user wants to update the shell specification
- **THEN** the section footer references the `/design-shell` AI command

### Requirement: AI Command for Design Shell Input
The system SHALL provide a Cursor AI command at `.cursor/commands/design-shell.md` that guides the user through designing the application shell.

#### Scenario: AI command reads all prior context
- **WHEN** user runs the `/design-shell` AI command
- **THEN** the AI reads product vision, roadmap, and design tokens for context

#### Scenario: AI command handles missing prerequisites
- **WHEN** no product vision or roadmap exists
- **THEN** the AI suggests running `/product-vision` and `/product-roadmap` first

#### Scenario: AI proposes layout pattern
- **WHEN** the AI has roadmap context
- **THEN** it presents layout options (sidebar, top nav, minimal) based on the number of sections and product type

#### Scenario: AI gathers navigation and shell details
- **WHEN** the user selects a layout pattern
- **THEN** the AI asks about navigation items, user menu placement, responsive behavior, and additional elements

#### Scenario: File output
- **WHEN** the user approves the shell specification
- **THEN** the AI saves to `designbook/design-system/design-system.scenes.yml`
- **AND** the file follows the structured Markdown format with Overview, Navigation Structure, User Menu, Layout Pattern, Responsive Behavior, and Design Notes sections

### Requirement: Shell Spec Markdown File Format
The shell spec file SHALL follow a structured Markdown format matching Design OS.

#### Scenario: File format matches expected structure
- **WHEN** the AI command saves the file
- **THEN** it starts with `# Application Shell`
- **AND** contains `## Overview`, `## Navigation Structure` (bullet list), `## User Menu`, `## Layout Pattern`, `## Responsive Behavior`, and optionally `## Design Notes`
