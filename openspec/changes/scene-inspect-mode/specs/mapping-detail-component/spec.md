## ADDED Requirements

### Requirement: MappingDetail renders entity mapping as field connections
MappingDetail SHALL render a `SceneTreeNode` with `kind: 'entity'` showing data source fields on the left, resolved component props/slots on the right, and visual connections between them.

#### Scenario: Entity with props mapping
- **WHEN** MappingDetail receives a SceneTreeNode with `kind: 'entity'` and `props`
- **THEN** it SHALL display data source fields (from data.yml) on the left, resolved prop names on the right, and connecting lines showing field-to-prop mapping

#### Scenario: Entity with slot mapping
- **WHEN** a SceneTreeNode with `kind: 'entity'` has slots containing further nodes
- **THEN** MappingDetail SHALL show slot names on the right with indicators for nested content, and corresponding source fields on the left

#### Scenario: Mapping file path displayed
- **WHEN** MappingDetail renders an entity node
- **THEN** the `.jsonata` mapping file path (from `entity.mapping`) SHALL be displayed as header

#### Scenario: Record number displayed
- **WHEN** the entity data includes a `record` number
- **THEN** MappingDetail SHALL display the record index (e.g. "record #0 from data.yml")

### Requirement: MappingDetail renders scene-ref resolution
MappingDetail SHALL render a `SceneTreeNode` with `kind: 'scene-ref'` showing the reference source, variables, and resolved output.

#### Scenario: Scene-ref with variables
- **WHEN** MappingDetail receives a node with `kind: 'scene-ref'` and `ref.with` containing variables
- **THEN** it SHALL display the source name, variable key-value pairs, and the resolved component

#### Scenario: Scene-ref without variables
- **WHEN** MappingDetail receives a scene-ref without `ref.with`
- **THEN** it SHALL display the source name and resolved component

### Requirement: MappingDetail renders component props directly
MappingDetail SHALL render a `SceneTreeNode` with `kind: 'component'` showing props and slots without a mapping column.

#### Scenario: Component with props
- **WHEN** MappingDetail receives a node with `kind: 'component'`
- **THEN** it SHALL display the component name and props/slots directly, without mapping visualization

### Requirement: MappingDetail is standalone and reusable
MappingDetail SHALL accept a single `SceneTreeNode` as its primary prop and SHALL NOT depend on Storybook APIs or panel state.

#### Scenario: Used outside scene panel
- **WHEN** MappingDetail is rendered in a non-panel context (e.g. a data-model page)
- **THEN** it SHALL render correctly without scene or panel providers

#### Scenario: Minimal SceneTreeNode
- **WHEN** MappingDetail receives a SceneTreeNode with only `kind` and `component`, no `props` or `slots`
- **THEN** it SHALL render the component name and gracefully handle missing data
