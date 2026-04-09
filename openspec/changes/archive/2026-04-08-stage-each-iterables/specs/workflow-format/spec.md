## MODIFIED Requirements

### Requirement: Stage definition with each keyword
A stage definition in workflow frontmatter SHALL support the optional `each` property alongside `steps`. The `each` value is a string naming the iterable (e.g. `component`, `scene`).

#### Scenario: Stage with each keyword
- **WHEN** a workflow declares `stages: { component: { each: component, steps: [create-component] } }`
- **THEN** the stage definition is valid and the CLI recognizes `component` as the iterable name

#### Scenario: Stage without each keyword
- **WHEN** a workflow declares `stages: { transform: { steps: [generate-css] } }`
- **THEN** the stage definition is valid and all steps run once (singleton)

### Requirement: Intake removed from stages
Workflow frontmatter SHALL NOT include intake steps in stage definitions. Intake is resolved by the engine from the convention `intake--<workflow-id>.md`.

#### Scenario: Design-shell workflow format
- **WHEN** the design-shell workflow is defined
- **THEN** the frontmatter looks like:
  ```yaml
  stages:
    component:
      each: component
      steps: [create-component]
    scene:
      each: scene
      steps: [create-scene]
    test:
      each: scene
      steps: [screenshot, resolve-reference, visual-compare, polish]
  ```
