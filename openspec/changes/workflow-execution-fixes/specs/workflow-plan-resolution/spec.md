## MODIFIED Requirements

### Requirement: workflow plan resolves task files from workflow-file and items

`workflow plan` SHALL accept `--workflow-file <path>` and `--items <json>` and resolve task files, file paths, dependencies, and rule files automatically. When a required param is missing, the error message SHALL list all expected params with their required/optional status.

#### Scenario: Missing required param shows all expected params
- **WHEN** `workflow plan` is called with params missing `product_name`
- **AND** the task frontmatter declares `params: { product_name: ~, description: ~, problems: ~, features: ~ }`
- **THEN** the error message SHALL contain "Missing required param 'product_name' for step 'create-vision'"
- **AND** the error message SHALL contain "Expected params: product_name (required), description (required), problems (required), features (required)"

#### Scenario: All params provided
- **WHEN** all required params are present in the `--params` JSON
- **THEN** resolution proceeds without error (no change to existing behavior)
