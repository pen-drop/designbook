## ADDED Requirements

### Requirement: Stage each keyword
A workflow stage definition SHALL support an `each: <iterable>` keyword that declares which iterable array the stage iterates over. All steps in the stage are expanded once per item in the iterable.

#### Scenario: Stage with each expands all steps per item
- **WHEN** a workflow declares `stages: { test: { each: scene, steps: [screenshot, visual-compare] } }` and plan receives `params.scene = [{"scene":"shell"}, {"scene":"dashboard"}]`
- **THEN** the CLI creates 4 tasks: screenshot-shell, screenshot-dashboard, visual-compare-shell, visual-compare-dashboard

#### Scenario: Stage without each creates singleton tasks
- **WHEN** a workflow declares `stages: { execute: { steps: [create-guidelines] } }` without `each`
- **THEN** the CLI creates 1 task per step (singleton expansion)

### Requirement: Iterable param injection
When expanding a stage with `each: <iterable>`, the CLI SHALL merge each iterable object into the task's `params`. The task's frontmatter param declarations receive values from the iterable item.

#### Scenario: Scene param injected into test task
- **WHEN** a stage declares `each: scene` and an iterable item is `{"scene":"design-system:shell"}`
- **THEN** the expanded task's `params.scene` is set to `"design-system:shell"`

#### Scenario: Component params injected into create-component task
- **WHEN** a stage declares `each: component` and an iterable item is `{"component":"header","group":"Shell","slots":["navigation"]}`
- **THEN** the expanded task's params include `component: "header"`, `group: "Shell"`, `slots: ["navigation"]`
