## ADDED Requirements

### Requirement: SceneTreeNode represents the annotated intermediate build result
The build pipeline SHALL produce `SceneTreeNode[]` as the canonical intermediate representation. Each node carries its `kind` (component, entity, scene-ref, string), the resolved component ID, props, and recursive slots.

#### Scenario: Entity node in SceneTree
- **WHEN** a scene YAML contains an entity node (`entity: node.landing_page`, `view_mode: full`)
- **THEN** the SceneTreeNode SHALL have `kind: 'entity'`, `component` set to the resolved component ID, and `entity` containing `{ entity_type, bundle, view_mode, record, mapping }` where `mapping` is the path to the `.jsonata` file

#### Scenario: Scene-ref node in SceneTree
- **WHEN** a scene YAML contains a scene reference (`scene: "shared:footer"`, `with: { year: "2025" }`)
- **THEN** the SceneTreeNode SHALL have `kind: 'scene-ref'`, `component` set to the resolved component ID, and `ref` containing `{ source: 'shared:footer', with: { year: '2025' } }`

#### Scenario: Component node in SceneTree
- **WHEN** a scene YAML contains a direct component node (`component: button`)
- **THEN** the SceneTreeNode SHALL have `kind: 'component'` and `component: 'button'`

#### Scenario: String slot value in SceneTree
- **WHEN** a slot contains a plain string value
- **THEN** the SceneTreeNode SHALL have `kind: 'string'` and `value` set to the string content

#### Scenario: Recursive slot nesting
- **WHEN** a resolved component has slots containing further entities, scene-refs, or components
- **THEN** the SceneTreeNode SHALL have a `slots` record mapping slot names to nested `SceneTreeNode[]`, preserving kind and origin at every level

### Requirement: Builders return BuildResult with required metadata
`SceneNodeBuilder.build()` SHALL return `Promise<BuildResult>` containing `{ nodes: RawNode[], meta }` where `meta` includes the `kind` and kind-specific origin data. The `meta` field is required.

#### Scenario: EntityBuilder returns entity meta
- **WHEN** the EntityBuilder resolves an entity node
- **THEN** it SHALL return `meta: { kind: 'entity', entity: { entity_type, bundle, view_mode, record, mapping } }`

#### Scenario: SceneBuilder returns scene-ref meta
- **WHEN** the SceneBuilder resolves a scene reference
- **THEN** it SHALL return `meta: { kind: 'scene-ref', ref: { source, with } }`

#### Scenario: ComponentBuilder returns component meta
- **WHEN** the ComponentBuilder passes through a component node
- **THEN** it SHALL return `meta: { kind: 'component' }`

### Requirement: view() projects SceneTree to RenderTree
A pure function `view()` SHALL transform `SceneTreeNode[]` into `ComponentNode[]` by copying `component`, `props`, and recursively transforming `slots`. No other fields are carried over.

#### Scenario: view() strips metadata
- **WHEN** `view()` is called with a SceneTree containing entity and scene-ref nodes
- **THEN** the output SHALL be `ComponentNode[]` containing only `component`, `props`, and `slots` — no `kind`, `entity`, `ref`, or `value` fields

#### Scenario: view() preserves slot structure
- **WHEN** a SceneTreeNode has nested slots with further SceneTreeNodes
- **THEN** `view()` SHALL recursively transform slot children into ComponentNodes

### Requirement: SceneTree emitted as story parameter
`buildSceneModule()` SHALL emit the SceneTree as `parameters.sceneTree` in each generated story, alongside the existing `args.__scene` (RenderTree).

#### Scenario: Generated CSF contains both trees
- **WHEN** a scene YAML is processed by the Vite plugin
- **THEN** the generated CSF story SHALL have `args.__scene` (ComponentNode[]) and `parameters.sceneTree` (SceneTreeNode[])

#### Scenario: Render function uses RenderTree only
- **WHEN** a scene story is rendered in Canvas
- **THEN** the render function SHALL use `args.__scene` and SHALL NOT reference `parameters.sceneTree`
