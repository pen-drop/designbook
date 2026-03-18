---
params:
  section_id: ~
  section_title: ~
  section_description: ~
  scenes: []
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
files:
  - $DESIGNBOOK_DIST/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
---

# Create Section Scene

Creates `sections/{{ section_id }}/{{ section_id }}.section.scenes.yml` — defines all page scenes for a section, inheriting the shell layout via `type: scene` + `ref: design-system:shell`.

## Output

```
$DESIGNBOOK_DIST/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
```

## Format

```yaml
id: {{ section_id }}
title: {{ section_title }}
description: {{ section_description }}
status: planned
order: 1

group: "Designbook/Sections/{{ section_title }}"
scenes:
  - name: "Detail"
    items:
      - type: scene
        ref: design-system:shell
        with:
          content:
            - entity: node.article
              view_mode: full
              record: 0

  - name: "Listing"
    items:
      - type: scene
        ref: design-system:shell
        with:
          content:
            - entity: node.article
              view_mode: teaser
              records: [0, 1, 2]
```

## Key Rules

- **`type: scene` + `ref: design-system:shell`** — always inherit the shell; never repeat header/footer
- **`with:`** — fills `$content` slot only; other shell slots are inherited
- **Provider prefix required** — every `component:` value must use `provider:component` format (e.g. `test_integration_drupal:heading`). Resolve from `$DESIGNBOOK_SDC_PROVIDER`.
- **No `type: element`** — never use `type: element` in scenes files; use plain string values for text
- **Section metadata** — `id`, `title`, `description`, `status`, `order` are required; they drive Designbook overview navigation

> For full YAML examples, see `@designbook-scenes/resources/scene-reference.md`
