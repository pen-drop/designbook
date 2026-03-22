## ADDED Requirements

### Requirement: intake.md task file convention
Skills MAY provide an `intake.md` task file in their `tasks/` directory to hook into the intake stage of workflows.

#### Scenario: intake.md is discovered like any other task file
- **WHEN** a workflow stage is named `intake`
- **THEN** the AI scans all `.agents/skills/*/tasks/intake.md` files and loads those whose `when` conditions match

#### Scenario: intake.md with reads enforces required files
- **WHEN** `intake.md` frontmatter declares `reads:` entries
- **THEN** Rule 5a checks each file before the intake stage begins
- **AND** any missing non-optional file causes a hard stop

#### Scenario: intake.md with files: [] requires no validation
- **WHEN** `intake.md` frontmatter declares `files: []`
- **THEN** `workflow validate` exits 0 without checking any files

#### Scenario: workflow done called after intake
- **WHEN** the user has confirmed their intake answers
- **THEN** the AI calls `workflow done` with `validation: []` before calling `workflow plan`

### Requirement: intake.md minimal frontmatter format
An `intake.md` task file SHALL declare `files: []` and optionally `reads:` and `when:`.

#### Scenario: Minimal valid intake.md
- **WHEN** `intake.md` contains only `files: []` in frontmatter
- **THEN** it is a valid task file that passes validation with no file checks

#### Scenario: intake.md with reads and when
- **WHEN** `intake.md` declares `reads:` and `when:` conditions
- **THEN** both are applied: `reads:` via Rule 5a, `when:` for task file selection
