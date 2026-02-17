# Designbook Tokens Skill

## ADDED Requirements

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
