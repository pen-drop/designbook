# view-entity Specification

## Purpose
Defines the `view.<name>` entity convention — a JSONata-defined entity type for listing views and aggregated content that requires no data-model.yml entry and no sample data record.

## Requirements

### Requirement: View entity scene node

Scenes SHALL support `entity: view.<name>` as a scene node. The `view` entity type is a convention for JSONata-defined view entities that declare their own content inline.

```yaml
- entity: view.recent_articles
  view_mode: default          # optional, defaults to "default"
```

#### Scenario: View entity node in scene content slot

- **WHEN** a scene contains `- entity: view.recent_articles`
- **THEN** the renderer SHALL load `view-modes/view.recent_articles.default.jsonata`
- **AND** SHALL evaluate it with `{}` as input
- **AND** SHALL resolve any entity refs in the output via `resolveEntityRefs`

#### Scenario: View entity node with view_mode override

- **WHEN** a scene contains `entity: view.recent_articles` with `view_mode: compact`
- **THEN** the renderer SHALL load `view-modes/view.recent_articles.compact.jsonata`

#### Scenario: View entity JSONata declares entity refs inline

- **WHEN** `view.recent_articles.default.jsonata` returns a ComponentNode with entity refs in a slot
- **THEN** `resolveEntityRefs` SHALL resolve those refs exactly as it does for any other entity ref
- **AND** the final output SHALL contain fully-resolved ComponentNode trees

#### Scenario: Missing JSONata file

- **WHEN** `entity: view.recent_articles` is used
- **AND** no `view.recent_articles.default.jsonata` file exists
- **THEN** the renderer SHALL render a placeholder component with a descriptive message

### Requirement: View entity requires no data.yml entry

View entities SHALL NOT require an entry in `data.yml`. The builder SHALL pass `{}` as input when no record is found.

#### Scenario: No data.yml entry for view entity

- **WHEN** `entity: view.recent_articles` is used
- **AND** `data.yml` contains no `view.recent_articles` entries
- **THEN** the renderer SHALL proceed normally, passing `{}` to the JSONata expression
- **AND** SHALL NOT emit a warning about missing sample data

### Requirement: View entities are not defined in data-model.yml

The `data-model.yml` file SHALL NOT require any entry for view entities. View entities exist solely as JSONata files.

#### Scenario: No data-model entry needed

- **WHEN** `entity: view.recent_articles` is used in scenes.yml
- **AND** `data-model.yml` has no `view:` section
- **THEN** schema validation SHALL pass
- **AND** the renderer SHALL resolve the view entity via its JSONata file
