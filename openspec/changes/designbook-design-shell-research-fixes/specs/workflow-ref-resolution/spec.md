## ADDED Requirements

### Requirement: expandWorkflowTasks resolves $ref in task result schemas
The CLI SHALL resolve all `$ref` entries in task result schema declarations during `expandWorkflowTasks`. After `expandTasksFromParams` returns, the CLI SHALL call `collectAndResolveSchemas` to populate `task.result[key].schema` for every declaration that uses `$ref`. The resulting schemas map SHALL be passed to `workflowPlan` instead of `undefined`.

#### Scenario: Task with $ref result schema validates correctly
- **WHEN** a task declares `result: { checks: { $ref: "../schemas.yml#/Check" } }` and the user runs `workflow done --task <id> --data '{"checks": [...]}'`
- **THEN** the CLI resolves the `$ref` against the task source file's directory, compiles the schema with AJV, and validates the provided data without errors

#### Scenario: Multiple $ref declarations in one task
- **WHEN** a task declares result entries with different `$ref` targets (e.g., `$ref: ../schemas.yml#/Check` and `$ref: ../schemas.yml#/Issue`)
- **THEN** both schemas are resolved and registered with AJV, and each result entry is validated against its respective schema

#### Scenario: $ref resolution failure produces actionable error
- **WHEN** a `$ref` path points to a non-existent file or missing schema key
- **THEN** the CLI SHALL produce an error message that includes the `$ref` value, the resolved file path, and the task ID

### Requirement: expandResultDeclarations preserves $ref for downstream resolution
The `expandResultDeclarations` function SHALL NOT strip `$ref` from result declarations. The `$ref` value SHALL be preserved on the declaration object so that `collectAndResolveSchemas` can resolve it in a subsequent step.

#### Scenario: $ref survives result declaration expansion
- **WHEN** `expandResultDeclarations` processes a declaration `{ $ref: "../schemas.yml#/Issue", description: "..." }`
- **THEN** the returned declaration retains the `$ref` property alongside any other schema properties
