## MODIFIED Requirements

### Requirement: workflow plan matches rule files per stage

`workflow plan` SHALL scan `.agents/skills/*/rules/**/*.md` (recursively) frontmatter and store matched rule file paths per task.

#### Scenario: Rule file matched by stage

- **WHEN** a rule file has `when.stages: [create-component]` and a task has stage `create-component`
- **THEN** the rule file path is included in the task's `rules` array

#### Scenario: Rule file matched by config condition

- **WHEN** a rule file has `when: { "frameworks.css": "daisyui" }` and config has `frameworks.css: daisyui`
- **THEN** the rule file path is included for all tasks whose stage matches (or rule has no `when.stages`)

#### Scenario: Rule file without when.stages applies to all stages

- **WHEN** a rule file has `when: {}` (no stages constraint)
- **THEN** it is included in the `rules` array of every task (if other when conditions pass)

#### Scenario: Rule file in subdirectory is matched

- **WHEN** a rule file exists at `.agents/skills/<skill>/rules/<subdir>/rule.md` and its `when` conditions match the current stage and config
- **THEN** the rule file path is included in the task's `rules` array
