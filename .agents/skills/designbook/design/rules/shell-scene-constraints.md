---
trigger:
  steps: [design-shell and:create-scene]
---

# Shell Scene Constraints

Constraints specific to shell scenes (design-system layout).

## Rules

- **`$content` injection point** -- exactly one slot in the root component MUST be set to `$content`. This is where section scenes inject their content.
- **Inline everything** -- all sub-component slots must be fully expanded with props and content. Never use `story: default` alone.
- **`group:`** must be `"Designbook/Design System"`
- **`id:`** must be `debo-design-system`
- **Scene name** -- the shell scene MUST be named `shell`

### Derivation from the reference

The shell scene is a structural mapping of the `DesignReference` — not a free composition. The following derivations are binding:

- **One row per landmark band** — each entry in `landmarks.header.rows[]` and `landmarks.footer.rows[]` MUST be represented as a separate row component (typically a `section` or `container` embed) in that order. Collapsing multiple rows into one is forbidden; the partner bar and the main header are distinct rows with distinct backgrounds and MUST stay separate.
- **Row content in reading order** — each row's slots/items MUST follow the `content` order captured in the extract (e.g. `logo | search | account | cart`). Do not reorder.
- **Forms are components, not HTML** — every entry in `forms[]` that appears in header or footer (search, newsletter, …) MUST be rendered via the `form` / `input` / `submit` components. Inline `<form>`/`<input>` HTML in slots is forbidden.
- **Images reference extracted assets** — every entry in `images[]` whose `location` is `header` or `footer` MUST be referenced via `local_path` in an `<img src="…">` (or as an inline SVG element). Text placeholders ("BIBB logo", "BMBF wordmark", styled text spans) are forbidden when `local_path` is set.
- **Navigation from navigation[]** — header/footer navigation items MUST be derived from `navigation[]` entries with matching `role`, preserving labels, URLs, and nesting.
- **Breakpoint-aware structure** — when `breakpoints[]` records layout changes for the shell (e.g. nav collapse at `md`), the scene structure MUST accommodate them; do not hard-code desktop-only markup.

## Output Structure

```yaml
id: debo-design-system
title: Design System
description: [layout description]
status: planned
order: 0

group: "Designbook/Design System"
scenes:
  - name: shell
    items:
      - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:page"
        slots:
          header:
            - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:header"
              slots:
                # fully inline all header sub-components
          content: $content
          footer:
            - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:footer"
              slots:
                # fully inline all footer sub-components
```
