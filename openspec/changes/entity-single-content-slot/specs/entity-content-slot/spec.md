## ADDED Requirements

### Requirement: Single content slot for entity components
Entity design components SHALL have exactly one slot named `content` instead of one slot per Drupal field. All UI components for the entity's fields SHALL be composed sequentially inside this single `content` slot.

#### Scenario: Entity component has one content slot
- **WHEN** the `designbook-entity` skill generates an entity component for `node/article`
- **THEN** the `.component.yml` file SHALL contain exactly one slot named `content`
- **AND** the slot SHALL have title "Content" and a description referencing the entity bundle

#### Scenario: Twig template uses single content slot
- **WHEN** the entity Twig template is generated
- **THEN** it SHALL render `{{ content }}` inside a single wrapper element
- **AND** the wrapper element SHALL use the BEM class `entity-[type]-[bundle]` (e.g., `entity-node-article`)

#### Scenario: All UI components rendered inside content slot
- **WHEN** the story YAML is generated for an entity
- **THEN** all field-mapped UI components SHALL appear as children of the `content` slot
- **AND** no other slots SHALL exist in the story
