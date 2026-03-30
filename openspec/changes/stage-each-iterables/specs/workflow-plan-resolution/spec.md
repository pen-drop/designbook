## MODIFIED Requirements

### Requirement: Plan expands each-stages from params
The `workflow plan` command SHALL read `each` declarations from stages and expand iterable arrays from `--params` into tasks. For each stage with `each: <name>`, it reads `params[name]` as an array and creates one task per step × item.

#### Scenario: Plan expands component stage
- **WHEN** plan receives `params.component = [{"component":"header"}, {"component":"footer"}]` and the workflow has `stages: { component: { each: component, steps: [create-component] } }`
- **THEN** 2 tasks are created: create-component-header, create-component-footer

#### Scenario: Plan expands test stage from scene iterable
- **WHEN** plan receives `params.scene = [{"scene":"design-system:shell"}]` and the workflow has `stages: { test: { each: scene, steps: [screenshot, resolve-reference, visual-compare, polish] } }`
- **THEN** 4 tasks are created, each with `params.scene = "design-system:shell"`

#### Scenario: Plan handles singleton stage
- **WHEN** a stage has no `each` declaration
- **THEN** one task per step is created with global params only

### Requirement: Items flag removed
The `--items` flag SHALL be removed from `workflow plan`. All task expansion is driven by `each` declarations and `--params` iterables.

#### Scenario: Plan called without items
- **WHEN** `workflow plan --params '{"component":[...]}'` is called without `--items`
- **THEN** the command succeeds and expands tasks from stage each declarations
