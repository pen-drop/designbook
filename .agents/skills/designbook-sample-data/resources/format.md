# Sample Data Format Reference

## Nested entity_type.bundle Structure

Sample data uses a **nested structure** that mirrors `data-model.yml`:

```yaml
content:
    taxonomy_term:
      author:
        - id: "1"
          title: Dr. Lena Hartmann
          field_role: Tierärztin
    node:
      article:
        - id: "1"
          title: Article Title
          field_author: "1"
config:
    view:
      article_listing:
        - id: "article_listing"
          items_per_page: 6
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

### Structure Rules

| Level | Key                                                                                 | Maps to                                                                                |
|-------|-------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| 1     | `content`, `config`                                                                 | Either or content or config. Both are entities and using the same structure.           |
| 2     | `node`, `taxonomy_term`, `block_content`, `media` or `view` as a example for config | Entity type from `data-model.yml`                                                      |
| 3     | `article`, `author`, `pet`, or    `lsiting_article` for config                      | Bundle for content or config.                                                          |
| 5     | Array of records                                                                    | Individual entity values for each field. If they are entity references use sub objects |


`record` is the zero-based index into the target bundle's records array in `data.yml`.

### Entity references

Handle entity references if the field is described as type="entityrefernce|reference" `data-model.yml`:

```
content:
    node:
      article:
        - title: "title"
           field_author:
            - type: entity
              entity_type: user
              bundle: user
              view_mode: compact
              record: 0

```
   
The same logic for config entities. 
```
config:
    view:
      article_listing:
        - id: "article_listing"
          items_per_page: 6
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
- `id` — required, simple string (`"1"`, `"2"`, etc.)
- `title` — required for most entities
- Field names MUST match data-model.yml)
- Reference fields store the target entity's `id` value

## Field Templates

Fields may declare `sample_template` in `data-model.yml` to control value structure:

```yaml
body:
  type: text_with_summary
  title: Body
  sample_template:
    template: formatted-text        # which rule to apply
    settings:
      hint: "Technical article"     # content guidance (optional)
```

**Precedence** (highest to lowest):
1. `sample_template.template` — explicit template → loads rule `when: template: <name>`
2. `field_type` rule — no `sample_template` but rule exists `when: field_type: <type>` → auto-applied
3. Plain string — fallback when no template or rule matches

Backend-specific templates (e.g. `formatted-text`, `link`, `image`) are provided by backend skills such as `designbook-drupal/sample-data/`.

## Content Guidelines

- Create 5–10 records per entity (enough for lists, pagination, empty states)
- Use realistic, varied content — no "Lorem ipsum"
- Include edge cases: long names, empty optional fields, different statuses
- Vary content across records (different lengths, categories, authors)
- Reference fields should form a realistic web of relationships
