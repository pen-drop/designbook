## ADDED Requirements

### Requirement: Entity Component Directory Convention

The skill SHALL place entity components under `$DESIGNBOOK_DIST/design/entity/[entity_type]/[bundle]/`. Component files use uniquely prefixed names: `entity_[entitytype]_[bundle]`.

#### Scenario: Node article entity
- **WHEN** the skill generates an entity component for node/article
- **THEN** the files are created at `$DESIGNBOOK_DIST/design/entity/node/article/entity_node_article.component.yml`, `entity_node_article.story.yml`, and `entity_node_article.twig`

#### Scenario: Block hero entity
- **WHEN** the skill generates an entity component for block/hero
- **THEN** the files are created at `$DESIGNBOOK_DIST/design/entity/block/hero/entity_block_hero.component.yml`, `entity_block_hero.story.yml`, and `entity_block_hero.twig`

---

### Requirement: Entity Components Are Structural Only

Entity component Twig templates SHALL NOT contain HTML markup. They SHALL only render slot references for each field.

#### Scenario: Entity Twig is structural
- **WHEN** the skill generates `entity_node_article.twig`
- **THEN** the template contains only `{{ field_title }}{{ field_body }}{{ field_image }}` with no HTML elements or CSS classes

---

### Requirement: Generate from Data Model

The skill SHALL read `$DESIGNBOOK_DIST/data-model.json` and generate one entity component per entity type/bundle. Fields from the data model SHALL be mapped to component slots.

#### Scenario: Entity component created from data model
- **WHEN** the data model contains `content.node.article` with fields `field_title`, `field_body`, `field_image`
- **THEN** the skill generates `entity_node_article.component.yml` with slots for each field

#### Scenario: Multiple entity types
- **WHEN** the data model contains `node.article`, `node.page`, and `media.image`
- **THEN** three entity components are generated under their respective directories

#### Scenario: Missing data model
- **WHEN** `$DESIGNBOOK_DIST/data-model.json` does not exist
- **THEN** the skill SHALL report an error and stop, listing `data-model.json` as a prerequisite

---

### Requirement: Structured View Modes

A structured view mode SHALL render entity fields directly through named slots. Each field from the data model maps to one slot, populated by a UI component in the story.

Structured vs. unstructured is a property of the **view mode**, not the entity type. The same entity CAN have both structured and unstructured view modes.

#### Scenario: Structured full view mode for article
- **WHEN** `node/article` has a structured `full` view mode
- **THEN** the entity component's `full` story variant populates each field slot (`field_title`, `field_body`, `field_image`) with UI component references

#### Scenario: Entity with both structured and unstructured view modes
- **WHEN** `node/article` has view modes `full` (structured) and `landing` (unstructured)
- **THEN** the entity component has two story variants: `full` with per-field slots and `landing` with a single `content` slot

---

### Requirement: Unstructured View Modes

An unstructured view mode SHALL provide a single `content` slot. This slot is filled with a layout component that arranges block entity components.

#### Scenario: Unstructured view mode with layout
- **WHEN** `node/page` has an unstructured `full` view mode
- **THEN** the entity component's `full` story variant has a single `content` slot
- **AND** the story populates the `content` slot with a layout component containing block entity references in column slots

---

### Requirement: Sample Data Becomes Stories

The skill SHALL read `$DESIGNBOOK_DIST/sections/[section-id]/data.json` to populate story slot values with realistic sample data. It SHALL read `screen-designs.md` to determine which UI component renders each field.

#### Scenario: Story populated from data.json
- **WHEN** `data.json` contains an article with `field_title: "Breaking: Climate Report"`
- **AND** `screen-designs.md` maps `field_title` to an `h1` element
- **THEN** the generated story has `field_title` slot with `type: element, tag: h1, value: "Breaking: Climate Report"`

#### Scenario: No data.json available
- **WHEN** `data.json` does not exist for a section
- **THEN** the skill generates stories with placeholder values and warns the user to run `/sample-data`

---

### Requirement: Block Entity Components

Block entity components SHALL have only one view mode. They wrap a single UI component. Block components are placed at `$DESIGNBOOK_DIST/design/entity/block/[bundle]/`.

#### Scenario: Block wraps a UI component
- **WHEN** the skill generates `design/entity/block/hero/`
- **THEN** the block component `entity_block_hero` has one slot that references the `hero` UI component
- **AND** the block story populates the slot with the `hero` UI component and sample data

---

### Requirement: Layout Component Convention

The skill SHALL expect a layout UI component at `$DESIGNBOOK_DRUPAL_THEME/components/layout/` with one slot per column. For unstructured view modes, the layout component arranges block entity components into named column slots.

#### Scenario: Layout component used in unstructured entity
- **WHEN** an unstructured entity view mode uses a two-column layout
- **THEN** the story references the `layout` UI component with `column_1` and `column_2` slots
- **AND** each column slot contains block entity component references

---

### Requirement: Delegation to designbook-drupal-components

The skill SHALL delegate actual SDC file creation to `designbook-drupal-components`, passing the output directory and the uniquely prefixed component name.

#### Scenario: Entity files created via delegation
- **WHEN** the skill needs to create an entity component for node/article
- **THEN** it prepares a component definition and invokes `designbook-drupal-components` with `outputDir` set to `$DESIGNBOOK_DIST/design/entity/node/article/` and component name `entity_node_article`
