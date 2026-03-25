# Drupal Views in data-model.yml

Drupal Views are modeled as `config.view.<view_name>` — same entity_type/bundle structure as content entities. They use `view_modes` and templates like all other entities.

## Structure

```yaml
config:
  view:
    recent_articles:
      view_modes:
        default:
          template: field-map
      fields:
        rows: 
          type: entityreference
```

## Template Selection

Use `view_modes.<mode>.template` to declare which template rule renders this view. The template name must match a rule in `skills/*/rules/*.md` with `when: template: <name>`.

Common templates for Drupal views:

| Template | Use case |
|----------|----------|
| `list-view` | Standard Drupal View — rows are entities resolved via `entity-builder` |

## Sample Data

Views have `rows` in their data.yml record — each row is an entity reference resolved by the entity builder:

```yaml
config:
  view:
    recent_articles:
      - id: "1"
        rows:
          - type: entity
            entity_type: node
            bundle: article
            view_mode: teaser
            record: 0
          - type: entity
            entity_type: node
            bundle: article
            view_mode: teaser
            record: 1
```

The entity builder resolves `rows` entries the same way it resolves `type: entity` references in other records.
