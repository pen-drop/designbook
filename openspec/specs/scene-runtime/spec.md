# scene-runtime Specification

## Purpose
Defines runtime scene behavior: component props rendering, HMR invalidation, and the scene-metadata shared module.

---

## Requirement: Props on component items are forwarded to the renderer

When a `component:` scene item declares a `props:` map, those props SHALL be passed as the first argument to `mod.render(props, slots)`.

### Scenario: Props preserved through build pipeline
- **WHEN** a scenes file contains `component: provider:heading` with `props: { level: h1 }`
- **THEN** `buildSceneModule` produces a CSF module where `args.__scene[0].props` equals `{ "level": "h1" }` — NOT merged into `slots`

### Scenario: Props and slots coexist
- **WHEN** a component item declares both `props: { level: h1 }` and `slots: { text: Hello World }`
- **THEN** `mod.render` receives `props = { level: 'h1' }` and `slots = { text: 'Hello World' }` as separate arguments

### Scenario: Empty props when none declared
- **WHEN** a component item declares no `props:` key
- **THEN** `mod.render` is called with `{}` as the first argument

---

## Requirement: Scene module invalidation on file change

The Vite plugin SHALL invalidate `.scenes.yml` modules in Vite's module graph when the file changes.

### Scenario: Story works after file change without browser refresh
- **WHEN** a `.scenes.yml` file is modified while Storybook is running
- **THEN** clicking the corresponding story renders updated content without requiring a browser refresh

### Scenario: Virtual sections module invalidation
- **WHEN** any `.section.scenes.yml` file is added or changed
- **THEN** `virtual:designbook-sections` is invalidated so the sections overview reflects current state

---

## Requirement: Clean debug output

The plugin SHALL NOT emit debug `console.log` statements during normal operation. Only warnings and errors.

### Scenario: No debug logs on story load or indexing
- **WHEN** `.scenes.yml` files are loaded or indexed
- **THEN** no `[Designbook] load()` or `[Designbook] Indexing` debug messages appear in the console
