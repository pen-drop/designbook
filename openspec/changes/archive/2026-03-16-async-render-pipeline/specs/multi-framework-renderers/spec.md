## ADDED Requirements

### Requirement: ComponentRenderer is the only framework-specific interface

A `ComponentRenderer` interface SHALL exist as the single framework-specific extension point. Entity and config rendering are built-in and framework-agnostic. Only the serialization of a `ComponentSceneNode` to a code string is framework-specific.

```ts
interface ComponentRenderer {
  render(node: ComponentSceneNode, ctx: RenderContext): Promise<string>;
  trackImport(componentId: string): string;
  getImports(): string[];
}
```

#### Scenario: Entity resolution delegates to ComponentRenderer

- **WHEN** `entityJsonataRenderer` evaluates a JSONata expression and gets `ComponentNode[]`
- **THEN** it SHALL call `await ctx.renderNode(node)` for each component node
- **AND** the render service SHALL dispatch to the registered `ComponentRenderer`
- **AND** the entity renderer SHALL NOT know which framework is in use

#### Scenario: Plugin registers one ComponentRenderer

- **WHEN** a plugin calls `buildSdcModule()`, `buildReactModule()`, or `buildVue3Module()`
- **THEN** it SHALL only need to provide a `ComponentRenderer` instance
- **AND** `entityJsonataRenderer` and `ConfigListRenderer` SHALL be registered automatically

### Requirement: SdcComponentRenderer

`SdcComponentRenderer` SHALL handle `type: 'component'` nodes and render them as Twig component call strings. It SHALL own SDC-specific import tracking via `.component.yml` file resolution.

#### Scenario: Renders component call string

- **WHEN** a `ComponentSceneNode` with `component: 'test_provider:heading'` is rendered
- **THEN** the renderer SHALL return `'testproviderheading.default.component({...args})'`
- **AND** SHALL call `this.trackImport('test_provider:heading')` internally

#### Scenario: Tracks imports via .component.yml

- **WHEN** `trackImport('test_provider:heading')` is called
- **THEN** the renderer SHALL resolve `../components/heading/heading.component.yml`
- **AND** SHALL add `import * as testproviderheading from '...'` to the import list

#### Scenario: Array slot children awaited

- **WHEN** a component node has an array slot with child `SceneNode` objects
- **THEN** the renderer SHALL `await ctx.renderNode(child)` for each child
- **AND** join the results into the slot value

### Requirement: ReactComponentRenderer

`ReactComponentRenderer` SHALL handle `type: 'component'` nodes and render them as `React.createElement()` call strings. It SHALL resolve local component files (`.tsx`, `.jsx`, `.ts`, `.js`).

#### Scenario: Renders createElement string

- **WHEN** a `ComponentSceneNode` with `component: 'ArticleCard'` and `props: { title: 'Hello' }` is rendered
- **THEN** the renderer SHALL return `React.createElement(ArticleCard, {...ArticleCard.Basic?.args, title: "Hello"})`

#### Scenario: Story reference args

- **WHEN** a `ComponentSceneNode` has `story: 'featured'`
- **THEN** the renderer SHALL spread `...ArticleCard.Featured?.args` as base args

#### Scenario: Resolves local component files

- **WHEN** `trackImport('ArticleCard')` is called
- **THEN** the renderer SHALL try `.tsx`, `.jsx`, `.ts`, `.js` extensions under `../components/ArticleCard/`
- **AND** generate `import ArticleCard from '<resolved-path>';`

### Requirement: Vue3ComponentRenderer

`Vue3ComponentRenderer` SHALL handle `type: 'component'` nodes and render them as `h()` call strings. It SHALL resolve `.vue` files.

#### Scenario: Renders h() string

- **WHEN** a `ComponentSceneNode` with `component: 'ArticleCard'` is rendered
- **THEN** the renderer SHALL return `h(ArticleCard, {...ArticleCard.Basic?.args, ...props})`

#### Scenario: Resolves .vue files

- **WHEN** `trackImport('ArticleCard')` is called
- **THEN** the renderer SHALL resolve `../components/ArticleCard/ArticleCard.vue`
- **AND** generate `import ArticleCard from '<resolved-path>';`

### Requirement: ConfigRenderer registered per config_type

Config renderers SHALL declare a `configType` property. The render service SHALL match config nodes by `config_type`, not by a greedy `type === 'config'` check.

```ts
interface ConfigRenderer {
  configType: string;
  render(node: ConfigSceneNode, ctx: RenderContext): Promise<string>;
}
```

#### Scenario: Built-in ConfigListRenderer handles list config_type

- **WHEN** a config node with `config_type: 'list'` is encountered
- **THEN** `ConfigListRenderer` SHALL handle it
- **AND** unknown config types SHALL fall through to a warning placeholder

#### Scenario: Custom config renderer registered

- **WHEN** a plugin registers a renderer with `configType: 'menu'`
- **THEN** config nodes with `config_type: 'menu'` SHALL be dispatched to it
- **AND** it SHALL coexist with `ConfigListRenderer` without priority conflicts

### Requirement: ModuleBuilder generates CSF format only

`ModuleBuilder` SHALL contain only `generateModule()`. Import tracking moves into `ComponentRenderer`.

```ts
interface ModuleBuilder {
  generateModule(opts: { imports: string[]; group: string; source: string; scenes: ResolvedScene[] }): string;
}
```

#### Scenario: SDC generateModule

- **WHEN** `sdcModuleBuilder.generateModule()` is called
- **THEN** output SHALL contain `TwigSafeArray`, `Drupal.attachBehaviors`, and `html +=` patterns
- **AND** imports SHALL come from `SdcComponentRenderer.getImports()`

#### Scenario: React generateModule

- **WHEN** `reactModuleBuilder.generateModule()` is called
- **THEN** output SHALL begin with `import React from 'react';`
- **AND** each story SHALL use `render: () => React.createElement(React.Fragment, null, ...)`

#### Scenario: Vue3 generateModule

- **WHEN** `vue3ModuleBuilder.generateModule()` is called
- **THEN** output SHALL begin with `import { h } from 'vue';`
- **AND** each story SHALL use `render: () => h('div', null, [...])`

### Requirement: Framework renderer tests

Each `ComponentRenderer` SHALL have a test file asserting on rendered output strings.

#### Scenario: SdcComponentRenderer test

- **WHEN** `await sdcComponentRenderer.render(node, ctx)`
- **THEN** result SHALL contain `.default.component(`
- **AND** SHALL NOT contain any marker strings

#### Scenario: ReactComponentRenderer test

- **WHEN** `await reactComponentRenderer.render(node, ctx)`
- **THEN** result SHALL contain `React.createElement(`

#### Scenario: Vue3ComponentRenderer test

- **WHEN** `await vue3ComponentRenderer.render(node, ctx)`
- **THEN** result SHALL contain `h(`

#### Scenario: Integration test per framework

- **WHEN** `buildSdcModule()`, `buildReactModule()`, or `buildVue3Module()` completes
- **THEN** the CSF output SHALL contain zero marker strings
- **AND** SHALL contain framework-appropriate component call patterns
