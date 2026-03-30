## MODIFIED Requirements

### Requirement: Intake is engine convention
Intake SHALL be an implicit engine step, not a declared stage step. The engine always resolves and runs the intake task file before plan. Intake task files follow the naming convention `intake--<workflow-id>.md`.

#### Scenario: Intake runs before plan
- **WHEN** a workflow is created and the agent loads instructions
- **THEN** the engine provides the intake task file automatically without it being listed in any stage's steps array

#### Scenario: Intake not in stages
- **WHEN** a workflow frontmatter is parsed
- **THEN** the `intake` step does not appear in any stage's `steps` array

### Requirement: Plan uses params with iterables
The agent SHALL pass named iterable arrays via `--params` instead of constructing explicit `--items`. The CLI reads `each` from stage definitions and matches iterable names to expand tasks.

#### Scenario: Agent provides iterables from intake
- **WHEN** the intake determines 3 components and 1 scene
- **THEN** the agent calls `workflow plan --params '{"component":[...], "scene":[...]}'` without `--items`

#### Scenario: CLI expands iterables into tasks
- **WHEN** `workflow plan` receives params with iterables and the workflow has stages with `each` declarations
- **THEN** the CLI creates tasks for all steps × iterable items per stage
