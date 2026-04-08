# recursive-entity-resolution Specification

## Purpose
Define how the builder registry recursively resolves entity, config, and scene reference nodes in the rendering pipeline.

## Requirements

### Requirement: Recursive entity resolution in renderer
The `resolveEntityRefs` function in the builder registry SHALL recursively resolve nodes that need building (entity, config, scene, and image refs) wherever they appear -- in top-level builder output and in component slot values.

#### Scenario: Entity node in builder output
- **WHEN** a builder returns a `RawNode[]` containing `{ type: "entity", entity_type, bundle, view_mode }`
- **THEN** `resolveEntityRefs` SHALL dispatch the node to `ctx.buildNode()`
- **AND** `ctx.buildNode()` finds the matching builder, calls `build()`, and recursively calls `resolveEntityRefs` on the result

#### Scenario: Entity node in component slot (single value)
- **WHEN** a component node has a slot value that is a single object matching `needsBuilding()` (entity, config, scene, or image ref)
- **THEN** `resolveSlots` SHALL dispatch the node to `ctx.buildNode()`
- **AND** replace the slot value with the first built ComponentNode (or the full array if multiple)

#### Scenario: Entity node in component slot (array)
- **WHEN** a component slot is an array containing objects that match `needsBuilding()`
- **THEN** `resolveSlots` SHALL dispatch each such object to `ctx.buildNode()`
- **AND** flatten the results into the slot array

#### Scenario: Nested recursion via buildNode loop
- **WHEN** a resolved entity produces output that itself contains nodes needing building
- **THEN** the `buildNode` -> `build` -> `resolveEntityRefs` chain SHALL continue resolving recursively
- **AND** there is no explicit depth guard -- recursion continues until no more nodes need building

### Requirement: needsBuilding type detection
The `needsBuilding()` function SHALL detect nodes that require further building using both normalized and YAML duck-typed formats.

#### Scenario: Normalized type detection
- **WHEN** a node has `type: 'entity'` or `type: 'config'`
- **THEN** `needsBuilding()` SHALL return true

#### Scenario: Duck-typed format detection
- **WHEN** a node has `entity` (string), `image` (string), `config` (string), or `scene` (string) as a direct property
- **THEN** `needsBuilding()` SHALL return true

#### Scenario: Plain ComponentNode passes through
- **WHEN** a node has `component` property but does not match any building criteria
- **THEN** `needsBuilding()` SHALL return false
- **AND** the node SHALL pass through with only its slots recursively resolved

### Requirement: Mixed slots handling
Component slots SHALL handle mixed content types correctly: strings, component nodes, and nodes that need building.

#### Scenario: All-string array slot
- **WHEN** a component slot is an array where every element is a string
- **THEN** `resolveSlots` SHALL join the strings into a single string value

#### Scenario: Mixed array with components and entities
- **WHEN** a component slot is an array containing both ComponentNode objects and entity refs
- **THEN** entity refs SHALL be resolved via `ctx.buildNode()` and the results flattened into the array
- **AND** ComponentNode objects SHALL have their own slots recursively resolved

#### Scenario: String slot passes through unchanged
- **WHEN** a component slot value is a plain string
- **THEN** `resolveSlots` SHALL pass it through unchanged

### Requirement: Missing builder warning
When no registered builder matches a node, `buildNode` SHALL log a warning and return an empty array.

#### Scenario: Unknown node type
- **WHEN** a node has `type: "unknown-custom"` and no builder's `appliesTo` returns true
- **THEN** `buildNode` SHALL log `[Designbook] No builder found for node type "unknown-custom" -- skipping.`
- **AND** return an empty `ComponentNode[]`
