## MODIFIED Requirements

### Requirement: SKILL.md is a pure orchestrator index
`designbook-workflow/SKILL.md` SHALL list all steps in a `## Steps` section and SHALL NOT repeat the CLI command syntax inline. CLI details live only in step files.

#### Scenario: Steps section lists all four steps
- **WHEN** an agent reads `designbook-workflow/SKILL.md`
- **THEN** the `## Steps` section links to `create.md`, `update.md`, `add-files.md`, and `validate.md`

#### Scenario: CLI Commands section is removed
- **WHEN** an agent reads `designbook-workflow/SKILL.md`
- **THEN** there is no `## CLI Commands` section with inline bash — those details are in step files

---

### Requirement: All debo-* workflows reference step files
Every `debo-*` workflow file SHALL load step files from `@designbook-workflow/steps/` instead of inlining the workflow tracking bash commands.

#### Scenario: Workflow tracking uses step references
- **WHEN** an agent reads any `debo-*.md` workflow
- **THEN** the Workflow Tracking section contains `Load @designbook-workflow/steps/create.md`, `Load @designbook-workflow/steps/update.md`, etc. — not raw bash commands

#### Scenario: No duplicate CLI commands in workflow files
- **WHEN** an agent reads any `debo-*.md` workflow
- **THEN** there are no inline `node packages/storybook-addon-designbook/dist/cli.js workflow ...` commands in the Workflow Tracking section
