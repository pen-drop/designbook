## Requirements

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

### Requirement: Central Storage Authority
The `designbook-tokens` skill SHALL be the sole authority for validating and saving the final `designbook/design-tokens.json` file.

#### Scenario: Save from Upstream
- **WHEN** it receives token data (from `debo-design-tokens` interview OR `designbook-figma-tokens`)
- **THEN** it validates the W3C structure
- **AND** saves it to the canonical path

### Requirement: Input Agnosticism
The skill SHALL accept W3C-formatted JSON from any valid source.

#### Scenario: Validation
- **WHEN** input is received
- **THEN** schema validation is performed before saving

### Requirement: Figma Tokens Output Delegation
**FROM**: The `designbook-figma-tokens` skill saves the generated tokens directly to `.pendrop/output/pendrop.theme.tokens.json`.
**TO**: The skill SHALL pass the generated W3C JSON to the `designbook-tokens` skill for final validation and storage.

#### Scenario: Token Handoff
- **WHEN** tokens are successfully generated from Figma
- **THEN** they are passed to the `designbook-tokens` skill
