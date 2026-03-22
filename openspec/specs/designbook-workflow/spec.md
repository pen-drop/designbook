# designbook-workflow Specification

## Purpose
Defines requirements for the AI Rules section in the designbook-workflow skill and the validation blocking rule.

## Requirements

### Requirement: AI Rules section in skill documentation
The designbook-workflow skill SKILL.md file SHALL include a new `## AI Rules` section that defines how AI assistants should handle workflow markers and status transitions.

#### Scenario: AI reads rules from skill documentation
- **WHEN** an AI assistant loads the designbook-workflow skill
- **THEN** it reads the AI Rules section to understand marker semantics and automation

#### Scenario: Rules cover marker system
- **WHEN** the AI Rules section is present
- **THEN** it defines behavior for `!WORKFLOW_FILE`, `!WORKFLOW_DONE`, and `!WORKFLOW_META` markers

#### Scenario: Rules define status transitions
- **WHEN** the AI Rules section is present
- **THEN** it explains when workflows transition between `planning`, `running`, and `completed` states

### Requirement: Validation blocking rule is explicit
The AI Rules section SHALL clearly state that validation is a hard gate and failures must be fixed before continuing.

#### Scenario: Validation gate rule is documented
- **WHEN** an AI reads the AI Rules for file registration
- **THEN** it sees a clear rule: "Validation must exit 0 before task can be marked done"

#### Scenario: Fix-loop expectation is set
- **WHEN** validation fails
- **THEN** the rule states: AI MUST fix errors and re-run validate until exit 0
