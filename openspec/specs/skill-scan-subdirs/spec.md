### Requirement: Recursive rule file scanning discovers files in subdirectories

`matchRuleFiles` SHALL discover all `.md` files under `skills/*/rules/` at any directory depth, not only at the top level.

#### Scenario: Rule file in subdirectory is discovered

- **WHEN** a rule file exists at `.agents/skills/designbook-drupal/data-model/rules/layout-builder/canvas.md`
- **THEN** the file is included as a candidate for `when` condition matching

#### Scenario: Rule file in nested subdirectory is discovered

- **WHEN** a rule file exists at `.agents/skills/<skill>/rules/<sub1>/<sub2>/rule.md`
- **THEN** the file is included as a candidate for `when` condition matching

#### Scenario: Flat rule files continue to be discovered

- **WHEN** a rule file exists at `.agents/skills/<skill>/rules/rule.md` (top-level, no subdirectory)
- **THEN** the file is included as a candidate for `when` condition matching, unchanged from current behavior

### Requirement: Recursive task file scanning discovers files in subdirectories (generic stage)

For generic stage resolution (no `skill:task` prefix), `resolveTaskFile` SHALL scan `tasks/` recursively to find `<stage>.md` at any depth.

#### Scenario: Task file in subdirectory is discovered for generic stage

- **WHEN** a task file exists at `.agents/skills/<skill>/tasks/<subdir>/<stage>.md`
- **THEN** the file is treated as a candidate and `when` condition filtering is applied

#### Scenario: Named stage resolution is unaffected

- **WHEN** a stage name uses the `skill:task` format (e.g., `designbook-sections:create-section`)
- **THEN** the CLI resolves directly to `.agents/skills/designbook-sections/tasks/create-section.md` without recursive scanning
