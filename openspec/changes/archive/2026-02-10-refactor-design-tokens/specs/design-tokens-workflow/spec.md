# Design Tokens Workflow

## ADDED Requirements

### Requirement: Interactive Interview
The `debo-design-tokens` workflow SHALL contain the logic to interview the user for token values (colors, typography).

#### Scenario: Interview Process
- **WHEN** the user starts the workflow
- **THEN** the workflow asks specific questions to gather design decisions (e.g. "What is your primary brand color?")
- **AND** collects these answers to pass to the skill

### Requirement: Skill Delegation for Storage
The workflow SHALL NOT save the file directly. It MUST pass the collected data to the `designbook-design-tokens` skill for validation and storage.

#### Scenario: Prompt-based Generation
- **WHEN** the user chooses to generate tokens via prompting
- **THEN** the agent guides the user to select colors and fonts
- **AND** the final output is saved as `designbook/design-tokens.json` in W3C format (NOT markdown)

#### Scenario: Token Display
- **WHEN** the tokens are generated (via any method)
- **THEN** the Storybook addon reads `designbook/design-tokens.json` to display the design system
