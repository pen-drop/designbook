## ADDED Requirements

### Requirement: Recursive entity resolution in renderer

The scene-module-builder renderer SHALL recursively resolve `type: "entity"` nodes wherever they appear — in JSONata output and in component slot values.

#### Scenario: Entity node in JSONata output

- **WHEN** a JSONata expression returns a `SceneNode[]` containing `{ type: "entity", entity_type, bundle, view_mode }`
- **THEN** the renderer SHALL look up the sample data for that entity
- **AND** evaluate the corresponding JSONata expression (e.g., `user.user.compact.jsonata`)
- **AND** recursively render the resulting nodes

#### Scenario: Entity node in component slot

- **WHEN** a component node has a slot value that is an array containing `{ type: "entity", ... }` nodes
- **THEN** the renderer SHALL recursively resolve each entity node in that slot
- **AND** replace the entity node with the rendered output

#### Scenario: Nested recursion

- **WHEN** a resolved entity produces output that itself contains `type: "entity"` nodes
- **THEN** the renderer SHALL continue resolving recursively

#### Scenario: Recursion depth guard

- **WHEN** entity resolution exceeds 5 levels of nesting
- **THEN** the renderer SHALL stop and emit a warning
- **AND** the unresolved entity node SHALL be rendered as a placeholder/comment

#### Scenario: Mixed slots

- **WHEN** a component slot contains a mix of plain values (strings) and `SceneNode[]`
- **THEN** the renderer SHALL only recursively process array values that contain objects with a `type` property
- **AND** plain string values SHALL be passed through unchanged
## Requirements
### Requirement: Recursive entity resolution in renderer

The scene-module-builder renderer SHALL recursively resolve `type: "entity"` nodes wherever they appear — in JSONata output and in component slot values.

#### Scenario: Entity node in JSONata output

- **WHEN** a JSONata expression returns a `SceneNode[]` containing `{ type: "entity", entity_type, bundle, view_mode }`
- **THEN** the renderer SHALL look up the sample data for that entity
- **AND** evaluate the corresponding JSONata expression (e.g., `user.user.compact.jsonata`)
- **AND** recursively render the resulting nodes

#### Scenario: Entity node in component slot

- **WHEN** a component node has a slot value that is an array containing `{ type: "entity", ... }` nodes
- **THEN** the renderer SHALL recursively resolve each entity node in that slot
- **AND** replace the entity node with the rendered output

#### Scenario: Nested recursion

- **WHEN** a resolved entity produces output that itself contains `type: "entity"` nodes
- **THEN** the renderer SHALL continue resolving recursively

#### Scenario: Recursion depth guard

- **WHEN** entity resolution exceeds 5 levels of nesting
- **THEN** the renderer SHALL stop and emit a warning
- **AND** the unresolved entity node SHALL be rendered as a placeholder/comment

#### Scenario: Mixed slots

- **WHEN** a component slot contains a mix of plain values (strings) and `SceneNode[]`
- **THEN** the renderer SHALL only recursively process array values that contain objects with a `type` property
- **AND** plain string values SHALL be passed through unchanged

