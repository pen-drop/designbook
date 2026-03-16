## ADDED Requirements

### Requirement: SceneNodeRenderer render is async

`SceneNodeRenderer.render()` SHALL return `Promise<string>` instead of `string`. All renderers — built-in and custom — MUST return a promise.

#### Scenario: Sync renderer declared as async

- **WHEN** a component renderer has no async work to do
- **THEN** it SHALL still be declared `async` and return a string directly
- **AND** the render service SHALL await the result uniformly

#### Scenario: Async renderer resolves inline

- **WHEN** an entity or config renderer needs to evaluate a JSONata expression
- **THEN** it SHALL `await` the evaluation directly inside `render()`
- **AND** SHALL return the fully resolved code string
- **AND** SHALL NOT emit any string marker

#### Scenario: No markers in rendered output

- **WHEN** `buildSceneModule()` completes
- **THEN** the returned CSF module string SHALL NOT contain `__ENTITY_EXPR__`
- **AND** SHALL NOT contain `__LIST_EXPR__`
- **AND** SHALL NOT contain `__END_ENTITY_EXPR__` or `__END_LIST_EXPR__`

### Requirement: RenderContext.renderNode is async

`RenderContext.renderNode` SHALL be typed as `(node: SceneNode) => Promise<string>`.

#### Scenario: Component renderer awaits nested slot nodes

- **WHEN** a component node has an array slot containing child `SceneNode` objects
- **THEN** the component renderer SHALL `await ctx.renderNode(childNode)` for each child
- **AND** SHALL await all children before assembling the final component call string

#### Scenario: Entity renderer awaits child nodes from JSONata result

- **WHEN** a JSONata expression returns `ComponentNode[]`
- **THEN** the entity renderer SHALL call `await ctx.renderNode(node)` for each result node
- **AND** join the awaited strings into the returned expression

### Requirement: SceneNodeRenderService.render is async

`SceneNodeRenderService.render()` SHALL be typed as `(node: SceneNode, ctx: RenderContext) => Promise<string>` and SHALL `await` the matched renderer's result.

#### Scenario: Service awaits renderer

- **WHEN** `renderService.render(node, ctx)` is called
- **THEN** the service SHALL find the first matching renderer
- **AND** SHALL `await renderer.render(node, ctx)`
- **AND** SHALL return the resolved string

#### Scenario: Fallback for unmatched nodes

- **WHEN** no renderer matches a node type
- **THEN** the service SHALL return a Promise that resolves to a comment placeholder string

### Requirement: ModuleBuilder has no resolveMarkers

The `ModuleBuilder` interface SHALL contain exactly two methods: `createImportTracker()` and `generateModule()`. The `resolveMarkers()` method SHALL NOT exist.

#### Scenario: SDC module builder builds without resolveMarkers

- **WHEN** `buildSdcModule()` is called
- **THEN** the `sdcModuleBuilder` adapter SHALL NOT call any marker resolution
- **AND** `generateModule()` SHALL receive `ResolvedScene[]` with clean, marker-free slot strings

#### Scenario: scene-module-builder loop is a simple await

- **WHEN** `buildSceneModule()` processes each scene node
- **THEN** it SHALL call `await renderService.render(node, renderContext)` directly
- **AND** SHALL collect results into `renders[]` with no post-processing step

### Requirement: Existing renderer tests assert on actual output

All tests for `entityJsonataRenderer` and `configRenderer` SHALL assert on the actual resolved JS expression string, not on marker presence or format.

#### Scenario: Entity renderer test awaits render

- **WHEN** a test calls `entityJsonataRenderer.render(node, ctx)`
- **THEN** the test SHALL `await` the result
- **AND** SHALL assert the returned string contains a component call (e.g., contains a function call pattern)
- **AND** SHALL NOT assert on `__ENTITY_EXPR__`

#### Scenario: Config renderer test awaits render

- **WHEN** a test calls `configRenderer.render(node, ctx)`
- **THEN** the test SHALL `await` the result
- **AND** SHALL assert the returned string is a component wrapper call
- **AND** SHALL NOT assert on `__LIST_EXPR__`

#### Scenario: renderNode mock is async in all tests

- **WHEN** a test creates a `RenderContext` mock
- **THEN** `renderNode` SHALL be typed and implemented as `async (node) => 'rendered string'`
