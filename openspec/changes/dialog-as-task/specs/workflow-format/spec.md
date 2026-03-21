## MODIFIED Requirements

### Requirement: YAML frontmatter workflow metadata
Workflow and skill markdown files SHALL declare workflow metadata in YAML frontmatter. The `dialog` stage name is renamed to `intake`.

#### Scenario: Intake stage declared in frontmatter
- **WHEN** a debo-* workflow file contains a `workflow:` block
- **THEN** the stages array uses `intake` instead of `dialog`

#### Scenario: Intake is a normal stage
- **WHEN** `stages: [intake, create-tokens]` is declared
- **THEN** the AI processes `intake` via Rule 5 like any other stage — no special handling
