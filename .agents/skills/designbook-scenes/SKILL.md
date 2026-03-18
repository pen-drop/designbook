---
name: Designbook Scenes
description: Generates scene files that compose UI components + entity data into full page views. Uses *.scenes.yml format with items arrays and scene references.
---

# Designbook Scenes

Creates `*.scenes.yml` files that compose UI components and entity data into full page views. Each file contains one or more **scenes** — each scene becomes a Storybook story.

> **Multiple scenes per file.** Group related pages together.
>
> | File | Scenes |
> |------|---------|
> | `design-system/design-system.scenes.yml` | `shell`, `minimal` |
> | `sections/blog/blog.section.scenes.yml` | `Blog Detail`, `Blog Listing` |

## Output Structure

```
$DESIGNBOOK_DIST/
├── design-system/
│   └── design-system.scenes.yml       # Shell layout (base for inheritance)
└── sections/
    └── blog/
        └── blog.section.scenes.yml    # Section metadata + all blog scenes
```

## Critical Rules

> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `test_integration_drupal:header`, NEVER just `header`.
> Resolve `$DESIGNBOOK_SDC_PROVIDER` from `@designbook-configuration` at generation time.

> ⛔ **No `type: element` in scenes.** Never use `type: element` nodes inside slots.
> Use plain string values for text content. `type: element` is only valid in component `*.story.yml` files.

> ⛔ **Shell scenes: inline all slots.** Header and footer MUST inline ALL their sub-component slots — `logo`, `navigation` (with `items` populated), `actions`, `copyright`. Never write `story: default` alone.

## Task Files

- [create-shell-scene.md](tasks/create-shell-scene.md) — Create `design-system/design-system.scenes.yml`
- [create-scene.md](tasks/create-scene.md) — Create `sections/{id}/{id}.section.scenes.yml`

## Resources

- [scene-reference.md](resources/scene-reference.md) — Field reference, entry types (component/entity/records/config/scene), and YAML examples
