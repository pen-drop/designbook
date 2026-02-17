## MODIFIED Requirements

### Requirement: Entity component generation
The `designbook-entity` skill SHALL generate entity design components with a **single `content` slot** instead of one slot per field. The story YAML SHALL use `type: ref` nodes with a `designbook:` metadata block to reference test data, instead of hardcoding prop values.

#### Scenario: Skill generates single content slot
- **WHEN** the skill generates an entity component for `node/article` with fields `title`, `body`, `field_media`
- **THEN** the `.component.yml` SHALL contain exactly one slot: `content`
- **AND** the `.story.yml` SHALL list all field components sequentially inside `slots.content`
- **AND** each field SHALL be a `type: ref` node with `ref`, `component`, and `props_map`

#### Scenario: Story includes designbook metadata
- **WHEN** the skill generates a story for a section with `data.json`
- **THEN** the `.story.yml` SHALL include a `designbook:` block with `testdata`, `entity_type`, and `bundle`
- **AND** `testdata` SHALL be the relative path from the designbook dist root to the section's `data.json`

#### Scenario: Non-data-driven components in story
- **WHEN** the entity includes components not mapped to data fields (e.g., CTA banners, author boxes from block_content)
- **THEN** these SHALL be included as `type: component` nodes with static props in the `content` slot
- **AND** they SHALL appear in the correct position within the content flow

#### Scenario: Field-to-component mapping table
- **WHEN** the skill maps fields to UI components
- **THEN** the mapping SHALL produce `type: ref` nodes with the following structure:
  ```yaml
  - type: ref
    ref: <field_name>
    component: '<provider>:<component_name>'
    props_map:
      <prop>: <field_path_or_literal>
  ```
- **AND** the standard field-type-to-component mapping table SHALL still apply for determining which UI component to use

#### Scenario: Twig template is minimal
- **WHEN** the skill generates the entity Twig template
- **THEN** it SHALL contain only a wrapper element and `{{ content }}`
- **AND** it SHALL NOT contain individual slot references like `{{ field_title }}`, `{{ field_body }}`, etc.
