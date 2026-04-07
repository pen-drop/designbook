## MODIFIED Requirements

### Requirement: Props on component items are forwarded to the renderer

When a `component:` scene item declares a `props:` map, those props SHALL be passed as the first argument to `mod.render(props, slots)`.

Built-in components (`designbook:*` prefix) SHALL receive props and slots through the same `mod.render(props, slots)` interface as external components.

#### Scenario: Props preserved through build pipeline
- **WHEN** a scenes file contains `component: provider:heading` with `props: { level: h1 }`
- **THEN** `buildSceneModule` produces a CSF module where `args.__scene[0].props` equals `{ "level": "h1" }` — NOT merged into `slots`

#### Scenario: Props and slots coexist
- **WHEN** a component item declares both `props: { level: h1 }` and `slots: { text: Hello World }`
- **THEN** `mod.render` receives `props = { level: 'h1' }` and `slots = { text: 'Hello World' }` as separate arguments

#### Scenario: Empty props when none declared
- **WHEN** a component item declares no `props:` key
- **THEN** `mod.render` is called with `{}` as the first argument

#### Scenario: Built-in component receives props like external components
- **WHEN** a ComponentNode references `component: "designbook:image"` with `props: { src: "url", alt: "text" }`
- **THEN** the built-in component's render function receives `props = { src: "url", alt: "text" }` as the first argument
