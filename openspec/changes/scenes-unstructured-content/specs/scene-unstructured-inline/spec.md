## ADDED Requirements

### Requirement: Entity nodes support inline component trees

An entity node in scenes.yml MAY carry a `components` array containing a static `RawNode[]` tree. When present, the entityBuilder SHALL return it directly without loading a JSONata expression file.

#### Scenario: Inline components bypass JSONata lookup

- **WHEN** an entity node in scenes.yml has a `components` array
- **THEN** the entityBuilder SHALL return that array as `RawNode[]` without attempting to load a `.jsonata` file
- **AND** `resolveEntityRefs` SHALL process the result identically to the JSONata path

#### Scenario: Nested entity refs in inline components are resolved

- **WHEN** an inline `components` array contains `entity` nodes (duck-typed or normalized)
- **THEN** `resolveEntityRefs` SHALL recursively resolve them to `ComponentNode[]`
- **AND** the final output SHALL contain no unresolved entity refs

#### Scenario: Nested entity refs in slots are resolved

- **WHEN** a component node inside `components` has a slot containing an entity ref
- **THEN** `resolveSlots` SHALL resolve it via `buildNode`
- **AND** the slot value SHALL be replaced with `ComponentNode | ComponentNode[]`

#### Scenario: Entity node without components follows existing path

- **WHEN** an entity node has no `components` key
- **THEN** the entityBuilder SHALL follow the existing JSONata lookup path unchanged

#### Scenario: EntitySceneNode type accepts components field

- **WHEN** `EntitySceneNode` is used in TypeScript
- **THEN** it SHALL accept an optional `components?: RawNode[]` field without type error
