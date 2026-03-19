---
when:
  stages: [compose-entity]
  extensions: [canvas]
---

# Rule: Canvas Composition

Applies when composing a `composition: unstructured` entity with `view_mode: full` and Canvas active.

## Pattern

Canvas uses a **flat component tree** — direct component nodes without section wrappers. Components can be nested arbitrarily via slots.

```yaml
# In scenes.yml — entity node with inline components:
- entity: node.landing_page
  view_mode: full
  components:
    - component: provider:hero
      props:
        background: dark
      slots:
        heading: Welcome to our site
        subheading: Discover what we offer
        cta:
          - component: provider:button
            props: {variant: primary}
            slots: {text: Get started}
    - component: provider:feature-grid
      props:
        columns: 3
      slots:
        items:
          - component: provider:feature-card
            slots: {title: Feature 1, body: Description here}
          - component: provider:feature-card
            slots: {title: Feature 2, body: Description here}
    - component: provider:cta-band
      slots:
        heading: Ready to start?
        action:
          - component: provider:button
            props: {variant: outline}
            slots: {text: Learn more}
```

## Rules

- No section wrapper required — components go directly in the `components:` array
- Components may be nested via slots (unlike Layout Builder, no block_content constraint)
- All component values use `provider:component` format — resolve `$DESIGNBOOK_SDC_PROVIDER`
- Keep the component tree realistic to what Canvas would actually author
- Slot values can be strings (text) or nested component arrays
