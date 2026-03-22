## ADDED Requirements

### Requirement: workflow rules subcommand
The CLI SHALL expose a `workflow rules` subcommand that discovers, filters, and outputs rule content for a given workflow stage.

#### Scenario: Basic invocation
- **WHEN** `designbook-workflow rules --stage debo-design-tokens:dialog` is run
- **THEN** stdout contains the concatenated content of all matching rule files followed by config rules
- **AND** exit code is 0

#### Scenario: No matching rules
- **WHEN** no rule files match the requested stage
- **AND** no config rules exist for the stage
- **THEN** stdout is empty
- **AND** exit code is 0

#### Scenario: Stage flag is required
- **WHEN** `workflow rules` is run without `--stage`
- **THEN** CLI prints an error and exits with code 1

### Requirement: Recursive rule file discovery
The CLI SHALL recursively scan `.agents/skills/**/rules/**/*.md` relative to `DESIGNBOOK_ROOT` to discover candidate rule files.

#### Scenario: Nested skill rules are found
- **WHEN** a rule file exists at `.agents/skills/designbook-guidelines/rules/guidelines-context.md`
- **THEN** the file is included in the candidate set

#### Scenario: Non-rule files are excluded
- **WHEN** a file exists at `.agents/skills/some-skill/tasks/create-thing.md`
- **THEN** the file is NOT included in the candidate set

### Requirement: Frontmatter-based stage filtering
The CLI SHALL parse YAML frontmatter from each candidate rule file and include it only when `when.stages` contains the requested stage.

#### Scenario: Stage match includes file
- **WHEN** a rule file has `when.stages: [debo-design-tokens:dialog, create-tokens]`
- **AND** the requested stage is `debo-design-tokens:dialog`
- **THEN** the file content is included in the output

#### Scenario: Stage mismatch excludes file
- **WHEN** a rule file has `when.stages: [create-component]`
- **AND** the requested stage is `debo-design-tokens:dialog`
- **THEN** the file content is NOT included in the output

#### Scenario: Rule file with no when.stages is excluded
- **WHEN** a rule file has no `when.stages` key in frontmatter
- **THEN** the file content is NOT included in the output

### Requirement: Config key filtering
The CLI SHALL additionally filter by `when.<config-key>` conditions using resolved config values.

#### Scenario: Config key match includes file
- **WHEN** a rule file has `when.backend: drupal`
- **AND** `DESIGNBOOK_BACKEND` resolves to `drupal`
- **THEN** the file passes the config filter

#### Scenario: Config key mismatch excludes file
- **WHEN** a rule file has `when.frameworks.css: daisyui`
- **AND** `DESIGNBOOK_FRAMEWORK_CSS` resolves to `tailwind`
- **THEN** the file is excluded regardless of stage match

#### Scenario: Multiple config conditions require all to pass
- **WHEN** a rule file has `when.backend: drupal` and `when.frameworks.css: tailwind`
- **AND** both config values match
- **THEN** the file is included

### Requirement: Variable resolution in output
The CLI SHALL resolve all `${VAR}` and `$VAR` references in rule file content using the resolved config env map before outputting.

#### Scenario: DESIGNBOOK_DIST resolved in content
- **WHEN** a rule file contains `$DESIGNBOOK_DIST/design-system/guidelines.yml`
- **THEN** the output contains the absolute resolved path

#### Scenario: Resolution is recursive
- **WHEN** a variable value itself contains another variable reference
- **THEN** both are resolved before output

### Requirement: Config rules appended
The CLI SHALL read `designbook.config.yml → workflow.rules[<stage>]` and append each string as a rule block after file-based rules.

#### Scenario: Config rules included in output
- **WHEN** `workflow.rules["debo-data-model:dialog"]` contains one or more strings
- **AND** the requested stage is `debo-data-model:dialog`
- **THEN** each string appears in the output after file-based rule content

#### Scenario: Missing config rules section is silently skipped
- **WHEN** `workflow.rules` does not contain the requested stage key
- **THEN** no error is raised and output contains only file-based rules

### Requirement: Output format
The CLI SHALL output matched rule file contents as concatenated markdown blocks separated by `---`, with config rules appended after a final `---`.

#### Scenario: Multiple rules are separated
- **WHEN** two rule files match
- **THEN** their contents appear in the output separated by `---\n`

#### Scenario: Malformed frontmatter emits warning
- **WHEN** a candidate rule file has unparseable YAML frontmatter
- **THEN** a warning is written to stderr and the file is skipped
- **AND** exit code remains 0
