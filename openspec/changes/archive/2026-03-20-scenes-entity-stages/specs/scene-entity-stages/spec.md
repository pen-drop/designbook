## ADDED Requirements

### Requirement: map-entity stage for structured entity rendering
The `designbook-scenes` skill SHALL provide a `map-entity` task that covers all structured entity rendering: all view modes except `full` when `composition: unstructured`, and recursive entity references encountered during mapping.

`map-entity` SHALL be the recursive workhorse of the entity rendering pipeline. When a field is a reference to another entity, the agent SHALL call `map-entity` again for that entity + view_mode.

#### Scenario: Structured field mapping
- **WHEN** an agent maps a `composition: structured` entity in any view mode
- **THEN** the agent SHALL use the `map-entity` task
- **AND** reference fields SHALL emit entity refs that are themselves resolved via `map-entity`

#### Scenario: Non-full view mode always uses map-entity
- **WHEN** an agent maps any entity with `view_mode != full`
- **THEN** the agent SHALL use the `map-entity` task regardless of `composition`

#### Scenario: Recursive entity resolution
- **WHEN** a JSONata expression emits a `type: entity` node (e.g. a Paragraphs reference field)
- **THEN** the agent SHALL apply `map-entity` for that nested entity's view_mode
- **AND** this recursion MAY be arbitrarily deep

### Requirement: compose-entity stage for unstructured entity rendering
The `designbook-scenes` skill SHALL provide a `compose-entity` task that covers direct component composition — used when there are no fields to map.

Two cases route to `compose-entity`:
1. `entity_type: view` (view entities) — regardless of view_mode
2. `view_mode: full` AND `composition: unstructured` on a content entity

#### Scenario: View entity routing
- **WHEN** an agent encounters `entity_type: view` (e.g. `entity: view.recent_articles`)
- **THEN** the agent SHALL use the `compose-entity` task
- **AND** the `compose-view-entity` rule SHALL apply

#### Scenario: Unstructured full view mode routing
- **WHEN** an entity has `composition: unstructured` AND `view_mode: full`
- **THEN** the agent SHALL use the `compose-entity` task
- **AND** an extension-specific rule SHALL apply based on `DESIGNBOOK_EXTENSIONS`

### Requirement: Per-extension compose rules
The `designbook-scenes` skill SHALL provide extension-specific rule files for `compose-entity`, loaded via `when: extensions: [...]` frontmatter.

Each active extension gets its own compose rule describing the allowed component tree structure.

#### Scenario: Layout Builder compose rule
- **WHEN** `compose-entity` is invoked AND `extensions` includes `layout_builder`
- **THEN** the `compose-layout-builder` rule SHALL apply
- **AND** the rule SHALL constrain composition to: section components wrapping `block_content` entity refs in column slots

#### Scenario: Canvas compose rule
- **WHEN** `compose-entity` is invoked AND `extensions` includes `canvas`
- **THEN** the `compose-canvas` rule SHALL apply
- **AND** the rule SHALL allow flat component trees with direct component nodes

#### Scenario: View entity compose rule
- **WHEN** `compose-entity` is invoked for `entity_type: view`
- **THEN** the `compose-view-entity` rule SHALL apply
- **AND** the rule SHALL describe: JSONata file with `{}` input, inline entity refs, wrapper component
