## ADDED Requirements

### Requirement: workflow instructions SHALL include expected_params from task frontmatter

When `workflow instructions` returns stage data, it SHALL parse the `task_file`'s YAML frontmatter and include an `expected_params` field in the JSON output. Each param entry SHALL indicate whether it is required (frontmatter value is `null`/`~`) or optional (frontmatter value is a default).

#### Scenario: Task with required params
- **WHEN** `workflow instructions --workflow $NAME --stage create-vision` is called
- **AND** the resolved task file has frontmatter `params: { product_name: ~, description: ~ }`
- **THEN** the JSON output SHALL include `"expected_params": { "product_name": { "required": true }, "description": { "required": true } }`

#### Scenario: Task with optional params (defaults)
- **WHEN** a task file has frontmatter `params: { format: "markdown" }`
- **THEN** the JSON output SHALL include `"expected_params": { "format": { "required": false, "default": "markdown" } }`

#### Scenario: Task with no params
- **WHEN** a task file has no `params` key in frontmatter
- **THEN** the JSON output SHALL include `"expected_params": {}`

#### Scenario: Task file does not exist
- **WHEN** the `task_file` path in stage_loaded does not exist on disk
- **THEN** `expected_params` SHALL be omitted from the output
