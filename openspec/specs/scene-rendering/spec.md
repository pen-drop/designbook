# Spec: Scene Component Props Rendering

## ADDED Requirements

### Requirement: Props on component items are forwarded to the renderer
When a `component:` scene item declares a `props:` map, those props SHALL be passed as the first argument to `mod.render(props, slots)` at render time. Props SHALL NOT be collapsed into slots or dropped.

#### Scenario: Props preserved through build pipeline
- **WHEN** a scenes file contains `component: provider:heading` with `props: { level: h1 }`
- **THEN** `buildSceneModule` produces a CSF module where `args.__scene[0].props` equals `{ "level": "h1" }`
- **AND** `args.__scene[0].props` is a distinct key — NOT merged into `slots` or the top-level node

#### Scenario: Props passed to mod.render at runtime
- **WHEN** `renderComponent` processes a `ComponentNode` with `props: { level: h1 }`
- **THEN** `mod.render` is called with `{ level: 'h1' }` as the first argument
- **AND** the second argument (slots) does NOT contain the `level` key

#### Scenario: Props and slots coexist
- **WHEN** a component item declares both `props: { level: h1 }` and `slots: { text: Hello World }`
- **THEN** `mod.render` receives `props = { level: 'h1' }` and `slots = { text: 'Hello World' }` as separate arguments
- **AND** neither map contains keys from the other

#### Scenario: Empty props when none declared
- **WHEN** a component item declares no `props:` key
- **THEN** `mod.render` is called with an empty object `{}` as the first argument
