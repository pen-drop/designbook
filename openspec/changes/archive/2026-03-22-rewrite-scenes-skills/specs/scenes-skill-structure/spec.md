## ADDED Requirements

### Requirement: SKILL.md explains three core concepts

The `designbook-scenes` SKILL.md SHALL explain Shell, Section, and Entity-Mapping as three distinct concepts. It SHALL NOT contain step-by-step build procedures. Each concept SHALL have one complete YAML example.

#### Scenario: Shell concept
- **WHEN** the AI reads the Shell section
- **THEN** it understands that a Shell is a scene composing layout components (header, footer, nav) with a `$content` placeholder slot

#### Scenario: Section concept
- **WHEN** the AI reads the Section section
- **THEN** it understands that a Section references a Shell via `scene:` key and fills `$content` with entities or components

#### Scenario: Entity-Mapping concept
- **WHEN** the AI reads the Entity-Mapping section
- **THEN** it understands that JSONata expressions transform data records into `ComponentNode[]`

#### Scenario: Convergence to ComponentNode
- **WHEN** the AI reads SKILL.md
- **THEN** it understands that all SceneNode types (component, entity, scene) resolve to `ComponentNode[]` at build time

### Requirement: JSON Schema as scenes.yml reference

The skill SHALL provide a JSON Schema (in markdown) that defines the `*.scenes.yml` file format. The schema SHALL cover file-level fields, scene-level fields, and all SceneNode types using duck-typed keys (`component:`, `entity:`, `scene:`).

#### Scenario: Schema covers all node types
- **WHEN** the AI consults the schema
- **THEN** it can validate that a scenes.yml file uses correct field names and types for component, entity, and scene nodes

#### Scenario: Schema uses duck-typed format
- **WHEN** the AI reads the schema
- **THEN** all scene reference examples use `scene: "source:name"` format (not `type: scene` + `ref:`)

### Requirement: Tasks define input-output contracts

Each task file SHALL define its interface via frontmatter (params, files, reads) and describe the expected output format and constraints. Tasks SHALL NOT prescribe step-by-step procedures for how the AI should build the output.

#### Scenario: Task has clear output definition
- **WHEN** the AI reads a task file
- **THEN** it knows what file to create, what format it should have, and what constraints apply — without being told how to compose it

#### Scenario: Task frontmatter is preserved
- **WHEN** comparing old and new task files
- **THEN** the frontmatter keys (params, files, reads) are identical to maintain workflow compatibility

### Requirement: Resources consolidated

The skill SHALL have three resource files: `scenes-schema.md` (JSON Schema), `jsonata-reference.md` (JSONata output format and syntax), and `scenes-constraints.md` (constraint examples). The previous `entry-types.md` and `field-reference.md` SHALL be removed (their content is captured by the schema).

#### Scenario: No duplicate documentation
- **WHEN** reviewing the skill's resources
- **THEN** there is no overlapping documentation between schema and prose files

### Requirement: Drupal skill focuses on field mapping

The `designbook-scenes-drupal` SKILL.md SHALL explain that it provides Drupal-specific entity mapping rules. It SHALL reference the base `designbook-scenes` skill for general concepts. The `field-map.md` rule and `field-mapping.md` resource SHALL be updated with `scene:` format examples where applicable.

#### Scenario: Clear relationship to base skill
- **WHEN** the AI reads the Drupal skill
- **THEN** it understands that this skill adds Drupal field access patterns to the base entity-mapping concept
