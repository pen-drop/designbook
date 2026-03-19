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

```

## Full Example

```yaml
# sections/blog/blog.section.scenes.yml
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
        ref: design-system:shell
        with:
          content:
            - entity: node.article
              view_mode: full
              record: 0

  - name: "Blog Listing"
    items:
      - type: scene
        ref: design-system:shell
        with:
          content:
            - entity: node.layout_builder
              view_mode: full
              record: 0
```

## Critical Rules

> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `test_integration_drupal:header`, NEVER just `header`.
> Resolve `$DESIGNBOOK_SDC_PROVIDER` from `@designbook-configuration` at generation time.

> ⛔ **No `type: element` in scenes.** Never use `type: element` nodes inside slots.
> Use plain string values for text content. `type: element` is only valid in component `*.story.yml` files.

> ⛔ **Shell scenes: inline all slots.** Header and footer MUST inline ALL their sub-component slots — `logo`, `navigation` (with `items` populated), `actions`, `copyright`. Never write `story: default` alone.
