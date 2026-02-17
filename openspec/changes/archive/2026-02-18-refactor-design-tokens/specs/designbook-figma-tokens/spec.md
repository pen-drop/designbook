# Designbook Figma Tokens Skill

## MODIFIED Requirements

### Requirement: Output Delegation
**FROM**: The skill saves the generated tokens directly to `.pendrop/output/pendrop.theme.tokens.json`.
**TO**: The skill SHALL pass the generated W3C JSON to the `designbook-tokens` skill for final validation and storage.

#### Scenario: Token Handoff
- **WHEN** tokens are successfully generated from Figma
- **THEN** they are passed to the `designbook-tokens` skill
