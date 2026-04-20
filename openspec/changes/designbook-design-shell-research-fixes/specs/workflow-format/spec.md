## MODIFIED Requirements

### Requirement: Task files use when.steps for stage matching
Tasks declare applicable steps via `when.steps` using either plain names (e.g., `create-component`) or colon-qualified names (e.g., `design-shell:intake`). The engine matches tasks to stages by comparing `when.steps` entries against the step names defined in the workflow's `stages` map.

Rules and blueprints follow the same `when.steps` convention. A bare step name like `create-scene` only matches stages whose step array contains the literal string `create-scene`. It does NOT match qualified names like `design-shell:create-scene` — qualified step matching requires the full qualified form.

#### Scenario: Qualified step name matches correctly
- **WHEN** a rule declares `when: { steps: ["design-shell:create-scene", "design-screen:create-scene"] }` and a workflow defines stage `scene: { steps: ["create-scene"] }` under workflow ID `design-shell`
- **THEN** the rule is loaded for the `scene` stage because the qualified name resolves to the correct step

#### Scenario: Bare step name does not match qualified steps
- **WHEN** a rule declares `when: { steps: ["create-scene"] }` and no workflow defines a stage with the literal step name `create-scene` (only qualified forms exist)
- **THEN** the rule is NOT loaded for any stage

## ADDED Requirements

### Requirement: Issue schema includes triage-emitted fields
The `schemas.yml#/Issue` schema SHALL include the following optional properties in addition to existing fields (`severity`, `description`, `file_hint`, `check`, `source`, `details`, `properties`):

- `id` (string, optional): Unique identifier assigned by triage for tracking through polish
- `storyId` (string, optional): Storybook story ID for the scene being polished
- `checkKey` (string, optional): Primary breakpoint--region key for this issue
- `scene` (string, optional): Scene name this issue belongs to

These fields are populated by the triage step and consumed by the polish step's `each: issues` expansion.

#### Scenario: Triage emits complete issue objects
- **WHEN** the triage task produces issue objects with `id`, `storyId`, `checkKey`, and `scene` fields
- **THEN** the `workflow done --data` validation passes because these fields are declared in the Issue schema

#### Scenario: Compare emits issues without triage fields
- **WHEN** the compare task produces issue objects without `id`, `storyId`, `checkKey`, or `scene` fields
- **THEN** validation passes because these fields are optional in the schema

### Requirement: Triage task params reference Issue schema
The `triage.md` task SHALL declare its `params.issues` with `$ref: ../schemas.yml#/Issue` to enable schema validation of the incoming issues array.

#### Scenario: Triage receives validated issues
- **WHEN** the triage task expands with an `issues` array from compare results
- **THEN** each item in the array is validated against the Issue schema before the task body executes
