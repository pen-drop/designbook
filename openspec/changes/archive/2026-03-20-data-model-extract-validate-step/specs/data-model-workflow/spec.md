## MODIFIED Requirements

### Requirement: SKILL.md lists all steps
`designbook-data-model/SKILL.md` SHALL list every step in `## Steps` and SHALL NOT contain inline implementation for steps that have their own step files.

#### Scenario: Validate step is listed
- **WHEN** an agent reads `designbook-data-model/SKILL.md`
- **THEN** `## Steps` includes a link to `./steps/validate.md`

#### Scenario: No inline validation section
- **WHEN** an agent reads `designbook-data-model/SKILL.md`
- **THEN** there is no standalone `## Validation` section with a raw CLI command
