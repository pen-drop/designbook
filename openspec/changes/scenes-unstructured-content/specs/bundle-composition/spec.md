## MODIFIED Requirements

### Requirement: Composition field in data model schema

The data model schema SHALL support a `composition` field at the bundle level with values `structured` or `unstructured`.

#### Scenario: Default composition

- **WHEN** a bundle has no `composition` field
- **THEN** it SHALL default to `structured`

#### Scenario: Structured bundle

- **WHEN** a bundle has `composition: structured` (or no composition field)
- **THEN** all view modes for this bundle SHALL render via field-based JSONata expressions
- **AND** JSONata output MAY contain `type: "entity"` nodes for reference fields

#### Scenario: Unstructured bundle — full view mode via inline components

- **WHEN** a bundle has `composition: unstructured`
- **AND** the view mode is `full`
- **THEN** scenes.yml SHALL use inline `components:` on the entity node instead of a JSONata expression file
- **AND** no `.jsonata` file is required for the full view mode of this bundle

#### Scenario: Unstructured bundle — non-full view modes

- **WHEN** a bundle has `composition: unstructured`
- **AND** the view mode is NOT `full` (e.g., teaser, card, compact)
- **THEN** the view mode SHALL be treated as structured (field-based JSONata)
- **AND** the bundle's field definitions SHALL be used

#### Scenario: Unstructured bundle still has fields

- **WHEN** a bundle has `composition: unstructured`
- **THEN** the bundle SHALL still define fields for its non-full view modes (e.g., title, field_image, field_summary)

#### Scenario: Data model validation

- **WHEN** a data model is validated
- **THEN** `composition` SHALL be accepted as an optional enum field with values `[structured, unstructured]`
- **AND** any other value SHALL fail validation
