## Requirements

### Requirement: Recursive rule file scanning discovers files in subdirectories

`matchRuleFiles` SHALL discover all `.md` files under `designbook/<concern>/rules/` at any concern level, in addition to the existing `skills/*/rules/` scan.

#### Scenario: Rule file in subdirectory is discovered

- **WHEN** a rule file exists at `.agents/skills/designbook-drupal/data-model/rules/layout-builder/canvas.md`
- **THEN** the file is included as a candidate for `when` condition matching

#### Scenario: Rule file in nested subdirectory is discovered

- **WHEN** a rule file exists at `.agents/skills/<skill>/rules/<sub1>/<sub2>/rule.md`
- **THEN** the file is included as a candidate for `when` condition matching

#### Scenario: Flat rule files continue to be discovered

- **WHEN** a rule file exists at `.agents/skills/<skill>/rules/rule.md` (top-level, no subdirectory)
- **THEN** the file is included as a candidate for `when` condition matching, unchanged from current behavior

#### Scenario: Concern-level rule discovered

- **WHEN** a rule file exists at `.agents/skills/designbook/design/rules/scenes-constraints.md`
- **THEN** it is included as a candidate for `when` condition matching

#### Scenario: Workflow-specific rule discovered via -- qualifier

- **WHEN** a rule file exists at `.agents/skills/designbook/design/rules/some-rule--design-screen.md`
- **THEN** it is included as a candidate and matched to the `design-screen` workflow via `when:` conditions

#### Scenario: Skill root rules discovered

- **WHEN** a rule file exists at `.agents/skills/designbook/rules/global-rule.md`
- **THEN** it is included as a candidate for all stages

### Requirement: Recursive task file scanning discovers files in subdirectories (generic stage)

For generic stage resolution (no `skill:task` prefix), `resolveTaskFile` SHALL scan `tasks/` recursively across all skill directories, including all `<concern>/tasks/` subdirs within the unified `designbook` skill.

#### Scenario: Task file in subdirectory is discovered for generic stage

- **WHEN** a task file exists at `.agents/skills/<skill>/tasks/<subdir>/<stage>.md`
- **THEN** the file is treated as a candidate and `when` condition filtering is applied

#### Scenario: Named stage resolution is unaffected

- **WHEN** a stage name uses the `skill:task` format (e.g., `designbook-sections:create-section`)
- **THEN** the CLI resolves directly to `.agents/skills/designbook-sections/tasks/create-section.md` without recursive scanning

#### Scenario: Concern-level task discovered

- **WHEN** a task file exists at `.agents/skills/designbook/design/tasks/create-component.md`
- **THEN** it is a candidate for the `create-component` stage via glob `designbook/**/tasks/create-component.md`

#### Scenario: Colon stage reference resolves to qualified file via glob

- **WHEN** a stage is declared as `design-screen:intake`
- **THEN** the system resolves via glob `**/intake--design-screen.md` — finding `designbook/design/tasks/intake--design-screen.md`

#### Scenario: Colon stage resolution does not use direct path

- **WHEN** `design-screen:intake` is resolved
- **THEN** the system uses glob `**/intake--design-screen.md`, NOT a direct path like `designbook-design-screen/tasks/intake.md`

#### Scenario: Named stage resolution via skill:task is unaffected

- **WHEN** a stage uses the old `skill:task` format pointing to a still-existing skill (e.g., `designbook-drupal:create-component`)
- **THEN** the CLI resolves directly to `.agents/skills/designbook-drupal/tasks/create-component.md` without glob
