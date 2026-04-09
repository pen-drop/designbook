## ADDED Requirements

### Requirement: workflow create returns aggregated expected_params

`workflow create` SHALL include an `expected_params` map in its JSON response, aggregated from all resolved stages' task file frontmatter.

#### Scenario: expected_params included in create response
- **WHEN** `workflow create --workflow design-screen --workflow-file <path>` completes
- **THEN** the JSON response SHALL include an `expected_params` object
- **AND** each key is a param name, each value has `required: boolean` and `from_step: string`

#### Scenario: Required params aggregated from all stages
- **WHEN** `create-sample-data` task declares `params: { section_id: ~ }` with `expected_params: { section_id: { required: true } }`
- **AND** `design-screen:map-entity` task declares `params: { entity_type: ~ }` with `expected_params: { entity_type: { required: true } }`
- **THEN** `expected_params` in the create response SHALL contain both `section_id` and `entity_type` with `required: true`

#### Scenario: Duplicate param names merged
- **WHEN** multiple stages declare the same param name (e.g. `section_id`)
- **THEN** the param appears once in `expected_params`
- **AND** `required` is `true` if ANY stage marks it required
- **AND** `from_step` references the first stage that declares it

#### Scenario: Agent uses expected_params for plan
- **WHEN** the agent receives `expected_params` from `workflow create`
- **THEN** it SHALL map intake results to all required params before calling `workflow plan`
- **AND** `workflow plan` SHALL succeed without param-missing errors on the first attempt
