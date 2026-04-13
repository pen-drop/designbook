---
when:
  steps: [design-shell:create-scene, design-screen:create-scene, design-screen:map-entity]
---

# Scenes Critical Constraints

> Full `*.scenes.yml` format and `ComponentNode` output schema: see [scenes-schema](../resources/scenes-schema.md).

> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `$COMPONENT_NAMESPACE:header`, NEVER just `header`.
> `COMPONENT_NAMESPACE` is set by the workflow bootstrap (Rule 0).

```yaml
# ✅ Correct — provider prefix on every component, including nested slots
- component: "$COMPONENT_NAMESPACE:card"
  slots:
    media:
      - component: "$COMPONENT_NAMESPACE:image"
        props:
          src: https://placehold.co/400x300

# ❌ Wrong — missing provider prefix
- component: card
  slots:
    media:
      - component: image
```

> ⛔ **No `type: element` in scenes.** Use plain strings/markup for text content. `type: element` is only valid in `*.story.yml` files.

Slots accept three value types:
1. **Component references** — objects with a `component` property
2. **Plain strings / markup** — rendered as raw HTML/text content inside the slot (both as direct values and as array elements)
3. **`$content` / `$variable`** — special placeholder variables

```yaml
# ✅ Correct — plain string in slot
- component: "$COMPONENT_NAMESPACE:heading"
  slots:
    text: "Welcome to the Blog"

# ✅ Correct — string as array element in slot
- component: "$COMPONENT_NAMESPACE:header"
  slots:
    logo:
      - "Designbook"

# ✅ Correct — mixed array with strings and components
- component: "$COMPONENT_NAMESPACE:nav"
  slots:
    items:
      - "Home"
      - component: "$COMPONENT_NAMESPACE:link"
        props:
          href: "/about"

# ❌ Wrong — type: element is story-only
- component: "$COMPONENT_NAMESPACE:heading"
  slots:
    text:
      - type: element
        tag: span
        value: "Welcome to the Blog"
```

> ⛔ **Shell scenes: inline all slots.** Header and footer MUST inline ALL sub-component slots — never use `story: default` alone.

## Slot HTML: Inline Styles Only

> ⛔ **Slot HTML in scene files MUST use inline `style=""` attributes — never CSS framework utility classes.**

Scene YAML files are not included in CSS build tool source paths. Utility classes written in slot HTML will not be compiled and will have no effect at runtime.

```yaml
# ✅ Correct — inline styles always work
slots:
  logo: '<img src="/logo.png" alt="Logo" style="height:47px;width:auto;">'

# ❌ Wrong — utility classes are not compiled from scene YAML
slots:
  logo: '<img src="/logo.png" alt="Logo" class="h-12 w-auto">'
```

This applies to all markup strings in scene files — both in `slots:` and in `props:` that accept HTML. Component templates can use utility classes freely since they are in configured source paths.

