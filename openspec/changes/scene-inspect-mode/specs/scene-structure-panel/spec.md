## ADDED Requirements

### Requirement: Structure panel registered as addon panel
A panel (`types.PANEL`) titled "Structure" SHALL be registered. The panel SHALL be visible when the current story has scene parameters.

#### Scenario: Panel visible for scene stories
- **WHEN** the current story has `parameters.scene`
- **THEN** the "Structure" panel tab SHALL appear in the panel area

#### Scenario: Panel disabled for non-scene stories
- **WHEN** the current story does not have `parameters.scene`
- **THEN** the "Structure" panel tab SHALL be disabled

### Requirement: Default view shows composition tree
When no node is selected, the panel SHALL display a composition tree showing the scene's entity and scene-ref nodes from `parameters.sceneTree`.

#### Scenario: Tree shows entities and scene-refs
- **WHEN** the panel renders with no node selected
- **THEN** the tree SHALL display entity nodes (with entity_type/bundle/view_mode) and scene-ref nodes (with ref source), in scene order

#### Scenario: Scene-refs show nested children
- **WHEN** a scene-ref resolves to nodes containing further entities in its slots
- **THEN** the tree SHALL show those nested entities as children of the scene-ref

#### Scenario: Component nodes are de-emphasized
- **WHEN** the tree contains direct component nodes (kind: 'component')
- **THEN** they SHALL be displayed with reduced visual emphasis compared to entity and scene-ref nodes

#### Scenario: Tree updates on story change
- **WHEN** user switches to a different scene story
- **THEN** the tree SHALL update to reflect the new scene's SceneTree

### Requirement: Node selection shows mapping detail
When a node is selected (via overlay click or tree click), the panel SHALL switch to mapping detail view.

#### Scenario: Select node from canvas overlay
- **WHEN** a `designbook/select-node` channel event is received with a node index
- **THEN** the panel SHALL switch to MappingDetail for `sceneTree[index]` and highlight the corresponding tree node

#### Scenario: Select node from tree
- **WHEN** user clicks a node in the composition tree
- **THEN** the panel SHALL switch to MappingDetail for that node

#### Scenario: Back to tree view
- **WHEN** user clicks a back button in mapping detail view
- **THEN** the panel SHALL return to the composition tree

### Requirement: Panel reads SceneTree from parameters
The panel SHALL read `parameters.sceneTree` via the `useParameter()` hook.

#### Scenario: No SceneTree available
- **WHEN** `parameters.sceneTree` is undefined or empty
- **THEN** the panel SHALL display an empty state message
