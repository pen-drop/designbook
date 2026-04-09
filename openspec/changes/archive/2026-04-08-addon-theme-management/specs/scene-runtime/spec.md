## MODIFIED Requirements

### Requirement: Props on component items are forwarded to the renderer

When a `component:` scene item declares a `props:` map, those props SHALL be passed as the first argument to `mod.render(props, slots)`.

#### Scenario: Props preserved through build pipeline
- **WHEN** a scenes file contains `component: provider:heading` with `props: { level: h1 }`
- **THEN** `buildSceneModule` produces a CSF module where `args.__scene[0].props` equals `{ "level": "h1" }` — NOT merged into `slots`

#### Scenario: Props and slots coexist
- **WHEN** a component item declares both `props: { level: h1 }` and `slots: { text: Hello World }`
- **THEN** `mod.render` receives `props = { level: 'h1' }` and `slots = { text: 'Hello World' }` as separate arguments

#### Scenario: Empty props when none declared
- **WHEN** a component item declares no `props:` key
- **THEN** `mod.render` is called with `{}` as the first argument

#### Scenario: Scene theme passed through as args.theme
- **WHEN** a scene declares `theme: "dark"` in the scenes YAML
- **THEN** `buildSceneModule` produces a CSF module where the story's `args.theme` equals `"dark"`
- **AND** the render function wraps output in `<div data-theme="${args.theme}">`
