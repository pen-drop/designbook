## ADDED Requirements

### Requirement: List config section in data model

The data model schema SHALL support a `config.list` section where each entry declares a named list with its content sources, limit, and sorting hint.

```yaml
config:
  list:
    <list_name>:
      sources:
        - entity_type: <string>
          bundle: <string>
          view_mode: <string>
      limit: <integer>
      sorting: <string>
```

#### Scenario: Single-source list

- **WHEN** a list config has one source with `entity_type: node`, `bundle: article`, `view_mode: teaser`
- **THEN** the config SHALL be valid
- **AND** the renderer SHALL load records from `node.article` sample data and render each through `node.article.teaser.jsonata`

#### Scenario: Multi-bundle list

- **WHEN** a list config has multiple sources with the same entity_type but different bundles
- **THEN** the config SHALL be valid
- **AND** the renderer SHALL load records from each source's bundle and render each through its respective view mode

#### Scenario: Multi-entity-type list

- **WHEN** a list config has sources spanning different entity types (e.g., `node.article`, `node.event`, `media.document`)
- **THEN** the config SHALL be valid
- **AND** each source's records SHALL be rendered through their own entity view-mode JSONata

#### Scenario: Sources array is required

- **WHEN** a list config has no `sources` field or an empty `sources` array
- **THEN** schema validation SHALL fail

#### Scenario: Each source requires entity_type, bundle, view_mode

- **WHEN** a source entry is missing `entity_type`, `bundle`, or `view_mode`
- **THEN** schema validation SHALL fail

#### Scenario: Limit is optional

- **WHEN** a list config omits `limit`
- **THEN** the config SHALL be valid
- **AND** the renderer SHALL use all available sample data records

#### Scenario: Sorting is optional and declarative

- **WHEN** a list config includes `sorting: created`
- **THEN** the config SHALL be valid
- **AND** sorting SHALL be treated as a documentation hint only — sample data order is used at render time

### Requirement: Config replaces views in schema

The `config.views` section SHALL be replaced by `config.list`. The `view` definition SHALL be removed from the schema.

#### Scenario: Config.views no longer valid

- **WHEN** a data model contains `config.views`
- **THEN** schema validation SHALL fail (or the key SHALL be ignored)

#### Scenario: Config.list accepted

- **WHEN** a data model contains `config.list` with valid list entries
- **THEN** schema validation SHALL pass

### Requirement: Config scene node type

Scenes SHALL support a `config` node type that references a config entry by type and name.

```yaml
- config: list.recent_articles
  view_mode: default          # optional, defaults to "default"
```

#### Scenario: Config node in scene content slot

- **WHEN** a scene layout slot contains `- config: list.recent_articles`
- **THEN** the scene parser SHALL produce a `ConfigSceneNode` with `config_type: "list"`, `config_name: "recent_articles"`, `view_mode: "default"`

#### Scenario: Config node with view_mode override

- **WHEN** a scene entry has `config: list.recent_articles` and `view_mode: compact`
- **THEN** the parser SHALL produce a node with `view_mode: "compact"`
- **AND** the renderer SHALL evaluate `list.recent_articles.compact.jsonata`

#### Scenario: Config node embedded in component slot

- **WHEN** a config node appears inside a component's slot (e.g., inside a section column)
- **THEN** the renderer SHALL resolve it inline, replacing the config node with the rendered list output

#### Scenario: Invalid config reference

- **WHEN** a config node references `list.nonexistent`
- **AND** no such list exists in `data-model.yml`
- **THEN** the renderer SHALL emit a warning and render a placeholder comment
