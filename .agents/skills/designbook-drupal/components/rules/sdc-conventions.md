---
domain: components
when:
  frameworks.component: sdc
---

# SDC Component Conventions

## Naming

- Directory name = file base name, always kebab-case: `button/button.*`, `navigation/navigation.*`
- `group:` required — one of: `Action`, `Data Display`, `Navigation`, `Layout`, `Shell`
- Components are **visually descriptive, never domain-specific**: `card` not `article-card`, `grid` not `article-teaser-grid`

## File Structure

- Three files minimum per component: `.component.yml` (metadata), `.twig` (template), `.story.yml` (stories) — always separate
- Stories always in a separate `.story.yml` — never inside `.component.yml`
- One `.twig` file per component — all variants inline with `{% if variant == '...' %}`; no partial twig files

## Slot Rules

Slot names in `.component.yml` must be **snake_case**: `main_content` ✅ — `mainContent` ❌

Every component template MUST include `attributes` on the root element:

```twig
<div{{ attributes.addClass([...]) }}>
```

Each Twig template must have exactly one root element. No fragments.

Slots are rendered directly — no wrapper unless the slot content requires it:

```twig
{% if text %}{{ text }}{% endif %}
{% if content %}{{ content }}{% endif %}
```

### `{% block %}` Wrapping for Layout Components

Layout components (`container`, `section`, `grid`) MUST wrap each slot output in `{% block <slotname> %}` tags. This is required for `{% embed %}` compatibility — without `{% block %}` tags, child templates that use `{% embed %}` cannot override slot content, causing it to silently disappear.

```twig
{# CORRECT — slot wrapped in block, embeddable #}
{% block content %}
  {% if content %}{{ content }}{% endif %}
{% endblock %}

{# WRONG — slot without block, embed overrides are silently ignored #}
{% if content %}{{ content }}{% endif %}
```

This applies to all slots on layout components, including optional slots like `background` and `header`.

## No Hardcoded Colors

Do not hardcode color values in Twig. Use design token CSS custom properties (e.g. `color: var(--color-primary)`, `background: var(--color-surface)`) or utility classes derived from them.

## Variants Instead of Duplicate Components

When two potential components share the same props and slots but differ only in layout or visual arrangement, implement as **variants of a single component** — not separate components.

| Scenario | Approach |
|----------|----------|
| Same props + same slots, different layout | Single component with variants |
| Different props or different slots | Separate components |
| Minor styling difference (e.g. color) | Variant with modifier class |

Each variant gets its own story file. The Twig template stays a single file with inline `{% if variant == '...' %}` blocks.

```
components/card/
├── card.component.yml        # one component, variants listed inside
├── card.vertical.story.yml   # one story file per variant
├── card.horizontal.story.yml
└── card.twig                 # one template — all variants inline
```

When variant markup only differs in a few classes, use conditional class assignment:

```twig
{% set card_classes = variant == 'horizontal' ? ['card', 'card-side'] : ['card'] %}
<div{{ attributes.addClass(card_classes) }}>
  {# shared markup #}
</div>
```

## Shell = UI

Shell components (header, footer, page) are full UI components with real HTML, not structural slot-only wrappers. Same location (`$DESIGNBOOK_HOME/components/`), same provider as all other UI components.

## Resolve `COMPONENT_NAMESPACE` at Generation Time

Never leave `COMPONENT_NAMESPACE` as a literal string in generated files. Read the config and substitute the actual value (e.g. `test_integration_drupal`).

## Placeholder Images in Stories

Story files must use placeholder service URLs for images, never local file paths:

```yaml
# Correct
- type: image
  uri: https://placehold.co/600x400

# Wrong — local file paths don't exist in Storybook
- type: image
  uri: /images/sample/photo.jpg
```

## Error Handling

- **Missing required parameter**: Report which parameter is missing
- **Invalid status value**: List valid options (`stable`, `experimental`, `deprecated`)
- **Invalid group value**: List valid options (`Action`, `Data Display`, `Navigation`, `Layout`, `Shell`)
- **Component already exists**: Ask for confirmation before overwriting
- **Schema validation fails**: Show errors and fix before continuing
- **No section files (shell)**: Warn but continue with empty navigation
