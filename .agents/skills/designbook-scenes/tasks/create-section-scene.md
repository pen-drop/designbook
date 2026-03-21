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
        ref: "design-system:shell"
        with:
          content:
            - entity: node.article
              view_mode: full
              record: 0

```

## Overview Scenes

When a section includes an overview scene (e.g., listing/landing page):

### With `landing_page` or `layout_builder` entity type

If the data model contains an entity type like `node.landing_page` or `node.layout_builder`, use it directly as the content entity for the overview scene:

```yaml
  - name: "Blog Overview"
    items:
      - type: scene
        ref: "design-system:shell"
        with:
          content:
            - entity: node.landing_page
              view_mode: full
              record: 0
```

### Without landing page entity type

If no `landing_page` or `layout_builder` entity type exists in the data model, create a `config.view.entity` entry and use it:

1. Register in `data-model.yml` under `config:`:

```yaml
config:
  view:
    {{ section_id }}_overview:
```

2. Reference in the scene:

```yaml
  - name: "Blog Overview"
    items:
      - type: scene
        ref: "design-system:shell"
        with:
          content:
            - entity: view.{{ section_id }}_overview
              view_mode: default
```

## Full Example

```yaml
# sections/blog/blog.section.scenes.yml — with landing_page entity
id: blog
title: Blog
description: Artikel und News rund ums Thema.
status: planned
order: 2

group: "Designbook/Sections/Blog"
scenes:
  - name: "Blog Detail"
    items:
      - type: scene
        ref: "design-system:shell"
        with:
          content:
            - entity: node.article
              view_mode: full
              record: 0

  - name: "Blog Overview"
    items:
      - type: scene
        ref: "design-system:shell"
        with:
          content:
            - entity: node.landing_page
              view_mode: full
              record: 0
```

### Full Example — without landing page entity

```yaml
# sections/blog/blog.section.scenes.yml — with config.view entity
id: blog
title: Blog
description: Artikel und News rund ums Thema.
status: planned
order: 2

group: "Designbook/Sections/Blog"
scenes:
  - name: "Blog Detail"
    items:
      - type: scene
        ref: "design-system:shell"
        with:
          content:
            - entity: node.article
              view_mode: full
              record: 0

  - name: "Blog Overview"
    items:
      - type: scene
        ref: "design-system:shell"
        with:
          content:
            - entity: view.blog_overview
              view_mode: default
```

## Critical Rules

> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `test_integration_drupal:header`, NEVER just `header`.
> `$DESIGNBOOK_SDC_PROVIDER` is set by the workflow bootstrap (Rule 0).

> ⛔ **No `type: element` in scenes.** Never use `type: element` nodes inside slots.
> Use plain string values for text content. `type: element` is only valid in component `*.story.yml` files.

> ⛔ **Shell scenes: inline all slots.** Header and footer MUST inline ALL their sub-component slots — `logo`, `navigation` (with `items` populated), `actions`, `copyright`. Never write `story: default` alone.
